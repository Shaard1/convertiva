import { NextResponse } from "next/server";
import { videoFormats } from "@/lib/formats/videoFormats";

const MAX_GUEST_VIDEO_BYTES = 250 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const outputFormat = formData.get("outputFormat");
  const file = formData.get("file");

  if (!outputFormat || typeof outputFormat !== "string") {
    return NextResponse.json({ error: "Choose an output video format." }, { status: 400 });
  }

  if (!videoFormats.includes(outputFormat.toUpperCase() as (typeof videoFormats)[number])) {
    return NextResponse.json({ error: "Unsupported video output format." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload one video to start." }, { status: 400 });
  }

  if (!file.type.startsWith("video/") && !file.name.match(/\.(3g2|3gp|3gpp|avi|cavs|dv|dvr|flv|m2ts|m4v|mkv|mod|mov|mp4|mpeg|mpg|mts|mxf|ogg|ogv|rm|rmvb|swf|ts|vob|webm|wmv|wtv)$/i)) {
    return NextResponse.json({ error: "Unsupported video file." }, { status: 400 });
  }

  if (file.size > MAX_GUEST_VIDEO_BYTES) {
    return NextResponse.json({ error: "File too large. Try a video under 250 MB." }, { status: 413 });
  }

  return NextResponse.json(
    {
      error:
        "Video conversion is ready in the interface, but the server video engine is not connected yet.",
    },
    { status: 501 },
  );
}
