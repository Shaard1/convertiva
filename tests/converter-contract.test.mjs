import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const constantsSource = await readFile("lib/constants.ts", "utf8");
const routeSource = await readFile("app/api/convert/route.ts", "utf8");
const componentSource = await readFile("components/ConverterCard.tsx", "utf8");

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
