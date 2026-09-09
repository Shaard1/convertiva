import { createConversionApiKey } from "@/lib/api-keys";
import {
  assertRequestSize,
  createApiSuccessResponse,
  handleApiRequest,
} from "@/lib/api/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleApiRequest(
    request,
    "create_api_key",
    "The API key could not be created.",
    async (context) => {
      assertRequestSize(request, 16 * 1024);
      const apiKey = await createConversionApiKey(request);
      return createApiSuccessResponse(context, apiKey, { status: 201 });
    },
  );
}
