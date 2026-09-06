import { NextResponse } from "next/server";
import { SUPPORTED_OUTPUT_FORMATS } from "@/lib/constants";
import { listConversionEngines } from "@/lib/conversion-engines";
import { audioFormats } from "@/lib/formats/audioFormats";
import { documentFormats } from "@/lib/formats/documentFormats";
import { videoFormats } from "@/lib/formats/videoFormats";

export async function GET() {
  return NextResponse.json({
    data: {
      operations: ["convert"],
      outputFormats: {
        image: SUPPORTED_OUTPUT_FORMATS,
        video: videoFormats.map((format) => format.toLowerCase()),
        audio: audioFormats.map((format) => format.toLowerCase()),
        document: documentFormats.map((format) => format.toLowerCase()),
        archive: ["zip", "7z", "tar"],
      },
      engines: listConversionEngines(),
    },
  });
}
