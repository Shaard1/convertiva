import {
  createApiSuccessResponse,
  handleApiRequest,
  PublicApiError,
} from "@/lib/api/http";
import { CONVERSION_POLICIES } from "@/lib/constants";
import {
  getGuestUsageCount,
  getGuestUsageKey,
  getUsageDate,
} from "@/lib/guest-usage-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleApiRequest(
    request,
    "get_guest_conversion_usage",
    "Guest usage could not be loaded.",
    async (context) => {
      const date = getUsageDate();
      let conversionsUsed: number;

      try {
        conversionsUsed = await getGuestUsageCount(
          getGuestUsageKey(request),
          date,
        );
      } catch {
        throw new PublicApiError(
          "GUEST_USAGE_UNAVAILABLE",
          "Guest usage is temporarily unavailable.",
          503,
        );
      }

      const limit = CONVERSION_POLICIES.guest.dailyLimit;

      return createApiSuccessResponse(context, {
        conversionsUsed,
        limit,
        remaining: Math.max(limit - conversionsUsed, 0),
        label: "Guest",
        isGuest: true,
        date,
      });
    },
  );
}
