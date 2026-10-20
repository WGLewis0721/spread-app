import { expect, type Locator, type Page } from "@playwright/test";

const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const spreadSection = (page: Page, name: string): Locator =>
  page.locator("section[id^='spread-role-']").filter({ has: page.getByRole("textbox", { name: `${name} name`, exact: true }) });

export const dayCard = (page: Page, dayName: string): Locator =>
  page.locator("section.week-seq-item").filter({ has: page.getByRole("heading", { level: 2, name: new RegExp(`^${dayName}`) }) });

export async function addTask(page: Page, spread: string, text: string) {
  const section = spreadSection(page, spread);
  const box = section.getByRole("textbox", { name: /What matters most here\?|Add a task/ });
  await box.fill(text);
  await box.press("Enter");
  await expect(section.getByRole("button", { name: text, exact: true })).toBeVisible();
}

export const doneCheckbox = (page: Page, text: string) => page.getByRole("checkbox", { name: new RegExp(`^Mark (not )?done: ${text}$`) });

export async function markDone(page: Page, text: string) {
  await page.getByRole("checkbox", { name: `Mark done: ${text}` }).click();
  await expect(page.getByRole("checkbox", { name: `Mark not done: ${text}` })).toBeChecked();
}

export async function openSpreadTab(page: Page) {
  await page.getByRole("tab", { name: "Spread" }).click();
  await expect(page.getByRole("tab", { name: "Spread" })).toHaveAttribute("aria-selected", "true");
}

export async function openWeekTab(page: Page) {
  await page.getByRole("tab", { name: "Week" }).click();
  await expect(page.getByRole("tab", { name: "Week" })).toHaveAttribute("aria-selected", "true");
}

export async function setHours(page: Page, spread: string, hours: number) {
  const adjust = page.getByRole("button", { name: new RegExp(`^${esc(spread)}, \\d+ hours?\\. Adjust$`) });
  await adjust.click();
  const group = page.getByRole("group", { name: `${spread} hours` });
  const current = async () => Number((await group.getByRole("button", { name: "Done adjusting hours" }).innerText()).replace("h", ""));
  for (let guard = 0; guard < 200 && (await current()) !== hours; guard++) {
    const direction = (await current()) < hours ? "Increase" : "Decrease";
    await group.getByRole("button", { name: `${direction} ${spread} hours` }).click();
  }
  await expect(group.getByRole("button", { name: "Done adjusting hours" })).toHaveText(`${hours}h`);
  await group.getByRole("button", { name: "Done adjusting hours" }).click();
}

/** Puts `hours` hours of a spread on a weekday by selecting its chip in Week and using that day's "Add" button. */
/** Scrolls a control to the middle of the screen first, clear of the pinned header and the floating dock, then taps it. */
export async function tap(locator: Locator) {
  await locator.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
  await locator.click();
}

export async function placeHours(page: Page, spread: string, dayName: string, hours = 1) {
  await openWeekTab(page);
  const chip = page.getByRole("button", { name: new RegExp(`^${esc(spread)} \\d+h$`) });
  if ((await chip.getAttribute("aria-pressed")) !== "true") await chip.click();
  await tap(dayCard(page, dayName).getByRole("button", { name: `Add ${spread}` }));
  for (let i = 1; i < hours; i++) {
    await tap(dayCard(page, dayName).getByRole("button", { name: `Increase ${spread} on ${dayName}` }));
  }
}

export async function remainingHours(page: Page, spread: string): Promise<number> {
  await openWeekTab(page);
  const chip = page.getByRole("button", { name: new RegExp(`^${esc(spread)} \\d+h$`) });
  return Number(((await chip.innerText()).match(/(\d+)h/) ?? [])[1]);
}
