import { createHash } from "node:crypto";
import { PublicApiError } from "@/lib/api/http";
import {
  ConversionApiIdentity,
  ConversionTaskRequest,
} from "@/types/conversion-platform";

export type JobIdempotency = {
  keyHash: string;
  owner: string;
  requestFingerprint: string;
};

const IDEMPOTENCY_KEY_PATTERN = /^[\x21-\x7e]{8,128}$/;

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(",")}}`;
}

function updateFingerprint(
  hash: ReturnType<typeof createHash>,
  value: string | Uint8Array,
) {
  const bytes = typeof value === "string" ? Buffer.from(value) : value;
  hash.update(String(bytes.byteLength));
  hash.update(":");
  hash.update(bytes);
}

async function updateFingerprintWithFile(
  hash: ReturnType<typeof createHash>,
  file: File,
) {
  updateFingerprint(
    hash,
    stableSerialize({ name: file.name, size: file.size, type: file.type }),
  );

  const reader = file.stream().getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      updateFingerprint(hash, value);
    }
  } finally {
    reader.releaseLock();
  }
}

export function parseIdempotencyKey(request: Request) {
  const value = request.headers.get("idempotency-key")?.trim();

  if (!value) {
    return null;
  }

  if (!IDEMPOTENCY_KEY_PATTERN.test(value)) {
    throw new PublicApiError(
      "INVALID_IDEMPOTENCY_KEY",
      "Idempotency-Key must contain 8 to 128 visible ASCII characters.",
      400,
    );
  }

  return value;
}

export async function createJobIdempotency(
  identity: ConversionApiIdentity,
  key: string | null,
  task: ConversionTaskRequest,
  files: File[],
): Promise<JobIdempotency | null> {
  if (!key) {
    return null;
  }

  const fingerprint = createHash("sha256");
  updateFingerprint(fingerprint, stableSerialize(task));

  for (const file of files) {
    await updateFingerprintWithFile(fingerprint, file);
  }

  return {
    owner: identity.apiKeyId
      ? `api-key:${identity.apiKeyId}`
      : "development",
    keyHash: createHash("sha256").update(key).digest("hex"),
    requestFingerprint: fingerprint.digest("hex"),
  };
}
