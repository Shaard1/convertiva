import {
  createApiSuccessResponse,
  handleApiRequest,
} from "@/lib/api/http";
import { cleanupExpiredConversionJobs } from "@/lib/conversion-jobs";
import { assertAuthorizedCronRequest } from "@/lib/cron-auth";
import { assertAuthorizedWorkerRequest } from "@/lib/worker-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const SCHEDULED_CLEANUP_MAX_BATCHES = 10;

async function cleanupExpiredJobBacklog() {
  let batchesProcessed = 0;
  let deletedJobs = 0;
  let deletedObjects = 0;
  let hasMore = false;

  while (batchesProcessed < SCHEDULED_CLEANUP_MAX_BATCHES) {
    const result = await cleanupExpiredConversionJobs();

    batchesProcessed += 1;
    deletedJobs += result.deletedJobs;
    deletedObjects += result.deletedObjects;
    hasMore = result.hasMore;

    if (!hasMore) {
      break;
    }
  }

  return {
    batchesProcessed,
    deletedJobs,
    deletedObjects,
    hasMore,
  };
}

export async function POST(request: Request) {
  return handleApiRequest(
    request,
    "cleanup_expired_conversion_jobs",
    "Expired conversion jobs could not be cleaned up.",
    async (context) => {
      assertAuthorizedWorkerRequest(request);
      const result = await cleanupExpiredConversionJobs();

      return createApiSuccessResponse(context, result);
    },
  );
}

export async function GET(request: Request) {
  return handleApiRequest(
    request,
    "scheduled_cleanup_expired_conversion_jobs",
    "Expired conversion jobs could not be cleaned up.",
    async (context) => {
      assertAuthorizedCronRequest(request);
      const result = await cleanupExpiredJobBacklog();

      return createApiSuccessResponse(context, result);
    },
  );
}
