import { existsSync } from "node:fs";
import chromium from "@sparticuz/chromium";
import type { BrowserContext, LaunchOptions } from "playwright-core";
import { CapacityLimiter, readConcurrencyLimit } from "@/lib/capacity";
import {
  assertPublicNetworkUrl,
  validatePublicHttpUrl,
} from "@/lib/security/public-network";

const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

export const browserCapacity = new CapacityLimiter(
  "Browser rendering",
  readConcurrencyLimit("BROWSER_RENDER_CONCURRENCY", 2),
);

export async function validateScreenshotUrl(value: string) {
  return validatePublicHttpUrl(value);
}

export async function installPublicNetworkGuard(
  context: BrowserContext,
  maxRequests = 150,
) {
  let requestCount = 0;

  await context.route("**/*", async (route) => {
    const requestUrl = route.request().url();

    if (requestUrl.startsWith("data:") || requestUrl.startsWith("blob:")) {
      await route.continue();
      return;
    }

    requestCount += 1;

    if (requestCount > maxRequests) {
      await route.abort("blockedbyclient");
      return;
    }

    try {
      const parsedUrl = new URL(requestUrl);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        await route.abort("blockedbyclient");
        return;
      }

      await assertPublicNetworkUrl(parsedUrl);
      await route.continue();
    } catch {
      await route.abort("blockedbyclient");
    }
  });
}

export function getBrowserExecutablePath() {
  const executablePath = browserCandidates.find((candidate) => existsSync(candidate));

  if (!executablePath) {
    throw new Error("No supported browser executable was found on the server.");
  }

  return executablePath;
}

export async function getBrowserLaunchOptions(): Promise<LaunchOptions> {
  if (process.env.VERCEL) {
    const executablePath = await chromium.executablePath();

    if (!executablePath) {
      throw new Error("No supported browser executable was found on the server.");
    }

    return {
      args: chromium.args,
      executablePath,
      headless: true,
    };
  }

  return {
    executablePath: getBrowserExecutablePath(),
    headless: true,
  };
}
