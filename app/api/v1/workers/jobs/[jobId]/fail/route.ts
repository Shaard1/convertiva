import { NextResponse } from "next/server";
import {
  failWorkerConversionJob,
  getConversionJobError,
  serializeJob,
} from "@/lib/conversion-jobs";
import {
  createWorkerAuthErrorResponse,
  isAuthorizedWorkerRequest,
} from "@/lib/worker-auth";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  if (!isAuthorizedWorkerRequest(request)) {
    return createWorkerAuthErrorResponse();
  }

  try {
    const { jobId } = await context.params;
    const payload = (await request.json().catch(() => ({}))) as {
      error?: unknown;
    };
    const message =
      typeof payload.error === "string" ? payload.error : "Conversion failed.";
    const job = await failWorkerConversionJob(jobId, message);

    return NextResponse.json(serializeJob(job));
  } catch (error) {
    const { message, statusCode } = getConversionJobError(error);

    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
