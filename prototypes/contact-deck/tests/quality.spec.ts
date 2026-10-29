import { test, expect, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Test the standalone file, never a deployment or Spread's production data.
const source = readFileSync(process.env.CONTACT_DECK_SOURCE || join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');
const modes = ['stack', 'fan', 'orbit'] as const; // Flow's internal key remains orbit.
const skins = ['current', '18', '7', '6'] as const;
const focused = '.contact-card[tabindex="0"]';

async function looks(page: Page) {
  await page.locator('#settingsTab').click();
  await expect(page.locator('#sheet')).toBeVisible();
}
async function geometry(page: Page) {
  return page.evaluate((selector) => {
    const rect = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    return {
      card: rect(document.querySelector(selector)!),
      arena: rect(document.querySelector('#arena')!),
      cinematic: document.querySelector('#screen')!.classList.contains('cinematic'),
      stage: rect(document.querySelector('#track')!),
      caption: rect(document.querySelector('.captionline')!),
      dock: rect(document.querySelector('.dock')!),
      orb: rect(document.querySelector('#fanOrb')!),
      screenScroll: document.querySelector('#screen')!.scrollLeft,
      translate: getComputedStyle(document.querySelector(selector)!).translate,
    };
  }, focused);
}
function assertGeometry(g: Awaited<ReturnType<typeof geometry>>, mode: string) {
  const { card: c, stage: s, dock } = g;
  expect(Math.abs(c.x + c.width / 2 - s.x - s.width / 2)).toBeLessThan(s.width * .05);
  // The owner pinned the deck to the collection strip after the original centering fix.
  const scale = mode === 'orbit' && g.cinematic ? .85 : 1;
  expect(c.width).toBeCloseTo((s.width - (mode === 'stack' ? 28 : 56)) * .85 * scale, 0);
  expect(c.height).toBeCloseTo((s.height - 16) * scale, 0);
  expect(c.y).toBeCloseTo(s.y + (mode === 'orbit' ? -20 * scale : g.cinematic ? 8 : mode === 'fan' ? 8 : 36), 0);
  expect(c.x).toBeGreaterThanOrEqual(s.x - 1);
  expect(c.x + c.width).toBeLessThanOrEqual(s.x + s.width + 1);
  expect(c.y + c.height).toBeLessThan(dock.y + 8);
  expect(g.screenScroll).toBe(0);

}

test.beforeEach(async ({ page }) => {
  // Exercise the built-in illustrated fallback without network or console errors.
  await page.route('https://i.pravatar.cc/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: '' }));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setContent(source);
  expect(errors).toEqual([]);
});

for (const viewport of [{ width: 402, height: 874 }, { width: 393, height: 852 }]) {
  test.describe(`${viewport.width}x${viewport.height} geometry`, () => {
    test.use({ viewport });
    for (const mode of modes) for (const skin of skins) {
      test(`${mode} / ${skin}: pinned geometry and continuous idle entry`, async ({ page }, info) => {
        const errors: string[] = [];
        page.on('pageerror', err => errors.push(err.message));
        page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
        await looks(page);
        await page.locator(`[data-viewset="${mode}"]`).click();
        await page.locator(`[data-skin="${skin}"]`).click();
        await page.locator('[data-close]').first().click();
        await page.waitForTimeout(750);
        const normal = await geometry(page);
        assertGeometry(normal, mode);
        writeFileSync(info.outputPath('geometry.json'), JSON.stringify(normal, null, 2));
        // Explicitly verify all controls are contained in the focused card.
        expect(await page.locator(`${focused} > .card-face .card-actions`).evaluate(el => {
          const a = el.getBoundingClientRect(), c = el.closest('.contact-card')!.getBoundingClientRect();
          return a.top >= c.top && a.bottom <= c.bottom && a.left >= c.left && a.right <= c.right;
        })).toBe(true);
        await expect(page.locator('.contact-card .card-actions .action').first()).toBeAttached();
        await expect(page.locator('.dock')).toBeVisible();
        await expect(page.locator('#previewIdle, #searchBtn, .app-head .modes')).toHaveCount(0);
        await expect(page.locator('.hint')).toBeHidden();
        // Remove the transient appearance toast by letting its actual timer expire.
        await expect(page.locator('#toast')).not.toHaveClass(/visible/);
        await page.screenshot({ path: info.outputPath('normal.png') });
        await info.attach('normal geometry', { body: JSON.stringify(normal, null, 2), contentType: 'application/json' });

        const originalNode = await page.locator(focused).elementHandle();
        await looks(page);
        await page.locator('[data-preview-cinema]').click();
        await expect(page.locator('#screen')).toHaveClass(/cinematic/);
        // Observe during the crossfade, not only its final frame. First advance is at 3.1s.
        for (const delay of [0, 150, 350, 550]) {
          await page.waitForTimeout(delay);
          const idle = await geometry(page);
          if (mode === 'orbit') {
            expect(Math.abs(idle.card.y - normal.card.y)).toBeLessThan(4);
            expect(idle.card.height / normal.card.height).toBeGreaterThanOrEqual(.849);
            expect(idle.card.height / normal.card.height).toBeLessThanOrEqual(1.001);
            expect(idle.arena).toEqual(normal.arena);
          } else {
            // Preserve the owner's Stack/Fan idle layout rather than applying Flow scaling.
            expect(idle.card.y - normal.card.y).toBeCloseTo(mode === 'fan' ? 28 : 0, 0);
            expect(idle.card.width).toBeCloseTo(normal.card.width, 0);
          }
        }
        expect(await originalNode!.evaluate(el => el === document.querySelector('.contact-card[tabindex="0"]'))).toBe(true);
        await page.screenshot({ path: info.outputPath('idle.png') });
        await page.locator('#idleWake').tap({ position: { x: 20, y: 20 } });
        await expect(page.locator('#screen')).not.toHaveClass(/cinematic/);
        await page.waitForTimeout(850);
        assertGeometry(await geometry(page), mode);
        expect(errors).toEqual([]);
      });
    }
  });
}

test('real crossfade, automatic advancement, first touch wakes in each view', async ({ page }) => {
  for (const mode of modes) {
    await looks(page);
    await page.locator(`[data-viewset="${mode}"]`).click();
    await page.locator('[data-preview-cinema]').click();
    const id = await page.locator(focused).getAttribute('data-id');
    const early = await page.locator('.cinematic-blackout').evaluate(el => Number(getComputedStyle(el).opacity));
    await expect.poll(() => page.locator('.cinematic-blackout').evaluate(el => Number(getComputedStyle(el).opacity))).toBeGreaterThan(.99);
    expect(early).toBeLessThan(1);
    await expect.poll(() => page.locator(focused).getAttribute('data-id'), { timeout: 5000 }).not.toBe(id);
    await page.waitForTimeout(800);
    assertGeometry(await geometry(page), mode);
    expect(await page.locator(focused).evaluate(el => Number(getComputedStyle(el).filter.match(/brightness\(([^)]+)/)?.[1]))).toBe(1);
    const depth = await page.locator('.distant').evaluateAll(els => els.map(el => Number(getComputedStyle(el).opacity)));
    expect(depth.every(opacity => opacity < 1)).toBe(true);
    await page.locator('#idleWake').tap({ position: { x: 20, y: 20 } });
    await expect(page.locator('#screen')).not.toHaveClass(/cinematic/);
    await expect(page.locator('#overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#track')).toHaveAttribute('data-mode', `normal-${mode}`);
  }
});

test('views, search, favorite, sort and export use the current controls', async ({ page }) => {
  const star = page.locator(`${focused} > .card-face [data-star]`);
  await expect(star).toHaveClass(/(?:^|\s)on(?:\s|$)/);
  await star.click();
  await expect(star).not.toHaveClass(/(?:^|\s)on(?:\s|$)/);
  await star.click();
  await expect(star).toHaveClass(/(?:^|\s)on(?:\s|$)/);
  for (const mode of modes) {
    await looks(page);
    await page.locator(`[data-viewset="${mode}"]`).click();
    await expect(page.locator(`[data-viewset="${mode}"]`)).toHaveClass(/selected/);
    await page.locator('[data-close]').first().click();
  }
  await page.locator('#filterBtn').click();
  await page.locator('[data-sort="company"]').click();
  await page.locator('[data-close]').first().click();
  await page.locator('#searchTab').click();
  await page.locator('#searchInput').fill('Marcus');
  await expect(page.locator('#searchResults')).toContainText('Marcus Carter');
  await page.locator('[data-select="1"]').click();
  await expect(page.locator('#sheet')).toContainText('Marcus Carter');
  await page.locator('.detail-actions [data-modal="export"]').click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#exportPNG').click()]);
  expect(download.suggestedFilename()).toMatch(/marcus-carter\.png/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Reduce Motion suppresses automatic and manual cinematic animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await looks(page);
  await page.locator('[data-preview-cinema]').click();
  await expect(page.locator('#screen')).not.toHaveClass(/cinematic/);
  await page.locator('[data-close]').first().click();
  await page.evaluate(() => { const now = Date.now.bind(Date); Date.now = () => now() + 11000; });
  await page.waitForTimeout(750);
  await expect(page.locator('#screen')).not.toHaveClass(/cinematic/);
});
