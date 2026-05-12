import { chromium } from "playwright-core";
import { getBrowserExecutablePath, validateScreenshotUrl } from "@/lib/tools/browser";
import {
  buildToolErrorResponse,
  createDownloadHeaders,
  decodeFormString,
} from "@/lib/tools/routeUtils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const urlValue = decodeFormString(formData.get("url"));

  if (!urlValue) {
    return buildToolErrorResponse("Enter a website URL to capture.");
  }

  let websiteUrl: URL;

  try {
    websiteUrl = validateScreenshotUrl(urlValue);
  } catch (error) {
    return buildToolErrorResponse(
      error instanceof Error ? error.message : "Enter a valid website URL.",
    );
  }

  const browser = await chromium.launch({
    executablePath: getBrowserExecutablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 960 },
      deviceScaleFactor: 1,
    });

    await page.goto(websiteUrl.toString(), {
      waitUntil: "networkidle",
      timeout: 30_000,
    });

    const screenshot = await page.screenshot({
      fullPage: true,
      type: "png",
    });

    return new Response(new Uint8Array(screenshot), {
      headers: createDownloadHeaders("website-screenshot.png", "image/png"),
    });
  } catch {
    return buildToolErrorResponse("The website could not be captured. Try another public URL.", 500);
  } finally {
    await browser.close();
  }
}
