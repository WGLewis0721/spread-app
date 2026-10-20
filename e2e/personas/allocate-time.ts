import type { Ctx, Persona } from "./engine";

export const allocateTimePersonas: Persona[] = [
  {
    slug: "02-marcus",
    behavior: "allocate",
    variations: ["overcommitment"],
    name: "Marcus Bell",
    bio: "Play director in tech week.",
    async run(c) {
      const { ops } = c;
      await c.step("create Production", () => ops.createSpread("Production", 8));
      await c.step("rename Health to Self", () => ops.renameSpread("Health", "Self"));
      await c.step("remove Work", () => ops.removeSpread("Work"));
      await c.step("task: block scenes", () => ops.addTask("Production", "Block Act II"));
      await c.step("task: sand set pieces", () => ops.addTask("Home", "Sand the set pieces"));
      await c.shot("normal week");
      await c.step("tech week: Production 32h", () => ops.setHours("Production", 32));
      c.note("info", `After Production 32h: ${await ops.total()}`);
      await c.shot("production 32h");
      let reached0 = false;
      await c.step("drop Self to 0h", async () => {
        await ops.setHours("Self", 0);
        reached0 = true;
      });
      c.note(reached0 ? "info" : "confusing", reached0 ? "Self can be set to 0h with no prompt or warning." : "Self could not be set to 0h.");
      await c.shot("self zero");
      for (const d of ["Monday", "Tuesday", "Wednesday", "Thursday"]) await c.step(`Production ${d} 8h`, () => ops.place("Production", d, 8));
      await c.shot("week swallowed by production", true);
      await c.step("see what is left", async () => {
        await ops.weekTab();
        c.note("info", `Week chips: ${(await c.page.getByRole("button", { name: /^.+ \d+h$/ }).allInnerTexts()).map((s) => s.replace(/\s+/g, " ")).join(", ")}`);
      });
      await c.step("next week and back", async () => {
        await ops.nextWeek();
        await ops.backToThisWeek();
      });
    },
  },
  {
    slug: "05-elena",
    behavior: "allocate",
    variations: ["overcommitment"],
    name: "Elena Voss",
    bio: "Forensic science grad student, many spreads and small tasks.",
    async run(c) {
      const { ops } = c;
      await c.step("rename Work to Lab Runs", () => ops.renameSpread("Work", "Lab Runs"));
      await c.step("rename Home to Coursework", () => ops.renameSpread("Home", "Coursework"));
      await c.step("rename Health to Self (climbing)", () => ops.renameSpread("Health", "Self (climbing)"));
      await c.step("create Thesis Writing", () => ops.createSpread("Thesis Writing", 12));
      await c.step("create Housework", () => ops.createSpread("Housework", 3));
      await c.shot("five spreads");
      const small = ["Run GC-MS batch 4", "Calibrate balance", "Book instrument slot", "Reading ch. 7", "Problem set 3", "Email advisor", "Outline thesis ch. 2", "Cite check", "Export figures", "Laundry", "Groceries", "Climb Tue"];
      const where = ["Lab Runs", "Lab Runs", "Lab Runs", "Coursework", "Coursework", "Thesis Writing", "Thesis Writing", "Thesis Writing", "Thesis Writing", "Housework", "Housework", "Self (climbing)"];
      for (let i = 0; i < small.length; i++) await c.step(`task ${small[i]}`, () => ops.addTask(where[i], small[i]));
      await c.shot("twelve small tasks");
      for (const d of ["Tuesday", "Thursday"]) await c.step(`Lab Runs ${d} 4h`, () => ops.place("Lab Runs", d, 4));
      for (const d of ["Monday", "Wednesday", "Friday"]) await c.step(`Thesis ${d} 3h`, () => ops.place("Thesis Writing", d, 3));
      await c.step("climb three evenings", async () => {
        for (const d of ["Tuesday", "Thursday", "Saturday"]) await ops.place("Self (climbing)", d, 1);
      });
      await c.shot("week with five spreads", true);
      await c.step("lab emergency: add 4h Lab Runs on Wednesday", async () => {
        await ops.weekTab();
        await c.page.getByRole("button", { name: /^Lab Runs d+h$/ }).click();
        const addBtn = c.page.locator("section.week-seq-item").filter({ has: c.page.getByRole("heading", { level: 2, name: /^Wednesday/ }) }).getByRole("button", { name: "Add Lab Runs" });
        if (await addBtn.isDisabled()) c.note("confusing", "With 0h left, 'Add Lab Runs' still looks like a normal blue button but is disabled. Nothing says why; Elena has to know to raise Lab Runs hours first.", "minor");
        const left = Number((((await c.page.getByRole("button", { name: /^Lab Runs \d+h$/ }).innerText()).match(/(\d+)h/)) ?? [])[1]);
        c.note("info", `Lab Runs hours left when the emergency hits: ${left}h.`);
        await ops.place("Lab Runs", "Wednesday", 4);
      });
      const wed = await ops.dayHours("Wednesday", "Lab Runs");
      c.note(wed >= 4 ? "info" : "confusing", `Lab emergency on Wednesday: Lab Runs got ${wed}h. Thesis Wednesday ${await ops.dayHours("Wednesday", "Thesis Writing")}h stayed.`);
      c.note("missing", "No way to mark thesis hours as protected, or see that the lab emergency came out of free time.");
      await c.shot("after the lab emergency", true);
    },
  },
  {
    slug: "08-ravi",
    behavior: "allocate",
    variations: ["future-weeks"],
    name: "Ravi Menon",
    bio: "Software job, middle school hackathon coach, D&D.",
    async run(c) {
      const { ops, page } = c;
      await c.step("create Hack Team", () => ops.createSpread("Hack Team", 2));
      await c.step("rename Health to Self (D&D)", () => ops.renameSpread("Health", "Self (D&D)"));
      await c.step("task: recruit mentors", () => ops.addTask("Hack Team", "Recruit mentors"));
      await c.step("this week Hack Team 2h on Thursday", () => ops.place("Hack Team", "Thursday", 2));
      const hours: string[] = [`this week ${await ops.total()}`];
      await c.step("next week", () => ops.nextWeek());
      await c.step("next week Hack Team 5h", () => ops.setHours("Hack Team", 5));
      await c.step("task: order kits", () => ops.addTask("Hack Team", "Order robot kits"));
      await c.step("place Thursday + Saturday", async () => {
        await ops.place("Hack Team", "Thursday", 3);
        await ops.place("Hack Team", "Saturday", 2);
      });
      await ops.spreadTab();
      hours.push(`week +1 ${await ops.total()}`);
      await c.step("week after", () => ops.nextWeek());
      await c.step("week +2 Hack Team 9h", () => ops.setHours("Hack Team", 9));
      await c.step("place Saturday 5h Sunday 4h", async () => {
        await ops.place("Hack Team", "Saturday", 5);
        await ops.place("Hack Team", "Sunday", 4);
      });
      await ops.spreadTab();
      hours.push(`week +2 ${await ops.total()}`);
      c.note("info", `Planned hours: ${hours.join("; ")}`);
      await c.shot("week plus two", true);
      await c.step("compare: back and forth", async () => {
        await ops.prevWeek();
        await ops.prevWeek();
        await ops.spreadTab();
        c.note("info", `Back on this week: Hack Team shows ${await page.getByRole("button", { name: /^Hack Team, \d+ hours?\. Adjust$/ }).innerText()}.`);
      });
      await c.step("try the Month view for a side-by-side", async () => {
        await ops.weekTab();
        await page.getByRole("button", { name: "Month" }).click();
        await c.shot("month view", true);
        c.note("info", `Month view text: ${(await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 160)}`);
      });
    },
  },
  {
    slug: "09-jaylen",
    behavior: "allocate",
    variations: ["overcommitment"],
    name: "Jaylen Carter",
    bio: "College fraternity president, midterms collide with an event.",
    async run(c) {
      const { ops, page } = c;
      await c.step("rename Work to Classes", () => ops.renameSpread("Work", "Classes"));
      await c.step("rename Home to Chapter", () => ops.renameSpread("Home", "Chapter"));
      await c.step("rename Health to Self (hoops)", () => ops.renameSpread("Health", "Self (hoops)"));
      await c.step("create Social", () => ops.createSpread("Social", 6));
      await c.step("Classes 24h", () => ops.setHours("Classes", 24));
      await c.step("Chapter 14h", () => ops.setHours("Chapter", 14));
      await c.step("Social 16h", () => ops.setHours("Social", 16));
      await c.step("task: study for midterm", () => ops.addTask("Classes", "Study for stats midterm"));
      await c.step("task: philanthropy", () => ops.addTask("Social", "Philanthropy dinner setup"));
      await c.step("task: chapter agenda", () => ops.addTask("Chapter", "Chapter meeting agenda"));
      await c.shot("overbooked plan");
      for (const [s, d] of [["Classes", "Wednesday"], ["Chapter", "Wednesday"], ["Social", "Wednesday"]] as const) await c.step(`${s} on ${d}`, () => ops.place(s, d, 1));
      let wed = 0;
      await c.step("pile everything on Wednesday", async () => {
        wed += await ops.pushDay("Wednesday", "Classes");
        wed += await ops.pushDay("Wednesday", "Chapter");
        wed += await ops.pushDay("Wednesday", "Social");
      });
      c.note(wed > 24 ? "bug" : "info", `Wednesday now holds ${wed} planned hours across spreads (a day has 24).`, wed > 24 ? "major" : undefined);
      await c.shot("wednesday 24h plus", true);
      c.note("missing", "No per-day total on the day card, so a 24h+ day isn't flagged anywhere.");
      await ops.weekTab();
      const selfLeft = await page.getByRole("button", { name: /^Self \(hoops\) \d+h$/ }).innerText();
      c.note("info", `Self time (hoops) is still ${selfLeft.replace(/\s+/g, " ")} unplaced. Nothing warns that none of it is on a day.`);
    },
  },
  {
    slug: "11-naomi",
    behavior: "allocate",
    name: "Dr. Naomi Feld",
    bio: "Couples therapist, protects Self time.",
    async run(c) {
      const { ops, page } = c;
      await c.step("rename Work to Clients", () => ops.renameSpread("Work", "Clients"));
      await c.step("create Admin", () => ops.createSpread("Admin", 8));
      await c.step("rename Health to Self (pottery)", () => ops.renameSpread("Health", "Self (pottery)"));
      await c.step("Self 8h", () => ops.setHours("Self (pottery)", 8));
      await c.step("Clients 24h", () => ops.setHours("Clients", 24));
      for (const d of ["Monday", "Tuesday", "Wednesday", "Thursday"]) {
        await c.step(`Clients ${d} 5h`, () => ops.place("Clients", d, 5));
        await c.step(`Admin ${d} 2h right after sessions`, () => ops.place("Admin", d, 2));
      }
      await c.step("pottery Friday + pickleball Sunday", async () => {
        await ops.place("Self (pottery)", "Friday", 4);
        await ops.place("Self (pottery)", "Sunday", 2);
      });
      await c.step("note-writing task", () => ops.addTask("Admin", "Finish Tuesday session notes"));
      await c.shot("protected week", true);
      await c.step("take a Free time suggestion", async () => {
        await ops.weekTab();
        const chip = c.page.getByRole("button", { name: /^Add 1 hour of / }).first();
        const label = (await chip.getAttribute("aria-label")) ?? "";
        await chip.click();
        c.note("info", `Free time offered "${label}" and added it with one tap.`);
      });
      await c.step("work grows: Clients to 40h", () => ops.setHours("Clients", 40));
      await c.step("squeeze: add Clients to Friday", () => ops.place("Clients", "Friday", 4));
      await ops.spreadTab();
      const self = await page.getByRole("button", { name: /^Self \(pottery\), \d+ hours?\. Adjust$/ }).innerText();
      c.note(self.includes("8h") ? "info" : "bug", `After work grew, Self (pottery) is ${self}. Growing work never touches it, and nothing stops Clients landing on her Friday pottery day.`);
      c.note("missing", "No way to lock a day or an hours block as protected. Self time is protected only by her own discipline.");
      await c.shot("work grew, self intact", true);
    },
  },
];
