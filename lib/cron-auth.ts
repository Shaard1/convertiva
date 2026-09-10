import { PublicApiError } from "@/lib/api/http";
import { getBearerSecret, secretsMatch } from "@/lib/worker-auth";

export function assertAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    throw new PublicApiError(
      "CRON_AUTH_NOT_CONFIGURED",
      "Cron authentication is not configured.",
      503,
    );
  }

  if (!secretsMatch(getBearerSecret(request), cronSecret)) {
    throw new PublicApiError(
      "CRON_UNAUTHORIZED",
      "Cron authorization failed.",
      401,
    );
  }
}
