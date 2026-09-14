import { readFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
const reports = JSON.parse(await readFile("test-results/design/report.json", "utf8"));
await mkdir("test-results/design/sheets", { recursive: true });
for (const theme of ["light", "dark"]) for (const width of [1440, 1366, 768, 360, 320]) {
  const matches = reports.filter((r) => r.width === width && r.theme === theme);
  for (let group = 0; group < matches.length; group += 10) {
    const rows = matches.slice(group, group + 10);
    const tileWidth = width < 704 ? width : 480;
    const tileHeight = width < 704 ? 780 : 360;
    const columns = 5;
    const inputs = [];
    for (const [index, row] of rows.entries()) {
      const name = `${row.route.replaceAll(/[^a-z0-9-]/g, "_") || "home"}-${width}-${theme}`;
      const src = `test-results/design/${name}.png`;
      const meta = await sharp(src).metadata();
      const buffer = await sharp(src).extract({ left: 0, top: 0, width, height: Math.min(meta.height, width < 704 ? 960 : 900) }).resize(tileWidth, tileHeight, { fit: "contain", background: theme === "dark" ? "#15221d" : "#f6f7f2" }).png().toBuffer();
      inputs.push({ input: buffer, left: (index % columns) * tileWidth, top: Math.floor(index / columns) * tileHeight });
    }
    await sharp({ create: { width: tileWidth * columns, height: tileHeight * 2, channels: 3, background: theme === "dark" ? "#15221d" : "#f6f7f2" } }).composite(inputs).png().toFile(`test-results/design/sheets/${width}-${theme}-${group / 10}.png`);
  }
}
