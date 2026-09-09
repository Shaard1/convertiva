import { authenticateConversionApiRequest } from "@/lib/api-keys";
import {
  createApiSuccessResponse,
  handleApiRequest,
  PublicApiError,
} from "@/lib/api/http";
import {
  createRateLimitHeaders,
  enforceApiRateLimit,
} from "@/lib/api/limits";
import {
  getConversionJob,
  serializeJob,
} from "@/lib/conversion-jobs";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export const runtime = "nodejs";

export async function GET(request: Request, routeContext: RouteContext) {
  return handleApiRequest(
    request,
    "get_conversion_job",
    "The conversion job could not be loaded.",
    async (context) => {
      const identity = await authenticateConversionApiRequest(request);
      const rateLimit = await enforceApiRateLimit(identity);
      const { jobId } = await routeContext.params;
      const job = await getConversionJob(jobId, identity);

      if (!job) {
        throw new PublicApiError(
          "CONVERSION_JOB_NOT_FOUND",
          "Conversion job was not found.",
          404,
        );
      }

      return createApiSuccessResponse(context, serializeJob(job).data, {
        headers: createRateLimitHeaders(rateLimit),
      });
    },
  );
}
