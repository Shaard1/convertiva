import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile("lib/pending-image-upload.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { stageImageUpload, consumeImageUpload } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("homepage upload preserves files and output format and can only be consumed once", () => {
  const image = new File(["fixture"], "test.png", { type: "image/png" });
  const files = [image];
  stageImageUpload(files, "webp");
  files.length = 0;
  assert.deepEqual(consumeImageUpload(), { files: [image], outputFormat: "webp" });
  assert.equal(consumeImageUpload(), null);
});

test("a new selection replaces abandoned files and expires after five minutes", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  stageImageUpload([new File(["old"], "old.png")], "jpg");
  context.mock.timers.tick(1000);
  const image = new File(["new"], "new.png");
  stageImageUpload([image], "pdf");
  context.mock.timers.tick(299000);
  assert.deepEqual(consumeImageUpload(), { files: [image], outputFormat: "pdf" });
  stageImageUpload([image], "webp");
  context.mock.timers.tick(300001);
  assert.equal(consumeImageUpload(), null);
});
