import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const base = process.env.DESIGN_TEST_URL ?? "http://127.0.0.1:3020";
const output = "test-results/format-picker";
const cases = [
  { route: "/tools/archive-converter", selected: "TAR" },
  { route: "/tools/spreadsheet-converter", selected: "ODS" },
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  for (const theme of ["light", "dark"]) {
    for (const width of [1366, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
      await context.addInitScript((value) => localStorage.setItem("convertly-theme", value), theme);
      await context.route("**/api/v1/usage", (route) => route.fulfill({ json: { data: { conversionsUsed: 0, limit: 15, remaining: 15, label: "Guest", isGuest: true }, error: null } }));
      const page = await context.newPage();

      for (const testCase of cases) {
        await page.goto(`${base}${testCase.route}`, { waitUntil: "networkidle" });
        const trigger = page.getByRole("button", { name: "Convert to", exact: true });
        await trigger.click();
        const dialog = page.getByRole("dialog", { name: "Choose output format" });
        await dialog.waitFor();
        const motion = await dialog.evaluate((element) => {
          const style = getComputedStyle(element);
          return { name: style.animationName, duration: style.animationDuration };
        });
        assert.match(motion.name, /picker-enter/);
        assert.notEqual(motion.duration, "0s");
        assert.equal(await trigger.getAttribute("aria-expanded"), "true");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
        await page.screenshot({ path: `${output}/${testCase.route.split("/").at(-1)}-${width}-${theme}.png`, fullPage: true });
        await dialog.getByRole("button", { name: testCase.selected, exact: true }).click();
        assert.match(await trigger.textContent(), new RegExp(testCase.selected, "i"));
        assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      }

      await context.close();
    }
  }

  const reducedContext = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: "reduce" });
  await reducedContext.route("**/api/v1/usage", (route) => route.fulfill({ json: { data: { conversionsUsed: 0, limit: 15, remaining: 15, label: "Guest", isGuest: true }, error: null } }));
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(`${base}/tools/spreadsheet-converter`, { waitUntil: "networkidle" });
  await reducedPage.getByRole("button", { name: "Convert to", exact: true }).click();
  assert.equal(await reducedPage.getByRole("dialog", { name: "Choose output format" }).evaluate((element) => getComputedStyle(element).animationName), "none");
  await reducedContext.close();

  console.log("PASS: 8 animated utility format pickers and reduced-motion behavior");
} finally {
  await browser.close();
}
