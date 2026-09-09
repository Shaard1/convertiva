import { PDFDocument } from "pdf-lib";
import {
  buildToolErrorResponse,
  createDownloadHeaders,
  handleToolRequest,
  hasFileExtension,
  rejectOversizedRequest,
} from "@/lib/tools/routeUtils";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 30 * 1024 * 1024;
const MAX_TOTAL_BYTES = 150 * 1024 * 1024;

export async function POST(request: Request) {
  return handleToolRequest("merge_pdf", "The PDF files could not be merged.", async () => {
  const sizeError = rejectOversizedRequest(request, MAX_TOTAL_BYTES + 1024 * 1024);

  if (sizeError) {
    return sizeError;
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (files.length < 2) {
    return buildToolErrorResponse("Upload at least two PDF files to merge.");
  }

  if (files.length > 20) {
    return buildToolErrorResponse("Merge up to 20 PDF files at a time.");
  }

  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
    return buildToolErrorResponse("The combined PDF upload must be under 150 MB.", 413);
  }

  for (const file of files) {
    if (!hasFileExtension(file.name, ["pdf"])) {
      return buildToolErrorResponse("Only PDF files can be merged.");
    }

    if (file.size > MAX_PDF_BYTES) {
      return buildToolErrorResponse("Each PDF must be under 30 MB.", 413);
    }
  }

  const mergedDocument = await PDFDocument.create();

  for (const file of files) {
    const sourceDocument = await PDFDocument.load(await file.arrayBuffer());
    const copiedPages = await mergedDocument.copyPages(
      sourceDocument,
      sourceDocument.getPageIndices(),
    );

    copiedPages.forEach((page) => mergedDocument.addPage(page));
  }

  const mergedBytes = await mergedDocument.save();

  return new Response(new Uint8Array(mergedBytes), {
    headers: createDownloadHeaders("merged.pdf", "application/pdf"),
  });
  });
}
