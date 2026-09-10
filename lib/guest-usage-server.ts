import { createHash, createHmac } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

type DailyUsageRecord = {
  date: string;
  conversionsUsed: number;
};

type GuestUsageRow = {
  conversions_used: number;
};

const guestUsageStore = new Map<string, DailyUsageRecord>();

export function getUsageDate() {
  return new Date().toISOString().slice(0, 10);
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

export function getGuestUsageKey(request: Request) {
  const clientIp = getClientIp(request);
  const hashSecret =
    process.env.GUEST_USAGE_HASH_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const digest = hashSecret
    ? createHmac("sha256", hashSecret).update(clientIp).digest("hex")
    : createHash("sha256").update(clientIp).digest("hex");

  return `guest:${digest}`;
}

export function getMemoryGuestUsage(key: string, date: string) {
  const record = guestUsageStore.get(key);

  if (!record || record.date !== date) {
    guestUsageStore.set(key, { date, conversionsUsed: 0 });
    return 0;
  }

  return record.conversionsUsed;
}

export function cacheGuestUsage(
  key: string,
  date: string,
  conversionsUsed: number,
) {
  guestUsageStore.set(key, { date, conversionsUsed });
}

export async function getGuestUsageCount(key: string, date: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return getMemoryGuestUsage(key, date);
  }

  const { data, error } = await supabase
    .from("guest_conversion_usage")
    .select("conversions_used")
    .eq("guest_key", key)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const conversionsUsed = (data as GuestUsageRow | null)?.conversions_used ?? 0;
  cacheGuestUsage(key, date, conversionsUsed);
  return conversionsUsed;
}
