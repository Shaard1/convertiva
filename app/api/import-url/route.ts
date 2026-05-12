import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import {
  MEGABYTE_BYTES,
  SUPPORTED_INPUT_EXTENSIONS,
  SUPPORTED_INPUT_MIME_TYPES,
} from "@/lib/constants";

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

function isPrivateIp(address: string) {
  if (!isIP(address)) {
    return false;
  }

  if (address === "::1" || address.startsWith("fc") || address.startsWith("fd")) {
    return true;
  }

  const parts = address.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [first, second] = parts;

  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254) ||
    first === 0
  );
}

async function assertPublicUrl(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS image links are supported.");
  }

  if (url.username || url.password) {
    throw new Error("Image links cannot include usernames or passwords.");
  }

  if (["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())) {
    throw new Error("Local image links are not supported.");
  }

  const records = await lookup(url.hostname, { all: true });

  if (!records.length || records.some((record) => isPrivateIp(record.address))) {
    throw new Error("Private network image links are not supported.");
  }
}

function isSupportedImage(contentType: string) {
  const normalizedType = contentType.split(";")[0]?.trim().toLowerCase();

  return SUPPORTED_INPUT_MIME_TYPES.includes(
    normalizedType as (typeof SUPPORTED_INPUT_MIME_TYPES)[number],
  );
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { url?: unknown };

    if (typeof payload.url !== "string" || !payload.url.trim()) {
      return NextResponse.json({ error: "Enter an image URL." }, { status: 400 });
    }

    const url = new URL(payload.url.trim());
    await assertPublicUrl(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not load an image from that URL." },
        { status: 400 },
      );
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!isSupportedImage(contentType)) {
      return NextResponse.json(
        { error: "That URL does not point to a supported image." },
        { status: 400 },
      );
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);

    if (contentLength > MAX_REMOTE_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image URL is too large. Try a smaller image." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.byteLength > MAX_REMOTE_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image URL is too large. Try a smaller image." },
        { status: 400 },
      );
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "X-Imported-File-Name": encodeURIComponent(getFileNameFromUrl(url)),
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
