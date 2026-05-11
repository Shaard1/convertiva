import JSZip from "jszip";
import { NextResponse } from "next/server";
import { getConversionJobOutputs } from "@/lib/conversion-jobs";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export const runtime = "nodejs";

function createDownloadHeaders(fileName: string, contentType: string) {
  return {
    "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    "Content-Type": contentType,
  };
}

type DownloadOutput = NonNullable<
  Awaited<ReturnType<typeof getConversionJobOutputs>>
>[number];

async function createZip(files: DownloadOutput[]) {
  const zip = new JSZip();

  files.forEach((file) => {
    zip.file(file.fileName, file.buffer);
  });

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const outputs = await getConversionJobOutputs(jobId);

  if (!outputs) {
    return NextResponse.json(
      {
        error: "Converted files are not available for this job.",
      },
      { status: 404 },
    );
  }

  if (outputs.length === 1) {
    const [file] = outputs;

    return new NextResponse(new Uint8Array(file.buffer), {
      headers: createDownloadHeaders(file.fileName, file.mimeType),
    });
  }

  const zipBuffer = await createZip(outputs);

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: createDownloadHeaders(`${jobId}.zip`, "application/zip"),
  });
}
