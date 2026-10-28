/**
 * Evidence shots of the real planner for Studio UI.
 * Not part of test:spread.
 *
 * The Customize entry is not mounted: that edit is a shared-file request.
 * Flag off is the untouched planner. Flag on applies resolveStudioScope on
 * document.body, the same harness G3 used, because the shared shell is not wrapped.
 *
 * The image is drawn in the page. It is not a photograph and not a team mark.
 *
 * Run with the dev server up:
 *   node --experimental-strip-types src/spread/components/studio/studio-ui.screenshots.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";
import { resolveStudioScope, STUDIO_STYLE_KEYS, type StudioScope } from "../../../lib/spread/studio/appearance.ts";
import { originalStudioAppearance, type StudioAppearanceV1 } from "../../../lib/spread/studio/contract.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..", "..");
const baseURL = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:8080";
const outDir = join(root, "screenshots", "studio-g1");
const artifactDir = process.env.STUDIO_ARTIFACT_DIR ?? outDir;
const nativeInit = readFileSync(join(root, "scripts", "ios-bridge-sim", "native-init.js"), "utf8");
const renderCss = readFileSync(join(here, "render.css"), "utf8");
const widths = [390, 402, 820, 1440] as const;
const schemes = ["light", "dark"] as const;
const WALLPAPER_ID = "wall-1";

function appearance(scheme: "light" | "dark", image: boolean): StudioAppearanceV1 {
  const base = originalStudioAppearance();
  return {
    ...base,
    id: image ? "custom-photo" : "custom-color",
    name: "Custom",
    mode: scheme,
    ...(image ? { wallpaperAssetId: WALLPAPER_ID } : {}),
    wallpaper: { fit: "cover", positionX: 30, positionY: 40, dim: image ? 0.35 : 0, blur: 0 },
    palette:
      scheme === "dark"
        ? { accent: "#ffb088", surface: "#1c1c1e", text: "#f5f5f7", secondaryText: "#c7c7cc" }
        : { accent: "#8a3e12", surface: "#f4f1ea", text: "#1d1d1f", secondaryText: "#6e6e73" },
    material: { treatment: "flat", transparency: 0, depth: 0 },
    typography: { presetId: "system", scale: 1, numeralEmphasis: 0 },
    controls: { density: "comfortable", treatmentId: "original" },
    effects: { decorationIntensity: 0, animationIntensity: 0 },
  };
}

function scopeFor(mode: "off" | "color" | "image", scheme: "light" | "dark", wallpaperUrl: string | null): StudioScope | null {
  if (mode === "off") return null;
  return resolveStudioScope({
    enabled: true,
    appearance: appearance(scheme, mode === "image"),
    systemScheme: scheme,
    wallpaper: mode === "image" && wallpaperUrl ? { assetId: WALLPAPER_ID, url: wallpaperUrl } : null,
  });
}

async function paint(page: Page, scope: StudioScope | null) {
  await page.evaluate(
    ({ scope: next, keys }) => {
      const root = document.body;
      for (const key of keys) root.style.removeProperty(key);
      if (!next) {
        root.removeAttribute("data-studio-appearance");
        root.removeAttribute("data-studio-material");
        root.removeAttribute("data-studio-scheme");
        root.removeAttribute("data-studio-density");
        return;
      }
      root.setAttribute("data-studio-appearance", next.attribute ?? "");
      root.setAttribute("data-studio-material", next.material);
      root.setAttribute("data-studio-scheme", next.scheme);
      root.setAttribute("data-studio-density", next.density);
      for (const [key, value] of Object.entries(next.style)) root.style.setProperty(key, value);
    },
    { scope, keys: [...STUDIO_STYLE_KEYS] },
  );
}

async function openWeek(page: Page) {
  await page.getByRole("tab", { name: "Week" }).click();
  await page.getByRole("heading", { level: 2, name: /Sunday/ }).first().waitFor();
}

async function openSpread(page: Page) {
  await page.getByRole("tab", { name: "Spread" }).click();
  await page.getByRole("button", { name: /^Work, / }).waitFor();
}

async function setScheme(page: Page, scheme: "light" | "dark") {
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("heading", { name: "More" }).waitFor();
  const radio = page.getByRole("radio", { name: scheme === "dark" ? "Dark" : "Light" });
  await radio.scrollIntoViewIfNeeded();
  await radio.click();
  await page.keyboard.press("Escape");
  await page.getByRole("heading", { name: "More" }).waitFor({ state: "hidden" });
}

async function seed(page: Page) {
  const add = async (spread: string, text: string) => {
    const section = page.locator("section[id^='spread-role-']").filter({
      has: page.getByRole("textbox", { name: `${spread} name`, exact: true }),
    });
    const box = section.getByRole("textbox", { name: /What matters most here\?|Add a task/ });
    await box.fill(text);
    await box.press("Enter");
    await section.getByRole("button", { name: text, exact: true }).waitFor();
  };
  await openSpread(page);
  await add("Work", "Outline the chapter");
  await add("Health", "Call the clinic");
  await openWeek(page);
  const chip = page.locator("button[data-drag='spread']").filter({ hasText: /^Work/ }).first();
  await chip.scrollIntoViewIfNeeded();
  if ((await chip.getAttribute("aria-pressed")) !== "true") await chip.click();
  const sunday = page.locator("section.week-seq-item").filter({ has: page.getByRole("heading", { level: 2, name: /Sunday/ }) });
  await sunday.getByRole("button", { name: "Add Work" }).click();
  const place = page.locator(`li:has(> div > button[aria-label="Move task Outline the chapter"])`).getByRole("button", { name: "Place", exact: true });
  await place.scrollIntoViewIfNeeded();
  await place.click();
  await page.getByRole("list", { name: "Days for Outline the chapter" }).getByRole("button", { name: /^Sunday/ }).click();
  const undo = page.getByRole("button", { name: "Undo" });
  await undo.waitFor();
  await undo.waitFor({ state: "hidden", timeout: 8_000 });
  await openSpread(page);
}

async function save(page: Page, name: string) {
  const file = `${name}.png`;
  await page.screenshot({ path: join(outDir, file) });
  await page.screenshot({ path: join(artifactDir, file) });
  return file;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  mkdirSync(artifactDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH ?? chromium.executablePath(),
  });
  const pageErrors: string[] = [];
  const files: string[] = [];
  try {
    const context = await browser.newContext();
    await context.exposeFunction("__fsRead", async () => null);
    await context.exposeFunction("__fsWrite", async () => {});
    await context.exposeFunction("__cloudSave", async () => ({ ok: true, tag: "shot" }));
    await context.exposeFunction("__cloudChanges", async () => ({ rows: [], seq: 0 }));
    await context.addInitScript(nativeInit);
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Spread" }).waitFor({ timeout: 30_000 });
    await page.addStyleTag({ content: renderCss });
    const wallpaperUrl = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = "#f4f1ea";
      ctx.fillRect(8, 8, 48, 20);
      ctx.fillStyle = "#8a3e12";
      ctx.fillRect(8, 36, 48, 20);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((value) => resolve(value), "image/png"));
      return blob ? URL.createObjectURL(blob) : null;
    });
    await setScheme(page, "light");
    await seed(page);
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("heading", { name: "More" }).waitFor();
    const customize = await page.getByRole("button", { name: "Customize Spread" }).count();
    if (customize !== 0) throw new Error("flag off showed Customize");
    files.push(await save(page, "settings-390-light-flag-off"));
    await page.keyboard.press("Escape");
    for (const scheme of schemes) {
      await setScheme(page, scheme);
      for (const width of widths) {
        await page.setViewportSize({ width, height: width === 1440 ? 900 : width === 820 ? 1180 : width === 402 ? 874 : 844 });
        for (const mode of ["off", "color", "image"] as const) {
          const scope = scopeFor(mode, scheme, wallpaperUrl);
          await paint(page, scope);
          const mark = await page.evaluate(() => document.body.getAttribute("data-studio-appearance"));
          if (mode === "off" && mark !== null) throw new Error("flag off left a studio attribute");
          if (mode === "color" && mark !== "custom-color") throw new Error(`color scope was ${mark}`);
          if (mode === "image" && mark !== "custom-photo") throw new Error(`image scope was ${mark}`);
          await openSpread(page);
          files.push(await save(page, `spread-${scheme}-${width}-${mode}`));
          await openWeek(page);
          files.push(await save(page, `week-${scheme}-${width}-${mode}`));
        }
      }
    }
    const manifest = {
      baseURL,
      files,
      pageErrors,
      image: "Procedural abstract canvas. Not a photograph and not a team mark.",
      note: "Customize is not mounted, so flag off is the current More sheet. Flag on frames paint resolveStudioScope on the body because the shared planner shell is not wrapped.",
    };
    writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    writeFileSync(join(artifactDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    if (pageErrors.length) {
      console.error(pageErrors.join("\n"));
      process.exitCode = 1;
    }
    console.log(`wrote ${files.length} screenshots`);
  } finally {
    await browser.close();
  }
}

await main();
