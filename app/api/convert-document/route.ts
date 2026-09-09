import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;

  return NextResponse.json(
    {
      error:
        "Document conversion is unavailable until the LibreOffice worker is installed.",
    },
    { status: 501 },
  );
}
