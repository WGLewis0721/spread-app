import { expect, test } from "./fixtures";
import { addTask, markDone, openSpreadTab, openWeekTab, placeHours, spreadSection } from "./helpers";

test.describe("tasks", () => {
  test("a task is added with Enter and the box becomes Add a task", async ({ planner: page }) => {
    await addTask(page, "Work", "Grade labs");
    await expect(spreadSection(page, "Work").getByRole("textbox", { name: "Add a task" })).toBeVisible();
  });

  test("tasks keep the order they were added in", async ({ planner: page }) => {
    for (const t of ["First", "Second", "Third"]) await addTask(page, "Work", t);
    const names = await spreadSection(page, "Work").getByRole("checkbox").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    expect(names).toEqual(["Mark done: First", "Mark done: Second", "Mark done: Third"]);
  });

  test("marking done updates the progress line, and can be undone by unchecking", async ({ planner: page }) => {
    await addTask(page, "Work", "Grade labs");
    await addTask(page, "Work", "Plan unit");
    await markDone(page, "Grade labs");
    await expect(page.getByText("1 of 2 done")).toBeVisible();
    await page.getByRole("checkbox", { name: "Mark not done: Grade labs" }).click();
    await expect(page.getByText("0 of 2 done")).toBeVisible();
  });

  test("an empty task is not created", async ({ planner: page }) => {
    const box = spreadSection(page, "Work").getByRole("textbox", { name: "What matters most here?" });
    await box.fill("   ");
    await box.press("Enter");
    await expect(page.getByRole("checkbox")).toHaveCount(0);
  });

  test("a very long task title stays inside the screen", async ({ planner: page }) => {
    const long = "Prepare the quarterly planning packet for the whole department ".repeat(4).trim();
    await addTask(page, "Work", long);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("tasks and done marks survive a reload", async ({ planner: page }) => {
    await addTask(page, "Home", "Fix the gate");
    await markDone(page, "Fix the gate");
    await page.reload();
    await expect(page.getByRole("checkbox", { name: "Mark not done: Fix the gate" })).toBeChecked();
  });

  test("an open task can be put on a day and taken off again with Undo", async ({ planner: page }) => {
    await addTask(page, "Work", "Lab setup");
    await placeHours(page, "Work", "Wednesday");
    await openWeekTab(page);
    await expect(page.getByRole("heading", { name: "To place" })).toBeVisible();
    await page.getByRole("button", { name: /Place/ }).first().click();
    await page.getByRole("button", { name: /Wednesday/ }).first().click();
    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByRole("heading", { name: "To place" })).toBeVisible();
    await openSpreadTab(page);
  });
});
