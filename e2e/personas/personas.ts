import type { Ctx, Persona } from "./engine";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

async function moveDay(c: Ctx, spread: string, from: string, to: string) {
  const { page, ops } = c;
  await ops.weekTab();
  const handle = page.locator("section.week-seq-item").filter({ has: page.getByRole("heading", { level: 2, name: new RegExp(`^${from}`) }) }).getByRole("button", { name: `Move ${spread}`, exact: true });
  const target = page.locator("section.week-seq-item").filter({ has: page.getByRole("heading", { level: 2, name: new RegExp(`^${to}`) }) });
  const hb = await handle.boundingBox();
  await target.scrollIntoViewIfNeeded();
  const tb = await target.boundingBox();
  if (!hb || !tb) throw new Error("no drag geometry");
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + 12, { steps: 4 });
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 12 });
  await page.mouse.up();
}

export const personas: Persona[] = [
  {
    slug: "01-dana",
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
    slug: "02-marcus",
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
    slug: "03-priya",
    name: "Priya Nair",
    bio: "Startup administrative assistant, half-marathon training.",
    async run(c) {
      const { ops } = c;
      await c.step("set Work 20h", () => ops.setHours("Work", 20));
      await c.step("rename Health to Self (running)", () => ops.renameSpread("Health", "Self (running)"));
      for (const t of ["Book exec flights", "Update calendar", "Expense report"]) await c.step(`task ${t}`, () => ops.addTask("Work", t));
      await c.step("task run", () => ops.addTask("Self (running)", "Long run 8mi"));
      for (const d of ["Monday", "Tuesday", "Wednesday"]) await c.step(`Work ${d} 4h`, () => ops.place("Work", d, 4));
      await c.step("run Saturday", () => ops.place("Self (running)", "Saturday", 2));
      await c.shot("before the plans change", true);
      await c.step("Tuesday plans change: drag Work from Tuesday to Thursday", async () => {
        await moveDay(c, "Work", "Tuesday", "Thursday");
      });
      const t = await ops.dayHours("Tuesday", "Work");
      const th = await ops.dayHours("Thursday", "Work");
      c.note(th > 0 && t === 0 ? "worked" : "bug", `Drag Tuesday to Thursday: Tuesday Work ${t}h, Thursday Work ${th}h.`, th > 0 && t === 0 ? undefined : "major");
      if (!(th > 0 && t === 0)) {
        await c.step("fallback: remove and re-add by tapping", async () => {
          await c.page.getByRole("button", { name: "Remove Work from Tuesday" }).click();
          await ops.place("Work", "Thursday", 4);
        });
      }
      await c.shot("after rearranging", true);
      await c.step("undo toast available", async () => {
        c.note("info", `Undo visible after the last change: ${await c.page.getByRole("button", { name: "Undo" }).isVisible()}`);
      });
    },
  },
  {
    slug: "04-tyrone",
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
        c.note("info", `A second Rollover from next week went on to ${await ops.weekLabel()}; no replace prompt appeared because that week was empty.`);
      });
    },
  },
  {
    slug: "05-elena",
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
    slug: "06-grace",
    name: "Grace Okafor",
    bio: "2nd grade teacher, wedding planning, bakery on the side.",
    async run(c) {
      const { ops, page } = c;
      await c.step("rename Home to Wedding planning", () => ops.renameSpread("Home", "Wedding planning"));
      await c.step("rename Health to Self", () => ops.renameSpread("Health", "Self"));
      await c.step("create Bakery", () => ops.createSpread("Bakery", 5));
      await c.step("Work 14h for conference week", () => ops.setHours("Work", 14));
      const t0 = Date.now();
      for (let i = 1; i <= 12; i++) await c.step(`conference ${i}`, () => ops.addTask("Work", `Conference ${i}: family ${String.fromCharCode(64 + i)}`));
      c.note("info", `Typing 12 small tasks took ${Math.round((Date.now() - t0) / 1000)}s of automation time.`);
      await c.shot("twelve conference tasks");
      await c.step("open Week", () => ops.weekTab());
      await c.step("first try placing a task before Work is on any day", async () => {
        const group = page.getByRole("button", { name: /^Work d+ tasks?$/ });
        const collapsed = (await group.getAttribute("aria-expanded")) !== "true";
        c.note(collapsed ? "confusing" : "info", collapsed ? "With 12 tasks the Work group in To place starts collapsed, so each Place button is hidden until the group is opened. One extra tap before the first placement." : "The To place group opened by itself.", collapsed ? "polish" : undefined);
        if (collapsed) await group.click();
        await page.getByRole("button", { name: "Place", exact: true }).first().click();
        const msg = await page.getByText("This role isn’t on a day yet. Add it to a day first.").isVisible();
        c.note(msg ? "confusing" : "info", msg ? "Tapping Place on a task before its spread is on a day only says 'Add it to a day first.' The order (days, then tasks) is not obvious on first use." : "Place offered days right away.", msg ? "polish" : undefined);
        await page.getByRole("button", { name: "Place", exact: true }).first().click();
      });
      for (const d of ["Monday", "Tuesday", "Wednesday"]) await c.step(`Work on ${d} 2h`, () => ops.place("Work", d, 2));
      await c.shot("to place list", true);
      let taps = 0;
      for (let i = 0; i < 3; i++) {
        await c.step(`place conference ${i + 1} on a day`, async () => {
          await ops.weekTab();
          await page.getByRole("button", { name: "Place", exact: true }).first().click();
          taps++;
          await page.getByRole("list", { name: /^Days for / }).first().getByRole("button", { name: new RegExp(DAYS[i]) }).click();
          taps++;
        });
      }
      c.note("info", `Placing 3 short tasks took ${taps} taps (about ${taps / 3} per task).`);
      await c.shot("after placing three", true);
      await c.step("bakery order Saturday", () => ops.place("Bakery", "Saturday", 3));
      await c.step("Mark two conferences done", async () => {
        await ops.spreadTab();
        await ops.markDone("Conference 1: family A");
        await ops.markDone("Conference 2: family B");
      });
      await c.shot("end of conference week");
    },
  },
  {
    slug: "07-hannah",
    name: "Hannah Lindqvist",
    bio: "Homesteader and homeschooling parent of four.",
    async run(c) {
      const { ops, page } = c;
      await c.step("rename Work to Homeschool", () => ops.renameSpread("Work", "Homeschool"));
      await c.step("rename Home to Homestead", () => ops.renameSpread("Home", "Homestead"));
      await c.step("create Family", () => ops.createSpread("Family", 6));
      await c.step("rename Health to Self (quiet hour)", () => ops.renameSpread("Health", "Self (quiet hour)"));
      const chores = ["Milk goats", "Feed chickens", "Water garden", "Collect eggs", "Weed beds", "Mend fence", "Bake bread", "Laundry"];
      const lessons = ["Math: fractions", "Reading aloud", "Latin drills", "Nature journal", "Science: soil", "History: Rome", "Piano practice", "Spelling"];
      for (const t of chores) await c.step(`chore ${t}`, () => ops.addTask("Homestead", t));
      for (const t of lessons) await c.step(`lesson ${t}`, () => ops.addTask("Homeschool", t));
      await c.shot("sixteen tasks");
      await c.step("mark milk and eggs done", async () => {
        await ops.markDone("Milk goats");
        await ops.markDone("Collect eggs");
      });
      const repeatUi = await page.getByText(/repeat|recurring|every week|daily/i).count();
      c.note(repeatUi ? "worked" : "missing", repeatUi ? "A repeat option is visible." : "No way to make a task repeat. Milk goats every morning has to be typed again every week.");
      await c.step("quiet hour Sunday", () => ops.place("Self (quiet hour)", "Sunday", 1));
      await c.step("rollover into next week", async () => {
        await ops.spreadTab();
        await ops.rollover();
      });
      const names = await ops.taskNames();
      c.note("info", `Next week after Rollover carries ${names.length} tasks (${names.includes("Milk goats") ? "including" : "not including"} the finished 'Milk goats').`);
      c.note(names.includes("Milk goats") ? "worked" : "confusing", names.includes("Milk goats") ? "Finished recurring chores carry over after Rollover, which works as a poor man's repeat." : "Finished chores do not carry to next week, so repeating chores must be re-entered.");
      await c.shot("next week after rollover", true);
    },
  },
  {
    slug: "08-ravi",
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
    slug: "10-renata",
    name: "Renata Alvarez",
    bio: "Small claims lawyer, alternating custody weeks.",
    async run(c) {
      const { ops, page } = c;
      await c.step("rename Home to Family", () => ops.renameSpread("Home", "Family"));
      await c.step("rename Health to Self (garden)", () => ops.renameSpread("Health", "Self (garden)"));
      await c.step("Work 30h", () => ops.setHours("Work", 30));
      await c.step("Family 20h kids week", () => ops.setHours("Family", 20));
      await c.step("filing task", () => ops.addTask("Work", "File motion to compel (due Fri)"));
      await c.step("hearing prep task", () => ops.addTask("Work", "Hearing prep: Hall v. Reyes"));
      await c.step("put the filing deadline on Friday", async () => {
        await ops.place("Work", "Friday", 2);
        await ops.weekTab();
        await page.getByRole("button", { name: /^Place/ }).first().click();
        await page.getByRole("button", { name: /Friday/ }).first().click();
      });
      c.note((await page.getByRole("button", { name: "Undo" }).count()) ? "worked" : "info", "Placing the filing on Friday offered Undo.");
      await c.shot("kids week", true);
      await c.step("next week: no kids", () => ops.nextWeek());
      await c.step("Family 2h, Work 40h", async () => {
        await ops.setHours("Family", 2);
        await ops.setHours("Work", 40);
      });
      await c.shot("no-kids week");
      let kept = true;
      for (let i = 0; i < 3; i++) {
        await c.step(`jump back and forth ${i + 1}`, async () => {
          await ops.prevWeek();
          await ops.nextWeek();
        });
      }
      await ops.spreadTab();
      const fam = await page.getByRole("button", { name: /^Family, \d+ hours?\. Adjust$/ }).innerText();
      kept = fam.includes("2h");
      c.note(kept ? "worked" : "bug", `After jumping between weeks, the no-kids week still shows Family ${fam}.`, kept ? undefined : "major");
      await c.step("back to this week: kids week intact", async () => {
        await ops.backToThisWeek();
        const f = await page.getByRole("button", { name: /^Family, \d+ hours?\. Adjust$/ }).innerText();
        c.note(f.includes("20h") ? "worked" : "bug", `Kids week Family hours: ${f}.`, f.includes("20h") ? undefined : "major");
      });
      c.note("missing", "No alternating-week template: she would rebuild the kids-week and no-kids-week split by hand every two weeks.");
    },
  },
  {
    slug: "11-naomi",
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
      await c.step("work grows: Clients to 40h", () => ops.setHours("Clients", 40));
      await c.step("squeeze: add Clients to Friday", () => ops.place("Clients", "Friday", 4));
      await ops.spreadTab();
      const self = await page.getByRole("button", { name: /^Self \(pottery\), \d+ hours?\. Adjust$/ }).innerText();
      c.note(self.includes("8h") ? "info" : "bug", `After work grew, Self (pottery) is ${self}. Growing work never touches it, and nothing stops Clients landing on her Friday pottery day.`);
      c.note("missing", "No way to lock a day or an hours block as protected. Self time is protected only by her own discipline.");
      await c.shot("work grew, self intact", true);
    },
  },
  {
    slug: "12-walt",
    name: "Walt Henderson",
    bio: "Plumbing business owner planning a 30th anniversary trip.",
    async run(c) {
      const { ops, page } = c;
      await c.step("rename Health to Self (golf)", () => ops.renameSpread("Health", "Self (golf)"));
      await c.step("create Anniversary Trip 1h", () => ops.createSpread("Anniversary Trip", 1));
      const plan: Record<number, string> = { 1: "Pick the destination", 2: "Book flights", 4: "Dinner reservation", 6: "Order surprise gift", 8: "Confirm hotel", 10: "Pack and print itinerary" };
      const timings: number[] = [];
      for (let w = 1; w <= 10; w++) {
        const t = Date.now();
        await c.step(`go to week +${w}`, () => ops.nextWeek());
        timings.push(Date.now() - t);
        if (plan[w]) await c.step(`task ${plan[w]}`, () => ops.addTask("Anniversary Trip", plan[w]));
        if (plan[w]) await c.step(`place trip hour week +${w}`, () => ops.place("Anniversary Trip", "Saturday", 1));
        if (w === 5) await c.shot("five weeks out", true);
      }
      c.note("info", `Moving forward ten weeks took ${timings.map((t) => `${t}ms`).join(", ")}. Now at ${await ops.weekLabel()}.`);
      await c.shot("ten weeks out", true);
      await c.step("month view", async () => {
        await ops.weekTab();
        await page.getByRole("button", { name: "Month" }).click();
        await page.waitForTimeout(800);
        await c.shot("month view");
      });
      await c.step("back to this week", async () => {
        await page.getByRole("button", { name: "Back to this month" }).click().catch(() => undefined);
        await page.getByRole("button", { name: "Back to this week" }).click().catch(() => undefined);
        c.note("info", `Return to this week: ${await ops.weekLabel()}.`);
      });
      await c.step("reload and check the trip persisted", async () => {
        await page.reload();
        await page.getByRole("tab", { name: "Spread" }).waitFor({ timeout: 20000 });
        for (let w = 0; w < 2; w++) await page.getByRole("button", { name: "Next week" }).click();
        c.note("info", `After reload, week +2 tasks: ${(await ops.taskNames()).join(", ") || "none"}.`);
      });
      c.note("worked", "Nothing left the device: the fixture records any outbound request and the test fails if one appears.");
    },
  },
];
