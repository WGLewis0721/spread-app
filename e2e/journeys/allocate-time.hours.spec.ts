import { expect, test } from "../fixtures";
import { dayCard, openWeekTab, placeHours, remainingHours } from "../helpers";

test.describe("hours: bank, days and what is left", () => {
  test("the week chips show each spread's unplaced hours", async ({ planner: page }) => {
    await openWeekTab(page);
    await expect(page.getByRole("button", { name: "Work 8h" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Home 4h" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Health 3h" })).toBeVisible();
  });

  test("placing an hour on a day takes it from the bank", async ({ planner: page }) => {
    await placeHours(page, "Work", "Monday");
    const monday = dayCard(page, "Monday");
    await expect(monday.getByRole("group", { name: "Work on Monday" })).toContainText("1h");
    expect(await remainingHours(page, "Work")).toBe(7);
  });

  test("increasing a day's hours keeps drawing down the bank, decreasing returns them", async ({ planner: page }) => {
    await placeHours(page, "Work", "Tuesday");
    const group = dayCard(page, "Tuesday").getByRole("group", { name: "Work on Tuesday" });
    await group.getByRole("button", { name: "Increase Work on Tuesday" }).click();
    await group.getByRole("button", { name: "Increase Work on Tuesday" }).click();
    await expect(group).toContainText("3h");
    expect(await remainingHours(page, "Work")).toBe(5);
    await group.getByRole("button", { name: "Decrease Work on Tuesday" }).click();
    await expect(group).toContainText("2h");
    expect(await remainingHours(page, "Work")).toBe(6);
  });

  test("removing a spread from a day puts every hour back", async ({ planner: page }) => {
    await placeHours(page, "Home", "Friday", 3);
    expect(await remainingHours(page, "Home")).toBe(1);
    await dayCard(page, "Friday").getByRole("button", { name: "Remove Home from Friday" }).click();
    await expect(dayCard(page, "Friday").getByText("No responsibilities scheduled for Friday.")).toBeVisible();
    expect(await remainingHours(page, "Home")).toBe(4);
  });

  test("a spread cannot place more hours than it has (the + simply does nothing)", async ({ planner: page }) => {
    await placeHours(page, "Health", "Monday", 3);
    expect(await remainingHours(page, "Health")).toBe(0);
    const group = dayCard(page, "Monday").getByRole("group", { name: "Health on Monday" });
    await expect(group).toContainText("3h");
    await group.getByRole("button", { name: "Increase Health on Monday" }).click();
    await expect(group).toContainText("3h");
    expect(await remainingHours(page, "Health")).toBe(0);
  });

  test("the Free time suggestions offer an hour on the lightest day and update after use", async ({ planner: page }) => {
    await openWeekTab(page);
    const free = page.getByRole("region", { name: "Free time" });
    await expect(free.getByRole("button", { name: "Add 1 hour of Work on Wednesday" })).toBeVisible();
    await free.getByRole("button", { name: "Add 1 hour of Work on Wednesday" }).click();
    await expect(page.getByText("Added to Wednesday.")).toBeVisible();
    await expect(dayCard(page, "Wednesday").getByRole("group", { name: "Work on Wednesday" })).toContainText("1h");
    await expect(free.getByRole("button", { name: "Add 1 hour of Work on Thursday" })).toBeVisible();
  });

  test("hours placed on days follow a spread's hour change in the bank", async ({ planner: page }) => {
    await placeHours(page, "Work", "Monday", 2);
    await page.getByRole("tab", { name: "Spread" }).click();
    await page.getByRole("button", { name: /^Work, \d+ hours?\. Adjust$/ }).click();
    const group = page.getByRole("group", { name: "Work hours" });
    await group.getByRole("button", { name: "Increase Work hours" }).click();
    await group.getByRole("button", { name: "Done adjusting hours" }).click();
    expect(await remainingHours(page, "Work")).toBe(7);
  });
});
