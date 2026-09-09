import JSZip from "jszip";
import { authenticateConversionApiRequest } from "@/lib/api-keys";
import {
  createApiResponseHeaders,
  handleApiRequest,
  PublicApiError,
} from "@/lib/api/http";
import {
  createRateLimitHeaders,
  enforceApiRateLimit,
} from "@/lib/api/limits";
import {
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

export async function GET(request: Request, routeContext: RouteContext) {
  return handleApiRequest(
    request,
    "download_conversion_job",
    "The converted files could not be downloaded.",
    async (context) => {
      const identity = await authenticateConversionApiRequest(request);
      const rateLimit = await enforceApiRateLimit(identity);
      const { jobId } = await routeContext.params;
      const outputs = await getConversionJobOutputs(jobId, identity);

      if (!outputs) {
        throw new PublicApiError(
          "CONVERSION_OUTPUT_NOT_FOUND",
          "Converted files are not available for this job.",
          404,
        );
      }

      if (outputs.length === 1) {
        const [file] = outputs;

        return new Response(new Uint8Array(file.buffer), {
          headers: createApiResponseHeaders(context, {
            ...createDownloadHeaders(file.fileName, file.mimeType),
            ...createRateLimitHeaders(rateLimit),
          }),
        });
      }

      const zipBuffer = await createZip(outputs);

      return new Response(new Uint8Array(zipBuffer), {
        headers: createApiResponseHeaders(context, {
          ...createDownloadHeaders(`${jobId}.zip`, "application/zip"),
          ...createRateLimitHeaders(rateLimit),
        }),
      });
    },
  );
}
