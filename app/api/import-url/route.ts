import {
  MEGABYTE_BYTES,
  SUPPORTED_INPUT_EXTENSIONS,
  SUPPORTED_INPUT_MIME_TYPES,
} from "@/lib/constants";
import { readApiJson } from "@/lib/api/http";
import {
  fetchPublicResource,
  PublicNetworkError,
  validatePublicHttpUrl,
} from "@/lib/security/public-network";
import {
  buildToolErrorResponse,
  handleToolRequest,
  rejectOversizedRequest,
} from "@/lib/tools/routeUtils";

export const runtime = "nodejs";

const MAX_REMOTE_IMAGE_BYTES = 20 * MEGABYTE_BYTES;
const REQUEST_TIMEOUT_MS = 12_000;

function decodeUrlPathSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return "";
  }
}

function getFileNameFromUrl(url: URL) {
  const lastSegment = url.pathname.split("/").filter(Boolean).pop();
  const decodedSegment = lastSegment ? decodeUrlPathSegment(lastSegment) : "";
  const hasExtension = SUPPORTED_INPUT_EXTENSIONS.some((extension) =>
    decodedSegment.toLowerCase().endsWith(`.${extension}`),
  );

  return hasExtension ? decodedSegment : "imported-image";
}

function isSupportedImage(contentType: string) {
  const normalizedType = contentType.split(";")[0]?.trim().toLowerCase();

  return SUPPORTED_INPUT_MIME_TYPES.includes(
    normalizedType as (typeof SUPPORTED_INPUT_MIME_TYPES)[number],
  );
}

async function importRemoteImage(request: Request) {
  const sizeError = rejectOversizedRequest(request, 16 * 1024);

  if (sizeError) {
    return sizeError;
  }

  const payload = await readApiJson(request);

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return buildToolErrorResponse("The request body must be a JSON object.");
  }

  const urlValue = (payload as { url?: unknown }).url;

  if (typeof urlValue !== "string" || !urlValue.trim()) {
    return buildToolErrorResponse("Enter an image URL.");
  }

  try {
    const url = await validatePublicHttpUrl(urlValue.trim());
    const resource = await fetchPublicResource(url, {
      timeoutMs: REQUEST_TIMEOUT_MS,
      maxBytes: MAX_REMOTE_IMAGE_BYTES,
      headers: {
        Accept: "image/*",
      },
    });
    const contentType = resource.contentType;

    if (!isSupportedImage(contentType)) {
      return buildToolErrorResponse(
        "That URL does not point to a supported image.",
      );
    }

    return new Response(new Uint8Array(Buffer.from(resource.body)), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Imported-File-Name": encodeURIComponent(
          getFileNameFromUrl(resource.finalUrl),
        ),
      },
    });
  } catch (error) {
    if (error instanceof PublicNetworkError) {
      return buildToolErrorResponse(error.message);
    }

    throw error;
  }
}

export async function POST(request: Request) {
  return handleToolRequest(
    request,
    "import_remote_image",
    "Could not import an image from that URL.",
    () => importRemoteImage(request),
  );
}
