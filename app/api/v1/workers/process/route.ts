import { NextResponse } from "next/server";
import {
  getConversionJobError,
  processNextQueuedConversionJob,
  serializeJob,
} from "@/lib/conversion-jobs";

export const runtime = "nodejs";

function isAuthorizedWorkerRequest(request: Request) {
  const workerSecret = process.env.CONVERSION_WORKER_SECRET;

  if (!workerSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-worker-secret");

  return (
    authorization === `Bearer ${workerSecret}` ||
    headerSecret === workerSecret
  );
}

export async function POST(request: Request) {
  if (!isAuthorizedWorkerRequest(request)) {
    return NextResponse.json(
      {
        error: "Worker authorization failed.",
      },
      { status: 401 },
    );
  }

  try {
    const job = await processNextQueuedConversionJob();

    if (!job) {
      return NextResponse.json({
        data: {
          processed: false,
          job: null,
        },
      });
    }

    return NextResponse.json({
      data: {
        processed: true,
        job: serializeJob(job).data,
      },
    });
  } catch (error) {
    const { message, statusCode } = getConversionJobError(error);

    return NextResponse.json(
      {
        error: message,
      },
      { status: statusCode },
    );
  }
}
