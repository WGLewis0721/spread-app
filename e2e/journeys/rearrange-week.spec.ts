import { expect, test } from "../fixtures";
import { addTask, dayCard, openSpreadTab, openWeekTab, placeHours } from "../helpers";

test.describe("rearranging a week", () => {
  test("a task can be put on a day from To place and taken back with Not today", async ({ planner: page }) => {
    await addTask(page, "Work", "Move me");
    await placeHours(page, "Work", "Wednesday", 2);
    await openWeekTab(page);
    await page.getByRole("button", { name: "Place", exact: true }).click();
    await page.getByRole("list", { name: /^Days for / }).getByRole("button", { name: /Wednesday/ }).click();
    await openSpreadTab(page);
    await page.getByRole("button", { name: "Not today: Move me" }).click();
    await expect(page.getByRole("button", { name: /^Not today: / })).toHaveCount(0);
  });

  test("Undo reverses the latest removal from a day", async ({ planner: page }) => {
    await placeHours(page, "Work", "Friday", 1);
    await page.getByRole("button", { name: "Remove Work from Friday" }).click();
    await expect(dayCard(page, "Friday").getByText("No responsibilities scheduled for Friday.")).toBeVisible();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(dayCard(page, "Friday").getByRole("group", { name: "Work on Friday" })).toBeVisible();
  });

  test("each week keeps its own plan when stepping back and forth", async ({ planner: page }) => {
    await placeHours(page, "Work", "Monday", 3);
    await page.getByRole("button", { name: "Next week" }).click();
    await openWeekTab(page);
    await expect(page.getByRole("group", { name: /^Work on \w+day$/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Previous week" }).click();
    await expect(dayCard(page, "Monday").getByRole("group", { name: "Work on Monday" })).toContainText("3h");
  });

  test("Back to this week returns from several weeks out", async ({ planner: page }) => {
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Next week" }).click();
    await expect(page.getByRole("group", { name: /Use left and right/ })).toContainText("Mar 30 – Apr 5");
    await page.getByRole("button", { name: "Back to this week" }).click();
    await expect(page.getByText("This week", { exact: true })).toBeVisible();
  });

  test("the arrow keys change the week", async ({ planner: page }) => {
    await page.getByRole("group", { name: /Use left and right/ }).focus().catch(() => undefined);
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("group", { name: /Use left and right/ })).toContainText("Mar 9 – Mar 15");
  });

  test("Month view opens a picked day's week", async ({ planner: page }) => {
    await openWeekTab(page);
    await page.getByRole("button", { name: "Month" }).click();
    await page.getByRole("button", { name: "Next month" }).click();
    await page.getByRole("button", { name: /^Saturday, April 11\./ }).click();
    await expect(page.getByRole("group", { name: /Use left and right/ })).toContainText("Apr 6 – Apr 12");
  });
});
