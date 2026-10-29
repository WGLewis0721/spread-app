import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const source = readFileSync(fileURLToPath(new URL('../three-action.html', import.meta.url)), 'utf8');
const focused = '.contact-card[tabindex="0"]';
const errors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const found: string[] = []; errors.set(page, found);
  page.on('pageerror', e => found.push(e.message));
  await page.route('https://i.pravatar.cc/**', r => r.fulfill({ status: 200, body: '' }));
  await page.route('https://contact-deck.test/**', r => r.fulfill({ contentType: 'text/html', body: source }));
  await page.goto('https://contact-deck.test/');
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

async function mode(page: Page, name: string) {
  await page.locator('#settingsTab').click();
  await page.locator(`[data-viewset="${name}"]`).click();
  await page.locator('[data-close]').click();
}
async function point(page: Page) {
  const box = await page.locator(focused).boundingBox();
  if (!box) throw new Error('No card');
  return { x: box.x + box.width / 2, y: box.y + box.height * 0.44 };
}

for (const name of ['stack', 'fan', 'orbit']) {
  test(`${name}: follows the finger before release and snaps without selecting or flipping`, async ({ page }) => {
    await mode(page, name);
    const id = await page.locator(focused).getAttribute('data-id');
    const original = await page.locator(focused).evaluate(el => getComputedStyle(el).transform);
    const p = await point(page);
    await page.mouse.move(p.x, p.y); await page.mouse.down();
    await page.mouse.move(p.x - (name === 'stack' ? 0 : 40), p.y - (name === 'stack' ? 40 : 0), { steps: 5 });
    const during = await page.locator(focused).evaluate(el => getComputedStyle(el).transform);
    expect(during).not.toBe(original);
    await page.mouse.move(p.x - (name === 'stack' ? 0 : 150), p.y - (name === 'stack' ? 150 : 0), { steps: 8 });
    await page.mouse.up();
    await expect(page.locator(focused)).not.toHaveAttribute('data-id', id!);
    await expect(page.locator('#track')).not.toHaveClass(/physics/, { timeout: 2500 });
    await expect(page.locator('#selectionShelf')).toBeHidden();
    await expect(page.locator('.is-flipped')).toHaveCount(0);
    expect(await page.locator('.contact-card').count()).toBeLessThanOrEqual(7);
  });
}

test('hold then drag selects without also browsing; cancel leaves no grouping action', async ({ page }) => {
  const id = await page.locator(focused).getAttribute('data-id');
  const p = await point(page); await page.mouse.move(p.x, p.y); await page.mouse.down();
  await page.waitForTimeout(520); await expect(page.locator('#selectionShelf')).toBeVisible();
  await page.mouse.move(p.x + 15, p.y + 15, { steps: 4 }); await page.mouse.up();
  await expect(page.locator(focused)).toHaveAttribute('data-id', id!);
  await expect(page.locator('.is-flipped')).toHaveCount(0);
  await expect(page.locator('#overlay')).not.toHaveClass(/show/);
});

test('movement cancels the long press and pointer cancellation returns to the original card', async ({ page }) => {
  const id = await page.locator(focused).getAttribute('data-id'); const p = await point(page);
  await page.mouse.move(p.x, p.y); await page.mouse.down();
  await page.mouse.move(p.x - 55, p.y, { steps: 5 }); await page.waitForTimeout(550);
  await expect(page.locator('#selectionShelf')).toBeHidden();
  await page.locator('#arena').dispatchEvent('pointercancel', { pointerId: 1 }); await page.mouse.up();
  await expect(page.locator('#track')).not.toHaveClass(/physics/, { timeout: 2500 });
  await expect(page.locator(focused)).toHaveAttribute('data-id', id!);
});

test('notes persist after reload and remain text', async ({ page }) => {
  await page.locator(`${focused} > .card-face [data-act="video"]`).click();
  await page.locator('#contactNote').fill('Ask about <script>workshop</script>');
  await page.locator('#saveNote').click(); await page.reload();
  await page.locator(`${focused} > .card-face [data-act="video"]`).click();
  await expect(page.locator('#contactNote')).toHaveValue('Ask about <script>workshop</script>');
});

test('reconnect is gentle, explicit reach-outs clear suggestions, unlock never blocks browsing', async ({ page }) => {
  await expect(page.locator('#overlay')).not.toHaveClass(/show/);
  await page.locator('#collectionBtn').click(); await page.locator('[data-collection="Reconnect"]').click();
  const before = await page.locator(focused).getAttribute('data-id');
  await page.locator(`${focused} > .card-face [data-more]`).click(); await page.locator('[data-mark-reached]').click();
  await expect(page.locator(`.contact-card[data-id="${before}"]`)).toHaveCount(0);
  await page.locator('#filterBtn').click(); await page.locator('[data-open-unlock]').click();
  await expect(page.locator('#sheet')).toContainText('No purchase can be made in this preview');
  await page.locator('button[data-close]').last().click(); await expect(page.locator('#overlay')).not.toHaveClass(/show/);
});

test('selection has a tap path and modal keyboard focus stays inside the sheet', async ({ page }) => {
  await page.locator('#filterBtn').click(); await page.locator('[data-select-focused]').click();
  await expect(page.locator('#selectionShelf')).toBeVisible(); await page.locator('#cancelSelected').click();
  await page.locator('#searchTopBtn').click();
  for (let i = 0; i < 18; i++) { await page.keyboard.press('Tab'); expect(await page.evaluate(() => !!document.activeElement?.closest('#sheet'))).toBe(true); }
  await page.keyboard.press('Escape'); await expect(page.locator('#overlay')).not.toHaveClass(/show/);
  await expect(page.locator('#searchTopBtn')).toBeFocused();
});

for (const size of [{ width: 390, height: 664 }, { width: 393, height: 852 }, { width: 820, height: 1180 }, { width: 1024, height: 768 }]) {
  for (const appearance of ['light', 'dark'] as const) {
    test(`geometry ${size.width}x${size.height} ${appearance}: controls and deck fit`, async ({ page }, info) => {
      await page.setViewportSize(size); await page.emulateMedia({ colorScheme: appearance });
      for (const name of ['stack', 'fan', 'orbit']) {
        await mode(page, name);
        const g = await page.evaluate(() => {
          const c = document.querySelector('.contact-card[tabindex="0"]')!.getBoundingClientRect();
          const dock = document.querySelector('.dock')!.getBoundingClientRect();
          const head = document.querySelector('.app-head')!.getBoundingClientRect();
          return { top: c.top, bottom: c.bottom, left: c.left, right: c.right, dock: dock.top, head: head.bottom, width: window.innerWidth, viewportHeight: window.innerHeight, overflow: document.documentElement.scrollWidth > window.innerWidth };
        });
        expect(g.overflow).toBe(false); expect(g.top).toBeGreaterThan(g.head - 4);
        expect(g.bottom).toBeLessThan(g.dock + 4); expect(g.dock).toBeLessThan(g.viewportHeight); expect(g.left).toBeGreaterThan(0); expect(g.right).toBeLessThan(g.width);
        await info.attach(`${size.width}-${appearance}-${name}`, { body: await page.screenshot(), contentType: 'image/png' });
      }
    });
  }
}

test('Reduce Motion removes 3D travel and mirrors while keyboard browsing works', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await expect.poll(()=>page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true); const id = await page.locator(focused).getAttribute('data-id');
  await page.keyboard.press('ArrowRight'); await expect(page.locator(focused)).not.toHaveAttribute('data-id', id!);
  await expect(page.locator(focused)).toHaveCSS('transform', 'none');
  const hidden = await page.locator('.floor-reflection').evaluateAll(els => els.every(el => getComputedStyle(el).display === 'none' && el.hasAttribute('inert')));
  expect(hidden).toBe(true);
});
