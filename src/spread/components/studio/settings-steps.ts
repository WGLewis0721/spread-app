import type { Page } from "playwright";

/**
 * Settings on the Studio Board is a grid of tiles; the theme and accent live inside the Appearance
 * tile. Scripts that change the theme open that tile first. Without a Board (no tile), this does
 * nothing, so the same script also drives the shipped column layout.
 */
export async function openAppearance(page: Page) {
  const tile = page.getByRole("button", { name: /^Appearance/ });
  if ((await tile.count()) > 0 && (await tile.first().isVisible())) {
    await tile.first().click();
    await page.getByRole("radio", { name: "System" }).waitFor();
  }
}
