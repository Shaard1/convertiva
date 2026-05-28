import { chromium } from "playwright-core";
import { getBrowserLaunchOptions, validateScreenshotUrl } from "@/lib/tools/browser";
import {
  buildToolErrorResponse,
  createDownloadHeaders,
  decodeFormString,
} from "@/lib/tools/routeUtils";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const formData = await request.formData();
  const urlValue = decodeFormString(formData.get("url"));

  if (!urlValue) {
    return buildToolErrorResponse("Enter a website URL to export.");
  }

  let websiteUrl: URL;

  try {
    websiteUrl = validateScreenshotUrl(urlValue);
  } catch (error) {
    return buildToolErrorResponse(
      error instanceof Error ? error.message : "Enter a valid website URL.",
    );
  }

  const browser = await chromium.launch(await getBrowserLaunchOptions());

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 960 },
      deviceScaleFactor: 1,
    });

    await page.goto(websiteUrl.toString(), {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });

    await page
      .waitForLoadState("load", { timeout: 5_000 })
      .catch(() => undefined);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12mm",
        right: "10mm",
        bottom: "12mm",
        left: "10mm",
      },
    });

    return new Response(new Uint8Array(pdf), {
      headers: createDownloadHeaders("website.pdf", "application/pdf"),
    });
  } catch (error) {
    console.error("Website PDF export failed", {
      message: error instanceof Error ? error.message : "Unknown error",
      url: websiteUrl.toString(),
    });

    return buildToolErrorResponse("The website could not be exported as a PDF. Try another public URL.", 500);
  } finally {
    await browser.close();
  }
}
