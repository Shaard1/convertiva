import { NextResponse } from "next/server";
import {
  createConversionJob,
  getConversionJobError,
  serializeJob,
} from "@/lib/conversion-jobs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const job = await createConversionJob(formData);

    return NextResponse.json(serializeJob(job), {
      status: job.status === "queued" ? 202 : job.status === "failed" ? 422 : 201,
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
