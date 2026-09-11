import {
  createApiSuccessResponse,
  handleApiRequest,
} from "@/lib/api/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiRequest(
    request,
    "health_check",
    "The health check failed.",
    async (context) =>
      createApiSuccessResponse(context, {
        status: "ok",
        service: "convertiva-api",
        version: "v1",
      }),
    { enforceRateLimit: false },
  );
}
