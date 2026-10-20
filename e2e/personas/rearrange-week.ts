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
  for (let i = 1; i <= 25; i++) await page.mouse.move(hb.x + hb.width / 2 + i * 2, hb.y + hb.height / 2 + ((tb.y + tb.height / 2 - hb.y - hb.height / 2) * i) / 25, { steps: 2 });
  await page.waitForTimeout(300);
  await page.mouse.up();
  await page.waitForTimeout(500);
}

export const rearrangeWeekPersonas: Persona[] = [
  {
    slug: "03-priya",
    behavior: "rearrange",
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
    slug: "06-grace",
    behavior: "rearrange",
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
        const group = page.getByRole("button", { name: /^Work \d+ tasks?$/ });
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
    slug: "10-renata",
    behavior: "rearrange",
    variations: ["future-weeks"],
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
    slug: "16-tomas",
    behavior: "rearrange",
    variations: ["future-weeks"],
    name: "Tomás Reyes",
    bio: "44, restaurant manager. Shifts change weekly; plans catering weeks out; lives in the Week and Month views.",
    async run(c) {
      const { ops, page } = c;
      await c.step("rename Work to Restaurant", () => ops.renameSpread("Work", "Restaurant"));
      await c.step("Restaurant 30h", () => ops.setHours("Restaurant", 30));
      await c.step("task: order produce", () => ops.addTask("Restaurant", "Order produce"));
      for (const d of ["Monday", "Tuesday", "Thursday"]) await c.step(`Restaurant ${d} 6h`, () => ops.place("Restaurant", d, 6));
      await c.step("trim Thursday by two hours then add one back", async () => {
        const g = page.locator("section.week-seq-item").filter({ has: page.getByRole("heading", { level: 2, name: /^Thursday/ }) }).getByRole("group", { name: "Restaurant on Thursday" });
        await g.getByRole("button", { name: "Decrease Restaurant on Thursday" }).click();
        await g.getByRole("button", { name: "Decrease Restaurant on Thursday" }).click();
        await g.getByRole("button", { name: "Increase Restaurant on Thursday" }).click();
      });
      await c.step("drag Monday's shift to Wednesday", async () => {
        await moveDay(c, "Restaurant", "Monday", "Wednesday");
        c.note((await ops.dayHours("Wednesday", "Restaurant")) > 0 ? "worked" : "confusing", `After dragging Monday to Wednesday: Wednesday Restaurant ${await ops.dayHours("Wednesday", "Restaurant")}h, Monday ${await ops.dayHours("Monday", "Restaurant")}h.`);
      });
      await c.step("remove Tuesday's shift", async () => {
        await page.getByRole("button", { name: "Remove Restaurant from Tuesday" }).click();
        await page.getByRole("button", { name: "Undo" }).first().click();
      });
      await c.step("swipe the week crown to the next week", async () => {
        const crown = page.getByRole("group", { name: /Use left and right/ });
        const box = (await crown.boundingBox())!;
        await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 10 });
        await page.mouse.up();
        await page.mouse.wheel(0, 120).catch(() => undefined);
        await page.waitForTimeout(1500);
        c.note("info", `After a swipe and a scroll on the crown: ${await ops.weekLabel()}.`);
      });
      await c.step("keyboard arrows on the crown", async () => {
        await page.keyboard.press("ArrowLeft");
        await page.keyboard.press("ArrowRight");
      });
      await c.step("open Month and jump a month ahead to a catering date", async () => {
        await ops.backToThisWeek().catch(() => undefined);
        await page.getByRole("button", { name: "Month" }).click();
        await page.waitForTimeout(800);
        await page.getByRole("button", { name: "Next month" }).click();
        await c.shot("month ahead");
        await page.getByRole("button", { name: /^Saturday, April 11\./ }).click();
        c.note("info", `Picking April 11 in Month opened: ${await ops.weekLabel().catch(() => "unknown")}`);
      });
      await c.step("previous month, then back to this month and out to Week", async () => {
        await page.getByRole("button", { name: "Month" }).click().catch(() => undefined);
        await page.getByRole("button", { name: "Previous month" }).click().catch(() => undefined);
        await page.getByRole("button", { name: "Back to this month" }).click().catch(() => undefined);
        await page.getByRole("button", { name: "Week", exact: true }).click().catch(() => undefined);
      });
      await c.shot("rearranged week", true);
    },
  },
  {
    slug: "17-aisha",
    behavior: "rearrange",
    name: "Aisha Rahman",
    bio: "29, ER nurse on rotating shifts. Tasks float until she knows her day.",
    async run(c) {
      const { ops, page } = c;
      await c.step("rename Work to Shifts", () => ops.renameSpread("Work", "Shifts"));
      await c.step("Shifts 36h", () => ops.setHours("Shifts", 36));
      for (const t of ["Renew CPR card", "Chart audit", "Swap shift with Dee", "Order scrubs", "Call pharmacy", "Union form"]) await c.step(`task ${t}`, () => ops.addTask("Shifts", t));
      await c.step("put Shifts on today (Wednesday) and Thursday", async () => {
        await ops.place("Shifts", "Wednesday", 12);
        await ops.place("Shifts", "Thursday", 12);
      });
      await c.step("open To place and place a task on Wednesday", async () => {
        await ops.weekTab();
        await ops.expandToPlace("Shifts");
        await page.getByRole("button", { name: "Place", exact: true }).first().click();
        await page.getByRole("list", { name: /^Days for / }).first().getByRole("button", { name: /Wednesday/ }).click();
      });
      await c.step("see Not today in Spread and use it", async () => {
        await ops.spreadTab();
        await page.getByRole("button", { name: /^Not today: / }).first().click();
        c.note("info", `Not today put the task back; Undo offered: ${await page.getByRole("button", { name: "Undo" }).isVisible().catch(() => false)}.`);
      });
      await c.step("collapse and reopen the To place group", async () => {
        await ops.weekTab();
        const group = page.getByRole("button", { name: /^Shifts \d+ tasks?$/ });
        await group.click();
        await group.click();
      });
      await c.step("place a second task on Thursday then undo it", async () => {
        await ops.expandToPlace("Shifts");
        await page.getByRole("button", { name: "Place", exact: true }).first().click();
        await page.getByRole("list", { name: /^Days for / }).first().getByRole("button", { name: /Thursday/ }).click();
        await page.getByRole("button", { name: "Undo" }).first().click();
      });
      await c.step("drag a task onto Thursday", async () => {
        await ops.expandToPlace("Shifts");
        const handle = page.getByRole("button", { name: /^Move task / }).first();
        const target = page.locator("section.week-seq-item").filter({ has: page.getByRole("heading", { level: 2, name: /^Thursday/ }) });
        await target.scrollIntoViewIfNeeded();
        await handle.scrollIntoViewIfNeeded();
        const hb = (await handle.boundingBox())!;
        const tb = (await target.boundingBox())!;
        await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
        await page.mouse.down();
        await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + 14, { steps: 4 });
        await page.mouse.move(tb.x + tb.width / 2, tb.y + Math.min(tb.height / 2, 40), { steps: 14 });
        await page.mouse.up();
        await page.waitForTimeout(500);
        await c.shot("after dragging a task");
      });
      await c.step("swap shifts: Wednesday to Friday by remove and add", async () => {
        await ops.weekTab();
        await page.getByRole("button", { name: "Remove Shifts from Wednesday" }).click();
        await ops.place("Shifts", "Friday", 12);
      });
      await c.shot("shift swap", true);
    },
  },
];
