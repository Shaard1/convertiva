import {
  buildToolErrorResponse,
  handleToolRequest,
} from "@/lib/tools/routeUtils";

export async function POST(request: Request) {
  return handleToolRequest(
    request,
    "convert_document",
    "Document conversion is temporarily unavailable.",
    async () =>
      buildToolErrorResponse(
        "Document conversion is unavailable until the LibreOffice worker is installed.",
        501,
      ),
  );
}
