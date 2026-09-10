import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const constantsSource = await readFile("lib/constants.ts", "utf8");
const routeSource = await readFile("app/api/convert/route.ts", "utf8");
const routeUtilsSource = await readFile("lib/tools/routeUtils.ts", "utf8");
const componentSource = await readFile("components/ConverterCard.tsx", "utf8");
const apiKeyRouteSource = await readFile("app/api/v1/api-keys/route.ts", "utf8");
const jobRouteSource = await readFile("app/api/v1/jobs/route.ts", "utf8");
const jobStatusRouteSource = await readFile("app/api/v1/jobs/[jobId]/route.ts", "utf8");
const jobDownloadRouteSource = await readFile(
  "app/api/v1/jobs/[jobId]/download/route.ts",
  "utf8",
);
const workerRouteSource = await readFile("app/api/v1/workers/process/route.ts", "utf8");
const workerClaimRouteSource = await readFile("app/api/v1/workers/claim/route.ts", "utf8");
const workerInputRouteSource = await readFile(
  "app/api/v1/workers/jobs/[jobId]/inputs/[fileId]/route.ts",
  "utf8",
);
const workerOutputRouteSource = await readFile(
  "app/api/v1/workers/jobs/[jobId]/outputs/route.ts",
  "utf8",
);
const workerFailRouteSource = await readFile(
  "app/api/v1/workers/jobs/[jobId]/fail/route.ts",
  "utf8",
);
const workerCleanupRouteSource = await readFile(
  "app/api/v1/workers/cleanup/route.ts",
  "utf8",
);
const cronAuthSource = await readFile("lib/cron-auth.ts", "utf8");
const vercelConfig = JSON.parse(await readFile("vercel.json", "utf8"));
const operationsRouteSource = await readFile("app/api/v1/operations/route.ts", "utf8");
const usageRouteSource = await readFile("app/api/v1/usage/route.ts", "utf8");
const apiHttpSource = await readFile("lib/api/http.ts", "utf8");
const apiLimitsSource = await readFile("lib/api/limits.ts", "utf8");
const idempotencySource = await readFile("lib/api/idempotency.ts", "utf8");
const apiKeySource = await readFile("lib/api-keys.ts", "utf8");
const jobServiceSource = await readFile("lib/conversion-jobs.ts", "utf8");
const engineRegistrySource = await readFile("lib/conversion-engines.ts", "utf8");
const operationRegistrySource = await readFile(
  "lib/conversion-operations.ts",
  "utf8",
);
const workerAuthSource = await readFile("lib/worker-auth.ts", "utf8");
const browserUsageSource = await readFile("lib/usage.ts", "utf8");
const guestUsageServerSource = await readFile(
  "lib/guest-usage-server.ts",
  "utf8",
);
const supabaseSetupSource = await readFile("supabase/setup.sql", "utf8");
const legacyToolRouteSources = await Promise.all(
  [
    "app/api/archive-converter/route.ts",
    "app/api/compress-jpg/route.ts",
    "app/api/compress-pdf/route.ts",
    "app/api/compress-png/route.ts",
    "app/api/convert/route.ts",
    "app/api/convert-audio/route.ts",
    "app/api/convert-document/route.ts",
    "app/api/convert-video/route.ts",
    "app/api/create-archive/route.ts",
    "app/api/extract-archive/route.ts",
    "app/api/import-url/route.ts",
    "app/api/merge-pdf/route.ts",
    "app/api/spreadsheet-converter/route.ts",
    "app/api/website-screenshot/route.ts",
    "app/api/website-to-pdf/route.ts",
  ].map((path) => readFile(path, "utf8")),
);

test("limits match the requested guest and logged-in plans", () => {
  assert.match(constantsSource, /GUEST_DAILY_LIMIT\s*=\s*15/);
  assert.match(constantsSource, /AUTHENTICATED_DAILY_LIMIT\s*=\s*75/);
  assert.match(constantsSource, /maxFileSizeBytes:\s*20\s*\*\s*MEGABYTE_BYTES/);
  assert.match(constantsSource, /maxFileSizeBytes:\s*75\s*\*\s*MEGABYTE_BYTES/);
  assert.match(constantsSource, /maxConcurrentConversions:\s*2/);
  assert.match(constantsSource, /maxConcurrentConversions:\s*5/);
  assert.match(constantsSource, /historyLimit:\s*0/);
  assert.match(constantsSource, /historyLimit:\s*LOGGED_IN_HISTORY_LIMIT/);
});

test("conversion API enforces request and batch protections", () => {
  assert.match(routeSource, /enforceRateLimit\(identity\.key\)/);
  assert.match(routeSource, /validateBatch\(files,\s*identity\.policyName\)/);
  assert.match(routeSource, /enforceDailyLimit\(identity,\s*files\.length\)/);
  assert.match(routeSource, /mapWithConcurrency/);
  assert.match(routeSource, /withTimeout/);
});

test("legacy tool APIs share overload protection and request correlation", () => {
  assert.match(routeUtilsSource, /TOOL_REQUEST_CONCURRENCY/);
  assert.match(routeUtilsSource, /CapacityLimiter/);
  assert.match(routeUtilsSource, /X-Request-ID/);
  assert.match(routeUtilsSource, /parseToolFormData/);
  assert.match(routeUtilsSource, /error: message, code/);

  for (const source of legacyToolRouteSources) {
    assert.match(source, /handleToolRequest/);
  }
});

test("conversion API returns binary downloads instead of base64 JSON payloads", () => {
  assert.doesNotMatch(routeSource, /toString\("base64"\)/);
  assert.match(routeSource, /application\/zip/);
  assert.match(routeSource, /createDownloadHeaders/);
  assert.match(routeUtilsSource, /X-Converted-File-Name/);
});

test("browser decodes API blobs directly", () => {
  assert.doesNotMatch(componentSource, /atob\(/);
  assert.match(componentSource, /response\.blob\(\)/);
  assert.match(componentSource, /JSZip\.loadAsync/);
});

test("v1 conversion platform exposes job-oriented API routes", () => {
  assert.match(apiKeyRouteSource, /createConversionApiKey/);
  assert.match(jobRouteSource, /createConversionJob/);
  assert.match(jobStatusRouteSource, /getConversionJob/);
  assert.match(jobDownloadRouteSource, /getConversionJobOutputs/);
  assert.match(workerRouteSource, /processNextQueuedConversionJob/);
  assert.match(workerClaimRouteSource, /claimNextWorkerConversionJob/);
  assert.match(workerInputRouteSource, /getWorkerJobInputFile/);
  assert.match(workerOutputRouteSource, /completeWorkerConversionJob/);
  assert.match(workerFailRouteSource, /failWorkerConversionJob/);
  assert.match(workerCleanupRouteSource, /cleanupExpiredConversionJobs/);
  assert.match(operationsRouteSource, /listConversionEngines/);
});

test("v1 jobs use an engine registry and do not expose output buffers in metadata", () => {
  assert.match(engineRegistrySource, /name:\s*"sharp"/);
  assert.match(engineRegistrySource, /name:\s*"ffmpeg"/);
  assert.match(engineRegistrySource, /name:\s*"libreoffice"/);
  assert.match(engineRegistrySource, /name:\s*"sevenzip"/);
  assert.match(engineRegistrySource, /isWorkerConversionEngine/);
  assert.match(engineRegistrySource, /getConversionEngine/);
  assert.match(jobServiceSource, /getConversionOperation/);
  assert.match(operationRegistrySource, /CONVERSION_OPERATIONS/);
  assert.match(jobServiceSource, /getConversionTool/);
  assert.match(jobServiceSource, /This conversion requires queued worker processing/);
  assert.match(jobServiceSource, /claimNextWorkerConversionJob/);
  assert.match(jobServiceSource, /completeWorkerConversionJob/);
  assert.match(jobServiceSource, /failWorkerConversionJob/);
  assert.match(jobServiceSource, /status:\s*"uploading"/);
  assert.match(jobServiceSource, /job\.status = "queued"/);
  assert.match(jobServiceSource, /status = "processing"/);
  assert.match(jobServiceSource, /status = "finished"/);
  assert.match(jobServiceSource, /CONVERSION_PROCESSING_MODE/);
  assert.match(jobServiceSource, /processConversionJob/);
  assert.match(jobServiceSource, /processNextQueuedConversionJob/);
  assert.match(jobServiceSource, /apiKeyId/);
  assert.match(jobServiceSource, /recordUsageEvent/);
  assert.match(jobServiceSource, /downloadUrl/);
  assert.doesNotMatch(jobServiceSource, /buffer:\s*output\.buffer/);
});

test("v1 operations advertise tool-specific output formats and worker engines", () => {
  assert.match(operationsRouteSource, /listConversionOperations/);
  assert.match(operationRegistrySource, /image:\s*\{/);
  assert.match(operationRegistrySource, /video:\s*\{/);
  assert.match(operationRegistrySource, /audio:\s*\{/);
  assert.match(operationRegistrySource, /document:\s*\{/);
  assert.match(operationRegistrySource, /archive:\s*\{/);
  assert.match(operationRegistrySource, /\["zip", "7z", "tar"\]/);
  assert.match(engineRegistrySource, /mode:\s*"worker"/);
  assert.match(engineRegistrySource, /tools:\s*\["video",\s*"audio"\]/);
});

test("v1 platform persistence schema matches the job service", () => {
  assert.match(jobServiceSource, /conversion_platform_jobs/);
  assert.match(jobServiceSource, /conversion_platform_files/);
  assert.match(jobServiceSource, /conversion_usage_events/);
  assert.match(jobServiceSource, /conversion-platform-files/);
  assert.match(jobServiceSource, /task_payload/);
  assert.match(jobServiceSource, /uploadInputs/);
  assert.match(jobServiceSource, /downloadStoredInput/);
  assert.match(supabaseSetupSource, /create table if not exists public\.conversion_platform_jobs/);
  assert.match(supabaseSetupSource, /create table if not exists public\.conversion_api_keys/);
  assert.match(supabaseSetupSource, /create table if not exists public\.conversion_platform_files/);
  assert.match(supabaseSetupSource, /create table if not exists public\.conversion_usage_events/);
  assert.match(supabaseSetupSource, /conversion-platform-files/);
  assert.match(supabaseSetupSource, /task_payload jsonb/);
});

test("v1 platform API keys are hashed and required by job routes", () => {
  assert.match(apiKeySource, /cvt_live_/);
  assert.match(apiKeySource, /createHash\("sha256"\)/);
  assert.match(apiKeySource, /CONVERSION_API_KEYS_REQUIRED/);
  assert.match(apiKeySource, /authenticateConversionApiRequest/);
  assert.match(apiKeyRouteSource, /authenticateSupabaseUser|createConversionApiKey/);
  assert.match(jobRouteSource, /authenticateConversionApiRequest/);
  assert.match(jobStatusRouteSource, /authenticateConversionApiRequest/);
  assert.match(jobDownloadRouteSource, /authenticateConversionApiRequest/);
  assert.doesNotMatch(apiKeySource, /apiKey:\s*data/);
});

test("v1 worker endpoint is protected for production processing", () => {
  assert.match(workerAuthSource, /CONVERSION_WORKER_SECRET/);
  assert.match(workerAuthSource, /authorization/);
  assert.match(workerAuthSource, /x-worker-secret/);
  assert.match(workerAuthSource, /Worker authorization failed/);
  assert.match(workerAuthSource, /assertAuthorizedWorkerRequest/);
  assert.match(workerRouteSource, /assertAuthorizedWorkerRequest/);
  assert.match(workerClaimRouteSource, /assertAuthorizedWorkerRequest/);
  assert.match(workerInputRouteSource, /assertAuthorizedWorkerRequest/);
  assert.match(workerOutputRouteSource, /assertAuthorizedWorkerRequest/);
  assert.match(workerFailRouteSource, /assertAuthorizedWorkerRequest/);
  assert.match(workerCleanupRouteSource, /assertAuthorizedWorkerRequest/);
});

test("expired platform jobs have a bounded authenticated cleanup path", () => {
  assert.match(jobServiceSource, /cleanupExpiredConversionJobs/);
  assert.match(jobServiceSource, /limit > 10/);
  assert.match(jobServiceSource, /hasMore: jobIds\.length === limit/);
  assert.match(jobServiceSource, /remove\(storagePaths\)/);
  assert.match(jobServiceSource, /conversion_platform_jobs/);
  assert.match(workerCleanupRouteSource, /handleApiRequest/);
  assert.match(workerCleanupRouteSource, /SCHEDULED_CLEANUP_MAX_BATCHES = 10/);
});

test("Vercel cron cleanup uses GET and a dedicated secret", () => {
  assert.match(workerCleanupRouteSource, /export async function GET/);
  assert.match(workerCleanupRouteSource, /assertAuthorizedCronRequest/);
  assert.match(workerCleanupRouteSource, /assertAuthorizedWorkerRequest/);
  assert.match(cronAuthSource, /CRON_SECRET/);
  assert.match(cronAuthSource, /getBearerSecret/);
  assert.match(cronAuthSource, /timingSafeEqual|secretsMatch/);
  assert.deepEqual(vercelConfig.crons, [
    {
      path: "/api/v1/workers/cleanup",
      schedule: "0 3 * * *",
    },
  ]);
});

test("v1 routes share request IDs and backward-compatible structured errors", () => {
  assert.match(apiHttpSource, /X-Request-ID/);
  assert.match(apiHttpSource, /requestId/);
  assert.match(apiHttpSource, /error:\s*error\.message/);
  assert.match(apiHttpSource, /code:\s*error\.code/);
  assert.match(jobRouteSource, /handleApiRequest/);
  assert.match(jobStatusRouteSource, /handleApiRequest/);
  assert.match(jobDownloadRouteSource, /handleApiRequest/);
  assert.match(operationsRouteSource, /handleApiRequest/);
});

test("v1 job creation is idempotent and distributed API limits are atomic", () => {
  assert.match(jobRouteSource, /parseIdempotencyKey/);
  assert.match(jobServiceSource, /createJobIdempotency/);
  assert.match(jobServiceSource, /reserveJob/);
  assert.match(jobServiceSource, /IDEMPOTENCY_KEY_REUSED/);
  assert.match(idempotencySource, /requestFingerprint/);
  assert.match(apiLimitsSource, /check_conversion_api_rate_limit/);
  assert.match(apiLimitsSource, /reserve_conversion_api_daily_usage/);
  assert.match(supabaseSetupSource, /conversion_platform_jobs_idempotency_idx/);
  assert.match(supabaseSetupSource, /check_conversion_api_rate_limit/);
  assert.match(supabaseSetupSource, /reserve_conversion_api_daily_usage/);
  assert.match(supabaseSetupSource, /for update/);
});

test("worker claims and usage reservations are atomic database operations", () => {
  assert.match(supabaseSetupSource, /claim_next_worker_conversion_job/);
  assert.match(supabaseSetupSource, /claim_next_inline_conversion_job/);
  assert.match(supabaseSetupSource, /for update skip locked/);
  assert.match(supabaseSetupSource, /worker_lease_expires_at/);
  assert.match(supabaseSetupSource, /attempt_count/);
  assert.match(supabaseSetupSource, /reserve_guest_conversion_usage/);
  assert.match(supabaseSetupSource, /reserve_authenticated_conversion_usage/);
  assert.match(routeSource, /reserveUsage\(identity, files\.length\)/);
  assert.match(routeSource, /releaseUsage\(identity, files\.length\)/);
});

test("guest usage tables are not writable through anonymous policies", () => {
  assert.doesNotMatch(
    supabaseSetupSource,
    /create policy "Anon can (?:read|insert|update) guest usage"/,
  );
  assert.doesNotMatch(
    supabaseSetupSource,
    /create policy "Users can (?:insert|update) their own usage"/,
  );
});

test("guest usage is restored from durable server state after restart", () => {
  assert.match(usageRouteSource, /getGuestUsageCount/);
  assert.match(usageRouteSource, /force-dynamic/);
  assert.match(guestUsageServerSource, /guest_conversion_usage/);
  assert.match(guestUsageServerSource, /getSupabaseAdminClient/);
  assert.match(browserUsageSource, /getSyncedGuestUsage/);
  assert.match(browserUsageSource, /reconcileUsageCount/);
  assert.match(browserUsageSource, /cache: "no-store"/);
});
