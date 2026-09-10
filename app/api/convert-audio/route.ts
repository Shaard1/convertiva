import {
  buildToolErrorResponse,
  handleToolRequest,
} from "@/lib/tools/routeUtils";

export async function POST(request: Request) {
  return handleToolRequest(
    request,
    "convert_audio",
    "Audio conversion is temporarily unavailable.",
    async () =>
      buildToolErrorResponse(
        "Audio conversion requires the queued media worker. Use POST /api/v1/jobs.",
        501,
      ),
  );
}
