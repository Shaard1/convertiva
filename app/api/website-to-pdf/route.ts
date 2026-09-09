import { chromium } from "playwright-core";
import {
  getBrowserLaunchOptions,
  installPublicNetworkGuard,
  browserCapacity,
  validateScreenshotUrl,
} from "@/lib/tools/browser";
import {
  buildToolErrorResponse,
  createDownloadHeaders,
  decodeFormString,
  handleToolRequest,
  rejectOversizedRequest,
} from "@/lib/tools/routeUtils";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  return handleToolRequest(
    "website_to_pdf",
    "The website could not be exported.",
    async () => {
      const sizeError = rejectOversizedRequest(request, 64 * 1024);

      if (sizeError) {
        return sizeError;
      }

      const formData = await request.formData();
      const urlValue = decodeFormString(formData.get("url"));

      if (!urlValue) {
        return buildToolErrorResponse("Enter a website URL to export.");
      }

      let websiteUrl: URL;

      try {
        websiteUrl = await validateScreenshotUrl(urlValue);
      } catch (error) {
        return buildToolErrorResponse(
          error instanceof Error ? error.message : "Enter a valid website URL.",
        );
      }

      return browserCapacity.run(async () => {
        let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

        try {
          browser = await chromium.launch(await getBrowserLaunchOptions());
          const context = await browser.newContext({
            viewport: { width: 1440, height: 960 },
            deviceScaleFactor: 1,
            acceptDownloads: false,
            serviceWorkers: "block",
          });
          await installPublicNetworkGuard(context);
          const page = await context.newPage();

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

          return buildToolErrorResponse(
            "The website could not be exported as a PDF. Try another public URL.",
            500,
          );
        } finally {
          await browser?.close();
        }
      });
    },
  );
}
