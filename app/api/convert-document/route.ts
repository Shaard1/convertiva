import { NextResponse } from "next/server";
import { documentFormats } from "@/lib/formats/documentFormats";

const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const outputFormat = formData.get("outputFormat");
  const file = formData.get("file");

  if (!outputFormat || typeof outputFormat !== "string") {
    return NextResponse.json({ error: "Choose an output document format." }, { status: 400 });
  }

  if (!documentFormats.includes(outputFormat.toUpperCase() as (typeof documentFormats)[number])) {
    return NextResponse.json({ error: "Unsupported document output format." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload one document to start." }, { status: 400 });
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: "File too large. Try a document under 50 MB." }, { status: 413 });
  }

  return NextResponse.json(
    {
      error:
        "Document conversion is ready in the interface, but the server document engine is not connected yet.",
    },
    { status: 501 },
  );
}
