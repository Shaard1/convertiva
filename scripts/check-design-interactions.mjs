import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { workingToolConfigs } from "../lib/tools/workingToolConfigs.ts";

// Isolated browser sessions and fixture APIs: no real files, accounts or quotas.
const base = process.env.DESIGN_TEST_URL ?? "http://127.0.0.1:3020";
const output = "test-results/design-interactions";
await mkdir(output, { recursive: true });
const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#456b50" } }).png().toBuffer();
const browser = await chromium.launch({ channel: "msedge", headless: true });
const reports = [];
const usage = (remaining = 15) => ({ data: { conversionsUsed: 15 - remaining, limit: 15, remaining, label: "Guest", isGuest: true, date: new Date().toISOString().slice(0, 10) }, error: null });

try {
  for (const theme of ["light", "dark"]) for (const width of [1366, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, colorScheme: theme });
    await context.addInitScript((value) => localStorage.setItem("convertly-theme", value), theme);
    await context.route("**/api/v1/usage", (route) => route.fulfill({ json: usage() }));
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const snapshot = async (name) => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, `${name} overflow`);
      await page.screenshot({ path: `${output}/${name}-${width}-${theme}.png`, fullPage: true, animations: "disabled" });
    };

    await page.goto(`${base}/help`, { waitUntil: "networkidle" });
    const question = page.getByRole("button", { name: "Why was my file rejected?" });
    await question.focus(); await page.keyboard.press("Enter");
    assert.equal(await question.getAttribute("aria-expanded"), "true");
    assert.notEqual(await question.evaluate((el) => getComputedStyle(el).outlineStyle), "none");
    await snapshot("help-open");
    await page.keyboard.press("Enter");
    assert.equal(await question.getAttribute("aria-expanded"), "false");

    if (width < 1024) await page.getByRole("button", { name: "Open navigation menu", exact: true }).click();
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    const authDialog = page.getByRole("dialog");
    await authDialog.waitFor();
    await authDialog.locator("input").first().focus();
    assert.notEqual(await authDialog.locator("input").first().evaluate((el) => getComputedStyle(el).outlineStyle), "none");
    await snapshot("auth-dialog");
    await page.keyboard.press("Escape");
    await authDialog.waitFor({ state: "hidden" });

    await page.goto(`${base}/contact`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Open email draft" }).click();
    assert.equal(await page.locator("form").evaluate((el) => el.checkValidity()), false);
    await page.getByLabel("Name", { exact: true }).fill("Interface test");
    await page.getByLabel("Email", { exact: true }).fill("test@example.com");
    await page.getByLabel("What can we help with?").selectOption("Bug report");
    await page.getByLabel("Subject", { exact: true }).fill("Design check");
    await page.getByLabel("Message", { exact: true }).fill("Local interface verification; no email is sent.");
    assert.equal(await page.locator("form").evaluate((el) => el.checkValidity()), true);
    await snapshot("contact-valid");
    // The existing handler prepares a mailto draft; this never sends a message.
    await page.getByRole("button", { name: "Open email draft" }).click();
    await page.getByRole("status").filter({ hasText: "Your email app should open" }).waitFor();

    await page.goto(`${base}/terms`, { waitUntil: "networkidle" });
    await page.locator("aside nav a").nth(1).click();
    assert.ok(new URL(page.url()).hash);
    await page.goto(`${base}/reset-password`, { waitUntil: "networkidle" });
    await page.getByLabel("New password", { exact: true }).fill("test-password-one");
    await page.getByLabel("Confirm password", { exact: true }).fill("test-password-two");
    await page.getByRole("button", { name: "Show password", exact: true }).click();
    assert.equal(await page.getByLabel("New password", { exact: true }).getAttribute("type"), "text");
    await page.getByRole("button", { name: "Update password", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Passwords do not match" }).waitFor();
    await snapshot("reset-validation");

    for (const [id, config] of Object.entries(workingToolConfigs)) {
      let release;
      let requested;
      const requestedPromise = new Promise((resolve) => { requested = resolve; });
      const releasePromise = new Promise((resolve) => { release = resolve; });
      let count = 0;
      await page.route(`**${config.apiRoute}`, async (route) => {
        count += 1;
        assert.equal(route.request().method(), "POST");
        if (count === 1) {
          requested(); await releasePromise;
          await route.fulfill({ status: 422, json: { error: "Fixture: this file could not be processed. Choose another file or retry." } });
        } else await route.fulfill({ contentType: "application/octet-stream", headers: { "x-converted-file-name": "verified-result.bin" }, body: png });
      });
      await page.goto(`${base}/tools/${id}`, { waitUntil: "networkidle" });
      const action = page.getByRole("button", { name: config.convertButtonLabel, exact: true });
      assert.equal(await action.isDisabled(), true);
      if (config.inputMode === "url") await page.getByLabel("Website URL").fill("https://example.com");
      else {
        const files = [{ name: "test.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7 fixture") }];
        if (config.allowMultiple) files.push({ name: "second.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7 fixture") });
        // Exercise the visible picker; server validation is separately covered by tests.
        const chooser = page.waitForEvent("filechooser");
        await page.getByRole("button", { name: config.selectButtonLabel, exact: true }).click();
        await (await chooser).setFiles(files);
      }
      if (config.outputFormats?.length) {
        await page.getByRole("button", { name: "Convert to", exact: true }).click();
        await page.getByRole("dialog", { name: "Choose output format" }).getByRole("button", { name: config.outputFormats.at(-1).label, exact: true }).click();
      }
      await action.click(); await requestedPromise;
      assert.equal(await page.getByRole("button", { name: "Working...", exact: true }).isDisabled(), true);
      if (id === "compress-png") await snapshot(`${id}-processing`);
      release();
      await page.getByRole("alert").filter({ hasText: "Fixture:" }).waitFor();
      if (id === "compress-png") await snapshot(`${id}-error`);
      await action.click();
      const download = page.getByRole("link", { name: "Download", exact: true });
      await download.waitFor();
      assert.equal(await download.getAttribute("download"), "verified-result.bin");
      const downloaded = page.waitForEvent("download"); await download.click(); await downloaded;
      if (["compress-png", "website-to-pdf", "merge-pdf"].includes(id)) await snapshot(`${id}-success`);
      await page.getByRole("button", { name: "Start again", exact: true }).click();
      assert.equal(await action.isDisabled(), true);
      assert.equal(count, 2);
      await page.unroute(`**${config.apiRoute}`);
      reports.push({ id, theme, width, picker: "passed", processing: "passed", error: "passed", retry: "passed", download: "fixture passed" });
    }

    for (const [kind, format, mime] of [["image", "png", "image/png"], ["video", "mp4", "video/mp4"], ["audio", "mp3", "audio/mpeg"], ["document", "pdf", "application/pdf"]]) {
      await page.goto(`${base}/tools/${kind}-converter`, { waitUntil: "networkidle" });
      if (kind === "image") {
        const sources = page.getByRole("button", { name: "Select images", exact: true });
        await sources.click();
        assert.equal(await sources.getAttribute("aria-expanded"), "true");
        await page.keyboard.press("Escape");
        assert.equal(await sources.getAttribute("aria-expanded"), "false");
        await sources.click();
        await page.getByRole("button", { name: "By URL", exact: true }).click();
        await page.getByLabel("Image URL", { exact: true }).fill("https://example.com/image.png");
        await page.route("**/api/import-url", (route) => route.fulfill({ status: 422, json: { error: "Fixture: this image URL cannot be imported." } }));
        await page.getByRole("button", { name: "Add image", exact: true }).click();
        await page.getByRole("alert").filter({ hasText: "Fixture: this image URL" }).waitFor();
        await page.unroute("**/api/import-url");
      }
      const picker = page.getByRole("button", { name: "Convert to", exact: true });
      await picker.focus(); await page.keyboard.press("Enter");
      await page.getByRole("dialog", { name: "Choose output format" }).waitFor();
      await page.getByLabel("Search format", { exact: true }).fill("zzz-no-match");
      await page.getByRole("status").filter({ hasText: "No matching format" }).waitFor();
      await snapshot(`${kind}-format-empty`);
      await page.keyboard.press("Escape");
      assert.equal(await picker.evaluate((el) => el === document.activeElement), true);
      await picker.click();
      await page.getByLabel("Search format", { exact: true }).fill("");
      await page.getByRole("dialog", { name: "Choose output format" }).getByRole("button", { name: format.toUpperCase(), exact: true }).click();
      await page.locator('input[type="file"]').setInputFiles({ name: `test.${format}`, mimeType: mime, buffer: kind === "image" ? png : Buffer.from("fixture") });
      await page.getByRole("button", { name: "Options", exact: true }).first().click();
      await page.getByRole("dialog").waitFor();
      await snapshot(`${kind}-options`);
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      const api = kind === "image" ? "/api/convert" : `/api/convert-${kind}`;
      await page.route(`**${api}`, (route) => route.fulfill({ status: 501, json: { error: "Fixture: conversion is temporarily unavailable." } }));
      await page.getByRole("button", { name: kind === "image" ? "Convert images" : `Convert ${kind}`, exact: true }).click();
      await page.getByRole("alert").filter({ hasText: "Fixture:" }).waitFor();
      await snapshot(`${kind}-conversion-error`);
      await page.unroute(`**${api}`);
      reports.push({ id: `${kind}-converter`, width, theme, formatSearch: "passed", keyboard: "passed", options: "passed", unavailableError: "passed" });
    }

    // Quota views must keep the primary action disabled before any API call.
    await context.unroute("**/api/v1/usage");
    await context.route("**/api/v1/usage", (route) => route.fulfill({ json: usage(0) }));
    for (const id of ["image-converter", "video-converter", "audio-converter", "document-converter", "compress-png"]) {
      await page.goto(`${base}/tools/${id}`, { waitUntil: "networkidle" });
      await page.getByText("0 conversions left", { exact: true }).first().waitFor({ state: "attached" });
      await page.getByRole("status").filter({ hasText: "Daily conversion limit reached" }).waitFor();
      await snapshot(`${id}-quota`);
      assert.ok(await page.locator("main button:disabled").count() > 0);
    }
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`Passed interactions: ${width}px ${theme}`);
  }
  await writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
  console.log(`PASS: ${reports.length} converter interaction scenarios plus forms, legal navigation, and quota views`);
} finally { await browser.close(); }
