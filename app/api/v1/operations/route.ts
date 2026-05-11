import { NextResponse } from "next/server";
import { SUPPORTED_OUTPUT_FORMATS } from "@/lib/constants";
import { listConversionEngines } from "@/lib/conversion-engines";

export async function GET() {
  return NextResponse.json({
    data: {
      operations: ["convert"],
      outputFormats: SUPPORTED_OUTPUT_FORMATS,
      engines: listConversionEngines(),
    },
  });
}
