import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const source = readFileSync(join(import.meta.dirname, '..', 'index.html'), 'utf8');
for (const [skin, label] of [['current', 'Glass'], ['18', 'Modern'], ['7', 'Flat'], ['6', 'Classic']]) {
  test(`${label}: material, controls, persisted choice and stable contact`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.route('http://contact-deck.test/**', r => r.fulfill({ contentType: 'text/html', body: source }));
    await page.route('https://i.pravatar.cc/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: '' }));
    await page.goto('http://contact-deck.test/');
    const contact = await page.locator('.contact-card[tabindex="0"]').getAttribute('data-id');
    await page.locator('#settingsTab').click();
    await page.locator('[data-viewset="stack"]').click();
    const choice = page.locator(`[data-skin="${skin}"]`);
    await expect(choice).toContainText(label);
    await choice.click();
    await expect(page.locator(`[data-skin="${skin}"]`)).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-close]').click();
    await page.waitForTimeout(800);
    await expect(page.locator('.contact-card[tabindex="0"]')).toHaveAttribute('data-id', contact!);
    const actions = page.locator('.contact-card[tabindex="0"] .action');
    await expect(actions).toHaveCount(4);
    await expect(actions.locator('svg')).toHaveCount(4);
    for (const action of await actions.all()) {
      const r = await action.boundingBox();
      expect(r!.width).toBeGreaterThanOrEqual(44);
      expect(r!.height).toBeGreaterThanOrEqual(44);
      await expect(action).toBeVisible();
    }
    await expect(page.locator('.dock .glyph')).toHaveCount(4);
    const paint = await page.locator('.contact-card[tabindex="0"]').evaluate(el => {
      const style = getComputedStyle(el), body = getComputedStyle(el.querySelector('.card-body')!);
      return { radius: parseFloat(style.borderRadius), panel: body.backgroundColor, name: getComputedStyle(el.querySelector('.card-name')!).color };
    });
    if (skin === 'current') expect(paint.radius).toBe(32);
    if (skin === '18') expect(paint.radius).toBe(28);
    if (skin === '7') { expect(paint.radius).toBe(6); expect(paint.panel).toBe('rgb(255, 255, 255)'); expect(paint.name).toBe('rgb(17, 17, 17)'); }
    if (skin === '6') { expect(paint.radius).toBe(18); expect(paint.name).toBe('rgb(30, 29, 26)'); }
    await expect(page.locator('#toast')).not.toHaveClass(/visible/);
    for (const view of ['stack', 'fan', 'orbit']) {
      await page.locator('#settingsTab').click();
      await page.locator(`[data-viewset="${view}"]`).click();
      await page.locator('[data-close]').click();
      await page.waitForTimeout(850);
      if (skin === '7' || skin === '6') {
        const card = page.locator('.contact-card[tabindex="0"]');
        const portrait = await card.locator('.poster').boundingBox();
        const name = await card.locator('.card-name').boundingBox();
        expect(name!.y - (portrait!.y + portrait!.height), `${label} ${view}: name clears portrait`).toBeGreaterThanOrEqual(8);
      }
      await page.screenshot({ path: info.outputPath(`${label}-${view}.png`) });
    }
    await page.locator('#settingsTab').click();
    await page.locator('[data-viewset="stack"]').click();
    await page.locator('[data-close]').click();
    await page.reload();
    await expect(page.locator('#screen')).toHaveClass(new RegExp(`skin-${skin}`));
    await expect(page.locator('#track')).toHaveAttribute('data-mode', 'normal-stack');
    expect(errors).toEqual([]);
  });
}
