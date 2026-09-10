import JSZip from "jszip";
import {
  createDownloadHeaders,
  buildToolErrorResponse,
  handleToolRequest,
  hasFileExtension,
  parseToolFormData,
  rejectOversizedRequest,
} from "@/lib/tools/routeUtils";

export const runtime = "nodejs";

const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 500;
const MAX_EXTRACTED_BYTES = 250 * 1024 * 1024;
const SAFE_ARCHIVE_PATH = /^(?![\\/])(?![A-Za-z]:)(?!.*(?:^|[\\/])\.\.(?:[\\/]|$))[^\u0000-\u001f\u007f]{1,512}$/;

function hasSafeArchivePath(entryName: string) {
  return SAFE_ARCHIVE_PATH.test(entryName);
}

async function readEntryBounded(
  entry: JSZip.JSZipObject,
  remainingBytes: number,
) {
  const stream = entry.nodeStream("nodebuffer");
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;

    if (totalBytes > remainingBytes) {
      throw new Error("The extracted archive exceeds the allowed size.");
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks, totalBytes);
}

export async function POST(request: Request) {
  return handleToolRequest(request, "extract_archive", "The archive could not be extracted.", async () => {
  const sizeError = rejectOversizedRequest(request, MAX_ARCHIVE_BYTES + 1024 * 1024);

  if (sizeError) {
    return sizeError;
  }

  const formData = await parseToolFormData(request);
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

  if (entries.length > MAX_ARCHIVE_ENTRIES) {
    return buildToolErrorResponse("The archive contains too many files.", 413);
  }

  if (entries.some((entry) => !hasSafeArchivePath(entry.name))) {
    return buildToolErrorResponse("The archive contains an unsafe file path.", 400);
  }

  if (entries.length === 1) {
    const [entry] = entries;
    const content = await readEntryBounded(entry, MAX_EXTRACTED_BYTES);

    return new Response(new Uint8Array(content), {
      headers: createDownloadHeaders(entry.name, "application/octet-stream"),
    });
  }

  const extractedArchive = new JSZip();
  let extractedBytes = 0;

  for (const entry of entries) {
    const content = await readEntryBounded(
      entry,
      MAX_EXTRACTED_BYTES - extractedBytes,
    );
    extractedBytes += content.byteLength;
    extractedArchive.file(entry.name, content);
  }

  const archiveBuffer = await extractedArchive.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return new Response(new Uint8Array(archiveBuffer), {
    headers: createDownloadHeaders("extracted-files.zip", "application/zip"),
  });
  });
}
