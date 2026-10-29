import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pixels, changedPixels } from './png';
const source = readFileSync(process.env.CONTACT_DECK_SOURCE || join(import.meta.dirname, '..', 'index.html'), 'utf8');
for (const viewport of [{ width: 402, height: 874 }, { width: 393, height: 852 }]) {
  test.describe(`Flow floor ${viewport.width}`, () => {
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
      await page.locator('[data-preview-cinema]').click();
      const frames = await page.evaluate(async () => {
        const result: { t: number; x: number; y: number; width: number; height: number }[] = [];
        const start = performance.now();
        while (performance.now() - start < 1000) {
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
      expect(frames.length).toBeGreaterThan(10);
      for (let i = 1; i < frames.length; i++) {
        expect(Math.abs(frames[i].y - frames[i - 1].y)).toBeLessThan(3.1);
        expect(frames[i].height).toBeLessThanOrEqual(frames[i - 1].height + .1);
      }
      expect(Math.abs(idle!.y - normal!.y)).toBeLessThan(4);
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
        const style = await page.addStyleTag({ content: `.contact-card[data-id="${id}"]{-webkit-box-reflect:initial!important}` });
        const off = pixels(await page.screenshot({ animations: 'disabled' }));
        expect(changedPixels(on, off), `card ${id} must paint its own reflection`).toBeGreaterThan(12);
        await style.evaluate(el => el.remove());
      }
      expect(painted).toBeGreaterThanOrEqual(3);
      const style = await page.addStyleTag({ content: '.contact-card{-webkit-box-reflect:initial!important}' });
      const off = pixels(await page.screenshot({ path: info.outputPath('without-reflections.png'), animations: 'disabled' }));
      expect(changedPixels(on, off, dock!.y), 'reflections fade before the navigation dock').toBe(0);
      await style.evaluate(el => el.remove());
      await info.attach('transition frames', { body: JSON.stringify(frames), contentType: 'application/json' });
      await page.locator('#idleWake').tap({ position: { x: 20, y: 20 } });
      await page.waitForTimeout(850);
      expect(await page.locator('.contact-card[tabindex="0"]').boundingBox()).toEqual(normal);
      expect(errors).toEqual([]);
    });
  });
}
