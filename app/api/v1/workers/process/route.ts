import {
  createApiSuccessResponse,
  handleApiRequest,
} from "@/lib/api/http";
import {
  processNextQueuedConversionJob,
  serializeJob,
} from "@/lib/conversion-jobs";
import { assertAuthorizedWorkerRequest } from "@/lib/worker-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleApiRequest(
    request,
    "process_inline_worker_job",
    "The queued conversion job could not be processed.",
    async (context) => {
      assertAuthorizedWorkerRequest(request);
      const job = await processNextQueuedConversionJob();

      if (!job) {
        return createApiSuccessResponse(context, {
          processed: false,
          job: null,
        });
      }

      return createApiSuccessResponse(context, {
        processed: true,
        job: serializeJob(job).data,
      });
    },
  );
}
