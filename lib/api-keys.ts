import { createHash, randomBytes } from "node:crypto";
import {
  getDefaultApiDailyConversionLimit,
  getDefaultApiRateLimit,
} from "@/lib/api/limits";
import { PublicApiError, readApiJson } from "@/lib/api/http";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase-server";
import { ConversionApiIdentity } from "@/types/conversion-platform";

const API_KEY_PREFIX = "cvt_live_";
const KEY_PREVIEW_LENGTH = 14;
const MAX_ACTIVE_API_KEYS = 10;
const API_KEY_NAME_PATTERN = /^[^\u0000-\u001f\u007f]{1,80}$/;

type ApiKeyRow = {
  id: string;
  user_id: string | null;
  key_hash: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  daily_conversion_limit: number;
  rate_limit_per_minute: number;
};

export class ApiAuthError extends PublicApiError {
  constructor(
    message: string,
    statusCode = 401,
    code = statusCode === 503 ? "AUTH_SERVICE_UNAVAILABLE" : "INVALID_API_KEY",
  ) {
    super(code, message, statusCode);
  }
}

function hashApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex");
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

function shouldRequireApiKeys() {
  if (process.env.NODE_ENV === "production") {
    return true;
  }

  if (process.env.CONVERSION_API_KEYS_REQUIRED === "true") {
    return true;
  }

  if (process.env.CONVERSION_API_KEYS_REQUIRED === "false") {
    return false;
  }

  return false;
}

function createDevelopmentIdentity(): ConversionApiIdentity {
  return {
    type: "development",
    userId: null,
    apiKeyId: null,
    dailyConversionLimit: getDefaultApiDailyConversionLimit(),
    rateLimitPerMinute: getDefaultApiRateLimit(),
  };
}

export function generateRawApiKey() {
  return `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export async function authenticateConversionApiRequest(
  request: Request,
): Promise<ConversionApiIdentity> {
  const token = getBearerToken(request);

  if (!token) {
    if (!shouldRequireApiKeys()) {
      return createDevelopmentIdentity();
    }

    throw new ApiAuthError("Missing API key.");
  }

  if (!token.startsWith(API_KEY_PREFIX)) {
    throw new ApiAuthError("Invalid API key.");
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    if (!shouldRequireApiKeys()) {
      return createDevelopmentIdentity();
    }

    throw new ApiAuthError("API key verification is not configured.", 503);
  }

  const keyHash = hashApiKey(token);
  const { data, error } = await supabase
    .from("conversion_api_keys")
    .select("id,user_id,key_hash,key_prefix,name,is_active,expires_at,last_used_at,daily_conversion_limit,rate_limit_per_minute")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error) {
    throw new ApiAuthError(
      "API key verification is temporarily unavailable.",
      503,
    );
  }

  if (!data) {
    throw new ApiAuthError("Invalid API key.");
  }

  const apiKey = data as ApiKeyRow;

  if (!apiKey.is_active) {
    throw new ApiAuthError("API key is inactive.");
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at).getTime() <= Date.now()) {
    throw new ApiAuthError("API key has expired.");
  }

  const lastUsedAt = apiKey.last_used_at
    ? new Date(apiKey.last_used_at).getTime()
    : 0;

  if (!Number.isFinite(lastUsedAt) || Date.now() - lastUsedAt > 5 * 60 * 1000) {
    const { error: updateError } = await supabase
      .from("conversion_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", apiKey.id);

    if (updateError) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "error",
          service: "convertiva-api",
          event: "api_key_last_used_update_failed",
          api_key_id: apiKey.id,
        }),
      );
    }
  }

  return {
    type: "api_key",
    userId: apiKey.user_id,
    apiKeyId: apiKey.id,
    dailyConversionLimit: apiKey.daily_conversion_limit,
    rateLimitPerMinute: apiKey.rate_limit_per_minute,
  };
}

export async function authenticateSupabaseUser(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    throw new ApiAuthError("Missing Supabase access token.");
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new ApiAuthError("API key management is not configured.", 503);
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new ApiAuthError("Invalid Supabase access token.");
  }

  return user;
}

export async function createConversionApiKey(request: Request) {
  const user = await authenticateSupabaseUser(request);
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new ApiAuthError("API key management is not configured.", 503);
  }

  const payload = await readApiJson(request);

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new PublicApiError(
      "INVALID_API_KEY_REQUEST",
      "The API key request body must be a JSON object.",
      400,
    );
  }

  const body = payload as { name?: unknown };
  const name = typeof body.name === "string" && body.name.trim()
    ? body.name.trim()
    : "Default API key";

  if (!API_KEY_NAME_PATTERN.test(name)) {
    throw new PublicApiError(
      "INVALID_API_KEY_NAME",
      "API key names must be 1 to 80 printable characters.",
      400,
    );
  }

  const { count, error: countError } = await supabase
    .from("conversion_api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (countError) {
    throw new PublicApiError("API_KEY_SERVICE_UNAVAILABLE", "API key creation is temporarily unavailable.", 503);
  }

  if ((count ?? 0) >= MAX_ACTIVE_API_KEYS) {
    throw new PublicApiError("API_KEY_LIMIT_REACHED", "Revoke an existing API key before creating another.", 409);
  }
  const rawKey = generateRawApiKey();
  const keyPrefix = rawKey.slice(0, KEY_PREVIEW_LENGTH);

  const { data, error } = await supabase
    .from("conversion_api_keys")
    .insert({
      user_id: user.id,
      name,
      key_hash: hashApiKey(rawKey),
      key_prefix: keyPrefix,
      daily_conversion_limit: getDefaultApiDailyConversionLimit(),
      rate_limit_per_minute: getDefaultApiRateLimit(),
    })
    .select("id,name,key_prefix,created_at")
    .single();

  if (error) {
    throw new PublicApiError(
      "API_KEY_SERVICE_UNAVAILABLE",
      "API key creation is temporarily unavailable.",
      503,
    );
  }

  if (!data) {
    throw new PublicApiError(
      "API_KEY_CREATION_FAILED",
      "Could not create API key.",
      500,
    );
  }

  return {
    id: data.id as string,
    name: data.name as string,
    keyPrefix: data.key_prefix as string,
    apiKey: rawKey,
    createdAt: data.created_at as string,
  };
}

export function getApiAuthError(error: unknown) {
  if (error instanceof ApiAuthError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  return {
    message: "API authentication failed.",
    statusCode: 500,
  };
}

export function isApiKeyInfrastructureConfigured() {
  return isSupabaseAdminConfigured();
}
