import { NextResponse } from "next/server";
import {
  authenticateConversionApiRequest,
  getApiAuthError,
} from "@/lib/api-keys";
import {
  getConversionJob,
  getConversionJobError,
  serializeJob,
} from "@/lib/conversion-jobs";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext) {
  try {
    const identity = await authenticateConversionApiRequest(_request);
    const { jobId } = await context.params;
    const job = await getConversionJob(jobId, identity);

    if (!job) {
      return NextResponse.json(
        {
          error: "Conversion job was not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(serializeJob(job));
  } catch (error) {
    const authError = getApiAuthError(error);
    const conversionError = getConversionJobError(error);
    const response =
      authError.statusCode !== 500 || authError.message !== "API authentication failed."
        ? authError
        : conversionError;

    return NextResponse.json(
      {
        error: response.message,
      },
      { status: response.statusCode },
    );
  }
}
