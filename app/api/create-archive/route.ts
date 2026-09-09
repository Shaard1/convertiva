import JSZip from "jszip";
import {
  buildToolErrorResponse,
  createDownloadHeaders,
  handleToolRequest,
  rejectOversizedRequest,
} from "@/lib/tools/routeUtils";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 75 * 1024 * 1024;
const MAX_TOTAL_BYTES = 250 * 1024 * 1024;

export async function POST(request: Request) {
  return handleToolRequest("create_archive", "The archive could not be created.", async () => {
  const sizeError = rejectOversizedRequest(request, MAX_TOTAL_BYTES + 1024 * 1024);

  if (sizeError) {
    return sizeError;
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (!files.length) {
    return buildToolErrorResponse("Upload one or more files to create an archive.");
  }

  if (files.length > 40) {
    return buildToolErrorResponse("Archive up to 40 files at a time.");
  }

  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
    return buildToolErrorResponse("The combined upload must be under 250 MB.", 413);
  }

  const zip = new JSZip();

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return buildToolErrorResponse("Each file must be under 75 MB.", 413);
    }

    if (!file.name || /[\\/\u0000-\u001f]/.test(file.name)) {
      return buildToolErrorResponse("One or more file names are invalid.");
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
  });
}
