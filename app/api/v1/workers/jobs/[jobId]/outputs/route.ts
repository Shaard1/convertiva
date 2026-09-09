import {
  assertRequestSize,
  createApiSuccessResponse,
  handleApiRequest,
  PublicApiError,
  readApiFormData,
} from "@/lib/api/http";
import {
  completeWorkerConversionJob,
  MAX_WORKER_OUTPUT_BYTES,
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
    "complete_worker_job",
    "The worker output could not be stored.",
    async (context) => {
      assertAuthorizedWorkerRequest(request);
      assertRequestSize(request, MAX_WORKER_OUTPUT_BYTES + 1024 * 1024);
      const { jobId } = await routeContext.params;
      const formData = await readApiFormData(request);
      const entries = formData.getAll("files");
      const files = entries.filter(
        (entry): entry is File => entry instanceof File,
      );

      if (entries.length !== files.length) {
        throw new PublicApiError(
          "INVALID_WORKER_OUTPUT",
          "One or more worker outputs are invalid.",
          400,
        );
      }

      const job = await completeWorkerConversionJob(jobId, files);

      return createApiSuccessResponse(context, serializeJob(job).data);
    },
  );
}
