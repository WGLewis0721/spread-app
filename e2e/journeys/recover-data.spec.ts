import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import { addTask, markDone, openSpreadTab, placeHours } from "../helpers";
import { makeOps } from "../personas/engine";

const taskNames = (page: Page) =>
  page.getByRole("checkbox").evaluateAll((els) => els.map((e) => (e.getAttribute("aria-label") ?? "").replace(/^Mark (not )?done: /, "")));

const quiet = () => undefined;

test.describe("recovering saved data", () => {
  test("a plan survives a reload", async ({ planner: page }) => {
    await addTask(page, "Work", "Keep me");
    await markDone(page, "Keep me");
    await placeHours(page, "Work", "Tuesday", 3);
    await page.reload();
    await openSpreadTab(page);
    await expect(page.getByRole("checkbox", { name: "Mark not done: Keep me" })).toBeChecked();
    await page.getByRole("tab", { name: "Week" }).click();
    await expect(page.getByRole("group", { name: "Work on Tuesday" })).toContainText("3h");
  });

  test("backup then restore on a wiped device brings the plan back", async ({ planner: page, deviceFiles }) => {
    const ops = makeOps(page, quiet, deviceFiles);
    await addTask(page, "Work", "Reconcile log");
    await placeHours(page, "Work", "Tuesday", 4);
    await openSpreadTab(page);
    await ops.openSettings();
    const backup = await ops.backup();
    expect(backup.length).toBeGreaterThan(100);
    await page.evaluate(() => localStorage.clear());
    deviceFiles.clear();
    await page.reload();
    await expect(page.getByRole("tab", { name: "Spread" })).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await ops.openSettings();
    await ops.restore(backup, "confirm");
    await expect.poll(() => taskNames(page)).toContain("Reconcile log");
    await page.getByRole("tab", { name: "Week" }).click();
    await expect(page.getByRole("group", { name: "Work on Tuesday" })).toContainText("4h");
  });

  test("Cancel on the restore confirmation changes nothing", async ({ planner: page, deviceFiles }) => {
    const ops = makeOps(page, quiet, deviceFiles);
    await addTask(page, "Work", "Original");
    await ops.openSettings();
    const backup = await ops.backup();
    await addTask(page, "Work", "Added later");
    await ops.openSettings();
    const said = await ops.restore(backup, "cancel");
    expect(said).toMatch(/Add these profiles|Restore this backup/);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "More" })).toBeHidden();
    await expect.poll(() => taskNames(page)).toEqual(expect.arrayContaining(["Original", "Added later"]));
  });

  test("files that are not Spread backups are refused and the plan is untouched", async ({ planner: page, deviceFiles }) => {
    const ops = makeOps(page, quiet, deviceFiles);
    await addTask(page, "Work", "Precious");
    for (const text of ["Dear Dorothy, here are the minutes.", "", JSON.stringify({ hello: "world" })]) {
      await ops.openSettings();
      const said = await ops.restore(text, "none");
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      expect(said).toMatch(/isn’t a Spread backup, or it is damaged/);
      await page.keyboard.press("Escape");
    }
    await expect(page.getByRole("dialog", { name: "More" })).toBeHidden();
    await expect.poll(() => taskNames(page)).toContain("Precious");
  });

  test("profiles keep their own plans", async ({ planner: page, deviceFiles }) => {
    const ops = makeOps(page, quiet, deviceFiles);
    await addTask(page, "Work", "Mine");
    await ops.openSettings();
    await ops.addProfile("Partner");
    await expect.poll(() => taskNames(page)).toEqual([]);
    await addTask(page, "Work", "Theirs");
    await ops.openSettings();
    await ops.switchProfile("Me");
    await expect.poll(() => taskNames(page)).toEqual(["Mine"]);
  });

  test("a restore leaves a safety copy that can be restored from", async ({ planner: page, deviceFiles }) => {
    const ops = makeOps(page, quiet, deviceFiles);
    await addTask(page, "Work", "Before");
    await ops.openSettings();
    const backup = await ops.backup();
    await ops.spreadTab();
    await addTask(page, "Work", "After the backup");
    await ops.openSettings();
    await ops.restore(backup, "confirm");
    await ops.spreadTab();
    await expect.poll(() => taskNames(page)).toContain("After the backup");
    await expect.poll(() => ops.profileNames()).toEqual(expect.arrayContaining(["Me", expect.stringMatching(/restored/)]));
    await ops.openSettings();
    await page.getByRole("button", { name: "Restore from a safety copy" }).click();
    await expect(page.getByRole("list", { name: "Safety copies on this device" }).getByRole("listitem").first()).toBeVisible();
  });

  test("when the device refuses to save, the person is told", async ({ planner: page }) => {
    await page.evaluate(() => {
      Storage.prototype.setItem = function () {
        throw new DOMException("quota", "QuotaExceededError");
      };
    });
    await page.getByRole("textbox", { name: "What matters most here?" }).first().fill("Will not save");
    await page.keyboard.press("Enter");
    await expect(page.getByText(/couldn’t save/i)).toBeVisible();
  });

  test("planning with no connection works and is still there after reconnecting", async ({ planner: page }) => {
    await page.context().setOffline(true);
    await addTask(page, "Work", "Planned on a plane");
    await page.context().setOffline(false);
    await page.reload();
    await expect(page.getByRole("button", { name: "Planned on a plane", exact: true })).toBeVisible();
  });
});
