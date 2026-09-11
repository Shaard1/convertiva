import { readFile, readdir, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";

const buildDirectory = path.resolve(".next");
const manifestPath = path.join(buildDirectory, "app-build-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const routeBudgets = {
  "/page": 140 * 1024,
  "/formats/page": 140 * 1024,
  "/tools/image-converter/page": 220 * 1024,
};

const results = [];

for (const [route, maximumBytes] of Object.entries(routeBudgets)) {
  const files = [...new Set(manifest.pages[route] ?? [])].filter((file) =>
    /\.(?:css|js)$/.test(file),
  );
  let gzipBytes = 0;
  for (const file of files) {
    const contents = await readFile(path.join(buildDirectory, file));
    gzipBytes += gzipSync(contents).byteLength;
  }

  results.push({ route, gzipBytes, maximumBytes });

  if (gzipBytes > maximumBytes) {
    throw new Error(
      `${route} ships ${gzipBytes} gzipped bytes, above its ${maximumBytes}-byte budget.`,
    );
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const filePath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(filePath) : [filePath];
    }),
  );
  return nested.flat();
}

const oversizedAssets = [];
for (const filePath of await listFiles(path.resolve("public"))) {
  const fileStats = await stat(filePath);
  if (fileStats.size > 500 * 1024) {
    oversizedAssets.push({ file: path.relative(process.cwd(), filePath), bytes: fileStats.size });
  }
}

if (oversizedAssets.length) {
  throw new Error(`Public assets exceed 500 KB: ${JSON.stringify(oversizedAssets)}`);
}

console.log(JSON.stringify({ routes: results, oversizedAssets }, null, 2));
