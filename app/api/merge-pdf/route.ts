import { PDFDocument } from "pdf-lib";
import { hasFileExtension, createDownloadHeaders, buildToolErrorResponse } from "@/lib/tools/routeUtils";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 30 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (files.length < 2) {
    return buildToolErrorResponse("Upload at least two PDF files to merge.");
  }

  if (files.length > 20) {
    return buildToolErrorResponse("Merge up to 20 PDF files at a time.");
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
}
