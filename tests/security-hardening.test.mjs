import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [middleware, apiHttp, archiveRoute, schema, network] = await Promise.all([
  readFile("middleware.ts", "utf8"),
  readFile("lib/api/http.ts", "utf8"),
  readFile("app/api/archive-converter/route.ts", "utf8"),
  readFile("supabase/setup.sql", "utf8"),
  readFile("lib/security/public-network.ts", "utf8"),
]);

test("uses per-response nonce CSP without unsafe-inline scripts", () => {
  assert.match(middleware, /const scriptSources = \[`'nonce-\$\{nonce\}'`, "'strict-dynamic'"\]/);
  assert.match(middleware, /process\.env\.NODE_ENV !== "production"/);
  assert.match(middleware, /scriptSources\.push\("'unsafe-eval'"\)/);
  assert.doesNotMatch(middleware, /script-src[^\n]*unsafe-inline/);
  assert.match(middleware, /frame-ancestors 'none'/);
});

test("uses atomic distributed request rate limiting and fails closed", () => {
  assert.match(apiHttp, /check_public_request_rate_limit/);
  assert.match(apiHttp, /enforceTableBackedRateLimit/);
  assert.match(apiHttp, /public_request_rate_limits/);
  assert.match(apiHttp, /RATE_LIMIT_SERVICE_UNAVAILABLE/);
  assert.match(apiHttp, /process\.env\.NODE_ENV === "production"/);
  assert.match(apiHttp, /development-only in-memory rate limiter/);
  assert.match(schema, /on conflict \(limit_key\) do update/);
  assert.match(schema, /grant execute.*service_role/);
});

test("accepts same-origin requests through a trusted host proxy", () => {
  assert.match(apiHttp, /request\.headers\.get\("host"\)/);
  assert.match(apiHttp, /trustedOrigins\.has\(origin\)/);
  assert.match(apiHttp, /CROSS_SITE_REQUEST_BLOCKED/);
});

test("preflights archives before extraction", () => {
  const inspectionIndex = archiveRoute.indexOf("validateArchiveListing(await listSevenZipArchive");
  const extractionIndex = archiveRoute.indexOf('runSevenZip(["x"');
  assert.ok(inspectionIndex >= 0 && inspectionIndex < extractionIndex);
  assert.match(archiveRoute, /MAX_EXPANDED_BYTES/);
  assert.match(archiveRoute, /Archive links are not supported/);
});

test("bounds ZIP extraction while using JSZip's supported stream API", async () => {
  const extractionRoute = await readFile("app/api/extract-archive/route.ts", "utf8");
  assert.match(extractionRoute, /nodeStream\("nodebuffer"\)/);
  assert.match(extractionRoute, /totalBytes > remainingBytes/);
  assert.doesNotMatch(extractionRoute, /for await \(const chunk of stream\)/);
});

test("public URL fetching fails closed until egress protection is enabled", () => {
  assert.match(network, /PUBLIC_URL_FETCH_ENABLED/);
  assert.match(network, /NODE_ENV === "production"/);
});
