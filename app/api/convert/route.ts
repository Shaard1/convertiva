import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import {
  CONVERSION_POLICIES,
  ConversionPolicyName,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  SUPPORTED_INPUT_EXTENSIONS,
  SUPPORTED_INPUT_MIME_TYPES,
  SUPPORTED_OUTPUT_FORMATS,
} from "@/lib/constants";
import { convertUploadedFile, ConvertedImage } from "@/lib/conversion";
import { formatFileSize, getFileExtensionLabel } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase";
import { OutputFormat, OutputOptions } from "@/types/converter";

export const runtime = "nodejs";

type RequestIdentity =
  | {
      type: "authenticated";
      key: string;
      userId: string;
      accessToken: string;
      limit: number;
      policyName: ConversionPolicyName;
      conversionsUsed: number;
    }
  | {
      type: "guest";
      key: string;
      limit: number;
      policyName: ConversionPolicyName;
      conversionsUsed: number;
    };

type RateLimitRecord = {
  windowStartedAt: number;
  requestCount: number;
};

type DailyUsageRecord = {
  date: string;
  conversionsUsed: number;
};

type GuestUsageRow = {
  conversions_used: number;
};

const rateLimitStore = new Map<string, RateLimitRecord>();
const guestUsageStore = new Map<string, DailyUsageRecord>();
const DEFAULT_OUTPUT_OPTIONS: OutputOptions = {
  quality: 90,
  keepMetadata: false,
  backgroundColor: "#ffffff",
  fitMode: "max",
};

function parseOutputOptions(value: FormDataEntryValue | null): OutputOptions {
  if (!value || typeof value !== "string") {
    return DEFAULT_OUTPUT_OPTIONS;
  }

  try {
    const parsed = JSON.parse(value) as Partial<OutputOptions>;
    const width =
      typeof parsed.width === "number" && Number.isFinite(parsed.width)
        ? Math.max(1, Math.min(10_000, Math.floor(parsed.width)))
        : undefined;
    const height =
      typeof parsed.height === "number" && Number.isFinite(parsed.height)
        ? Math.max(1, Math.min(10_000, Math.floor(parsed.height)))
        : undefined;
    const fitMode =
      parsed.fitMode === "max" || parsed.fitMode === "crop" || parsed.fitMode === "scale"
        ? parsed.fitMode
        : DEFAULT_OUTPUT_OPTIONS.fitMode;

    return {
      ...DEFAULT_OUTPUT_OPTIONS,
      width,
      height,
      keepMetadata:
        typeof parsed.keepMetadata === "boolean"
          ? parsed.keepMetadata
          : DEFAULT_OUTPUT_OPTIONS.keepMetadata,
      fitMode,
    };
  } catch {
    return DEFAULT_OUTPUT_OPTIONS;
  }
}

class RequestValidationError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
  }
}

function isOutputFormat(value: string): value is OutputFormat {
  return SUPPORTED_OUTPUT_FORMATS.includes(value as OutputFormat);
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function getClientIp(request: Request): string {
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

function enforceRateLimit(key: string) {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || now - current.windowStartedAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { windowStartedAt: now, requestCount: 1 });
    return;
  }

  if (current.requestCount >= RATE_LIMIT_MAX_REQUESTS) {
    throw new RequestValidationError(
      "Too many conversion requests. Please wait a moment and try again.",
      429,
    );
  }

  current.requestCount += 1;
}

function sanitizeUnexpectedError(error: unknown) {
  if (error instanceof RequestValidationError) {
    return error.message;
  }

  return "The server failed to process the image.";
}

function validateInputFile(file: File, maxFileSizeBytes: number) {
  const extension = getFileExtensionLabel(file.name);
  const isSupportedExtension = SUPPORTED_INPUT_EXTENSIONS.includes(
    extension as (typeof SUPPORTED_INPUT_EXTENSIONS)[number],
  );
  const isSupportedMimeType = SUPPORTED_INPUT_MIME_TYPES.includes(
    file.type as (typeof SUPPORTED_INPUT_MIME_TYPES)[number],
  );
  const isGenericMimeType =
    file.type.length === 0 || file.type === "application/octet-stream";
  const canUseExtensionFallback =
    isSupportedExtension &&
    ["bmp", "ico", "jfif"].includes(extension) &&
    isGenericMimeType;

  if (!isSupportedExtension || (!isSupportedMimeType && !canUseExtensionFallback)) {
    throw new RequestValidationError("Unsupported file type detected.");
  }

  if (file.size > maxFileSizeBytes) {
    throw new RequestValidationError(
      `File size must be under ${formatFileSize(maxFileSizeBytes)}.`,
    );
  }
}

function validateBatch(files: File[], policyName: ConversionPolicyName) {
  const policy = CONVERSION_POLICIES[policyName];

  if (!files.length) {
    throw new RequestValidationError("No image files were uploaded.");
  }

  if (files.length > policy.maxBatchFiles) {
    throw new RequestValidationError(
      `Upload ${policy.maxBatchFiles} images or fewer per conversion.`,
    );
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const maxTotalSize = policy.maxFileSizeBytes * policy.maxBatchFiles;

  if (totalSize > maxTotalSize) {
    throw new RequestValidationError(
      `Total upload size must be under ${formatFileSize(maxTotalSize)}.`,
    );
  }

  files.forEach((file) => validateInputFile(file, policy.maxFileSizeBytes));
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await task(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

function getSupabaseServerClient(accessToken?: string) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined,
    },
  );
}

function getMemoryGuestUsage(key: string, date: string) {
  const record = guestUsageStore.get(key);

  if (!record || record.date !== date) {
    guestUsageStore.set(key, { date, conversionsUsed: 0 });
    return 0;
  }

  return record.conversionsUsed;
}

async function getPersistentGuestUsage(key: string, date: string) {
  const supabase = getSupabaseServerClient();

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
    return getMemoryGuestUsage(key, date);
  }

  return ((data as GuestUsageRow | null)?.conversions_used ?? 0);
}

async function getRequestIdentity(request: Request): Promise<RequestIdentity> {
  const ip = getClientIp(request);
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  const supabase = token ? getSupabaseServerClient(token) : null;

  if (token && supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (user) {
      const date = getTodayDateString();
      const { data, error } = await supabase
        .from("conversion_usage")
        .select("conversions_used")
        .eq("user_id", user.id)
        .eq("date", date)
        .maybeSingle();

      if (error) {
        throw new RequestValidationError("Could not verify account usage.", 503);
      }

      return {
        type: "authenticated",
        key: `user:${user.id}`,
        userId: user.id,
        accessToken: token,
        limit: CONVERSION_POLICIES.authenticated.dailyLimit,
        policyName: "authenticated",
        conversionsUsed: data?.conversions_used ?? 0,
      };
    }
  }

  const date = getTodayDateString();
  const key = `guest:${ip}`;
  const conversionsUsed = await getPersistentGuestUsage(key, date);
  guestUsageStore.set(key, { date, conversionsUsed });

  return {
    type: "guest",
    key,
    limit: CONVERSION_POLICIES.guest.dailyLimit,
    policyName: "guest",
    conversionsUsed,
  };
}

async function incrementUsage(identity: RequestIdentity, count: number) {
  if (count <= 0) {
    return;
  }

  const date = getTodayDateString();
  const conversionsUsed = identity.conversionsUsed + count;

  if (identity.type === "guest") {
    guestUsageStore.set(identity.key, { date, conversionsUsed });
    const supabase = getSupabaseServerClient();

    if (supabase) {
      await supabase.from("guest_conversion_usage").upsert(
        {
          guest_key: identity.key,
          date,
          conversions_used: conversionsUsed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "guest_key,date" },
      );
    }

    return;
  }

  const supabase = getSupabaseServerClient(identity.accessToken);

  if (!supabase) {
    throw new RequestValidationError("Could not update account usage.", 503);
  }

  const { error } = await supabase.from("conversion_usage").upsert(
    {
      user_id: identity.userId,
      date,
      conversions_used: conversionsUsed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" },
  );

  if (error) {
    throw new RequestValidationError("Could not update account usage.", 503);
  }
}

function enforceDailyLimit(identity: RequestIdentity, requestedConversions: number) {
  const remaining = Math.max(identity.limit - identity.conversionsUsed, 0);

  if (remaining <= 0) {
    throw new RequestValidationError(
      identity.type === "guest"
        ? "Guest limit reached. Sign in to convert more images."
        : "You have reached your daily conversion limit.",
      429,
    );
  }

  if (requestedConversions > remaining) {
    throw new RequestValidationError(
      `You only have ${remaining} conversions left.`,
      429,
    );
  }
}

function getConversionFailureMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("timed out")) {
    return "Image processing timed out. Try a smaller file or fewer images.";
  }

  if (normalizedMessage.includes("dimensions are too large")) {
    return "Image dimensions are too large for this converter.";
  }

  if (normalizedMessage.includes("metadata")) {
    return "This file does not look like a valid image.";
  }

  if (normalizedMessage.includes("unsupported")) {
    return "This image format is not supported yet.";
  }

  return "Could not convert this image. Try another file.";
}

function createDownloadHeaders(fileName: string, contentType: string) {
  return {
    "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    "Content-Type": contentType,
    "X-Converted-File-Name": encodeURIComponent(fileName),
  };
}

async function createZip(files: ConvertedImage[]): Promise<Buffer> {
  const zip = new JSZip();

  files.forEach((file) => {
    zip.file(file.fileName, file.buffer);
  });

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export async function POST(request: Request) {
  try {
    const identity = await getRequestIdentity(request);
    enforceRateLimit(identity.key);

    const formData = await request.formData();
    const outputFormat = formData.get("outputFormat");
    const outputOptions = parseOutputOptions(formData.get("outputOptions"));
    const entries = formData.getAll("files");

    if (!outputFormat || typeof outputFormat !== "string" || !isOutputFormat(outputFormat)) {
      throw new RequestValidationError("Invalid output format.");
    }

    const files = entries.filter((entry): entry is File => entry instanceof File);

    if (files.length !== entries.length) {
      throw new RequestValidationError("Invalid file upload.");
    }

    validateBatch(files, identity.policyName);
    enforceDailyLimit(identity, files.length);

    const usedNames = new Set<string>();
    const policy = CONVERSION_POLICIES[identity.policyName];

    let convertedFiles: ConvertedImage[];

    try {
      convertedFiles = await mapWithConcurrency(
        files,
        policy.maxConcurrentConversions,
        (file) =>
          withTimeout(
            convertUploadedFile(file, outputFormat, outputOptions, usedNames),
            policy.processingTimeoutMs,
            "Image processing timed out.",
          ),
      );
    } catch (error) {
      throw new RequestValidationError(
        getConversionFailureMessage(error),
      );
    }

    await incrementUsage(identity, convertedFiles.length);

    if (convertedFiles.length === 1) {
      const [file] = convertedFiles;

      return new NextResponse(new Uint8Array(file.buffer), {
        headers: createDownloadHeaders(file.fileName, file.mimeType),
      });
    }

    const zipBuffer = await createZip(convertedFiles);

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: createDownloadHeaders("converted-images.zip", "application/zip"),
    });
  } catch (error) {
    const statusCode =
      error instanceof RequestValidationError ? error.statusCode : 500;

    return NextResponse.json(
      {
        error: sanitizeUnexpectedError(error),
      },
      { status: statusCode },
    );
  }
}
