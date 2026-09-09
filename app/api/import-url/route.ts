import { NextResponse } from "next/server";
import {
  MEGABYTE_BYTES,
  SUPPORTED_INPUT_EXTENSIONS,
  SUPPORTED_INPUT_MIME_TYPES,
} from "@/lib/constants";
import {
  fetchPublicResource,
  validatePublicHttpUrl,
} from "@/lib/security/public-network";
import { rejectOversizedRequest } from "@/lib/tools/routeUtils";

export const runtime = "nodejs";

const MAX_REMOTE_IMAGE_BYTES = 20 * MEGABYTE_BYTES;
const REQUEST_TIMEOUT_MS = 12000;

function getFileNameFromUrl(url: URL) {
  const lastSegment = url.pathname.split("/").filter(Boolean).pop();
  const decodedSegment = lastSegment ? decodeURIComponent(lastSegment) : "";
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

export async function POST(request: Request) {
  try {
    const sizeError = rejectOversizedRequest(request, 16 * 1024);

    if (sizeError) {
      return sizeError;
    }

    const payload = (await request.json()) as { url?: unknown };

    if (typeof payload.url !== "string" || !payload.url.trim()) {
      return NextResponse.json({ error: "Enter an image URL." }, { status: 400 });
    }

    const url = await validatePublicHttpUrl(payload.url.trim());
    const resource = await fetchPublicResource(url, {
      timeoutMs: REQUEST_TIMEOUT_MS,
      maxBytes: MAX_REMOTE_IMAGE_BYTES,
      headers: {
        Accept: "image/*",
      },
    });
    const contentType = resource.contentType;

    if (!isSupportedImage(contentType)) {
      return NextResponse.json(
        { error: "That URL does not point to a supported image." },
        { status: 400 },
      );
    }

    return new NextResponse(new Uint8Array(Buffer.from(resource.body)), {
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
    const message =
      error instanceof Error
        ? error.message
        : "Could not import an image from that URL.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
