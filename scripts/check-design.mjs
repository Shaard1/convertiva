import assert from "node:assert/strict";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const base = process.env.DESIGN_TEST_URL ?? "http://127.0.0.1:3020";
const output = "test-results/design";
const tools = (await readdir("app/tools", { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => `/tools/${entry.name}`);
const routes = ["/", "/help", "/contact", "/how-it-works", "/terms", "/privacy-policy", "/formats", "/pricing", "/reset-password", "/auth/callback?error_description=test", ...tools];
const sizes = [[1440, 960], [1366, 768], [768, 1024], [360, 960], [320, 960]];
const browser = await chromium.launch({ channel: "msedge", headless: true });
await mkdir(output, { recursive: true });
const reports = [];
try {
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ colorScheme: theme, reducedMotion: "reduce" });
    await context.addInitScript((value) => localStorage.setItem("convertly-theme", value), theme);
    await context.route("**/api/v1/usage", (route) => route.fulfill({ json: { data: { conversionsUsed: 0, limit: 15, remaining: 15, label: "Guest", isGuest: true, date: new Date().toISOString().slice(0, 10) }, error: null } }));
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const route of routes) {
      const response = await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200, route);
      for (const [width, height] of sizes) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => window.scrollTo(0, 0));
        const metrics = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - innerWidth,
          headings: document.querySelectorAll("h1").length,
          theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
          headerHeight: document.querySelector("header")?.getBoundingClientRect().height ?? 0,
          canvas: getComputedStyle(document.body).backgroundColor,
        }));
        const name = `${route.replaceAll(/[^a-z0-9-]/g, "_") || "home"}-${width}-${theme}`;
        assert.equal(metrics.theme, theme, `${route} theme at ${width}px`);
        await page.screenshot({ path: `${output}/${name}.png`, fullPage: true, animations: "disabled" });
        reports.push({ route, width, height, theme, ...metrics });
        if (metrics.overflow || metrics.headings !== 1 || metrics.theme !== theme || metrics.headerHeight > 80) {
          console.error("Layout issue", reports.at(-1));
        }
      }
      console.log(`${theme} ${route}`);
    }
    assert.deepEqual(errors, [], "Browser runtime errors");
    await context.close();
  }
  await writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
  const failures = reports.filter((r) => r.overflow || r.headings !== 1 || r.headerHeight > 80);
  assert.deepEqual(failures, [], "Responsive page checks");
  console.log(`PASS: ${reports.length} route / viewport / theme combinations`);
} finally { await browser.close(); }
