import {
  assertRequestSize,
  createApiSuccessResponse,
  handleApiRequest,
  PublicApiError,
  readApiJson,
} from "@/lib/api/http";
import {
  failWorkerConversionJob,
  serializeJob,
} from "@/lib/conversion-jobs";
import { assertAuthorizedWorkerRequest } from "@/lib/worker-auth";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export const runtime = "nodejs";

export async function POST(request: Request, routeContext: RouteContext) {
  return handleApiRequest(
    request,
    "fail_worker_job",
    "The worker failure could not be recorded.",
    async (context) => {
      assertAuthorizedWorkerRequest(request);
      assertRequestSize(request, 16 * 1024);
      const { jobId } = await routeContext.params;
      const body = await readApiJson(request);

      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new PublicApiError(
          "INVALID_WORKER_FAILURE",
          "The worker failure body must be a JSON object.",
          400,
        );
      }

      const payload = body as { error?: unknown };
      const message =
        typeof payload.error === "string"
          ? payload.error
          : "Conversion failed.";
      const job = await failWorkerConversionJob(jobId, message);

      return createApiSuccessResponse(context, serializeJob(job).data);
    },
  );
}
