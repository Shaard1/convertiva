import sharp from "sharp";
import {
  buildToolErrorResponse,
  createDownloadHeaders,
  handleToolRequest,
  hasFileExtension,
  parseToolFormData,
  rejectOversizedRequest,
} from "@/lib/tools/routeUtils";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  return handleToolRequest(
    request,
    "compress_png",
    "The PNG could not be compressed.",
    async () => {
      const sizeError = rejectOversizedRequest(
        request,
        MAX_IMAGE_BYTES + 1024 * 1024,
      );

      if (sizeError) {
        return sizeError;
      }

      const formData = await parseToolFormData(request);
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return buildToolErrorResponse("Upload one PNG file to compress.");
      }

      if (!hasFileExtension(file.name, ["png"])) {
        return buildToolErrorResponse("Only PNG files can be compressed here.");
      }

      if (file.size > MAX_IMAGE_BYTES) {
        return buildToolErrorResponse("The PNG must be under 25 MB.", 413);
      }

      const compressedImage = await sharp(await file.arrayBuffer(), {
        failOn: "error",
      })
        .png({ compressionLevel: 9, effort: 10, palette: true })
        .toBuffer();
      const outputName = file.name.replace(/\.png$/i, "-compressed.png");

      return new Response(new Uint8Array(compressedImage), {
        headers: createDownloadHeaders(outputName, "image/png"),
      });
    },
  );
}
