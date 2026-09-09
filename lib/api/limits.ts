import { PublicApiError } from "@/lib/api/http";
import { MemoryApiLimits } from "@/lib/api/memory-limits";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { ConversionApiIdentity } from "@/types/conversion-platform";

export type ApiRateLimitState = {
  limit: number;
  remaining: number;
  resetAt: number;
};

export type ApiUsageReservation = {
  count: number;
  date: string;
  identity: ConversionApiIdentity;
};

type ApiRateLimitRow = {
  allowed?: unknown;
  limit_count?: unknown;
  remaining_count?: unknown;
  reset_at?: unknown;
};

type ApiUsageRow = {
  allowed?: unknown;
  limit_count?: unknown;
  remaining_count?: unknown;
  usage_date?: unknown;
};

const DEFAULT_API_RATE_LIMIT_PER_MINUTE = 60;
const DEFAULT_API_DAILY_CONVERSION_LIMIT = 1_000;
const RATE_LIMIT_WINDOW_MS = 60 * 1_000;
const memoryApiLimits = new MemoryApiLimits();

function readPositiveInteger(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

export function getDefaultApiRateLimit() {
  return readPositiveInteger(
    "CONVERSION_API_RATE_LIMIT_PER_MINUTE",
    DEFAULT_API_RATE_LIMIT_PER_MINUTE,
  );
}

export function getDefaultApiDailyConversionLimit() {
  return readPositiveInteger(
    "CONVERSION_API_DAILY_LIMIT",
    DEFAULT_API_DAILY_CONVERSION_LIMIT,
  );
}

function getIdentityKey(identity: ConversionApiIdentity) {
  return identity.apiKeyId ?? "development";
}

function getUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function getNextUtcDateStart() {
  const now = new Date();
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
}

function getRpcRow<T>(data: unknown) {
  if (!Array.isArray(data) || !data.length || typeof data[0] !== "object") {
    return null;
  }

  return data[0] as T;
}

function parseCount(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isSafeInteger(value)
    ? value
    : fallback;
}

function enforceMemoryRateLimit(identity: ConversionApiIdentity) {
  const now = Date.now();
  const identityKey = getIdentityKey(identity);
  const result = memoryApiLimits.consumeRateLimit({
    identityKey,
    limit: identity.rateLimitPerMinute,
    now,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });

  if (!result.allowed) {
    throw new PublicApiError(
      "RATE_LIMIT_EXCEEDED",
      "Too many API requests. Try again shortly.",
      429,
      Math.max(1, Math.ceil((result.resetAt - now) / 1_000)),
    );
  }

  return result;
}

export async function enforceApiRateLimit(
  identity: ConversionApiIdentity,
): Promise<ApiRateLimitState> {
  const supabase = getSupabaseAdminClient();

  if (!supabase || !identity.apiKeyId) {
    return enforceMemoryRateLimit(identity);
  }

  const { data, error } = await supabase.rpc(
    "check_conversion_api_rate_limit",
    { p_api_key_id: identity.apiKeyId },
  );

  if (error) {
    throw new PublicApiError(
      "RATE_LIMIT_SERVICE_UNAVAILABLE",
      "API rate limiting is temporarily unavailable.",
      503,
    );
  }

  const row = getRpcRow<ApiRateLimitRow>(data);

  if (!row) {
    throw new PublicApiError(
      "RATE_LIMIT_SERVICE_UNAVAILABLE",
      "API rate limiting returned an invalid response.",
      503,
    );
  }

  const limit = parseCount(row.limit_count, identity.rateLimitPerMinute);
  const remaining = parseCount(row.remaining_count, 0);
  const resetAt =
    typeof row.reset_at === "string"
      ? new Date(row.reset_at).getTime()
      : Date.now() + RATE_LIMIT_WINDOW_MS;

  if (row.allowed !== true) {
    throw new PublicApiError(
      "RATE_LIMIT_EXCEEDED",
      "Too many API requests. Try again shortly.",
      429,
      Math.max(1, Math.ceil((resetAt - Date.now()) / 1_000)),
    );
  }

  return { limit, remaining, resetAt };
}

function reserveMemoryUsage(identity: ConversionApiIdentity, count: number) {
  const date = getUtcDate();
  const identityKey = getIdentityKey(identity);
  const result = memoryApiLimits.reserveDailyUsage({
    count,
    date,
    identityKey,
    limit: identity.dailyConversionLimit,
  });

  if (!result.allowed) {
    throw new PublicApiError(
      "DAILY_CONVERSION_LIMIT_EXCEEDED",
      "The API key has reached its daily conversion limit.",
      429,
      Math.max(1, Math.ceil((getNextUtcDateStart() - Date.now()) / 1_000)),
    );
  }

  return { count, date, identity };
}

export async function reserveApiConversionUsage(
  identity: ConversionApiIdentity,
  count: number,
): Promise<ApiUsageReservation> {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error("API usage reservation count must be a positive integer.");
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase || !identity.apiKeyId) {
    return reserveMemoryUsage(identity, count);
  }

  const { data, error } = await supabase.rpc(
    "reserve_conversion_api_daily_usage",
    {
      p_api_key_id: identity.apiKeyId,
      p_requested_conversions: count,
    },
  );

  if (error) {
    throw new PublicApiError(
      "USAGE_SERVICE_UNAVAILABLE",
      "API usage accounting is temporarily unavailable.",
      503,
    );
  }

  const row = getRpcRow<ApiUsageRow>(data);

  if (!row) {
    throw new PublicApiError(
      "USAGE_SERVICE_UNAVAILABLE",
      "API usage accounting returned an invalid response.",
      503,
    );
  }

  if (row.allowed !== true) {
    throw new PublicApiError(
      "DAILY_CONVERSION_LIMIT_EXCEEDED",
      "The API key has reached its daily conversion limit.",
      429,
      Math.max(1, Math.ceil((getNextUtcDateStart() - Date.now()) / 1_000)),
    );
  }

  return {
    count,
    date: typeof row.usage_date === "string" ? row.usage_date : getUtcDate(),
    identity,
  };
}

export async function releaseApiConversionUsage(
  reservation: ApiUsageReservation,
) {
  const { count, date, identity } = reservation;
  const supabase = getSupabaseAdminClient();

  if (!supabase || !identity.apiKeyId) {
    const identityKey = getIdentityKey(identity);
    memoryApiLimits.releaseDailyUsage({ count, date, identityKey });

    return;
  }

  const { error } = await supabase.rpc(
    "release_conversion_api_daily_usage",
    {
      p_api_key_id: identity.apiKeyId,
      p_usage_date: date,
      p_conversion_count: count,
    },
  );

  if (error) {
    throw new PublicApiError(
      "USAGE_SERVICE_UNAVAILABLE",
      "API usage accounting could not be rolled back.",
      503,
    );
  }
}

export function createRateLimitHeaders(state: ApiRateLimitState) {
  return {
    "X-RateLimit-Limit": String(state.limit),
    "X-RateLimit-Remaining": String(state.remaining),
    "X-RateLimit-Reset": String(Math.ceil(state.resetAt / 1_000)),
  };
}
