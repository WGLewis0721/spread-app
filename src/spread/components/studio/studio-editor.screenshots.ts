/**
 * Gate-50 proof of the actual mounted Customize editor, not a mock or body-only style hack.
 * Run with VITE_SPREAD_STUDIO=1 npm run dev and Playwright Chromium installed:
 *   node --experimental-strip-types src/spread/components/studio/studio-editor.screenshots.ts
 * Generated evidence is stored in screenshots/studio-editor and uploaded by CI.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const dir = join(root, "screenshots", "studio-editor");
const nativeInit = readFileSync(join(root, "scripts", "ios-bridge-sim", "native-init.js"), "utf8");
const url = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:8080";
const sizes = [{ width: 390, height: 844 }, { width: 820, height: 1180 }, { width: 1440, height: 900 }];
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? chromium.executablePath() });
const shots: string[] = [];
const errors: string[] = [];
try {
  const context = await browser.newContext();
  await context.exposeFunction("__fsRead", async () => null);
  await context.exposeFunction("__fsWrite", async () => {});
  await context.exposeFunction("__cloudSave", async () => ({ ok: true, tag: "shot" }));
  await context.exposeFunction("__cloudChanges", async () => ({ rows: [], seq: 0 }));
  await context.addInitScript(nativeInit);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.text().startsWith("[Studio import]")) console.log(message.text()); });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Spread" }).waitFor({ timeout: 30_000 });
  for (const scheme of ["light", "dark"] as const) {
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("heading", { name: "More" }).waitFor();
    await page.getByRole("radio", { name: scheme === "light" ? "Light" : "Dark" }).click();
    const entry = page.getByRole("button", { name: "Customize Spread" });
    await entry.waitFor();
    await entry.click();
    const editor = page.locator(".studio-sheet");
    await editor.getByRole("heading", { name: "Customize Spread" }).waitFor();
    const apply = editor.getByRole("button", { name: "Apply", exact: true });
    if (await apply.isEnabled()) throw Error("unedited session unexpectedly enabled Apply");
    for (const size of sizes) {
      await page.setViewportSize(size);
      const file = `editor-${scheme}-${size.width}-original.png`;
      await page.screenshot({ path: join(dir, file) });
      shots.push(file);
    }
    // Import a small high-contrast procedural image; no uploaded/third-party copyrighted art.
    const base64 = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 160; canvas.height = 160;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw Error("2D canvas unavailable");
      ctx.fillStyle = "#1d4e89"; ctx.fillRect(0, 0, 160, 160);
      ctx.strokeStyle = "#fff6d6"; ctx.lineWidth = 13;
      for (let x = -60; x < 200; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 60, 160); ctx.stroke(); }
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await editor.locator("input[type='file']").setInputFiles({
      name: "contrast-fixture.png", mimeType: "image/png", buffer: Buffer.from(base64, "base64"),
    });
    // Import errors should be diagnosable from CI without losing the screenshot.
    await page.screenshot({ path: join(dir, `editor-${scheme}-after-import.png`) });
    console.log("editor-after-import", JSON.stringify(await page.evaluate(() => ({
      sheetCount: document.querySelectorAll(".studio-sheet").length,
      dialogCount: document.querySelectorAll("[role='dialog']").length,
      bodyEnd: document.body.innerText.slice(-900),
      applyButtons: Array.from(document.querySelectorAll(".studio-sheet button")).filter((button) =>
        button.textContent?.includes("Apply") || button.textContent?.includes("Saving")
      ).map((button) => ({ text: button.textContent, disabled: (button as HTMLButtonElement).disabled })),
    }))));
    if (!(await editor.isVisible())) throw Error("Customize sheet disappeared after photo import: " + errors.join(" | "));
    await page.waitForFunction(() => {
      const button = Array.from(document.querySelectorAll(".studio-sheet button")).find((item) =>
        item.textContent?.trim() === "Apply"
      ) as HTMLButtonElement | undefined;
      return button && !button.disabled;
    }, null, { timeout: 30_000 });
    for (const size of sizes) {
      await page.setViewportSize(size);
      const file = `editor-${scheme}-${size.width}-wallpaper-draft.png`;
      await page.screenshot({ path: join(dir, file) });
      shots.push(file);
    }
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    await editor.waitFor({ state: "hidden" });
    await page.keyboard.press("Escape");
    await page.getByRole("heading", { name: "More" }).waitFor({ state: "hidden" });
  }
  writeFileSync(join(dir, "manifest.json"), JSON.stringify({ url, shots, errors, status: "captured mounted Customize, no Apply" }, null, 2));
  if (errors.length) throw Error(errors.join("\n"));
  console.log(`Captured ${shots.length} real Customize editor screenshots`);
} finally {
  await browser.close();
}
