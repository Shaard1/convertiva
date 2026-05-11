import { NextResponse } from "next/server";
import { getConversionJob, serializeJob } from "@/lib/conversion-jobs";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const job = await getConversionJob(jobId);

  if (!job) {
    return NextResponse.json(
      {
        error: "Conversion job was not found.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(serializeJob(job));
}
