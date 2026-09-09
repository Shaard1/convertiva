import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile("lib/capacity.ts", "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const capacity = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`
);

test("rejects excess work and releases capacity after completion", async () => {
  const limiter = new capacity.CapacityLimiter("test resource", 1);
  let finishFirstTask;
  const firstTask = limiter.run(
    () =>
      new Promise((resolve) => {
        finishFirstTask = resolve;
      }),
  );

  await assert.rejects(
    () => limiter.run(async () => "second"),
    /test resource capacity is currently full/,
  );

  finishFirstTask("first");
  assert.equal(await firstTask, "first");
  assert.equal(await limiter.run(async () => "third"), "third");
});

test("rejects invalid concurrency configuration", () => {
  assert.throws(
    () => new capacity.CapacityLimiter("test resource", 0),
    /positive integer/,
  );
});
