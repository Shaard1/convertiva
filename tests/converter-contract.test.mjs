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
const operationsRouteSource = await readFile("app/api/v1/operations/route.ts", "utf8");
const apiKeySource = await readFile("lib/api-keys.ts", "utf8");
const jobServiceSource = await readFile("lib/conversion-jobs.ts", "utf8");
const engineRegistrySource = await readFile("lib/conversion-engines.ts", "utf8");
const workerAuthSource = await readFile("lib/worker-auth.ts", "utf8");
const supabaseSetupSource = await readFile("supabase/setup.sql", "utf8");

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
  assert.match(operationsRouteSource, /listConversionEngines/);
});

test("v1 jobs use an engine registry and do not expose output buffers in metadata", () => {
  assert.match(engineRegistrySource, /name:\s*"sharp"/);
  assert.match(engineRegistrySource, /name:\s*"ffmpeg"/);
  assert.match(engineRegistrySource, /name:\s*"libreoffice"/);
  assert.match(engineRegistrySource, /name:\s*"sevenzip"/);
  assert.match(engineRegistrySource, /isWorkerConversionEngine/);
  assert.match(engineRegistrySource, /getConversionEngine/);
  assert.match(jobServiceSource, /toolConversionConfigs/);
  assert.match(jobServiceSource, /getConversionTool/);
  assert.match(jobServiceSource, /This conversion requires queued worker processing/);
  assert.match(jobServiceSource, /claimNextWorkerConversionJob/);
  assert.match(jobServiceSource, /completeWorkerConversionJob/);
  assert.match(jobServiceSource, /failWorkerConversionJob/);
  assert.match(jobServiceSource, /status:\s*"queued"/);
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
  assert.match(operationsRouteSource, /image:\s*SUPPORTED_OUTPUT_FORMATS/);
  assert.match(operationsRouteSource, /video:\s*videoFormats/);
  assert.match(operationsRouteSource, /audio:\s*audioFormats/);
  assert.match(operationsRouteSource, /document:\s*documentFormats/);
  assert.match(operationsRouteSource, /archive:\s*\["zip",\s*"7z",\s*"tar"\]/);
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
  assert.match(workerRouteSource, /isAuthorizedWorkerRequest/);
  assert.match(workerClaimRouteSource, /isAuthorizedWorkerRequest/);
  assert.match(workerInputRouteSource, /isAuthorizedWorkerRequest/);
  assert.match(workerOutputRouteSource, /isAuthorizedWorkerRequest/);
  assert.match(workerFailRouteSource, /isAuthorizedWorkerRequest/);
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
