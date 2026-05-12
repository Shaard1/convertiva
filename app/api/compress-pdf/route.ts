import { PDFDocument } from "pdf-lib";
import {
  buildToolErrorResponse,
  createDownloadHeaders,
  hasFileExtension,
} from "@/lib/tools/routeUtils";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return buildToolErrorResponse("Upload one PDF file to compress.");
  }

  if (!hasFileExtension(file.name, ["pdf"])) {
    return buildToolErrorResponse("Only PDF files can be compressed here.");
  }

  if (file.size > MAX_PDF_BYTES) {
    return buildToolErrorResponse("The PDF must be under 50 MB.", 413);
  }

  const sourceBytes = new Uint8Array(await file.arrayBuffer());
  const document = await PDFDocument.load(sourceBytes, {
    updateMetadata: false,
  });

  const optimizedBytes = await document.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
    objectsPerTick: 50,
  });

  const resultBytes =
    optimizedBytes.byteLength < sourceBytes.byteLength ? optimizedBytes : sourceBytes;
  const outputName = file.name.replace(/\.pdf$/i, "-compressed.pdf");

  return new Response(new Uint8Array(resultBytes), {
    headers: createDownloadHeaders(outputName, "application/pdf"),
  });
}
