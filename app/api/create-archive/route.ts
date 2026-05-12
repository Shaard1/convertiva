import JSZip from "jszip";
import { createDownloadHeaders, buildToolErrorResponse } from "@/lib/tools/routeUtils";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 75 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (!files.length) {
    return buildToolErrorResponse("Upload one or more files to create an archive.");
  }

  if (files.length > 40) {
    return buildToolErrorResponse("Archive up to 40 files at a time.");
  }

  const zip = new JSZip();

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return buildToolErrorResponse("Each file must be under 75 MB.", 413);
    }

    zip.file(file.name, await file.arrayBuffer());
  }

  const archiveBuffer = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return new Response(new Uint8Array(archiveBuffer), {
    headers: createDownloadHeaders("created-archive.zip", "application/zip"),
  });
}
