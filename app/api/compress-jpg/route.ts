import sharp from "sharp";
import {
  buildToolErrorResponse,
  createDownloadHeaders,
  hasFileExtension,
} from "@/lib/tools/routeUtils";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return buildToolErrorResponse("Upload one JPG file to compress.");
  }

  if (!hasFileExtension(file.name, ["jpg", "jpeg"])) {
    return buildToolErrorResponse("Only JPG files can be compressed here.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return buildToolErrorResponse("The JPG must be under 25 MB.", 413);
  }

  const compressedImage = await sharp(await file.arrayBuffer(), { failOn: "error" })
    .jpeg({ quality: 76, mozjpeg: true, progressive: true })
    .toBuffer();

  const outputName = file.name.replace(/\.(jpe?g)$/i, "-compressed.jpg");

  return new Response(new Uint8Array(compressedImage), {
    headers: createDownloadHeaders(outputName, "image/jpeg"),
  });
}
