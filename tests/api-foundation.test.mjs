import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTypeScriptModule(path) {
  const source = await readFile(path, "utf8");
  const isolatedSource = source.replace(/^import[\s\S]*?from\s+["'][^"']+["'];\s*$/gm, "");
  const transpiled = ts.transpileModule(isolatedSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  return import(
    `data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`
  );
}

const http = await importTypeScriptModule("lib/api/http.ts");
const { MemoryApiLimits } = await importTypeScriptModule(
  "lib/api/memory-limits.ts",
);
const { reconcileUsageCount } = await importTypeScriptModule(
  "lib/usage-reconciliation.ts",
);

test("should preserve compatibility fields and add request metadata", async () => {
  const request = new Request("https://convertiva.test/api/v1/health", {
    headers: { "X-Request-ID": "request-test-123" },
  });
  const context = http.createApiRequestContext(request, "health_check");

  const response = http.createApiSuccessResponse(context, { status: "ok" });
  const body = await response.json();

  assert.equal(response.headers.get("x-request-id"), "request-test-123");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("server-timing"), /^app;dur=\d+$/);
  assert.deepEqual(body.data, { status: "ok" });
  assert.equal(body.error, null);
  assert.equal(body.meta.requestId, "request-test-123");
  assert.equal(body.meta.version, "v1");
});

test("should return stable public errors without exposing internal details", async () => {
  const request = new Request("https://convertiva.test/api/v1/jobs");
  const context = http.createApiRequestContext(request, "create_job");
  const error = new http.PublicApiError(
    "RATE_LIMIT_EXCEEDED",
    "Try again shortly.",
    429,
    12,
  );

  const response = http.createApiErrorResponse(context, error);
  const body = await response.json();

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "12");
  assert.equal(body.error, "Try again shortly.");
  assert.equal(body.code, "RATE_LIMIT_EXCEEDED");
  assert.equal(body.data, null);
  assert.equal(body.meta.requestId, context.requestId);
});

test("should reject invalid content length and media type at the boundary", () => {
  const oversized = new Request("https://convertiva.test/api/v1/jobs", {
    method: "POST",
    headers: { "Content-Length": "101" },
  });
  const wrongMediaType = new Request("https://convertiva.test/api/v1/jobs", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
  });

  assert.throws(
    () => http.assertRequestSize(oversized, 100),
    (error) => error.code === "PAYLOAD_TOO_LARGE" && error.statusCode === 413,
  );
  assert.throws(
    () => http.assertRequestMediaType(wrongMediaType, "application/json"),
    (error) =>
      error.code === "UNSUPPORTED_MEDIA_TYPE" && error.statusCode === 415,
  );
});

test("should enforce fixed-window request limits and reset cleanly", () => {
  const limits = new MemoryApiLimits();
  const options = {
    identityKey: "key-1",
    limit: 2,
    now: 1_000,
    windowMs: 60_000,
  };

  assert.deepEqual(limits.consumeRateLimit(options), {
    allowed: true,
    limit: 2,
    remaining: 1,
    resetAt: 61_000,
  });
  assert.equal(limits.consumeRateLimit(options).allowed, true);
  assert.equal(limits.consumeRateLimit(options).allowed, false);
  assert.equal(
    limits.consumeRateLimit({ ...options, now: 61_000 }).remaining,
    1,
  );
});

test("should reserve and release daily conversion usage atomically in memory", () => {
  const limits = new MemoryApiLimits();
  const reservation = {
    identityKey: "key-1",
    date: "2026-09-09",
    limit: 3,
  };

  assert.equal(
    limits.reserveDailyUsage({ ...reservation, count: 2 }).allowed,
    true,
  );
  assert.equal(
    limits.reserveDailyUsage({ ...reservation, count: 2 }).allowed,
    false,
  );

  limits.releaseDailyUsage({
    identityKey: reservation.identityKey,
    date: reservation.date,
    count: 1,
  });

  assert.equal(
    limits.reserveDailyUsage({ ...reservation, count: 2 }).allowed,
    true,
  );
});

test("should preserve spent guest conversions across state reconciliation", () => {
  assert.equal(
    reconcileUsageCount({
      localConversionsUsed: 1,
      serverConversionsUsed: 0,
      limit: 15,
    }),
    1,
  );
  assert.equal(
    reconcileUsageCount({
      localConversionsUsed: 0,
      serverConversionsUsed: 1,
      limit: 15,
    }),
    1,
  );
  assert.equal(
    reconcileUsageCount({
      localConversionsUsed: 14,
      serverConversionsUsed: 20,
      limit: 15,
    }),
    15,
  );
});
