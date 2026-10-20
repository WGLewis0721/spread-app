import type { Persona } from "./engine";

export const recoverDataPersonas: Persona[] = [
  {
    slug: "21-nadia",
    behavior: "recover",
    name: "Nadia Haddad",
    bio: "36, ICU pharmacist. Just bought a new phone and wants her plan on it.",
    async run(c) {
      const { ops, page } = c;
      await c.step("build a plan worth keeping", async () => {
        await ops.renameSpread("Work", "Pharmacy");
        await ops.setHours("Pharmacy", 24);
        await ops.addTask("Pharmacy", "Reconcile narcotics log");
        await ops.addTask("Pharmacy", "Renew licence");
        await ops.markDone("Renew licence");
        await ops.place("Pharmacy", "Tuesday", 8);
      });
      let backup = "";
      await c.step("Back Up Spread", async () => {
        await ops.spreadTab();
        await ops.openSettings();
        backup = await ops.backup();
        c.note("info", `Backup toast: ${await ops.toastText()}. File is ${backup.length} characters and starts ${backup.slice(0, 40)}.`);
      });
      await c.step("move to the new phone: wipe this device and reload", async () => {
        await page.evaluate(() => localStorage.clear());
        c.deviceFiles.clear();
        await page.reload();
        await page.getByRole("tab", { name: "Spread" }).waitFor({ timeout: 20000 });
        c.note("info", `New device starts with ${await ops.total()} and ${(await ops.taskNames()).length} tasks.`);
        await c.shot("new phone empty");
      });
      await c.step("Restore Spread: look, cancel, then restore", async () => {
        await ops.openSettings();
        await page.getByRole("button", { name: "Restore Spread" }).click().catch(() => undefined);
        const said = await ops.restore(backup, "cancel");
        c.note("info", `Restore dialog said: ${said}`);
        c.note("info", `After Cancel nothing changed: ${await ops.total()}.`);
        await ops.openSettings().catch(() => undefined);
        const again = await ops.restore(backup, "confirm");
        c.note("info", `Second pick, same summary: ${again === said}.`);
      });
      await c.step("check what came back", async () => {
        await page.waitForTimeout(800);
        await ops.spreadTab().catch(() => undefined);
        c.note("info", `After restore: ${await ops.total()}; tasks: ${(await ops.taskNames()).join(", ")}; toast: ${await ops.toastText()}.`);
        await ops.weekTab();
        c.note("info", `Tuesday Pharmacy after restore: ${await ops.dayHours("Tuesday", "Pharmacy")}h.`);
        await c.shot("restored on the new phone", true);
      });
    },
  },
  {
    slug: "22-owen",
    behavior: "recover",
    name: "Owen Gallagher",
    bio: "58, accountant. Terrified of losing his data; reloads and checks after every step.",
    async run(c) {
      const { ops, page } = c;
      await c.step("add a task and reload", async () => {
        await ops.addTask("Work", "Quarterly filings");
        await ops.markDone("Quarterly filings");
        await page.reload();
        await page.getByRole("tab", { name: "Spread" }).waitFor({ timeout: 20000 });
        const kept = (await ops.taskNames()).includes("Quarterly filings");
        c.note(kept ? "worked" : "bug", `The task and its done tick ${kept ? "survived" : "did not survive"} a reload.`, kept ? undefined : "blocker");
      });
      await c.step("read the save status in Settings", async () => {
        await ops.openSettings();
        const status = (await page.getByRole("dialog", { name: "More" }).getByRole("status").innerText()).replace(/\s+/g, " ");
        c.note("info", `Settings status: ${status}`);
        await ops.closeSettings();
      });
      let backup = "";
      await c.step("take a backup, then change the plan", async () => {
        await ops.openSettings();
        backup = await ops.backup();
        await ops.addTask("Work", "Task added after the backup");
        await ops.renameSpread("Home", "House");
      });
      await c.step("restore the backup (creates a safety copy first)", async () => {
        await ops.openSettings();
        const said = await ops.restore(backup, "confirm");
        c.note("info", `Restore dialog said: ${said}`);
        await page.waitForTimeout(1000);
        await ops.spreadTab().catch(() => undefined);
        const profiles = await ops.profileNames();
        c.note("info", `After restoring a backup onto a device that already has content: profiles are ${profiles.join(", ")}; the open one shows tasks ${(await ops.taskNames()).join(", ")}.`);
      });
      await c.step("find the safety copy and restore from it", async () => {
        await ops.openSettings();
        await page.getByRole("button", { name: "Restore from a safety copy" }).click();
        const list = page.getByRole("list", { name: "Safety copies on this device" });
        const copies = await list.getByRole("listitem").count();
        c.note(copies > 0 ? "worked" : "bug", copies > 0 ? `${copies} safety copy/copies listed after a restore.` : "No safety copy was listed after a restore, although the app says one is saved before anything is replaced.", copies > 0 ? undefined : "major");
        await c.shot("safety copies");
        if (copies > 0) {
          await list.getByRole("listitem").first().click();
          const dialog = page.getByRole("alertdialog");
          c.note("info", `Safety copy dialog said: ${(await dialog.innerText()).replace(/\s+/g, " ")}`);
          await dialog.getByRole("button", { name: /^(Add as profiles|Add)$/ }).click();
          await page.waitForTimeout(1000);
          c.note("info", `After "Add as profiles" the profiles are: ${(await ops.profileNames()).join(", ")}.`);
        }
      });
      await c.step("storage full: edit when the device refuses to save", async () => {
        await page.evaluate(() => {
          const real = Storage.prototype.setItem;
          Storage.prototype.setItem = function () {
            throw new DOMException("quota", "QuotaExceededError");
          };
          (window as any).__restoreStorage = () => (Storage.prototype.setItem = real);
        });
        await ops.addTask("Work", "Typed while storage is full");
        await page.waitForTimeout(800);
        c.note("info", `Toast when saving fails: ${await ops.toastText()}.`);
        await c.shot("save failed toast");
        await page.evaluate(() => (window as any).__restoreStorage());
      });
    },
  },
  {
    slug: "23-imani",
    behavior: "recover",
    name: "Imani Brooks",
    bio: "26, nurse practitioner. Shares her phone's planner with her partner Jordan, each with their own plan.",
    async run(c) {
      const { ops, page } = c;
      await c.step("rename the open profile to Imani", async () => {
        await ops.openSettings();
        await ops.renameOpenProfile("Imani");
        await ops.closeSettings();
      });
      await c.step("Imani plans her week", async () => {
        await ops.addTask("Work", "Clinic charts");
        await ops.setHours("Work", 20);
        await ops.place("Work", "Tuesday", 6);
      });
      await c.step("add a profile for Jordan", async () => {
        await ops.openSettings();
        await ops.addProfile("Jordan");
        await page.waitForTimeout(600);
        c.note("info", `After adding Jordan the toast says: ${await ops.toastText()}.`);
      });
      await c.step("Jordan's profile starts clean", async () => {
        await ops.spreadTab();
        c.note("info", `Jordan sees ${await ops.total()} and tasks: ${(await ops.taskNames()).join(", ") || "none"}.`);
        await ops.addTask("Work", "Fix bike");
        await c.shot("Jordan profile");
      });
      await c.step("switch back to Imani: nothing of Jordan's leaks in", async () => {
        await ops.openSettings();
        await ops.switchProfile("Imani");
        await page.waitForTimeout(700);
        await ops.spreadTab();
        const names = await ops.taskNames();
        c.note(names.includes("Fix bike") ? "bug" : "worked", `Imani's tasks after switching: ${names.join(", ")}.`, names.includes("Fix bike") ? "blocker" : undefined);
      });
      await c.step("Imani's hours stayed hers", async () => {
        c.note("info", `Imani's total: ${await ops.total()}.`);
        await ops.weekTab();
        c.note("info", `Imani's Tuesday Work: ${await ops.dayHours("Tuesday", "Work")}h.`);
      });
      await c.step("try to remove Jordan, cancel, then remove", async () => {
        await ops.openSettings();
        await ops.removeProfile("Jordan", false);
        c.note("info", `After Cancel the profiles are still: ${(await ops.profileNames()).join(", ")}.`);
        await ops.removeProfile("Jordan", true);
        await page.waitForTimeout(500);
        c.note("info", `After Remove the profiles are: ${(await ops.profileNames()).join(", ")}.`);
      });
      await c.step("reload: profile and plan persist", async () => {
        await page.reload();
        await page.getByRole("tab", { name: "Spread" }).waitFor({ timeout: 20000 });
        c.note("info", `After reload tasks: ${(await ops.taskNames()).join(", ")}.`);
      });
    },
  },
  {
    slug: "24-kenji",
    behavior: "recover",
    name: "Kenji Watanabe",
    bio: "31, travelling consultant. Plans on planes with no signal and expects nothing to be lost.",
    async run(c) {
      const { ops, page } = c;
      await c.step("make one backup before boarding (also loads the export code, which the installed app has on disk but this web simulation fetches lazily)", async () => {
        await ops.openSettings();
        await ops.backup();
        await ops.closeSettings();
      });
      await c.step("go offline", async () => {
        await page.context().setOffline(true);
        c.note("info", "Airplane mode on.");
      });
      await c.step("plan a whole week offline", async () => {
        await ops.renameSpread("Work", "Client site");
        await ops.setHours("Client site", 25);
        await ops.addTask("Client site", "Workshop slides");
        await ops.addTask("Client site", "Expense report");
        await ops.markDone("Expense report");
        await ops.place("Client site", "Thursday", 8);
        await ops.nextWeek();
        await ops.addTask("Client site", "Follow-up call");
        await ops.backToThisWeek();
      });
      await c.step("Settings says it works with no connection", async () => {
        await ops.openSettings();
        const status = (await page.getByRole("dialog", { name: "More" }).getByRole("status").innerText()).replace(/\s+/g, " ");
        c.note(/no connection/i.test(status) ? "worked" : "confusing", `Settings status offline: ${status}`);
        await c.shot("offline settings");
      });
      await c.step("Back up while offline", async () => {
        const backup = await ops.backup();
        c.note("info", `Offline backup produced a ${backup.length}-character file; toast: ${await ops.toastText()}.`);
      });
      await c.step("land: back online and reload", async () => {
        await page.context().setOffline(false);
        await page.reload();
        await page.getByRole("tab", { name: "Spread" }).waitFor({ timeout: 20000 });
        const names = await ops.taskNames();
        c.note(names.includes("Workshop slides") ? "worked" : "bug", `After landing and reloading: ${names.join(", ")}.`, names.includes("Workshop slides") ? undefined : "blocker");
        await ops.weekTab();
        c.note("info", `Thursday Client site after reload: ${await ops.dayHours("Thursday", "Client site")}h.`);
        await ops.nextWeek();
        await ops.spreadTab();
        c.note("info", `Next week after reload: ${(await ops.taskNames()).join(", ")}.`);
      });
    },
  },
  {
    slug: "25-dorothy",
    behavior: "recover",
    name: "Dorothy Kessler",
    bio: "71, retired librarian. Emails herself backups and sometimes picks the wrong file.",
    async run(c) {
      const { ops, page } = c;
      await c.step("make a small plan and a good backup", async () => {
        await ops.addTask("Work", "Library board minutes");
        await ops.openSettings();
      });
      const good = await ops.backup().catch(() => "");
      const tries: [string, string][] = [
        ["a random text file", "Dear Dorothy, here are the minutes."],
        ["an empty file", ""],
        ["JSON that isn't a Spread backup", JSON.stringify({ hello: "world" })],
        ["a backup from a future version", good.replace(/"version":\s*\d+/, '"version":99')],
        ["a backup edited by hand (checksum no longer matches)", good.replace("Library board minutes", "Library board minutes EDITED")],
      ];
      for (const [label, text] of tries) {
        await c.step(`pick ${label}`, async () => {
          await ops.openSettings();
          const said = await ops.restore(text, "none");
          const dialogShown = await page.getByRole("alertdialog").isVisible().catch(() => false);
          if (dialogShown) await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
          c.note(dialogShown ? "bug" : "info", `Picking ${label}: ${dialogShown ? "the app offered to restore it" : "refused"}. Message: ${said}`, dialogShown ? "major" : undefined);
          const kept = (await ops.taskNames()).includes("Library board minutes");
          if (!kept) c.note("bug", `Her plan changed after picking ${label}.`, "blocker");
        });
      }
      await c.step("finally pick the good backup and restore it", async () => {
        await ops.openSettings();
        const said = await ops.restore(good, "confirm");
        c.note("info", `Good backup dialog: ${said}`);
        await page.waitForTimeout(600);
        c.note("info", `Tasks after the good restore: ${(await ops.taskNames()).join(", ")}.`);
        await c.shot("after good restore");
      });
    },
  },
];
