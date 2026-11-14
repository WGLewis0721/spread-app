/* eslint-disable @typescript-eslint/no-require-imports -- Node evidence script, run outside the app bundle. Playwright is preinstalled on the machine and is not a repo dependency, so it is required by name. */
// Usage: node capture-landing.cjs <phase> <outDir> [dpr=2] [url]
// Viewport captures at named section stops (real scroll positions), plus overflow and error checks.
// Needs the dev server on the given URL (npm run dev) and writes WebP frames through to_webp.py beside this file.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const [phase, outDir, dprArg, urlArg] = process.argv.slice(2);
const dpr = Number(dprArg || 2);
const url = urlArg || 'http://localhost:8080/';
const scratch = path.dirname(process.argv[1]);
const sizes = [{ w: 390, h: 844 }, { w: 820, h: 1180 }, { w: 1024, h: 1366 }, { w: 1440, h: 900 }];
// stops: [name, css selector, offset from element top in px]
const stops = [
  ['hero', 'main .site-hero', -72],
  ['how', '#how', 0],
  ['story', '#story', 0],
  ['start', '#start', 0],
];
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const report = [];
  const run = async (s, mode, reduced, shoot) => {
    const context = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: dpr, colorScheme: mode, reducedMotion: reduced ? 'reduce' : 'no-preference', isMobile: s.w < 500, hasTouch: s.w < 500 });
    await context.addInitScript((m) => { try { localStorage.setItem('spread.theme', m); } catch { /* storage blocked: keep the system theme */ } }, mode);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL/.test(m.text())) errors.push('console: ' + m.text().slice(0, 160)); });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.site-hero', { timeout: 20000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1600);
    const saved = [];
    if (shoot) {
      for (const [name, sel, off] of stops) {
        // Walk down to the section first so scroll-triggered reveals run, then settle at the stop.
        const y = await page.evaluate(([q, o]) => { const el = document.querySelector(q); return el ? Math.max(0, el.getBoundingClientRect().top + window.scrollY + o) : 0; }, [sel, off]);
        for (let t = 0; t <= y; t += Math.max(260, Math.floor(s.h * 0.6))) { await page.evaluate((yy) => window.scrollTo(0, yy), t); await page.waitForTimeout(160); }
        await page.evaluate((yy) => window.scrollTo(0, yy), y);
        await page.waitForTimeout(1500);
        const file = path.join(outDir, `${s.w}-${mode}-${name}.png`);
        await page.screenshot({ path: file, fullPage: false });
        saved.push(file);
      }
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    const metrics = await page.evaluate(() => { const de = document.documentElement; return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, overflowPx: de.scrollWidth - de.clientWidth, height: de.scrollHeight, siteTheme: document.querySelector('.spread-site')?.getAttribute('data-site-theme') }; });
    report.push({ phase, width: s.w, height: s.h, mode, reducedMotion: reduced, dpr, ...metrics, errors: errors.slice(0, 5), frames: saved.map((f) => path.basename(f)) });
    await context.close();
  };
  // A navigation during evaluate (dev-server reload) can abort one combination; retry it once.
  const safe = async (...args) => { for (let i = 0; i < 2; i++) { try { return await run(...args); } catch (e) { if (i === 1) throw e; console.warn('retrying', args[0].w, args[1], String(e.message).slice(0, 80)); } } };
  for (const mode of ['light', 'dark']) for (const s of sizes) await safe(s, mode, false, true);
  for (const s of sizes) await safe(s, 'light', true, false);
  for (const s of sizes) await safe(s, 'dark', true, false);
  await browser.close();
  // Convert the PNG frames to WebP to keep the repository small, then drop the PNGs.
  execFileSync('python3', ['-I', path.join(scratch, 'to_webp.py'), outDir]);
  fs.writeFileSync(path.join(outDir, `report-${phase}.json`), JSON.stringify(report, null, 2));
  console.table(report.filter((r) => !r.reducedMotion).map(({ width, mode, overflowPx, height, siteTheme, errors, frames }) => ({ width, mode, overflowPx, height, siteTheme, errors: errors.length, frames: frames.length })));
  console.table(report.filter((r) => r.reducedMotion).map(({ width, mode, overflowPx, errors }) => ({ width, mode: mode + '+reduce', overflowPx, errors: errors.length })));
})().catch((e) => { console.error(e); process.exit(1); });
