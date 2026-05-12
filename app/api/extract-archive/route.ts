import JSZip from "jszip";
import {
  createDownloadHeaders,
  buildToolErrorResponse,
  hasFileExtension,
} from "@/lib/tools/routeUtils";

export const runtime = "nodejs";

const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return buildToolErrorResponse("Upload one ZIP archive to extract.");
  }

  if (!hasFileExtension(file.name, ["zip"])) {
    return buildToolErrorResponse("This extractor currently supports ZIP archives.");
  }

  if (file.size > MAX_ARCHIVE_BYTES) {
    return buildToolErrorResponse("The archive must be under 100 MB.", 413);
  }

  const archive = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(archive.files).filter((entry) => !entry.dir);

  if (!entries.length) {
    return buildToolErrorResponse("The archive does not contain any files.");
  }

  if (entries.length === 1) {
    const [entry] = entries;
    const content = await entry.async("uint8array");

    return new Response(new Uint8Array(content), {
      headers: createDownloadHeaders(entry.name, "application/octet-stream"),
    });
  }

  const extractedArchive = new JSZip();

  for (const entry of entries) {
    extractedArchive.file(entry.name, await entry.async("uint8array"));
  }

  const archiveBuffer = await extractedArchive.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return new Response(new Uint8Array(archiveBuffer), {
    headers: createDownloadHeaders("extracted-files.zip", "application/zip"),
  });
}
