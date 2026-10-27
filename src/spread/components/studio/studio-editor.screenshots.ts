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
import { auditStudioContrast } from "./contrast-audit.ts";
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
  // The native simulator must retain file bytes just like Capacitor Filesystem.
  // Without this backing map a Studio import cannot be read back into its preview.
  const fakeNativeFiles = new Map<string, string>();
  await context.exposeFunction("__fsRead", async (path: string) => fakeNativeFiles.get(path) ?? null);
  await context.exposeFunction("__fsWrite", async (path: string, data: string) => { fakeNativeFiles.set(path, data); });
  await context.exposeFunction("__cloudSave", async () => ({ ok: true, tag: "shot" }));
  await context.exposeFunction("__cloudChanges", async () => ({ rows: [], seq: 0 }));
  await context.addInitScript(nativeInit);
  const page = await context.newPage();
  // Deliberately keep the OS light while testing BOTH Spread Settings choices.
  // If Studio uses OS media instead of Spread Settings, the dark case must fail.
  await page.emulateMedia({ colorScheme: "light" });
  page.on("pageerror", (error) => errors.push(String(error)));

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Spread" }).waitFor({ timeout: 30_000 });
  for (const scheme of ["light", "dark"] as const) {
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("heading", { name: "More" }).waitFor();
    await page.getByRole("radio", { name: scheme === "light" ? "Light" : "Dark" }).click();
    const plannerSetting = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    if (plannerSetting !== scheme) throw new Error(`Expected Spread Settings ${scheme}, got ${plannerSetting}`);
    const entry = page.getByRole("button", { name: "Customize Spread" });
    await entry.waitFor();
    await entry.click();
    const editor = page.locator(".studio-sheet");
    await editor.getByRole("heading", { name: "Customize Spread" }).waitFor();
    await page.waitForTimeout(530); // capture the settled sheet, not its entrance animation
    const apply = editor.getByRole("button", { name: "Apply", exact: true });
    if (await apply.isEnabled()) throw Error("unedited session unexpectedly enabled Apply");
    for (const size of sizes) {
      await page.setViewportSize(size);
      const file = `editor-${scheme}-${size.width}-original.png`;
      await page.screenshot({ path: join(dir, file) });
      shots.push(file);
    }
    // Verify all four curated looks in the *mounted editor*, not only object-level tests.
    // A click must immediately update real scoped planner preview paint, but not persist.
    for (const starter of [
      { name: "Personal Canvas", id: "studio-personal", controls: "original", font: "Georgia" },
      { name: "Retro Desk", id: "studio-retro", controls: "desktop", font: "mono" },
      { name: "Clear Glass", id: "studio-glass", controls: "soft-glass", font: "apple-system" },
      { name: "Dynamic Ink", id: "studio-illustrated", controls: "illustrated", font: "Arial Black" },
    ]) {
      await editor.getByRole("button", { name: new RegExp("^" + starter.name) }).click();
      const preview = editor.locator("[data-studio-appearance]").first();
      await preview.waitFor({ state: "visible" });
      const drawn = await preview.evaluate((el) => ({
        id: el.getAttribute("data-studio-appearance"),
        controls: el.getAttribute("data-studio-controls"),
        font: getComputedStyle(el).getPropertyValue("--font-sans"),
      }));
      if (drawn.id !== starter.id || drawn.controls !== starter.controls || !drawn.font.includes(starter.font)) {
        throw new Error(`Starter ${starter.name} preview mismatch: ${JSON.stringify(drawn)}`);
      }
      // Check each stage of the actual weekly planning workflow with the same starter.
      for (const stage of ["Roles", "Hours", "Week", "Tasks"]) {
        await editor.getByRole("tab", { name: stage, exact: true }).click();
        const selected = await editor.getByRole("tab", { name: stage, exact: true }).getAttribute("aria-selected");
        if (selected !== "true") throw new Error(`Preview step ${stage} did not select`);
        if (stage === "Hours" && await editor.getByText("Allocated this week").count() !== 1) {
          throw new Error("Hours preview missing the real plan readout");
        }
      }
      await editor.getByRole("tab", { name: "Roles", exact: true }).click();
      await page.setViewportSize({ width: 390, height: 844 });
      const capture = `starter-${scheme}-${starter.id}-390.png`;
      await page.screenshot({ path: join(dir, capture) });
      shots.push(capture);
    }
    // A section choice must change the *computed geometry* of the actual role/week cards.
    await editor.getByRole("button", { name: /^Dynamic Ink/ }).click();
    await editor.getByRole("radio", { name: "Responsibility cards: Frame" }).click();
    const roleCard = editor.locator("[data-studio-appearance] .studio-role-card").first();
    await roleCard.waitFor();
    const outlined = await roleCard.evaluate((el) => ({
      width: getComputedStyle(el).borderTopWidth,
      radius: getComputedStyle(el).borderTopLeftRadius,
    }));
    if (outlined.width !== "1px" || outlined.radius !== "6px") {
      throw new Error(`Responsibility treatment did not change actual card geometry: ${JSON.stringify(outlined)}`);
    }
    await editor.getByRole("radio", { name: "Responsibility cards: Ink" }).click();
    const inked = await roleCard.evaluate((el) => ({
      width: getComputedStyle(el).borderTopWidth,
      radius: getComputedStyle(el).borderTopLeftRadius,
    }));
    if (inked.width !== "2px" || inked.radius !== "14px") {
      throw new Error(`Comic treatment did not change actual card geometry: ${JSON.stringify(inked)}`);
    }
    for (const part of ["Week crown", "Responsibility cards", "Week cards", "Task rows", "Navigation dock"]) {
      await editor.getByRole("radio", { name: part + ": Ink" }).click();
    }
    await editor.getByRole("tab", { name: "Week", exact: true }).click();
    const dayCard = editor.locator("[data-studio-appearance] .week-seq-item").first();
    await dayCard.waitFor();
    const dayPaint = await dayCard.evaluate((el) => ({
      top: getComputedStyle(el).borderTopWidth,
      radius: getComputedStyle(el).borderTopLeftRadius,
    }));
    if (dayPaint.top !== "6px" || dayPaint.radius !== "16px") {
      throw new Error(`Week treatment did not change card geometry: ${JSON.stringify(dayPaint)}`);
    }
    await editor.getByRole("tab", { name: "Roles", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    const artShot = `dynamic-ink-elements-${scheme}-390.png`;
    await page.screenshot({ path: join(dir, artShot) });
    shots.push(artShot);
    // Cancel must throw away all four previews and restore the prior saved look.
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    await editor.waitFor({ state: "hidden" });
    await entry.click();
    await editor.getByRole("heading", { name: "Customize Spread" }).waitFor();
    if (await editor.getByRole("button", { name: "Apply", exact: true }).isEnabled()) {
      throw new Error("Cancelling starter previews unexpectedly left an unsaved draft");
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
    const draftScheme = await editor.locator("[data-studio-scheme]").first().getAttribute("data-studio-scheme");
    if (draftScheme !== scheme) throw new Error(`N3: editor preview scheme ${draftScheme}, expected ${scheme} with light OS`);
    for (const size of sizes) {
      await page.setViewportSize(size);
      const file = `editor-${scheme}-${size.width}-wallpaper-draft.png`;
      await page.screenshot({ path: join(dir, file) });
      shots.push(file);
    }
    // Apply a personal photo in this isolated browser context and prove the
    // REAL live planner (not merely a preview) adopts the saved appearance.
    await editor.getByRole("button", { name: "Apply", exact: true }).click();
    await editor.waitFor({ state: "hidden", timeout: 15_000 });
    // Closing the nested Customize portal returns to More. Explicitly close the
    // underlying More sheet, since Escape is consumed by Radix during unmount.
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("heading", { name: "More" }).waitFor({ state: "hidden" });
    await page.waitForFunction(() => {
      const scope = document.querySelector<HTMLElement>("[data-studio-appearance]");
      return !!scope && getComputedStyle(scope).getPropertyValue("--studio-wallpaper-image").includes("blob:");
    }, null, { timeout: 15_000 });
    // A wallpaper must paint under the header from the top of the viewport,
    // not begin at the old opaque sticky bar's bottom edge.
    const wallpaperPaint = await page.locator("[data-studio-wallpaper='on']").first().evaluate((scope) => {
      const header = scope.querySelector<HTMLElement>(".bar-fade");
      if (!header) return null;
      const headerPaint = getComputedStyle(header);
      const fade = getComputedStyle(header, "::after");
      const backdrop = getComputedStyle(scope, "::before");
      return {
        headerBackground: headerPaint.backgroundColor,
        headerImage: headerPaint.backgroundImage,
        fade: fade.display,
        backdropPosition: backdrop.position,
        backdropSize: backdrop.backgroundSize,
        backdropTop: backdrop.top,
        image: backdrop.backgroundImage,
      };
    });
    if (!wallpaperPaint ||
      wallpaperPaint.headerBackground !== "rgba(0, 0, 0, 0)" ||
      wallpaperPaint.headerImage !== "none" ||
      wallpaperPaint.fade !== "none" ||
      wallpaperPaint.backdropPosition !== "fixed" ||
      !wallpaperPaint.backdropSize.includes("cover") ||
      !wallpaperPaint.image.includes("blob:")) {
      throw new Error("Wallpaper does not extend behind the full-height planner header: " + JSON.stringify(wallpaperPaint));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const fullWallpaperShot = `live-fullscreen-wallpaper-${scheme}-390.png`;
    await page.screenshot({ path: join(dir, fullWallpaperShot) });
    shots.push(fullWallpaperShot);
    await page.getByRole("tab", { name: "Week" }).click();
    await page.waitForFunction((expected) => document.querySelector("[data-studio-appearance]")?.getAttribute("data-studio-scheme") === expected, scheme);
    // Verify the real Week planner has three useful sheet positions only when
    // a personal wallpaper is selected. The Week content is the existing live planner.
    const stage = page.locator(".studio-week-stage");
    await stage.waitFor({state:"visible"});
    const firstDetent=await stage.getAttribute("data-studio-detent");
    if(firstDetent!=="half")throw new Error(`Expected default Half sheet, got ${firstDetent}`);
    const firstPosition=await stage.evaluate((el)=>({
      position:getComputedStyle(el).position,
      top:Math.round(el.getBoundingClientRect().top),
      viewport:window.innerHeight,
    }));
    if(firstPosition.position!=="fixed"||Math.abs(firstPosition.top/firstPosition.viewport-.47)>.03)
      throw new Error(`Half sheet not at its viewport detent: ${JSON.stringify(firstPosition)}`);
    const detentToggle=page.getByRole("button",{name:/Week sheet (half|peek|full)/});
    // Three distinct positions must be reachable through the accessible grabber.
    await detentToggle.click(); // Half -> Full
    await page.waitForTimeout(470);
    if(await stage.getAttribute("data-studio-detent")!=="full")throw new Error("Full detent did not open");
    const fullPaint=await stage.evaluate(el=>({
      overflow:getComputedStyle(el).overflowY,
      maxScroll:el.scrollHeight-el.clientHeight,
    }));
    if(fullPaint.overflow!=="auto"||fullPaint.maxScroll<=0)throw new Error("Full sheet is not scrollable: "+JSON.stringify(fullPaint));
    await stage.evaluate(el=>{el.scrollTop=el.scrollHeight});
    await page.waitForTimeout(80);
    const end=await page.locator(".studio-week-stage [data-day]").last().evaluate(el=>el.getBoundingClientRect().bottom);
    const dockTop=await page.locator(".app-dock").first().evaluate(el=>el.getBoundingClientRect().top);
    if(end>dockTop-4)throw new Error(`Final day is hidden behind floating dock: day=${end} dock=${dockTop}`);
    await detentToggle.click(); // Full -> Peek
    await page.waitForTimeout(470);
    if(await stage.getAttribute("data-studio-detent")!=="peek")throw new Error("Peek detent did not open");
    if(await stage.locator(".studio-week-scrollbody").isVisible())throw new Error("Peek should reveal the wallpaper subject");
    await page.setViewportSize({width:390,height:844});
    const peekShot=`studio-week-peek-${scheme}-390.png`;
    await page.screenshot({path:join(dir,peekShot)});shots.push(peekShot);
    await detentToggle.click(); // Peek -> Half
    await page.waitForTimeout(470);
    const halfShot=`studio-week-half-${scheme}-390.png`;
    await page.screenshot({path:join(dir,halfShot)});shots.push(halfShot);
    await detentToggle.click(); // Half -> Full for existing readability and screenshot tests.
    await page.waitForTimeout(470);
    const fullShot=`studio-week-full-${scheme}-390.png`;
    await page.screenshot({path:join(dir,fullShot)});shots.push(fullShot);
    const actualScheme = await page.locator("[data-studio-appearance]").getAttribute("data-studio-scheme");
    if (actualScheme !== scheme) throw new Error(`N3: saved Week scheme ${actualScheme}, expected ${scheme} with light OS`);
    // Attribute alone is not proof: catch light cards incorrectly rendered in dark mode.
    const elevated = await page.locator("[data-studio-appearance]").first().evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--elevated").trim()
    );
    if (!/^#[0-9a-fA-F]{6}$/.test(elevated)) throw Error(`Missing solid elevated surface: ${elevated}`);
    const channels = [1, 3, 5].map((offset) => Number.parseInt(elevated.slice(offset, offset + 2), 16));
    const surfaceBrightness = channels.reduce((sum, value) => sum + value, 0) / 3;
    if ((scheme === "dark" && surfaceBrightness >= 100) || (scheme === "light" && surfaceBrightness <= 140)) {
      throw Error(`N3: visual ${scheme} palette incorrect: surface=${elevated}, brightness=${surfaceBrightness}`);
    }
    console.log(`N3 planner-theme light-OS/${scheme}-Settings -> live Week ${actualScheme}, card ${elevated}`);
    await page.waitForTimeout(600); // Settled transition; avoid misleading half-opacity capture.
    for (const size of sizes) {
      await page.setViewportSize(size);
      const actual = `live-week-${scheme}-${size.width}-saved-photo.png`;
      await page.screenshot({ path: join(dir, actual) });
      shots.push(actual);
      const issues = await auditStudioContrast(page);
      console.log(`live-scope-contrast ${scheme}-${size.width}: ${issues.length}`);
      if (issues.length) {
        console.error(JSON.stringify(issues.slice(0, 30), null, 2));
        throw new Error(`live saved wallpaper contrast audit failed: ${scheme} ${size.width} ${issues.length} violations`);
      }
    }
  }
  // When Spread Settings is System, follow changes to the OS as well.
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("heading", { name: "More" }).waitFor();
  await page.getByRole("radio", { name: "System" }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  for (const os of ["dark", "light"] as const) {
    await page.emulateMedia({ colorScheme: os });
    await page.waitForFunction((expected) => document.querySelector("[data-studio-appearance]")?.getAttribute("data-studio-scheme") === expected, os);
    console.log(`N3 planner-theme system / OS ${os} -> live Week ${os}`);
  }

  // Persist a starter and prove that the real planner adopts it across both tabs.
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Customize Spread" }).click();
  const studio = page.locator(".studio-sheet");
  await studio.getByRole("button", { name: /^Retro Desk/ }).click();
  await studio.getByRole("button", { name: "Apply", exact: true }).click();
  await studio.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  for (const tab of ["Spread", "Week"]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await page.waitForFunction(() => document.querySelector("[data-studio-controls='desktop'][data-studio-appearance='studio-retro']") !== null);
    // Capture settled paint. During the Week transition, text temporarily fades.
    await page.waitForTimeout(700);
    const violations = await auditStudioContrast(page);
    if (violations.length > 0) {
      console.error(JSON.stringify(violations.slice(0, 20), null, 2));
      throw new Error(`Retro Desk ${tab} failed settled contrast: ${violations.length} violations`);
    }
    const capture = `live-${tab.toLowerCase()}-retro-390.png`;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: join(dir, capture) });
    shots.push(capture);
  }
  // Persist five independently styled groups, then test their real planner geometry.
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Customize Spread" }).click();
  await studio.getByRole("button", { name: /^Dynamic Ink/ }).click();
  await studio.getByRole("radio", { name: "Week crown: Frame" }).click();
  for (const part of ["Responsibility cards", "Week cards", "Task rows", "Navigation dock"]) {
    await studio.getByRole("radio", { name: part + ": Ink" }).click();
  }
  await studio.getByRole("button", { name: "Apply", exact: true }).click();
  await studio.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  for (const [tab, className, expectedBorder] of [
    ["Spread", ".studio-role-card", "2px"],
    ["Week", ".week-seq-item", "6px"],
  ] as const) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await page.waitForFunction(() =>
      document.querySelector("[data-studio-appearance='studio-illustrated'][data-studio-crown='outline'][data-studio-responsibilities='comic'][data-studio-week='comic'][data-studio-tasks='comic'][data-studio-dock='comic']") !== null
    );
    await page.waitForTimeout(700);
    const border = await page.locator("[data-studio-appearance] " + className).first().evaluate((node) =>
      getComputedStyle(node).borderTopWidth);
    if (border !== expectedBorder) {
      throw new Error(`Actual ${tab} component did not transform: ${border}, expected ${expectedBorder}`);
    }
    const capture = `live-${tab.toLowerCase()}-dynamic-ink-390.png`;
    await page.setViewportSize({width: 390, height: 844});
    await page.screenshot({path: join(dir,capture)});
    shots.push(capture);
  }
  // Reset proves the original look is still a true no-wrapper rollback.
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Customize Spread" }).click();
  await studio.getByRole("button", { name: "Reset to the original look", exact: true }).click();
  await studio.getByRole("button", { name: "Apply", exact: true }).click();
  await studio.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("[data-studio-appearance]") === null);
  writeFileSync(join(dir, "manifest.json"), JSON.stringify({ url, shots, errors, osThemeOverrideChecked: true, status: "N3 passed: Studio System inherits Spread Settings, or OS when Spread Settings is System" }, null, 2));
  if (errors.length) throw Error(errors.join("\n"));
  console.log(`Captured ${shots.length} real Customize editor screenshots`);
} finally {
  await browser.close();
}
