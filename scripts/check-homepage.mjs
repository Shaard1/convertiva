import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import sharp from "sharp";

// Run against a running local dev/production server. All API responses are
// fixtures: this UI check never changes a real user's quota or remote data.
const baseUrl = process.env.HOMEPAGE_TEST_URL ?? "http://127.0.0.1:3020";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE_PATH
    ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH }
    : { channel: "msedge" }),
});
await mkdir("test-results/homepage", { recursive: true });
const source = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#456b50" } }).png().toBuffer();
const resultImage = await sharp(source).webp().toBuffer();
const reports = [];

try {
  for (const [width, height, theme] of [[1440, 960, "light"], [1366, 768, "light"], [768, 960, "light"], [360, 960, "light"], [320, 960, "light"], [1440, 960, "dark"]]) {
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme });
    await context.addInitScript((value) => localStorage.setItem("convertly-theme", value), theme);
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    let conversionRequests = 0;
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/v1/usage", (route) => route.fulfill({ json: {
      data: { conversionsUsed: 0, limit: 15, remaining: 15, label: "Guest", isGuest: true, date: new Date().toISOString().slice(0, 10) },
      error: null,
    } }));
    await page.route("**/api/convert", async (route) => {
      conversionRequests += 1;
      assert.match(route.request().postDataBuffer().toString(), /webp/);
      await route.fulfill({ status: 200, contentType: "image/webp", headers: { "x-converted-file-name": "homepage-test.webp" }, body: resultImage });
    });
    const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    await page.getByRole("heading", { name: "File conversion. Straight to it." }).waitFor();
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator("#tools li a").count(), 14);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.equal(overflow, 0, `Horizontal overflow at ${width}px`);
    const headerHeight = await page.locator("header").evaluate((element) => element.getBoundingClientRect().height);
    assert.ok(headerHeight < 80, `Collapsed header has extra space at ${width}px`);
    if (width >= 1024) {
      const chooseButton = await page.getByRole("button", { name: "Choose images", exact: true }).boundingBox();
      assert.ok(chooseButton.y + chooseButton.height <= height, "Primary action should be above the desktop fold");
    }
    await page.screenshot({ path: `test-results/homepage/${width}-${theme}-hero.png`, animations: "disabled" });
    // Render content-visibility sections before taking a full-page reference.
    await page.locator("footer").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: `test-results/homepage/${width}-${theme}.png`, fullPage: true, animations: "disabled" });

    if (width >= 1024) {
      const menuButton = page.getByRole("button", { name: "Open converters menu", exact: true });
      await menuButton.click();
      await page.locator("#converters-menu").waitFor({ state: "visible" });
      assert.equal(await menuButton.getAttribute("aria-expanded"), "true");
      await page.keyboard.press("Escape");
      await page.locator("#converters-menu").waitFor({ state: "hidden" });
    } else {
      await page.getByRole("button", { name: "Open navigation menu", exact: true }).click();
      const closeMenu = page.getByRole("button", { name: "Close navigation menu", exact: true });
      assert.equal(await closeMenu.getAttribute("aria-expanded"), "true");
      await closeMenu.click();
    }

    // Custom format menu updates the illustration and supports full keyboard control.
    const formatMenu = page.getByRole("button", { name: /CONVERT TO/i });
    await formatMenu.click();
    assert.equal(await formatMenu.getAttribute("aria-expanded"), "true");
    await page.getByRole("listbox", { name: "CONVERT TO", exact: true }).waitFor();
    await page.getByRole("option", { name: "PNG", exact: true }).click();
    assert.equal(await formatMenu.getAttribute("aria-expanded"), "false");
    assert.match(await page.locator("#image-upload").textContent(), /\.png/);
    await formatMenu.click();
    await page.getByRole("option", { name: "WEBP", exact: true }).click();
    await formatMenu.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Home");
    await page.keyboard.press("Enter");
    assert.match(await formatMenu.textContent(), /AVIF/);
    await formatMenu.click();
    await page.getByRole("option", { name: "WEBP", exact: true }).click();
    await formatMenu.click();
    await page.keyboard.press("Escape");
    assert.equal(await formatMenu.getAttribute("aria-expanded"), "false");
    assert.equal(await formatMenu.evaluate((element) => element === document.activeElement), true);
    await page.locator('input[type="file"]').setInputFiles({ name: "invalid.txt", mimeType: "text/plain", buffer: Buffer.from("test") });
    await page.getByRole("alert").filter({ hasText: "Unsupported file type" }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/");

    if (width === 360) {
      // Realistic drag events exercise the same handoff as the file picker.
      await page.locator("#image-upload").evaluate((element, bytes) => {
        const transfer = new DataTransfer();
        transfer.items.add(new File([new Uint8Array(bytes)], "homepage-test.png", { type: "image/png" }));
        element.dispatchEvent(new DragEvent("dragenter", { bubbles: true, dataTransfer: transfer }));
        element.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer }));
      }, [...source]);
    } else {
      const picker = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: "Choose images", exact: true }).click();
      await (await picker).setFiles({ name: "homepage-test.png", mimeType: "image/png", buffer: source });
    }
    await page.waitForURL("**/tools/image-converter");
    await page.getByText("1 image selected", { exact: true }).waitFor();
    assert.equal(await page.getByText("homepage-test.png", { exact: true }).count(), 1);
    assert.match(await page.getByRole("button", { name: "Convert to", exact: true }).textContent(), /webp/i);
    assert.equal(conversionRequests, 0, "Choosing a file must not upload it");
    await page.getByRole("button", { name: "Convert images", exact: true }).click();
    await page.getByRole("link", { name: "Download", exact: true }).waitFor();
    assert.equal(conversionRequests, 1);
    assert.deepEqual(errors, []);
    reports.push({ width, height, theme, overflow, navigation: "passed", handoff: "passed", conversion: "fixture passed", errors });
    await context.close();
  }
  console.log(JSON.stringify(reports, null, 2));
} finally {
  await browser.close();
}
