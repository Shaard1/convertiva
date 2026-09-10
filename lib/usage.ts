import {
  CONVERSION_POLICIES,
  GUEST_DAILY_LIMIT,
  GUEST_USAGE_STORAGE_KEY,
} from "@/lib/constants";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { reconcileUsageCount } from "@/lib/usage-reconciliation";
import { AuthUser } from "@/types/auth";
import { UserUsage } from "@/types/usage";

type StoredGuestUsage = {
  date: string;
  conversionsUsed: number;
};

function isStoredGuestUsage(value: unknown): value is StoredGuestUsage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const usage = value as Partial<StoredGuestUsage>;

  return (
    typeof usage.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(usage.date) &&
    Number.isSafeInteger(usage.conversionsUsed) &&
    (usage.conversionsUsed ?? -1) >= 0
  );
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function buildUsage(
  conversionsUsed: number,
  limit: number,
  isGuest: boolean,
  date: string,
): UserUsage {
  return {
    conversionsUsed,
    limit,
    remaining: Math.max(limit - conversionsUsed, 0),
    label: isGuest ? "Guest" : "Logged in",
    isGuest,
    date,
  };
}

export function createGuestUsage(conversionsUsed = 0): UserUsage {
  return buildUsage(
    conversionsUsed,
    CONVERSION_POLICIES.guest.dailyLimit,
    true,
    getTodayDateString(),
  );
}

export function createAuthenticatedUsage(conversionsUsed = 0): UserUsage {
  return buildUsage(
    conversionsUsed,
    CONVERSION_POLICIES.authenticated.dailyLimit,
    false,
    getTodayDateString(),
  );
}

export function getGuestUsage(): UserUsage {
  const date = getTodayDateString();

  if (typeof window === "undefined") {
    return createGuestUsage();
  }

  const raw = window.localStorage.getItem(GUEST_USAGE_STORAGE_KEY);

  if (!raw) {
    const initialUsage: StoredGuestUsage = { date, conversionsUsed: 0 };
    window.localStorage.setItem(GUEST_USAGE_STORAGE_KEY, JSON.stringify(initialUsage));
    return buildUsage(0, GUEST_DAILY_LIMIT, true, date);
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isStoredGuestUsage(parsed) || parsed.date !== date) {
      const resetUsage: StoredGuestUsage = { date, conversionsUsed: 0 };
      window.localStorage.setItem(GUEST_USAGE_STORAGE_KEY, JSON.stringify(resetUsage));
      return buildUsage(0, GUEST_DAILY_LIMIT, true, date);
    }

    return buildUsage(parsed.conversionsUsed, GUEST_DAILY_LIMIT, true, date);
  } catch {
    const resetUsage: StoredGuestUsage = { date, conversionsUsed: 0 };
    window.localStorage.setItem(GUEST_USAGE_STORAGE_KEY, JSON.stringify(resetUsage));
    return buildUsage(0, GUEST_DAILY_LIMIT, true, date);
  }
}

export function incrementGuestUsage(successfulConversions: number): UserUsage {
  const currentUsage = getGuestUsage();
  const updatedUsage: StoredGuestUsage = {
    date: currentUsage.date,
    conversionsUsed: currentUsage.conversionsUsed + successfulConversions,
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(GUEST_USAGE_STORAGE_KEY, JSON.stringify(updatedUsage));
  }

  return buildUsage(
    updatedUsage.conversionsUsed,
    GUEST_DAILY_LIMIT,
    true,
    updatedUsage.date,
  );
}

function isGuestUsage(value: unknown): value is UserUsage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const usage = value as Partial<UserUsage>;

  return (
    usage.isGuest === true &&
    usage.label === "Guest" &&
    typeof usage.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(usage.date) &&
    Number.isSafeInteger(usage.conversionsUsed) &&
    (usage.conversionsUsed ?? -1) >= 0 &&
    usage.limit === GUEST_DAILY_LIMIT
  );
}

export async function getSyncedGuestUsage(): Promise<UserUsage> {
  const localUsage = getGuestUsage();

  try {
    const response = await fetch("/api/v1/usage", { cache: "no-store" });

    if (!response.ok) {
      console.warn(`Guest usage sync failed with status ${response.status}.`);
      return localUsage;
    }

    const payload = (await response.json()) as { data?: unknown };

    if (!isGuestUsage(payload.data) || payload.data.date !== localUsage.date) {
      console.warn("Guest usage sync returned an invalid response.");
      return localUsage;
    }

    const conversionsUsed = reconcileUsageCount({
      localConversionsUsed: localUsage.conversionsUsed,
      serverConversionsUsed: payload.data.conversionsUsed,
      limit: GUEST_DAILY_LIMIT,
    });
    const synchronizedUsage: StoredGuestUsage = {
      date: localUsage.date,
      conversionsUsed,
    };

    window.localStorage.setItem(
      GUEST_USAGE_STORAGE_KEY,
      JSON.stringify(synchronizedUsage),
    );

    return buildUsage(conversionsUsed, GUEST_DAILY_LIMIT, true, localUsage.date);
  } catch (error) {
    console.warn(
      "Guest usage sync is temporarily unavailable.",
      error instanceof Error ? error.message : "Unknown error",
    );
    return localUsage;
  }
}

export async function getAuthenticatedUsage(user: AuthUser): Promise<UserUsage> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return createAuthenticatedUsage();
  }

  const date = getTodayDateString();
  const { data, error } = await supabase
    .from("conversion_usage")
    .select("conversions_used")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return buildUsage(
    data?.conversions_used ?? 0,
    CONVERSION_POLICIES.authenticated.dailyLimit,
    false,
    date,
  );
}

export async function incrementAuthenticatedUsage(
  user: AuthUser,
  successfulConversions: number,
): Promise<UserUsage> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return createAuthenticatedUsage(successfulConversions);
  }

  const date = getTodayDateString();
  const currentUsage = await getAuthenticatedUsage(user);
  const updatedConversions = currentUsage.conversionsUsed + successfulConversions;

  const { error } = await supabase.from("conversion_usage").upsert(
    {
      user_id: user.id,
      date,
      conversions_used: updatedConversions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" },
  );

  if (error) {
    throw new Error(error.message);
  }

  return buildUsage(
    updatedConversions,
    CONVERSION_POLICIES.authenticated.dailyLimit,
    false,
    date,
  );
}
