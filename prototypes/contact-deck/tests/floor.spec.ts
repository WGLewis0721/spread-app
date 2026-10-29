import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pixels, changedPixels } from './png';
const source = readFileSync(process.env.CONTACT_DECK_SOURCE || join(import.meta.dirname, '..', 'three-action.html'), 'utf8');
for (const viewport of [{ width: 402, height: 874 }, { width: 393, height: 852 }, { width: 390, height: 664 }, { width: 820, height: 1180 }, { width: 1024, height: 768 }]) {
  for (const skin of ['current']) test.describe(`Flow floor ${viewport.width} skin ${skin}`, () => {
    test.use({ viewport, deviceScaleFactor: 1 });
    test('15% idle shrink, continuous anchor, and painted reflections on every visible card', async ({ page }, info) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://i.pravatar.cc/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: '' }));
      await page.setContent(source);
      await page.locator('#settingsTab').click();
      await page.locator('[data-viewset="orbit"]').click();
      await page.locator('[data-close]').click();
      await page.waitForTimeout(850);
      const normal = await page.locator('.contact-card[tabindex="0"]').boundingBox();
      const arena = await page.locator('#arena').boundingBox();
      const dock = await page.locator('.dock').boundingBox();
      await page.screenshot({ path: info.outputPath('normal.png') });
      await page.locator('#settingsTab').click();
      // Trigger and sample in the same browser task. Cross-process automation
      // latency must not consume the recording window before the click arrives.
      // Real pointer tests cover activation; this test measures interpolated paint.
      const frames = await page.evaluate(async () => {
        const result: { t: number; x: number; y: number; width: number; height: number }[] = [];
        const initial = document.querySelector('.contact-card[tabindex="0"]')!.getBoundingClientRect();
        result.push({ t: 0, x: initial.x, y: initial.y, width: initial.width, height: initial.height });
        (document.querySelector('[data-preview-cinema]') as HTMLButtonElement).click();
        const start = performance.now();
        while (performance.now() - start < 1500) {
          await new Promise(requestAnimationFrame);
          const r = document.querySelector('.contact-card[tabindex="0"]')!.getBoundingClientRect();
          result.push({ t: performance.now() - start, x: r.x, y: r.y, width: r.width, height: r.height });
        }
        return result;
      });
      const idle = await page.locator('.contact-card[tabindex="0"]').boundingBox();
      expect(idle!.height / normal!.height).toBeCloseTo(.85, 3);
      expect(idle!.width / normal!.width).toBeCloseTo(.85, 3);
      expect(await page.locator('#arena').boundingBox()).toEqual(arena);
      expect(frames.length).toBeGreaterThanOrEqual(3);
      expect(frames.some(f => f.height < normal!.height - 1 && f.height > idle!.height + 1), 'capture an interpolated size during the transition').toBe(true);
      for (let i = 1; i < frames.length; i++) {
        expect(Math.abs(frames[i].y - frames[i - 1].y)).toBeLessThan(3.1);
        expect(frames[i].height).toBeLessThanOrEqual(frames[i - 1].height + .1);
      }
      expect(Math.abs(idle!.y - normal!.y)).toBeLessThan(4);
      const card = page.locator('.contact-card[tabindex="0"]');
      const mirror = card.locator('.floor-reflection');
      await expect(mirror).toHaveAttribute('aria-hidden', 'true');
      await expect(mirror).toHaveJSProperty('inert', true);
      const faces = await card.evaluate(el => {
        const original = getComputedStyle(el.querySelector(':scope > .card-face')!);
        const reflected = getComputedStyle(el.querySelector('.reflected-face')!);
        return { width: parseFloat(original.width), height: parseFloat(original.height),
          reflectedWidth: parseFloat(reflected.width), reflectedHeight: parseFloat(reflected.height), flip: reflected.transform };
      });
      expect(faces.reflectedWidth).toBeCloseTo(faces.width, 0);
      expect(faces.reflectedHeight).toBeCloseTo(faces.height, 0);
      expect(faces.flip).toBe('matrix(1, 0, 0, -1, 0, 0)');
      await expect(page.getByRole('group', { name: (await card.getAttribute('aria-label'))!, exact: true })).toHaveCount(1);
      // Freeze only the demo's advancement clock while comparing actual paint.
      await page.evaluate(() => { const fixed = Date.now(); Date.now = () => fixed; });
      const on = pixels(await page.screenshot({ path: info.outputPath('reflections.png'), animations: 'disabled' }));
      const visible = await page.locator('.contact-card').evaluateAll(cards => cards.filter(el => {
        const r = el.getBoundingClientRect();
        return Number(getComputedStyle(el).opacity) > .1 && r.right > 0 && r.left < innerWidth;
      }).map(el => el.getAttribute('data-id')));
      expect(visible.length).toBeGreaterThanOrEqual(3);
      let painted = 0;
      for (const id of visible) {
        // Bounding boxes can intersect the screen while nearer cards fully occlude them.
        const hidden = await page.addStyleTag({ content: `.contact-card[data-id="${id}"]{visibility:hidden!important}` });
        const withoutCard = pixels(await page.screenshot({ animations: 'disabled' }));
        await hidden.evaluate(el => el.remove());
        if (changedPixels(on, withoutCard) <= 12) continue;
        painted++;
        const style = await page.addStyleTag({ content: `.contact-card[data-id="${id}"] .floor-reflection{visibility:hidden!important}` });
        const off = pixels(await page.screenshot({ animations: 'disabled' }));
        expect(changedPixels(on, off), `card ${id} must paint its own reflection`).toBeGreaterThan(12);
        await style.evaluate(el => el.remove());
      }
      expect(painted).toBeGreaterThanOrEqual(3);
      const style = await page.addStyleTag({ content: '.floor-reflection{visibility:hidden!important}' });
      const off = pixels(await page.screenshot({ path: info.outputPath('without-reflections.png'), animations: 'disabled' }));
      expect(changedPixels(on, off, dock!.y), 'reflections fade before the navigation dock').toBe(0);
      // A faint outline passed the old pixel-count test but was invisible in use.
      // Measure a broad strip of the actual floor, relative to reflections disabled.
      const bounds = { left: Math.ceil(idle!.x + 12), right: Math.floor(idle!.x + idle!.width - 12),
        top: Math.ceil(idle!.y + idle!.height + 12), bottom: Math.floor(idle!.y + idle!.height + Math.min(100, idle!.height * .18)) };
      let total = 0, contrast = 0, legible = 0;
      for (let y = bounds.top; y < bounds.bottom; y++) for (let x = bounds.left; x < bounds.right; x++) {
        const p = (y * on.width + x) * on.channels;
        const delta = [0, 1, 2].reduce((sum, c) => sum + Math.abs(on.data[p + c] - off.data[p + c]), 0) / 3;
        total++; contrast += delta; if (delta >= 24) legible++;
      }
      const floor = { meanContrast: contrast / total, visibleFraction: legible / total, bounds };
      await info.attach('floor visibility', { body: JSON.stringify(floor), contentType: 'application/json' });
      expect(floor.meanContrast, 'floor must show reflected detail, not a dim outline').toBeGreaterThan(30);
      expect(floor.visibleFraction, 'reflection must fill a visibly contrasted floor area').toBeGreaterThan(.65);
      await style.evaluate(el => el.remove());
      await info.attach('transition frames', { body: JSON.stringify(frames), contentType: 'application/json' });
      await page.locator('#idleWake').tap({ position: { x: 20, y: 20 } });
      await page.waitForTimeout(850);
      expect(await page.locator('.contact-card[tabindex="0"]').boundingBox()).toEqual(normal);
      expect(errors).toEqual([]);
    });
  });
}
