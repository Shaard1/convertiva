import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;

  return NextResponse.json(
    {
      error:
        "Audio conversion requires the queued media worker. Use POST /api/v1/jobs.",
    },
    { status: 501 },
  );
}
