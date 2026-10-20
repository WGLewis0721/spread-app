import { expect, test } from "./fixtures";
import { dayCard, openWeekTab } from "./helpers";

test.describe("first run", () => {
  test("opens straight into an empty planner with three starter spreads", async ({ planner: page }) => {
    await expect(page.getByText("15 hours across 3 spreads")).toBeVisible();
    for (const [name, hours] of [["Work", 8], ["Home", 4], ["Health", 3]] as const) {
      await expect(page.getByRole("textbox", { name: `${name} name`, exact: true })).toHaveValue(name);
      await expect(page.getByRole("button", { name: `${name}, ${hours} hours. Adjust` })).toHaveText(`${hours}h`);
    }
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "What matters most here?" })).toHaveCount(3);
  });

  test("shows the current week and today", async ({ planner: page }) => {
    await expect(page.getByText("This week", { exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: /^This week/ })).toContainText("Mar 2 – Mar 8");
    await openWeekTab(page);
    await expect(dayCard(page, "Wednesday").getByText("Today")).toBeVisible();
    await expect(page.getByText("Today")).toHaveCount(1);
  });

  test("an empty week lists every day with nothing scheduled", async ({ planner: page }) => {
    await openWeekTab(page);
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
      await expect(dayCard(page, day).getByText(`No responsibilities scheduled for ${day}.`)).toBeVisible();
    }
  });

  test("needs no account and keeps every request on the device", async ({ planner: page, diagnostics }) => {
    await expect(page.getByText("Private beta", { exact: false })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
    expect(diagnostics.externalRequests).toEqual([]);
    expect(diagnostics.consoleErrors).toEqual([]);
  });
});
