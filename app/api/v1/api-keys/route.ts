import { NextResponse } from "next/server";
import {
  createConversionApiKey,
  getApiAuthError,
} from "@/lib/api-keys";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const apiKey = await createConversionApiKey(request);

    return NextResponse.json(
      {
        data: apiKey,
      },
      { status: 201 },
    );
  } catch (error) {
    const { message, statusCode } = getApiAuthError(error);

    return NextResponse.json(
      {
        error: message,
      },
      { status: statusCode },
    );
  }
}
