import {
  authenticateConversionApiRequest,
} from "@/lib/api-keys";
import {
  assertRequestSize,
  createApiSuccessResponse,
  handleApiRequest,
  readApiFormData,
} from "@/lib/api/http";
import { parseIdempotencyKey } from "@/lib/api/idempotency";
import {
  createRateLimitHeaders,
  enforceApiRateLimit,
} from "@/lib/api/limits";
import {
  createConversionJob,
  serializeJob,
} from "@/lib/conversion-jobs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleApiRequest(
    request,
    "create_conversion_job",
    "The conversion job could not be created.",
    async (context) => {
      assertRequestSize(request, 251 * 1024 * 1024);
    const identity = await authenticateConversionApiRequest(request);
      const rateLimit = await enforceApiRateLimit(identity);
      const idempotencyKey = parseIdempotencyKey(request);
      const formData = await readApiFormData(request);
      const { job, replayed } = await createConversionJob(formData, identity, {
        idempotencyKey,
      });
      const status =
        job.status === "uploading" || job.status === "queued"
          ? 202
          : job.status === "failed"
            ? 422
            : 201;

      return createApiSuccessResponse(context, serializeJob(job).data, {
        status,
        headers: {
          ...createRateLimitHeaders(rateLimit),
          "Idempotency-Replayed": String(replayed),
        },
      });
    },
  );
}
