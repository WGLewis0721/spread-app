import type { Ctx, Persona } from "./engine";

export const unfinishedTasksPersonas: Persona[] = [
  {
    slug: "01-dana",
    behavior: "unfinished",
    variations: ["overcommitment"],
    name: "Dana Whitfield",
    bio: "High school physics teacher, cello, robotics club.",
    async run(c) {
      const { ops, page } = c;
      await c.step("rename Home to Family", () => ops.renameSpread("Home", "Family"));
      await c.step("rename Health to Self (cello)", () => ops.renameSpread("Health", "Self (cello)"));
      await c.step("create Robotics Club", () => ops.createSpread("Robotics Club", 3));
      await c.step("set Work 10h", () => ops.setHours("Work", 10));
      await c.step("set Family 6h", () => ops.setHours("Family", 6));
      await c.step("set Self 4h", () => ops.setHours("Self (cello)", 4));
      await c.shot("setup");
      for (const t of ["Grade lab reports", "Grade quizzes", "Set up density lab", "Post grades"]) await c.step(`add task ${t}`, () => ops.addTask("Work", t));
      await c.step("add robotics task", () => ops.addTask("Robotics Club", "Order servo parts"));
      await c.step("add cello task", () => ops.addTask("Self (cello)", "Practice Dvorak"));
      await c.step("mark lab setup done", () => ops.markDone("Set up density lab"));
      await c.step("mark cello done", () => ops.markDone("Practice Dvorak"));
      await c.step("grading Monday 2h", () => ops.place("Work", "Monday", 2));
      await c.step("lab setup Wednesday 1h", () => ops.place("Work", "Wednesday", 1));
      await c.step("robotics Tuesday 2h", () => ops.place("Robotics Club", "Tuesday", 2));
      await c.step("cello Thursday", () => ops.place("Self (cello)", "Thursday", 1));
      await c.step("family Saturday 3h", () => ops.place("Family", "Saturday", 3));
      await c.shot("week planned", true);
      let monday = 0;
      await c.step("try to push grading past 2h on Monday", async () => {
        monday = await ops.pushDay("Monday", "Work");
      });
      c.note(monday > 2 ? "bug" : "worked", `Dana wanted grading capped at 2h on Monday. The + button kept going to ${monday}h, with no cap and no warning.`, monday > 2 ? "major" : undefined);
      await c.shot("Monday grading uncapped");
      await c.step("review open tasks into next week", async () => {
        await ops.spreadTab();
        const rows = await ops.reviewOpenTasks(true);
        c.note("info", `Review open tasks offered: ${rows.join(" | ")}`);
      });
      await c.step("go to next week", () => ops.nextWeek());
      await ops.spreadTab();
      c.note("info", `Next week now holds: ${(await ops.taskNames()).join(", ")}; ${await ops.total()}`);
      await c.shot("next week after rollover");
    },
  },
  {
    slug: "04-tyrone",
    behavior: "unfinished",
    variations: ["future-weeks"],
    name: "Coach Tyrone Reeves",
    bio: "Football coach, heavy weekends, bye week.",
    async run(c) {
      const { ops, page } = c;
      await c.step("rename Work to Film", () => ops.renameSpread("Work", "Film"));
      await c.step("rename Home to Family", () => ops.renameSpread("Home", "Family"));
      await c.step("rename Health to Self", () => ops.renameSpread("Health", "Self"));
      await c.step("create Practice", () => ops.createSpread("Practice", 10));
      for (const d of ["Monday", "Tuesday"]) await c.step(`Film ${d} 3h`, () => ops.place("Film", d, 3));
      for (const d of ["Wednesday", "Thursday", "Friday"]) await c.step(`Practice ${d} 2h`, () => ops.place("Practice", d, 2));
      await c.step("Family Saturday", () => ops.place("Family", "Saturday", 3));
      await c.step("task game plan", () => ops.addTask("Film", "Cut opponent tape"));
      await c.step("task recruits", () => ops.addTask("Practice", "Call recruits"));
      await c.shot("normal week", true);
      await c.step("rollover into next week", async () => {
        await ops.spreadTab();
        await ops.rollover();
      });
      c.note("info", `After Rollover the screen shows ${await ops.weekLabel()}.`);
      await ops.weekTab();
      const carried = await page.getByRole("group", { name: /^.+ on w+day$/ }).count();
      c.note(carried ? "worked" : "confusing", carried ? "Rollover carried the day layout into next week." : "Rollover copied tasks and hours but left every day empty, so the whole week layout has to be placed again. Tyrone would rebuild a normal week by hand just to take out one practice.", carried ? undefined : "major");
      await c.step("bye week: place Practice Wed and Thu only", async () => {
        await ops.place("Practice", "Wednesday", 2);
        await ops.place("Practice", "Thursday", 2);
      });
      await c.shot("bye week", true);
      await c.step("flip back to this week", () => ops.prevWeek());
      await ops.weekTab();
      const fri = await ops.dayHours("Friday", "Practice");
      c.note(fri > 0 ? "worked" : "bug", fri > 0 ? "This week kept its Friday practice after editing next week." : "This week lost its Friday practice.", fri > 0 ? undefined : "major");
      await c.step("rollover again onto a week that already has content", async () => {
        await ops.spreadTab();
        await ops.rollover();
        const confirm = page.getByRole("alertdialog", { name: "Replace next week?" });
        if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
          c.note("info", "Rolling over again onto the bye week he had already edited asked 'Replace next week?' before overwriting it.");
          await confirm.getByRole("button", { name: "Cancel" }).click();
        } else {
          c.note("bug", "Rolling over onto a week that already had edits did not ask before replacing it.", "major");
        }
      });
    },
  },
  {
    slug: "18-pete",
    behavior: "unfinished",
    variations: ["future-weeks"],
    name: "Pete Janssen",
    bio: "37, general contractor. Jobs slip all the time; picks what moves and what stays.",
    async run(c) {
      const { ops, page } = c;
      await c.step("rename Work to Jobs", () => ops.renameSpread("Work", "Jobs"));
      for (const t of ["Frame garage", "Order trusses", "Permit follow-up", "Quote Hendricks", "Pour pad", "Final walkthrough", "Invoice Lee", "Return rental"]) await c.step(`task ${t}`, () => ops.addTask("Jobs", t));
      for (const t of ["Frame garage", "Order trusses", "Invoice Lee"]) await c.step(`done: ${t}`, () => ops.markDone(t));
      await c.step("change my mind on one", async () => {
        await ops.markDone("Return rental");
        await page.getByRole("checkbox", { name: "Mark not done: Return rental" }).click();
      });
      await c.step("Review open tasks: look, then Not now", async () => {
        await page.getByRole("button", { name: "Review open tasks" }).click();
        const dialog = page.getByRole("dialog", { name: "Open tasks" });
        c.note("info", `Open tasks sheet lists ${await dialog.getByRole("checkbox").count()} tasks, all ticked by default.`);
        await c.shot("open tasks sheet");
        await dialog.getByRole("button", { name: "Not now" }).click();
      });
      await c.step("Review again: untick two, move the rest", async () => {
        await page.getByRole("button", { name: "Review open tasks" }).click();
        const dialog = page.getByRole("dialog", { name: "Open tasks" });
        await dialog.getByRole("checkbox", { name: /^Quote Hendricks/ }).click();
        await dialog.getByRole("checkbox", { name: /^Pour pad/ }).click();
        const label = await dialog.getByRole("button", { name: /^Move \d+/ }).innerText();
        c.note("info", `With two unticked the button reads "${label}".`);
        await dialog.getByRole("button", { name: /^Move \d+/ }).click();
      });
      await c.step("next week: what arrived?", async () => {
        await ops.nextWeek();
        c.note("info", `Next week holds: ${(await ops.taskNames()).join(", ")}.`);
        await ops.prevWeek();
        c.note("info", `This week still holds: ${(await ops.taskNames()).join(", ")}.`);
      });
      await c.step("Rollover onto a week that already has tasks: cancel", async () => {
        await ops.rollover();
        const confirm = page.getByRole("alertdialog", { name: "Replace next week?" });
        c.note("info", `Rollover asked before replacing: ${await confirm.isVisible().catch(() => false)}.`);
        await c.shot("replace next week prompt");
        await confirm.getByRole("button", { name: "Cancel" }).click();
      });
      await c.step("Rollover again and replace", async () => {
        await ops.rollover();
        await page.getByRole("alertdialog", { name: "Replace next week?" }).getByRole("button", { name: "Replace" }).click();
        c.note("info", `After Replace next week holds: ${(await ops.taskNames()).join(", ")}.`);
      });
      await c.step("jump three weeks ahead and back", async () => {
        for (let i = 0; i < 3; i++) await ops.nextWeek();
        await ops.backToThisWeek();
      });
    },
  },
  {
    slug: "19-lucia",
    behavior: "unfinished",
    name: "Lucia Ferrante",
    bio: "50, wedding photographer. Every week looks like last week; she copies and shares plans.",
    async run(c) {
      const { ops, page } = c;
      await c.step("rename Work to Shoots", () => ops.renameSpread("Work", "Shoots"));
      await c.step("Shoots 20h", () => ops.setHours("Shoots", 20));
      for (const t of ["Edit Alvarez gallery", "Deliver Chen album", "Backup cards"]) await c.step(`task ${t}`, () => ops.addTask("Shoots", t));
      await c.step("Shoots Saturday 10h", () => ops.place("Shoots", "Saturday", 10));
      await c.step("finish one task", () => ops.markDone("Backup cards"));
      await c.step("go to next week and Copy last week", async () => {
        await ops.nextWeek();
        await ops.openSettings();
        await page.getByRole("button", { name: "Copy last week" }).click();
        c.note("info", `Copy last week said: ${await ops.toastText()}.`);
      });
      await c.step("what did Copy last week bring?", async () => {
        c.note("info", `Next week tasks: ${(await ops.taskNames()).join(", ")}; ${await ops.total()}.`);
        await ops.weekTab();
        c.note("info", `Day layout copied: ${(await page.getByRole("group", { name: /^.+ on \w+day$/ }).count()) > 0}.`);
        await c.shot("after Copy last week", true);
      });
      await c.step("Copy week as text", async () => {
        await ops.openSettings();
        await page.getByRole("button", { name: "Copy week", exact: true }).click();
        c.note("info", `Copy week said: ${await ops.toastText()}.`);
      });
      await c.step("export a Word document", async () => {
        await ops.openSettings();
        await page.getByRole("button", { name: "Word document" }).click();
        await page.waitForTimeout(800);
        c.note("info", `Word export: ${await ops.toastText()}; files written: ${[...c.deviceFiles.keys()].filter((k) => k.endsWith(".docx")).join(", ") || "none seen"}.`);
      });
      await c.step("Print / Save PDF", async () => {
        await ops.openSettings();
        const offered = await page.getByRole("button", { name: /^Print/ }).count();
        c.note("info", offered ? "Print / Save PDF is offered." : "Print / Save PDF is not offered in the installed app's Settings (it is a web-only action), so a photographer who wants a PDF must use Word document or Copy week.");
      });
    },
  },
  {
    slug: "20-ben",
    behavior: "unfinished",
    variations: ["future-weeks"],
    name: "Ben Ashworth",
    bio: "41, freelance writer. Ticks things off, un-ticks them, deletes dead tasks and rolls the rest forward week after week.",
    async run(c) {
      const { ops, page } = c;
      await c.step("rename Work to Writing", () => ops.renameSpread("Work", "Writing"));
      for (const t of ["Pitch to Wired", "Draft essay", "Invoice Acme", "Fact-check piece", "Newsletter"]) await c.step(`task ${t}`, () => ops.addTask("Writing", t));
      await c.step("finish two", async () => {
        await ops.markDone("Pitch to Wired");
        await ops.markDone("Invoice Acme");
      });
      await c.step("un-finish one", () => page.getByRole("checkbox", { name: "Mark not done: Pitch to Wired" }).click());
      await c.step("open the dead newsletter task and delete it", async () => {
        await ops.openTask("Newsletter");
        await page.getByRole("button", { name: "Delete task" }).click();
      });
      await c.step("collapse the list for a clean look and reopen", async () => {
        await page.getByRole("button", { name: "Hide tasks for Writing" }).click();
        await page.getByRole("button", { name: "Show tasks for Writing" }).click();
      });
      const chain: string[] = [];
      for (let i = 1; i <= 4; i++) {
        await c.step(`Rollover #${i}`, async () => {
          await ops.rollover();
          chain.push(`week +${i}: ${(await ops.taskNames()).length} tasks, ${(await page.getByRole("checkbox", { checked: true }).count())} ticked`);
        });
      }
      c.note("info", `Rollover chain: ${chain.join(" | ")}.`);
      await c.shot("four rollovers out");
      await c.step("tick a task in the far week and go back", async () => {
        await ops.markDone("Draft essay");
        await ops.backToThisWeek();
        c.note("info", `This week afterwards: ${(await ops.taskNames()).join(", ")}; ${(await page.getByRole("checkbox", { checked: true }).count())} ticked.`);
      });
    },
  },
];
