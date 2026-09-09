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
  const asciiFallback = safeFileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");

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

export function buildToolErrorResponse(message: string, status = 400) {
  return Response.json(
    { error: message },
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
    return null;
  }

  const contentLength = Number(header);

  if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
    return buildToolErrorResponse("The Content-Length header is invalid.");
  }

  return contentLength > maxBytes
    ? buildToolErrorResponse("The request body is too large.", 413)
    : null;
}

export async function handleToolRequest(
  operation: string,
  fallbackMessage: string,
  handler: () => Promise<Response>,
) {
  try {
    return await handler();
  } catch (error) {
    console.error("Tool request failed", {
      operation,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return error instanceof CapacityExceededError
      ? buildToolErrorResponse("The service is busy. Try again shortly.", 503)
      : buildToolErrorResponse(fallbackMessage, 500);
  }
}
import { CapacityExceededError } from "@/lib/capacity";
