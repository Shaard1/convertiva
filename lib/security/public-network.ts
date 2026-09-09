import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const DEFAULT_MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export class PublicNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicNetworkError";
  }
}

function parseIpv4(address: string) {
  const parts = address.split(".");

  if (parts.length !== 4) {
    return null;
  }

  const octets = parts.map(Number);

  if (
    octets.some(
      (octet, index) =>
        !Number.isInteger(octet) ||
        octet < 0 ||
        octet > 255 ||
        String(octet) !== parts[index],
    )
  ) {
    return null;
  }

  return octets;
}

function mappedIpv4Address(address: string) {
  const normalized = address.toLowerCase();
  const marker = "::ffff:";

  if (!normalized.startsWith(marker)) {
    return null;
  }

  const mappedValue = normalized.slice(marker.length);

  if (mappedValue.includes(".")) {
    return mappedValue;
  }

  const groups = mappedValue.split(":");

  if (groups.length !== 2 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) {
    return null;
  }

  const high = Number.parseInt(groups[0], 16);
  const low = Number.parseInt(groups[1], 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

function isBlockedIpv4(address: string) {
  const octets = parseIpv4(address);

  if (!octets) {
    return true;
  }

  const [first, second, third] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
}

function isBlockedIpv6(address: string) {
  const normalized = address.toLowerCase().split("%")[0];
  const mappedAddress = mappedIpv4Address(normalized);

  if (mappedAddress) {
    return isBlockedIpv4(mappedAddress);
  }

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  );
}

export function isBlockedNetworkAddress(address: string) {
  const version = isIP(address);

  if (version === 4) {
    return isBlockedIpv4(address);
  }

  if (version === 6) {
    return isBlockedIpv6(address);
  }

  return true;
}

export function parsePublicHttpUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new PublicNetworkError("Enter a valid public HTTP or HTTPS URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new PublicNetworkError("Only HTTP and HTTPS URLs are supported.");
  }

  if (url.username || url.password) {
    throw new PublicNetworkError("URLs cannot include usernames or passwords.");
  }

  if (!url.hostname || url.hostname.endsWith(".")) {
    throw new PublicNetworkError("The URL hostname is invalid.");
  }

  return url;
}

export async function assertPublicNetworkUrl(url: URL) {
  const urlHostname = url.hostname.toLowerCase();
  const normalizedHostname =
    urlHostname.startsWith("[") && urlHostname.endsWith("]")
      ? urlHostname.slice(1, -1)
      : urlHostname;

  if (
    normalizedHostname === "localhost" ||
    normalizedHostname.endsWith(".localhost") ||
    normalizedHostname.endsWith(".local")
  ) {
    throw new PublicNetworkError("Local and private network addresses are not allowed.");
  }

  const literalVersion = isIP(normalizedHostname);
  let addresses: string[];

  try {
    addresses = literalVersion
      ? [normalizedHostname]
      : (await lookup(normalizedHostname, { all: true, verbatim: true })).map(
          (record) => record.address,
        );
  } catch {
    throw new PublicNetworkError("The URL hostname could not be resolved.");
  }

  if (!addresses.length || addresses.some(isBlockedNetworkAddress)) {
    throw new PublicNetworkError("Local and private network addresses are not allowed.");
  }
}

export async function validatePublicHttpUrl(value: string) {
  const url = parsePublicHttpUrl(value);
  await assertPublicNetworkUrl(url);
  return url;
}

type FetchPublicResourceOptions = {
  timeoutMs: number;
  maxBytes: number;
  maxRedirects?: number;
  headers?: HeadersInit;
};

export type PublicResource = {
  body: Uint8Array;
  contentType: string;
  finalUrl: URL;
};

async function readBoundedBody(response: Response, maxBytes: number) {
  const contentLength = Number(response.headers.get("content-length") ?? 0);

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new PublicNetworkError("The remote file exceeds the allowed size.");
  }

  if (!response.body) {
    return new Uint8Array();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new PublicNetworkError("The remote file exceeds the allowed size.");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body;
}

export async function fetchPublicResource(
  initialUrl: URL,
  options: FetchPublicResourceOptions,
): Promise<PublicResource> {
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    await assertPublicNetworkUrl(currentUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    let response: Response;

    try {
      response = await fetch(currentUrl, {
        headers: options.headers,
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof PublicNetworkError) {
        throw error;
      }

      throw new PublicNetworkError("The remote server could not be reached.");
    }

    try {
      if (REDIRECT_STATUSES.has(response.status)) {
        if (redirectCount === maxRedirects) {
          throw new PublicNetworkError("The remote URL redirected too many times.");
        }

        const location = response.headers.get("location");

        if (!location) {
          throw new PublicNetworkError("The remote server returned an invalid redirect.");
        }

        await response.body?.cancel();
        currentUrl = parsePublicHttpUrl(new URL(location, currentUrl).toString());
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new PublicNetworkError("The remote server did not return a usable file.");
      }

      return {
        body: await readBoundedBody(response, options.maxBytes),
        contentType: response.headers.get("content-type") ?? "",
        finalUrl: currentUrl,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new PublicNetworkError("The remote URL redirected too many times.");
}
