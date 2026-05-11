import { NextResponse } from "next/server";
import {
  authenticateConversionApiRequest,
  getApiAuthError,
} from "@/lib/api-keys";
import {
  createConversionJob,
  getConversionJobError,
  serializeJob,
} from "@/lib/conversion-jobs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const identity = await authenticateConversionApiRequest(request);
    const formData = await request.formData();
    const job = await createConversionJob(formData, identity);

    return NextResponse.json(serializeJob(job), {
      status: job.status === "queued" ? 202 : job.status === "failed" ? 422 : 201,
    });
  } catch (error) {
    const authError = getApiAuthError(error);

    if (authError.statusCode !== 500 || authError.message !== "API authentication failed.") {
      return NextResponse.json(
        {
          error: authError.message,
        },
        { status: authError.statusCode },
      );
    }

    const { message, statusCode } = getConversionJobError(error);

    return NextResponse.json(
      {
        error: message,
      },
      { status: statusCode },
    );
  }
}
