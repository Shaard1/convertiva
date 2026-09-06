import { NextResponse } from "next/server";
import {
  claimNextWorkerConversionJob,
  getConversionJobError,
} from "@/lib/conversion-jobs";
import {
  createWorkerAuthErrorResponse,
  isAuthorizedWorkerRequest,
} from "@/lib/worker-auth";
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
  if (!isAuthorizedWorkerRequest(request)) {
    return createWorkerAuthErrorResponse();
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as {
      tools?: unknown;
    };
    const job = await claimNextWorkerConversionJob(getRequestedTools(payload.tools));

    return NextResponse.json({
      data: {
        claimed: Boolean(job),
        job: job?.data ?? null,
      },
    });
  } catch (error) {
    const { message, statusCode } = getConversionJobError(error);

    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
