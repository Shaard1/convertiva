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

const API_VERSION = "v1";
const REQUEST_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

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
    return;
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
) {
  const context = createApiRequestContext(request, operation);

  try {
    return await handler(context);
  } catch (error) {
    const publicError = normalizeApiError(error, fallbackMessage);
    logApiFailure(context, error, publicError);
    return createApiErrorResponse(context, publicError);
  }
}
