import { NextResponse } from "next/server";
import {
  getConversionJobError,
  processNextQueuedConversionJob,
  serializeJob,
} from "@/lib/conversion-jobs";
import {
  createWorkerAuthErrorResponse,
  isAuthorizedWorkerRequest,
} from "@/lib/worker-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAuthorizedWorkerRequest(request)) {
    return createWorkerAuthErrorResponse();
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
