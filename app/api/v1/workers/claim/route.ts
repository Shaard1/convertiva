import {
  assertRequestSize,
  createApiSuccessResponse,
  handleApiRequest,
  PublicApiError,
  readApiJson,
} from "@/lib/api/http";
import {
  claimNextWorkerConversionJob,
} from "@/lib/conversion-jobs";
import { assertAuthorizedWorkerRequest } from "@/lib/worker-auth";
import { ConversionToolName } from "@/types/conversion-platform";

export const runtime = "nodejs";

const claimableTools = ["image", "video", "audio", "document", "archive"] satisfies ConversionToolName[];

function getRequestedTools(value: unknown): ConversionToolName[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is ConversionToolName =>
    claimableTools.includes(item as ConversionToolName),
  );
}

export async function POST(request: Request) {
  return handleApiRequest(
    request,
    "claim_worker_job",
    "A worker job could not be claimed.",
    async (context) => {
      assertAuthorizedWorkerRequest(request);
      assertRequestSize(request, 16 * 1024);
      const body = await readApiJson(request);

      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new PublicApiError(
          "INVALID_WORKER_CLAIM",
          "The worker claim body must be a JSON object.",
          400,
        );
      }

      const payload = body as { tools?: unknown };
      const job = await claimNextWorkerConversionJob(
        getRequestedTools(payload.tools),
      );

      return createApiSuccessResponse(context, {
        claimed: Boolean(job),
        job: job?.data ?? null,
      });
    },
  );
}
