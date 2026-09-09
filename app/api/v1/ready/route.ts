import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
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

  const ready = Object.values(checks).every(Boolean);

  return NextResponse.json(
    {
      data: {
        status: ready ? "ready" : "not_ready",
        checks,
      },
    },
    {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
