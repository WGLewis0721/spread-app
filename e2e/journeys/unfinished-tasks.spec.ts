import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import { addTask, markDone, openSpreadTab, placeHours, setHours } from "../helpers";

const taskNames = (page: Page) =>
  page.getByRole("checkbox").evaluateAll((els) => els.map((e) => (e.getAttribute("aria-label") ?? "").replace(/^Mark (not )?done: /, "")));

async function threeTasksOneDone(page: Page) {
  await addTask(page, "Work", "Alpha");
  await addTask(page, "Work", "Bravo");
  await addTask(page, "Work", "Charlie");
  await markDone(page, "Charlie");
}

test.describe("handling unfinished tasks", () => {
  test("Review open tasks lists only what is open and moves those to next week", async ({ planner: page }) => {
    await threeTasksOneDone(page);
    await page.getByRole("button", { name: "Review open tasks" }).click();
    const dialog = page.getByRole("dialog", { name: "Open tasks" });
    await expect(dialog.getByRole("checkbox")).toHaveCount(2);
    await dialog.getByRole("button", { name: "Move 2" }).click();
    await page.getByRole("button", { name: "Next week" }).click();
    await expect.poll(() => taskNames(page)).toEqual(["Alpha", "Bravo"]);
  });

  test("unticking a task in the review keeps it here and lowers the count", async ({ planner: page }) => {
    await threeTasksOneDone(page);
    await page.getByRole("button", { name: "Review open tasks" }).click();
    const dialog = page.getByRole("dialog", { name: "Open tasks" });
    await dialog.getByRole("checkbox", { name: /^Bravo/ }).click();
    await expect(dialog.getByRole("button", { name: "Move 1" })).toBeVisible();
    await dialog.getByRole("button", { name: "Move 1" }).click();
    await page.getByRole("button", { name: "Next week" }).click();
    await expect.poll(() => taskNames(page)).toEqual(["Alpha"]);
    await page.getByRole("button", { name: "Previous week" }).click();
    await expect.poll(() => taskNames(page)).toContain("Bravo");
  });

  test("Not now leaves both weeks as they were", async ({ planner: page }) => {
    await threeTasksOneDone(page);
    await page.getByRole("button", { name: "Review open tasks" }).click();
    await page.getByRole("dialog", { name: "Open tasks" }).getByRole("button", { name: "Not now" }).click();
    await page.getByRole("button", { name: "Next week" }).click();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
  });

  test("Rollover goes to next week and carries the tasks and hours", async ({ planner: page }) => {
    await threeTasksOneDone(page);
    await page.getByRole("button", { name: "Rollover" }).click();
    await expect(page.getByRole("group", { name: /Use left and right/ })).toContainText("Mar 9 – Mar 15");
    await expect.poll(() => taskNames(page)).toEqual(expect.arrayContaining(["Alpha", "Bravo"]));
    await expect(page.getByText("15 hours across 3 spreads")).toBeVisible();
  });

  test("Rollover onto a week that already has tasks asks before replacing, and Cancel keeps it", async ({ planner: page }) => {
    await threeTasksOneDone(page);
    await page.getByRole("button", { name: "Rollover" }).click();
    await addTask(page, "Work", "Only next week");
    await page.getByRole("button", { name: "Previous week" }).click();
    await page.getByRole("button", { name: "Rollover" }).click();
    const confirm = page.getByRole("alertdialog", { name: "Replace next week?" });
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Next week" }).click();
    await expect.poll(() => taskNames(page)).toContain("Only next week");
  });

  test("Replace swaps next week's tasks for this week's", async ({ planner: page }) => {
    await threeTasksOneDone(page);
    await page.getByRole("button", { name: "Rollover" }).click();
    await addTask(page, "Work", "Only next week");
    await page.getByRole("button", { name: "Previous week" }).click();
    await page.getByRole("button", { name: "Rollover" }).click();
    await page.getByRole("alertdialog", { name: "Replace next week?" }).getByRole("button", { name: "Replace" }).click();
    await expect.poll(() => taskNames(page)).not.toContain("Only next week");
  });

  test("Rollover does not carry the day layout (current behavior, see report)", async ({ planner: page }) => {
    await addTask(page, "Work", "Alpha");
    await placeHours(page, "Work", "Friday", 2);
    await openSpreadTab(page);
    await page.getByRole("button", { name: "Rollover" }).click();
    await page.getByRole("tab", { name: "Week" }).click();
    await expect(page.getByRole("group", { name: /^.+ on \w+day$/ })).toHaveCount(0);
  });

  test("after Rollover the hours still add up: planned = on days + left", async ({ planner: page }) => {
    test.fail(true, "Known defect: Rollover leaves hours counted as placed although no day carries them (for example 12h planned, 4h placed, none on any day, 8h left shows only 8). See user-testing/report.md.");
    await setHours(page, "Work", 12);
    await addTask(page, "Work", "Edit gallery");
    await placeHours(page, "Work", "Saturday", 4);
    await openSpreadTab(page);
    await page.getByRole("button", { name: "Rollover" }).click();
    await page.getByRole("tab", { name: "Week" }).click();
    const onDays = await page.getByRole("group", { name: /^Work on \w+day$/ }).count();
    const left = Number(((await page.getByRole("button", { name: /^Work \d+h$/ }).innerText()).match(/(\d+)h/) ?? [])[1]);
    expect(left + (onDays > 0 ? 4 : 0)).toBe(12);
  });

  test("after Copy last week the hours still add up: planned = on days + left", async ({ planner: page }) => {
    test.fail(true, "Known defect: Copy last week leaves hours counted as placed although no day carries them. See user-testing/report.md.");
    await setHours(page, "Work", 12);
    await placeHours(page, "Work", "Saturday", 4);
    await page.getByRole("button", { name: "Next week" }).click();
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("button", { name: "Copy last week" }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: "Week" }).click();
    const onDays = await page.getByRole("group", { name: /^Work on \w+day$/ }).count();
    const left = Number(((await page.getByRole("button", { name: /^Work \d+h$/ }).innerText()).match(/(\d+)h/) ?? [])[1]);
    expect(left + (onDays > 0 ? 4 : 0)).toBe(12);
  });

  test("Copy last week brings last week's tasks back open", async ({ planner: page }) => {
    await threeTasksOneDone(page);
    await page.getByRole("button", { name: "Next week" }).click();
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("button", { name: "Copy last week" }).click();
    await expect(page.getByText("Last week copied. Tasks are open again.")).toBeVisible();
    await expect.poll(() => taskNames(page)).toEqual(expect.arrayContaining(["Alpha", "Bravo", "Charlie"]));
    await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(0);
  });

  async function deleteDoomed(page: Page) {
    await addTask(page, "Work", "Doomed");
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Doomed", exact: true }).click();
    await page.getByRole("button", { name: "Delete task" }).click();
    await expect(page.getByRole("button", { name: "Doomed", exact: true })).toHaveCount(0);
  }

  test("a deleted task stays gone after a reload a moment later", async ({ planner: page }) => {
    await deleteDoomed(page);
    await page.waitForTimeout(1500);
    await page.reload();
    await expect(page.getByRole("tab", { name: "Spread" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Doomed", exact: true })).toHaveCount(0);
  });

  test("a deleted task stays gone even when the app is reloaded straight away", async ({ planner: page }) => {
    test.fixme(true, "Known defect: reloading within about 300ms of deleting a task brings the task back (adding a task is safe). See user-testing/report.md.");
    await deleteDoomed(page);
    await page.reload();
    await expect(page.getByRole("tab", { name: "Spread" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Doomed", exact: true })).toHaveCount(0);
  });
});
