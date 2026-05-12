import { existsSync } from "node:fs";
import { isIP } from "node:net";

const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase();

  if (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized.endsWith(".localhost")
  ) {
    return true;
  }

  const ipVersion = isIP(normalized);

  if (ipVersion === 4) {
    return (
      normalized.startsWith("10.") ||
      normalized.startsWith("127.") ||
      normalized.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
    );
  }

  return false;
}

export function validateScreenshotUrl(value: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error("Enter a valid website URL.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only http and https website URLs are supported.");
  }

  if (isBlockedHostname(parsedUrl.hostname)) {
    throw new Error("Local and private network addresses are not allowed.");
  }

  return parsedUrl;
}

export function getBrowserExecutablePath() {
  const executablePath = browserCandidates.find((candidate) => existsSync(candidate));

  if (!executablePath) {
    throw new Error("No supported browser executable was found on the server.");
  }

  return executablePath;
}
