import {
  createApiSuccessResponse,
  handleApiRequest,
} from "@/lib/api/http";
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApiRequest(
    request,
    "readiness_check",
    "The readiness check failed.",
    async (context) => {
      const queuedMode = process.env.CONVERSION_PROCESSING_MODE === "queued";
      const databaseConfigured = isSupabaseAdminConfigured();
      const checks = {
        database: !queuedMode || databaseConfigured,
        workerAuthentication:
          !queuedMode ||
          process.env.NODE_ENV !== "production" ||
          Boolean(process.env.CONVERSION_WORKER_SECRET),
      };

      if (databaseConfigured) {
        const supabase = getSupabaseAdminClient();
        const { error } = supabase
          ? await supabase
              .from("conversion_platform_jobs")
              .select("id", { count: "exact", head: true })
              .limit(1)
          : { error: new Error("Database client is unavailable.") };

        checks.database = !error;
      }

      const isReady = Object.values(checks).every(Boolean);

      return createApiSuccessResponse(
        context,
        {
          status: isReady ? "ready" : "not_ready",
          checks,
        },
        { status: isReady ? 200 : 503 },
      );
    },
  );
}
