import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const constantsSource = await readFile("lib/constants.ts", "utf8");
const routeSource = await readFile("app/api/convert/route.ts", "utf8");
const componentSource = await readFile("components/ConverterCard.tsx", "utf8");
const apiKeyRouteSource = await readFile("app/api/v1/api-keys/route.ts", "utf8");
const jobRouteSource = await readFile("app/api/v1/jobs/route.ts", "utf8");
const jobStatusRouteSource = await readFile("app/api/v1/jobs/[jobId]/route.ts", "utf8");
const jobDownloadRouteSource = await readFile(
  "app/api/v1/jobs/[jobId]/download/route.ts",
  "utf8",
);
const workerRouteSource = await readFile("app/api/v1/workers/process/route.ts", "utf8");
const operationsRouteSource = await readFile("app/api/v1/operations/route.ts", "utf8");
const apiKeySource = await readFile("lib/api-keys.ts", "utf8");
const jobServiceSource = await readFile("lib/conversion-jobs.ts", "utf8");
const engineRegistrySource = await readFile("lib/conversion-engines.ts", "utf8");
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
  assert.match(routeSource, /X-Converted-File-Name/);
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
  assert.match(operationsRouteSource, /listConversionEngines/);
});

test("v1 jobs use an engine registry and do not expose output buffers in metadata", () => {
  assert.match(engineRegistrySource, /name:\s*"sharp"/);
  assert.match(engineRegistrySource, /getConversionEngine/);
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
  assert.match(workerRouteSource, /CONVERSION_WORKER_SECRET/);
  assert.match(workerRouteSource, /authorization/);
  assert.match(workerRouteSource, /x-worker-secret/);
  assert.match(workerRouteSource, /Worker authorization failed/);
});
