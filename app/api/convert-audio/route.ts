import { NextResponse } from "next/server";
import { audioFormats } from "@/lib/formats/audioFormats";

const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
const supportedAudioPattern = /\.(aac|ac3|aif|aifc|aiff|amr|au|caf|dss|flac|m4a|m4b|mp3|oga|opus|sf2|sfark|voc|wav|weba|wma)$/i;

export async function POST(request: Request) {
  const formData = await request.formData();
  const outputFormat = formData.get("outputFormat");
  const file = formData.get("file");

  if (!outputFormat || typeof outputFormat !== "string") {
    return NextResponse.json({ error: "Choose an output audio format." }, { status: 400 });
  }

  if (!audioFormats.includes(outputFormat.toUpperCase() as (typeof audioFormats)[number])) {
    return NextResponse.json({ error: "Unsupported audio output format." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload one audio file to start." }, { status: 400 });
  }

  if (!file.type.startsWith("audio/") && !supportedAudioPattern.test(file.name)) {
    return NextResponse.json({ error: "Unsupported audio file." }, { status: 400 });
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "File too large. Try an audio file under 100 MB." }, { status: 413 });
  }

  return NextResponse.json(
    {
      error:
        "Audio conversion is ready in the interface, but the server audio engine is not connected yet.",
    },
    { status: 501 },
  );
}
