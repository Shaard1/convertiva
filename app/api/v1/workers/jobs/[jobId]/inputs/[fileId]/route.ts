import { NextResponse } from "next/server";
import {
  getConversionJobError,
  getWorkerJobInputFile,
} from "@/lib/conversion-jobs";
import {
  createWorkerAuthErrorResponse,
  isAuthorizedWorkerRequest,
} from "@/lib/worker-auth";

type RouteContext = {
  params: Promise<{
    jobId: string;
    fileId: string;
  }>;
};

export const runtime = "nodejs";

function createInputHeaders(file: File) {
  return {
    "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
    "Content-Type": file.type || "application/octet-stream",
    "X-Input-File-Name": encodeURIComponent(file.name),
  };
}

export async function GET(request: Request, context: RouteContext) {
  if (!isAuthorizedWorkerRequest(request)) {
    return createWorkerAuthErrorResponse();
  }

  try {
    const { jobId, fileId } = await context.params;
    const file = await getWorkerJobInputFile(jobId, fileId);

    return new NextResponse(new Uint8Array(await file.arrayBuffer()), {
      headers: createInputHeaders(file),
    });
  } catch (error) {
    const { message, statusCode } = getConversionJobError(error);

    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
