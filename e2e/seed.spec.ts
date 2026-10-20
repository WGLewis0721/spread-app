import { expect, test } from "./fixtures";

/** Seed for the Playwright planner/generator/healer agents: an empty device with Spread open, offline from the world. */
test("seed", async ({ planner }) => {
  await expect(planner.getByRole("tab", { name: "Spread" })).toBeVisible();
});
