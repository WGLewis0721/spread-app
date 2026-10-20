import { expect, test } from "./fixtures";
import { setHours, spreadSection } from "./helpers";

async function createSpread(page: import("@playwright/test").Page, name: string, hours = 2) {
  await page.getByRole("button", { name: /New Spread/ }).click();
  const dialog = page.getByRole("dialog", { name: "New Spread" });
  await dialog.getByRole("textbox", { name: "Spread 1" }).fill(name);
  for (let h = 2; h < hours; h++) await dialog.getByRole("button", { name: "Increase Hours for spread 1" }).click();
  await dialog.getByRole("button", { name: "Save spreads" }).click();
  await expect(dialog).toBeHidden();
}

test.describe("responsibilities", () => {
  test("New Spread cannot be saved until it has a name", async ({ planner: page }) => {
    await page.getByRole("button", { name: /New Spread/ }).click();
    const dialog = page.getByRole("dialog", { name: "New Spread" });
    await expect(dialog.getByRole("button", { name: "Save spreads" })).toBeDisabled();
    await dialog.getByRole("textbox", { name: "Spread 1" }).fill("Robotics Club");
    await expect(dialog.getByRole("button", { name: "Save spreads" })).toBeEnabled();
  });

  test("a custom spread joins the list and the weekly total", async ({ planner: page }) => {
    await createSpread(page, "Robotics Club", 3);
    await expect(page.getByRole("textbox", { name: "Robotics Club name" })).toHaveValue("Robotics Club");
    await expect(page.getByRole("button", { name: "Robotics Club, 3 hours. Adjust" })).toBeVisible();
    await expect(page.getByText("18 hours across 4 spreads")).toBeVisible();
  });

  test("several spreads can be created in one pass", async ({ planner: page }) => {
    await page.getByRole("button", { name: /New Spread/ }).click();
    const dialog = page.getByRole("dialog", { name: "New Spread" });
    await dialog.getByRole("textbox", { name: "Spread 1" }).fill("Bakery");
    await dialog.getByRole("button", { name: "Add another spread" }).click();
    await dialog.getByRole("textbox", { name: "Spread 2" }).fill("Wedding");
    await dialog.getByRole("button", { name: "Save spreads" }).click();
    await expect(page.getByText("19 hours across 5 spreads")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Bakery name" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Wedding name" })).toBeVisible();
  });

  test("renaming a spread sticks across a reload", async ({ planner: page }) => {
    await page.getByRole("textbox", { name: "Home name", exact: true }).fill("Household");
    await page.keyboard.press("Enter");
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Household name" })).toHaveValue("Household");
    await expect(page.getByRole("textbox", { name: "Home name", exact: true })).toHaveCount(0);
  });

  test("hours go up and down and the weekly total follows", async ({ planner: page }) => {
    await setHours(page, "Health", 6);
    await expect(page.getByText("18 hours across 3 spreads")).toBeVisible();
    await setHours(page, "Health", 1);
    await expect(page.getByText("13 hours across 3 spreads")).toBeVisible();
  });

  test("a spread can be removed in edit mode and the total drops", async ({ planner: page }) => {
    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByRole("button", { name: "Remove Home" }).click();
    const confirm = page.getByRole("alertdialog");
    if (await confirm.isVisible().catch(() => false)) await confirm.getByRole("button", { name: /Remove|Delete/ }).click();
    await expect(page.getByRole("textbox", { name: "Home name", exact: true })).toHaveCount(0);
    await expect(page.getByText("11 hours across 2 spreads")).toBeVisible();
  });

  test("each spread keeps its own tasks", async ({ planner: page }) => {
    const work = spreadSection(page, "Work");
    await work.getByRole("textbox", { name: "What matters most here?" }).fill("Only for work");
    await page.keyboard.press("Enter");
    await expect(spreadSection(page, "Home").getByText("Only for work")).toHaveCount(0);
  });
});
