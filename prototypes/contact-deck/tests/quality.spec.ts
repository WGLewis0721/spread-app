import { test, expect, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Self-contained browser test: no deployment, contact permissions, or production data.
const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');
const mobile = devices['iPhone 13'];

test.describe('Contact Deck product walkthrough', () => {
  test.use({ ...mobile, browserName: 'chromium' });

  test('real crossfade, animated cards, first touch wakes', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.setContent(source);
    await expect(page.locator('#screen')).not.toHaveClass(/cinematic/);
    await page.locator('#previewIdle').click();
    await expect(page.locator('#screen')).toHaveClass(/cinematic/);
    await expect(page.locator('.cinematic-card')).toHaveCount(8);
    const getOpacity = () => page.locator('.cinematic-blackout').evaluate(el => Number(getComputedStyle(el).opacity));
    await page.waitForTimeout(150);
    const early = await getOpacity();
    await page.waitForTimeout(300);
    const middle = await getOpacity();
    await page.waitForTimeout(900);
    const end = await getOpacity();
    expect(end).toBeGreaterThan(0.99);
    expect(middle).toBeGreaterThan(early);
    expect(early).toBeLessThan(1);
    await page.locator('#idleWake').tap();
    await expect(page.locator('#screen')).not.toHaveClass(/cinematic/);
    expect(errors).toEqual([]);
  });

  test('three modes, contact search and export remain functional', async ({ page }) => {
    await page.setContent(source);
    for (const mode of ['stack', 'fan', 'orbit']) {
      await page.locator('[data-view="' + mode + '"]').click();
      await expect(page.locator('[data-view="' + mode + '"]')).toHaveClass(/active/);
    }
    await page.locator('#searchBtn').click();
    await page.locator('#searchInput').fill('Marcus');
    await expect(page.locator('#searchResults')).toContainText('Marcus Carter');
    await page.locator('[data-select="1"]').click();
    await expect(page.locator('#sheet')).toContainText('Marcus Carter');
    await page.locator('[data-modal="export"]').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#exportPNG').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/marcus-carter\.png/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test('Reduce Motion suppresses automatic cinematic animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setContent(source);
    await page.locator('#previewIdle').click();
    await expect(page.locator('#screen')).not.toHaveClass(/cinematic/);
    await page.evaluate(() => {
      const now = Date.now.bind(Date);
      Date.now = () => now() + 11000;
    });
    await page.waitForTimeout(750);
    await expect(page.locator('#screen')).not.toHaveClass(/cinematic/);
  });
});