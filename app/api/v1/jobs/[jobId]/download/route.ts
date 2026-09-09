import JSZip from "jszip";
import { NextResponse } from "next/server";
import {
  authenticateConversionApiRequest,
  getApiAuthError,
} from "@/lib/api-keys";
import {
  getConversionJobError,
  getConversionJobOutputs,
} from "@/lib/conversion-jobs";
import { createDownloadHeaders } from "@/lib/tools/routeUtils";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export const runtime = "nodejs";

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
  try {
    const identity = await authenticateConversionApiRequest(_request);
    const { jobId } = await context.params;
    const outputs = await getConversionJobOutputs(jobId, identity);

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
  } catch (error) {
    const authError = getApiAuthError(error);
    const conversionError = getConversionJobError(error);
    const response =
      authError.statusCode !== 500 || authError.message !== "API authentication failed."
        ? authError
        : conversionError;

    return NextResponse.json(
      {
        error: response.message,
      },
      { status: response.statusCode },
    );
  }
}
