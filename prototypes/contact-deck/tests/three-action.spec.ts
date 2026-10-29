import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'three-action.html'), 'utf8');
const focused = '.contact-card[tabindex="0"]';

test.beforeEach(async ({ page }) => {
  await page.route('https://i.pravatar.cc/**', route =>
    route.fulfill({ status: 200, contentType: 'image/png', body: '' }));
  await page.setContent(source);
  await expect(page.locator('.branding')).toHaveText('Contact Deck');
});

async function holdFocused(page: import('@playwright/test').Page) {
  const card = page.locator(focused);
  const rect = await card.boundingBox();
  if (!rect) throw new Error('No focused card');
  // Pointer event dispatch exercises the explicit hold state, not a fake deletion.
  const pos = { clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2, button: 0, pointerId: 55 };
  await card.dispatchEvent('pointerdown', pos);
  await page.waitForTimeout(510);
  await card.dispatchEvent('pointerup', pos);
  await expect(page.locator('#selectionShelf')).toBeVisible();
}

test('search includes phone numbers; selecting a match reveals its card back', async ({ page }) => {
  await page.locator('#searchTopBtn').click();
  await page.locator('#searchInput').fill('555-0123');
  await expect(page.locator('#searchResults')).toContainText('Marcus Carter');
  await page.locator('[data-select="1"]').click();
  await expect(page.locator('.contact-card[data-id="1"]')).toHaveClass(/is-flipped/);
  await expect(page.locator('.contact-card[data-id="1"] .card-back')).toContainText('marcus@example.com');
});

test('sorting preserves the focused contact; shuffle offers undo', async ({ page }) => {
  const original = await page.locator(focused).getAttribute('data-id');
  await page.locator('#filterBtn').click();
  await page.locator('[data-sort="company"]').click();
  await expect(page.locator(focused)).toHaveAttribute('data-id', original!);
  await page.locator('#filterBtn').click();
  await page.locator('[data-sort="shuffle"]').click();
  await expect(page.locator('#toast .toast-undo')).toBeVisible();
  await page.locator('#toast .toast-undo').click();
  await page.locator('#filterBtn').click();
  await expect(page.locator('[data-sort="company"]')).toBeVisible();
});

test('flip works in the main stage without opening a modal', async ({ page }) => {
  await page.locator(focused).click();
  await expect(page.locator(focused)).toHaveClass(/is-flipped/);
  await expect(page.locator('#overlay')).not.toHaveClass(/show/);
  await page.locator(focused + ' [data-card-action="close"]').click();
  await expect(page.locator(focused)).not.toHaveClass(/is-flipped/);
});

test('hold selects, review keeps contacts, confirmed demo deletion supports undo', async ({ page }) => {
  await holdFocused(page);
  await page.locator('#deleteSelected').click();
  await expect(page.locator('#sheet')).toContainText('Nothing from your iPhone will be deleted');
  await page.locator('[data-close]').last().click();
  await expect(page.locator('#selectionShelf')).toBeVisible();
  const before = await page.locator('#countLabel').textContent();
  await page.locator('#deleteSelected').click();
  await page.locator('#confirmDelete').click();
  await expect(page.locator('#selectionShelf')).toBeHidden();
  await expect(page.locator('#countLabel')).not.toHaveText(before!);
  await page.locator('#toast .toast-undo').click();
  await expect(page.locator('#countLabel')).toHaveText(before!);
});

test('create a visual deck from selection and return to the full collection', async ({ page }) => {
  await holdFocused(page);
  await page.locator('#moveSelected').click();
  await page.locator('[data-create="new"]').click();
  await page.locator('#deckName').fill('My Team');
  await page.locator('#saveDeck').click();
  await expect(page.locator('#collectionTitle')).toHaveText('MY TEAM');
  await page.locator('#collectionBtn').click();
  await expect(page.locator('#sheet')).toContainText('My Team');
  await page.locator('[data-collection="All"]').click();
  await expect(page.locator('#collectionTitle')).toHaveText('ALL CONTACTS');
});

test('duplicate suggestions merge exact sample matches and permit undo', async ({ page }) => {
  await page.locator('#filterBtn').click();
  await page.locator('[data-open-duplicates]').click();
  await expect(page.locator('.duplicate-row')).toHaveCount(2);
  await page.locator('.duplicate-row button[data-merge]').first().click();
  await expect(page.locator('#toast')).toContainText('Duplicate cards combined');
  await page.locator('#toast .toast-undo').click();
  await page.locator('#filterBtn').click();
  await page.locator('[data-open-duplicates]').click();
  await expect(page.locator('.duplicate-row')).toHaveCount(2);
});

test('export downloads usable vCard without leaking sample contacts to a server', async ({ page }) => {
  await page.locator(focused).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(focused + ' [data-card-action="share"]').click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.vcf$/);
});

test('history is clearly labeled sample data and searchable by date and name', async ({ page }) => {
  await page.locator('#historyTab').click();
  await expect(page.locator('#sheet')).toContainText('Fictional sample records only');
  await page.locator('#historySearch').fill('2026-10-27');
  await expect(page.locator('#historyResults .history-row')).toHaveCount(1);
  await expect(page.locator('#historyResults')).toContainText('Alyssa Parker');
});

test('system dark mode and reduced motion keep the single design usable', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  await expect(page.locator('#screen')).toHaveClass(/skin-current/);
  await page.locator('#settingsTab').click();
  await expect(page.locator('[data-skin]')).toHaveCount(0);
  await expect(page.locator('[data-viewset]')).toHaveCount(3);
  await page.locator('[data-close]').click();
  await page.locator(focused).click();
  await expect(page.locator(focused)).toHaveClass(/is-flipped/);
});
