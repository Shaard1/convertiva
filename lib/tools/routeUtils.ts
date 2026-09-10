import {
  CapacityExceededError,
  CapacityLimiter,
  readConcurrencyLimit,
} from "@/lib/capacity";
import {
  ApiRequestContext,
  assertTrustedBrowserOrigin,
  createApiRequestContext,
  enforceRequestRateLimit,
  PublicApiError,
  readApiFormData,
} from "@/lib/api/http";

const toolRequestCapacity = new CapacityLimiter(
  "tool request",
  readConcurrencyLimit("TOOL_REQUEST_CONCURRENCY", 4),
);

function getToolErrorCode(status: number) {
  switch (status) {
    case 400:
      return "INVALID_REQUEST";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 413:
      return "PAYLOAD_TOO_LARGE";
    case 415:
      return "UNSUPPORTED_MEDIA_TYPE";
    case 429:
      return "RATE_LIMIT_EXCEEDED";
    case 501:
      return "NOT_IMPLEMENTED";
    case 503:
      return "SERVICE_UNAVAILABLE";
    default:
      return status >= 500 ? "TOOL_PROCESSING_FAILED" : "INVALID_REQUEST";
  }
}

function withToolResponseContext(
  response: Response,
  context: ApiRequestContext,
) {
  const headers = new Headers(response.headers);

  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "no-store");
  }

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Request-ID", context.requestId);
  headers.set("Server-Timing", `app;dur=${Date.now() - context.startedAt}`);

  if (response.status === 503 && !headers.has("Retry-After")) {
    headers.set("Retry-After", "2");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function hasFileExtension(fileName: string, extensions: string[]) {
  return extensions.includes(getFileExtension(fileName));
}

function safeDownloadFileName(fileName: string) {
  const normalized = fileName
    .replace(/[\\/\u0000-\u001f\u007f]/g, "_")
    .trim()
    .slice(0, 180);

  return normalized || "download";
}

export function createDownloadHeaders(fileName: string, contentType: string) {
  const safeFileName = safeDownloadFileName(fileName);
  const asciiFallback = safeFileName
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");

  return {
    "Cache-Control": "private, no-store",
    "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "X-Converted-File-Name": encodeURIComponent(safeFileName),
  };
}

export function decodeFormString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function parseToolFormData(request: Request) {
  return readApiFormData(request);
}

export function buildToolErrorResponse(
  message: string,
  status = 400,
  code = getToolErrorCode(status),
) {
  return Response.json(
    { error: message, code },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export function rejectOversizedRequest(request: Request, maxBytes: number) {
  const header = request.headers.get("content-length");

  if (!header) {
    return buildToolErrorResponse(
      "A valid Content-Length header is required.",
      411,
      "LENGTH_REQUIRED",
    );
  }

  const contentLength = Number(header);

  if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
    return buildToolErrorResponse(
      "The Content-Length header is invalid.",
      400,
      "INVALID_CONTENT_LENGTH",
    );
  }

  return contentLength > maxBytes
    ? buildToolErrorResponse("The request body is too large.", 413)
    : null;
}

function logToolFailure(
  context: ApiRequestContext,
  error: unknown,
  status: number,
  code: string,
) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: status >= 500 ? "error" : "warn",
    service: "convertiva-tools",
    event: "tool_request_failed",
    operation: context.operation,
    request_id: context.requestId,
    error_code: code,
    status_code: status,
    duration_ms: Date.now() - context.startedAt,
    internal_error:
      error instanceof Error && !(error instanceof PublicApiError)
        ? error.message
        : undefined,
  });

  if (status >= 500) {
    console.error(entry);
  } else {
    console.warn(entry);
  }
}

export async function handleToolRequest(
  request: Request,
  operation: string,
  fallbackMessage: string,
  handler: () => Promise<Response>,
) {
  const context = createApiRequestContext(request, operation);

  try {
    assertTrustedBrowserOrigin(request);
    await enforceRequestRateLimit(request, `tool:${operation}`);
    const response = await toolRequestCapacity.run(handler);
    return withToolResponseContext(response, context);
  } catch (error) {
    const publicError = error instanceof PublicApiError ? error : null;
    const capacityExceeded = error instanceof CapacityExceededError;
    const status = publicError?.statusCode ?? (capacityExceeded ? 503 : 500);
    const code =
      publicError?.code ??
      (capacityExceeded ? "TOOL_CAPACITY_EXCEEDED" : "TOOL_PROCESSING_FAILED");
    const message =
      publicError?.message ??
      (capacityExceeded
        ? "The service is busy. Try again shortly."
        : fallbackMessage);
    const response = buildToolErrorResponse(message, status, code);

    if (capacityExceeded) {
      response.headers.set("Retry-After", "2");
    }

    logToolFailure(context, error, status, code);
    return withToolResponseContext(response, context);
  }
}
