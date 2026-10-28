/**
 * Evidence shots of the real planner. Not part of test:spread.
 * The React scope is not mounted in the app shell (that file is shared).
 * This script applies the same resolver output and render.css on document.body
 * so portaled sheets and toasts, which escape a wrapper, still show the materials.
 * Flag off removes the attribute. The planner theme attribute is changed only
 * through the existing Settings radios.
 *
 * Run with the dev server up:
 *   node --experimental-strip-types src/spread/components/studio/render.screenshots.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";
import { auditStudioContrast } from "./contrast-audit.ts";
import { openAppearance } from "./settings-steps.ts";
import { STUDIO_STYLE_KEYS, resolveStudioScope, type StudioScope } from "../../../lib/spread/studio/appearance.ts";
import {
  SAMPLE_SCHEMES,
  SAMPLE_WALLPAPER_ID,
  SAMPLE_WIDTHS,
  sampleAppearance,
} from "../../../lib/spread/studio/appearance-fixtures.ts";
import type { MaterialTreatment } from "../../../lib/spread/studio/contract.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..", "..");
const baseURL = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:8080";
const outDir = join(root, "screenshots", "studio-g3");
const artifactDir = process.env.STUDIO_ARTIFACT_DIR ?? outDir;
const nativeInit = readFileSync(join(root, "scripts", "ios-bridge-sim", "native-init.js"), "utf8");
const renderCss = readFileSync(join(here, "render.css"), "utf8");

const looks = ["off", "flat", "glass", "matte", "metal"] as const;
type Look = (typeof looks)[number];

const viewports: Record<(typeof SAMPLE_WIDTHS)[number], { width: number; height: number }> = {
  390: { width: 390, height: 844 },
  820: { width: 820, height: 1180 },
  1440: { width: 1440, height: 900 },
};

function scopeFor(look: Look, scheme: "light" | "dark", wallpaperUrl: string | null): StudioScope | null {
  if (look === "off") return null;
  const appearance = sampleAppearance(look as MaterialTreatment, scheme);
  return resolveStudioScope({
    enabled: true,
    appearance,
    systemScheme: scheme,
    wallpaper: wallpaperUrl ? { assetId: SAMPLE_WALLPAPER_ID, url: wallpaperUrl } : null,
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

async function openSettings(page: Page) {
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("heading", { name: "More" }).waitFor();
}

async function closeSettings(page: Page) {
  await page.keyboard.press("Escape");
  await page.getByRole("heading", { name: "More" }).waitFor({ state: "hidden" });
}

async function setScheme(page: Page, scheme: "light" | "dark") {
  await openSettings(page);
  await openAppearance(page);
  const radio = page.getByRole("radio", { name: scheme === "dark" ? "Dark" : "Light" });
  await radio.scrollIntoViewIfNeeded();
  await radio.click();
  await closeSettings(page);
  const theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  if (theme !== scheme) throw new Error(`planner theme is ${theme}, expected ${scheme}`);
}

async function save(page: Page, name: string, fullPage: boolean) {
  const file = `${name}.png`;
  await page.screenshot({ path: join(outDir, file), fullPage });
  await page.screenshot({ path: join(artifactDir, file), fullPage });
  return file;
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
  await add("Work", "Sketch the intro");
  await add("Health", "Call the clinic");
  await openWeek(page);
  const chip = page.locator("button[data-drag='spread']").filter({ hasText: /^Work/ }).first();
  await chip.scrollIntoViewIfNeeded();
  if ((await chip.getAttribute("aria-pressed")) !== "true") await chip.click();
  const sunday = page.locator("section.week-seq-item").filter({ has: page.getByRole("heading", { level: 2, name: /Sunday/ }) });
  await sunday.getByRole("button", { name: "Add Work" }).click();
  await placeOnSunday(page, "Outline the chapter");
  const seededUndo = page.getByRole("button", { name: "Undo" });
  await seededUndo.waitFor();
  await seededUndo.waitFor({ state: "hidden", timeout: 8_000 });
  await openSpread(page);
  await page.getByRole("checkbox", { name: "Mark done: Outline the chapter" }).click();
  await page.getByRole("checkbox", { name: "Mark not done: Outline the chapter" }).waitFor();
}

/** The role-group row also contains the task text, so match the task's own grip. */
function taskRow(page: Page, task: string) {
  return page.locator(`li:has(> div > button[aria-label="Move task ${task}"])`);
}

async function placeOnSunday(page: Page, task: string) {
  const place = taskRow(page, task).getByRole("button", { name: "Place", exact: true });
  await place.scrollIntoViewIfNeeded();
  await place.click();
  await page.getByRole("list", { name: `Days for ${task}` }).getByRole("button", { name: /^Sunday/ }).click();
}

async function shootUndo(page: Page, name: string) {
  await openWeek(page);
  await placeOnSunday(page, "Sketch the intro");
  await page.getByRole("button", { name: "Undo" }).waitFor();
  const file = await save(page, name, false);
  // The toast sits under the sticky header, so a normal click is intercepted, then the toast leaves.
  await page.getByRole("button", { name: "Undo" }).evaluate((node: HTMLButtonElement) => node.click());
  await taskRow(page, "Sketch the intro").getByRole("button", { name: "Place", exact: true }).waitFor();
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
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Spread" }).waitFor({ timeout: 30_000 });
    await page.addStyleTag({ content: renderCss });
    const wallpaperUrl = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 80;
      canvas.height = 80;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#1d4e89";
      ctx.fillRect(0, 0, 80, 80);
      ctx.strokeStyle = "#f4f1ea";
      ctx.lineWidth = 6;
      for (let x = -10; x < 90; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 30, 80);
        ctx.stroke();
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((value) => resolve(value), "image/png"));
      return blob ? URL.createObjectURL(blob) : null;
    });
    await setScheme(page, "light");
    await seed(page);
    if (process.env.STUDIO_AUDIT_ONLY !== "1") {
    for (const scheme of SAMPLE_SCHEMES) {
      await setScheme(page, scheme);
      for (const width of SAMPLE_WIDTHS) {
        await page.setViewportSize(viewports[width]);
        for (const look of looks) {
          const scope = scopeFor(look, scheme, wallpaperUrl);
          await paint(page, scope);
          const mark = await page.evaluate(() => ({
            html: document.documentElement.getAttribute("data-studio-appearance"),
            body: document.body.getAttribute("data-studio-appearance"),
          }));
          if (mark.html !== null) throw new Error("studio attribute leaked onto the document element");
          if (look === "off" && mark.body !== null) throw new Error("flag off left data-studio-appearance on body");
          if (look !== "off" && mark.body !== `${look}-sample`) throw new Error(`expected ${look}-sample, saw ${mark.body}`);
          const stem = `${scheme}-${width}-${look}`;
          await openWeek(page);
          files.push(await save(page, `week-${stem}`, true));
          await openSpread(page);
          files.push(await save(page, `spread-${stem}`, true));
          await openSettings(page);
          files.push(await save(page, `sheet-${stem}`, false));
          await closeSettings(page);
          files.push(await shootUndo(page, `undo-${stem}`));
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          process.stdout.write(`saved ${stem} overflow=${overflow}\n`);
        }
      }
    }
    }

    // Release-blocking browser audit: real Spread and Week with busy image, no
    // global scrim, both schemes and all supported preview widths.
    const contrastAudit: Record<string, Awaited<ReturnType<typeof auditStudioContrast>>> = {};
    for (const scheme of SAMPLE_SCHEMES) {
      await setScheme(page, scheme);
      for (const width of SAMPLE_WIDTHS) {
        await page.setViewportSize(viewports[width]);
        const appearance = sampleAppearance("glass", scheme);
        appearance.wallpaper = { ...appearance.wallpaper, dim: 0 };
        const scope = resolveStudioScope({
          enabled: true,
          appearance,
          systemScheme: scheme,
          wallpaper: wallpaperUrl ? { assetId: SAMPLE_WALLPAPER_ID, url: wallpaperUrl } : null,
        });
        for (const view of ["week", "spread"] as const) {
          await paint(page, scope);
          if (view === "week") await openWeek(page);
          else await openSpread(page);
          const violations = await auditStudioContrast(page);
          const key = `${view}-${scheme}-${width}-dim0`;
          contrastAudit[key] = violations;
          files.push(await save(page, `audit-${key}`, false));
          console.log(`contrast-audit ${key}: ${violations.length} violations`);
          if (violations.length) console.error(JSON.stringify(violations.slice(0, 30), null, 2));
        }
      }
    }
    writeFileSync(join(outDir, "contrast-audit.json"), JSON.stringify(contrastAudit, null, 2));
    if (Object.values(contrastAudit).some((issues) => issues.length > 0)) {
      process.exitCode = 1;
    }

    await page.setViewportSize(viewports[390]);
    for (const scheme of SAMPLE_SCHEMES) {
      await setScheme(page, scheme);
      const appearance = sampleAppearance("glass", scheme);
      appearance.wallpaper = { ...appearance.wallpaper, dim: 0 };
      const scope = resolveStudioScope({
        enabled: true,
        appearance,
        systemScheme: scheme,
        wallpaper: wallpaperUrl ? { assetId: SAMPLE_WALLPAPER_ID, url: wallpaperUrl } : null,
      });
      await paint(page, scope);
      await openWeek(page);
      const name = `week-${scheme}-390-glass-dim0`;
      files.push(await save(page, name, true));
      process.stdout.write(`saved ${name}\n`);
    }
    const manifest = {
      baseURL,
      files,
      pageErrors,
      contrastAudit,
      note: "Harness applied resolver output on body because the shared planner shell is not wrapped. Flag off has no data-studio-appearance. Spread frames include hour banks and a completed task. Week frames include the crown, day cards, hour chips, To place, and task rows. week-*-390-glass-dim0 uses glass with wallpaper dim 0.",
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
