import { OutputFormat } from "@/types/converter";

export const PROJECT_NAME = "Jaiidonee Convert";
export const APP_NAME = "Convertiva";

export const SUPPORTED_INPUT_MIME_TYPES = [
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/ico",
  "image/png",
  "image/jpeg",
  "image/tiff",
  "image/vnd.microsoft.icon",
  "image/webp",
  "image/x-icon",
  "image/x-ms-bmp",
] as const;
export const SUPPORTED_INPUT_EXTENSIONS = [
  "avif",
  "bmp",
  "gif",
  "ico",
  "png",
  "jpg",
  "jpeg",
  "tif",
  "tiff",
  "webp",
  "jfif",
] as const;

export const SUPPORTED_OUTPUT_FORMATS: OutputFormat[] = [
  "avif",
  "bmp",
  "gif",
  "ico",
  "jpg",
  "pdf",
  "png",
  "tiff",
  "webp",
];
export const SUPPORTED_INPUT_ACCEPT =
  ".avif,.bmp,.gif,.ico,.png,.jpg,.jpeg,.jfif,.tif,.tiff,.webp,image/avif,image/bmp,image/gif,image/ico,image/png,image/jpeg,image/tiff,image/vnd.microsoft.icon,image/webp,image/x-icon,image/x-ms-bmp";

export const MAX_IMAGE_PIXELS = 40_000_000;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const RATE_LIMIT_MAX_REQUESTS = 20;
export const MEGABYTE_BYTES = 1024 * 1024;
export const GUEST_DAILY_LIMIT = 15;
export const AUTHENTICATED_DAILY_LIMIT = 75;
export const LOGGED_IN_HISTORY_LIMIT = 20;
export const GUEST_USAGE_STORAGE_KEY = "convertly-guest-usage";
export const THEME_STORAGE_KEY = "convertly-theme";

export const CONVERSION_POLICIES = {
  guest: {
    dailyLimit: GUEST_DAILY_LIMIT,
    maxFileSizeBytes: 20 * MEGABYTE_BYTES,
    maxBatchFiles: 10,
    maxConcurrentConversions: 2,
    processingTimeoutMs: 60 * 1000,
    historyLimit: 0,
    retentionMs: 60 * 60 * 1000,
  },
  authenticated: {
    dailyLimit: AUTHENTICATED_DAILY_LIMIT,
    maxFileSizeBytes: 75 * MEGABYTE_BYTES,
    maxBatchFiles: 30,
    maxConcurrentConversions: 5,
    processingTimeoutMs: 3 * 60 * 1000,
    historyLimit: LOGGED_IN_HISTORY_LIMIT,
    retentionMs: 24 * 60 * 60 * 1000,
  },
} as const;

export type ConversionPolicyName = keyof typeof CONVERSION_POLICIES;

