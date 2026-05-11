import { createHash, randomBytes } from "node:crypto";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase-server";
import { ConversionApiIdentity } from "@/types/conversion-platform";

const API_KEY_PREFIX = "cvt_live_";
const KEY_PREVIEW_LENGTH = 14;

type ApiKeyRow = {
  id: string;
  user_id: string | null;
  key_hash: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  expires_at: string | null;
};

export class ApiAuthError extends Error {
  constructor(
    message: string,
    public statusCode = 401,
  ) {
    super(message);
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
  if (process.env.CONVERSION_API_KEYS_REQUIRED === "true") {
    return true;
  }

  if (process.env.CONVERSION_API_KEYS_REQUIRED === "false") {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

function createDevelopmentIdentity(): ConversionApiIdentity {
  return {
    type: "development",
    userId: null,
    apiKeyId: null,
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
    .select("id,user_id,key_hash,key_prefix,name,is_active,expires_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !data) {
    throw new ApiAuthError("Invalid API key.");
  }

  const apiKey = data as ApiKeyRow;

  if (!apiKey.is_active) {
    throw new ApiAuthError("API key is inactive.");
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at).getTime() <= Date.now()) {
    throw new ApiAuthError("API key has expired.");
  }

  await supabase
    .from("conversion_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id);

  return {
    type: "api_key",
    userId: apiKey.user_id,
    apiKeyId: apiKey.id,
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

  const body = (await request.json().catch(() => ({}))) as { name?: unknown };
  const name = typeof body.name === "string" && body.name.trim()
    ? body.name.trim().slice(0, 80)
    : "Default API key";
  const rawKey = generateRawApiKey();
  const keyPrefix = rawKey.slice(0, KEY_PREVIEW_LENGTH);

  const { data, error } = await supabase
    .from("conversion_api_keys")
    .insert({
      user_id: user.id,
      name,
      key_hash: hashApiKey(rawKey),
      key_prefix: keyPrefix,
    })
    .select("id,name,key_prefix,created_at")
    .single();

  if (error || !data) {
    throw new ApiAuthError("Could not create API key.", 500);
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
