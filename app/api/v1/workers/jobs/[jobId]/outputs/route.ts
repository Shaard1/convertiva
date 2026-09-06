import { NextResponse } from "next/server";
import {
  completeWorkerConversionJob,
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
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);
    const job = await completeWorkerConversionJob(jobId, files);

    return NextResponse.json(serializeJob(job));
  } catch (error) {
    const { message, statusCode } = getConversionJobError(error);

    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
