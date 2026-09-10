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
  assert.match(middleware, /script-src 'nonce-\$\{nonce\}' 'strict-dynamic'/);
  assert.doesNotMatch(middleware, /script-src[^\n]*unsafe-inline/);
  assert.match(middleware, /frame-ancestors 'none'/);
});

test("uses atomic distributed request rate limiting and fails closed", () => {
  assert.match(apiHttp, /check_public_request_rate_limit/);
  assert.match(apiHttp, /RATE_LIMIT_SERVICE_UNAVAILABLE/);
  assert.match(schema, /on conflict \(limit_key\) do update/);
  assert.match(schema, /grant execute.*service_role/);
});

test("preflights archives before extraction", () => {
  const inspectionIndex = archiveRoute.indexOf("validateArchiveListing(await listSevenZipArchive");
  const extractionIndex = archiveRoute.indexOf('runSevenZip(["x"');
  assert.ok(inspectionIndex >= 0 && inspectionIndex < extractionIndex);
  assert.match(archiveRoute, /MAX_EXPANDED_BYTES/);
  assert.match(archiveRoute, /Archive links are not supported/);
});

test("public URL fetching fails closed until egress protection is enabled", () => {
  assert.match(network, /PUBLIC_URL_FETCH_ENABLED/);
  assert.match(network, /NODE_ENV === "production"/);
});
