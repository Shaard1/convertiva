import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export async function createTemporaryDirectory(prefix: string) {
  return mkdtemp(join(tmpdir(), prefix));
}

export async function cleanupTemporaryDirectory(path: string) {
  await rm(path, { recursive: true, force: true });
}
