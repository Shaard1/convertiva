import { createHash, createHmac } from "node:crypto";
import { activateDevelopmentServiceFallback } from "@/lib/development-service-fallback";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export type ApiRequestContext = {
  operation: string;
  requestId: string;
  startedAt: number;
};

export type ApiResponseOptions = {
  headers?: HeadersInit;
  status?: number;
};

type ApiHandler = (context: ApiRequestContext) => Promise<Response>;

type ApiHandlerOptions = {
  enforceRateLimit?: boolean;
};

const API_VERSION = "v1";
const DISTRIBUTED_RATE_LIMIT_TIMEOUT_MS = 1_500;
const REQUEST_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const MAX_TRACKED_CLIENTS = 10_000;

type RateLimitRecord = {
  count: number;
  expiresAt: number;
};

const requestRateLimits = new Map<string, RateLimitRecord>();
let hasWarnedAboutLocalRateLimitFallback = false;

function defaultErrorCode(statusCode: number) {
  switch (statusCode) {
    case 400:
      return "INVALID_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 413:
      return "PAYLOAD_TOO_LARGE";
    case 415:
      return "UNSUPPORTED_MEDIA_TYPE";
    case 422:
      return "UNPROCESSABLE_ENTITY";
    case 429:
      return "RATE_LIMIT_EXCEEDED";
    case 501:
      return "NOT_IMPLEMENTED";
    case 503:
      return "SERVICE_UNAVAILABLE";
    default:
      return "INTERNAL_ERROR";
  }
}

export class PublicApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export function createPublicApiError(
  message: string,
  statusCode = 400,
  code = defaultErrorCode(statusCode),
) {
  return new PublicApiError(code, message, statusCode);
}

function getClientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function assertTrustedBrowserOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(request.url).origin;
  } catch {
    throw new PublicApiError("INVALID_REQUEST_URL", "The request URL is invalid.", 400);
  }

  if (origin === "null" || origin !== expectedOrigin) {
    throw new PublicApiError("CROSS_SITE_REQUEST_BLOCKED", "Cross-site requests are not allowed.", 403);
  }
}

function getDistributedRateLimitKey(request: Request, scope: string) {
  const value = `${scope}:${getClientAddress(request)}`;
  const secret = process.env.GUEST_USAGE_HASH_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  return secret
    ? createHmac("sha256", secret).update(value).digest("hex")
    : createHash("sha256").update(value).digest("hex");
}

export async function enforceRequestRateLimit(
  request: Request,
  scope: string,
  maximumRequests = 30,
  windowMs = 60_000,
) {
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .rpc("check_public_request_rate_limit", {
          p_limit_key: getDistributedRateLimitKey(request, scope),
          p_maximum_requests: maximumRequests,
          p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
        })
        .abortSignal(AbortSignal.timeout(DISTRIBUTED_RATE_LIMIT_TIMEOUT_MS));
      const result = Array.isArray(data) ? data[0] as { allowed?: unknown; retry_after_seconds?: unknown } | undefined : undefined;

      if (error || typeof result?.allowed !== "boolean") {
        throw new Error("The distributed request rate limiter returned an invalid response.");
      }

      if (!result.allowed) {
        const retryAfterSeconds = typeof result.retry_after_seconds === "number"
          ? Math.max(1, Math.ceil(result.retry_after_seconds))
          : 60;
        throw new PublicApiError("RATE_LIMIT_EXCEEDED", "Too many requests. Try again shortly.", 429, retryAfterSeconds);
      }

      return;
    } catch (error) {
      if (error instanceof PublicApiError) {
        throw error;
      }

      if (process.env.NODE_ENV === "production") {
        throw new PublicApiError("RATE_LIMIT_SERVICE_UNAVAILABLE", "Request validation is temporarily unavailable.", 503);
      }

      activateDevelopmentServiceFallback();

      if (!hasWarnedAboutLocalRateLimitFallback) {
        hasWarnedAboutLocalRateLimitFallback = true;
        console.warn("Distributed request validation is unavailable; using the development-only in-memory rate limiter.");
      }
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new PublicApiError("RATE_LIMIT_SERVICE_UNAVAILABLE", "Request validation is temporarily unavailable.", 503);
  }

  const now = Date.now();

  if (requestRateLimits.size >= MAX_TRACKED_CLIENTS) {
    for (const [key, record] of requestRateLimits) {
      if (record.expiresAt <= now) requestRateLimits.delete(key);
    }
    if (requestRateLimits.size >= MAX_TRACKED_CLIENTS) {
      const oldestKey = requestRateLimits.keys().next().value as string | undefined;
      if (oldestKey) requestRateLimits.delete(oldestKey);
    }
  }

  const key = `${scope}:${getClientAddress(request)}`;
  const current = requestRateLimits.get(key);
  if (!current || current.expiresAt <= now) {
    requestRateLimits.set(key, { count: 1, expiresAt: now + windowMs });
    return;
  }

  if (current.count >= maximumRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.expiresAt - now) / 1000));
    throw new PublicApiError("RATE_LIMIT_EXCEEDED", "Too many requests. Try again shortly.", 429, retryAfterSeconds);
  }

  current.count += 1;
}

export function createApiRequestContext(
  request: Request,
  operation: string,
): ApiRequestContext {
  const suppliedRequestId = request.headers.get("x-request-id")?.trim();

  return {
    operation,
    requestId:
      suppliedRequestId && REQUEST_ID_PATTERN.test(suppliedRequestId)
        ? suppliedRequestId
        : crypto.randomUUID(),
    startedAt: Date.now(),
  };
}

export function createApiResponseHeaders(
  context: ApiRequestContext,
  extraHeaders?: HeadersInit,
) {
  const headers = new Headers(extraHeaders);

  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "no-store");
  }

  headers.set("Server-Timing", `app;dur=${Date.now() - context.startedAt}`);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Request-ID", context.requestId);
  return headers;
}

export function createApiSuccessResponse<T>(
  context: ApiRequestContext,
  data: T,
  options: ApiResponseOptions = {},
) {
  return Response.json(
    {
      data,
      error: null,
      meta: {
        requestId: context.requestId,
        version: API_VERSION,
      },
    },
    {
      status: options.status ?? 200,
      headers: createApiResponseHeaders(context, options.headers),
    },
  );
}

export function createApiErrorResponse(
  context: ApiRequestContext,
  error: PublicApiError,
  options: ApiResponseOptions = {},
) {
  const headers = createApiResponseHeaders(context, options.headers);

  if (error.retryAfterSeconds) {
    headers.set("Retry-After", String(error.retryAfterSeconds));
  }

  return Response.json(
    {
      data: null,
      // Keep the string field for existing v1 clients and workers.
      error: error.message,
      code: error.code,
      meta: {
        requestId: context.requestId,
        version: API_VERSION,
      },
    },
    {
      status: options.status ?? error.statusCode,
      headers,
    },
  );
}

export function assertRequestSize(request: Request, maxBytes: number) {
  const header = request.headers.get("content-length");

  if (!header) {
    throw new PublicApiError(
      "LENGTH_REQUIRED",
      "A valid Content-Length header is required.",
      411,
    );
  }

  const contentLength = Number(header);

  if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
    throw new PublicApiError(
      "INVALID_CONTENT_LENGTH",
      "The Content-Length header is invalid.",
      400,
    );
  }

  if (contentLength > maxBytes) {
    throw new PublicApiError(
      "PAYLOAD_TOO_LARGE",
      "The request body is too large.",
      413,
    );
  }
}

export function assertRequestMediaType(
  request: Request,
  expectedType: "application/json" | "multipart/form-data",
) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.startsWith(expectedType)) {
    throw new PublicApiError(
      "UNSUPPORTED_MEDIA_TYPE",
      `Content-Type must be ${expectedType}.`,
      415,
    );
  }
}

export async function readApiFormData(request: Request) {
  assertRequestMediaType(request, "multipart/form-data");

  try {
    return await request.formData();
  } catch {
    throw new PublicApiError(
      "INVALID_MULTIPART_BODY",
      "The multipart request body is invalid.",
      400,
    );
  }
}

export async function readApiJson(request: Request): Promise<unknown> {
  assertRequestMediaType(request, "application/json");

  try {
    return await request.json();
  } catch {
    throw new PublicApiError(
      "INVALID_JSON_BODY",
      "The JSON request body is invalid.",
      400,
    );
  }
}

function normalizeApiError(error: unknown, fallbackMessage: string) {
  return error instanceof PublicApiError
    ? error
    : new PublicApiError("INTERNAL_ERROR", fallbackMessage, 500);
}

function logApiFailure(
  context: ApiRequestContext,
  error: unknown,
  publicError: PublicApiError,
) {
  const logEntry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: publicError.statusCode >= 500 ? "error" : "warn",
    service: "convertiva-api",
    event: "api_request_failed",
    operation: context.operation,
    request_id: context.requestId,
    error_code: publicError.code,
    status_code: publicError.statusCode,
    duration_ms: Date.now() - context.startedAt,
    internal_error:
      error instanceof Error && !(error instanceof PublicApiError)
        ? error.message
        : undefined,
  });

  if (publicError.statusCode >= 500) {
    console.error(logEntry);
    return;
  }

  console.warn(logEntry);
}

export async function handleApiRequest(
  request: Request,
  operation: string,
  fallbackMessage: string,
  handler: ApiHandler,
  options: ApiHandlerOptions = {},
) {
  const context = createApiRequestContext(request, operation);

  try {
    assertTrustedBrowserOrigin(request);
    if (options.enforceRateLimit !== false) {
      await enforceRequestRateLimit(request, `api:${operation}`, 60);
    }
    return await handler(context);
  } catch (error) {
    const publicError = normalizeApiError(error, fallbackMessage);
    logApiFailure(context, error, publicError);
    return createApiErrorResponse(context, publicError);
  }
}
