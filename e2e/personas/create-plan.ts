import type { Ctx, Persona } from "./engine";

export const createPlanPersonas: Persona[] = [
  {
    slug: "07-hannah",
    behavior: "create",
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
    slug: "12-walt",
    behavior: "create",
    variations: ["future-weeks"],
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
        const monthOpen = await page.getByRole("button", { name: "Next month" }).isVisible().catch(() => false);
        c.note("info", `After a reload Spread reopens on ${monthOpen ? "the Month view he left it on" : "the week view"}.`);
        if (monthOpen) {
          await page.getByRole("button", { name: "Back to this month" }).click().catch(() => undefined);
          await page.getByRole("button", { name: "Week", exact: true }).click();
        }
        await page.getByRole("button", { name: "Back to this week" }).click().catch(() => undefined);
        for (let w = 0; w < 2; w++) await ops.nextWeek();
        const names = await ops.taskNames();
        c.note(names.includes("Book flights") ? "worked" : "bug", `After a reload, week +2 (${await ops.weekLabel()}) holds: ${names.join(", ") || "nothing"}.`, names.includes("Book flights") ? undefined : "blocker");
      });
      c.note("worked", "Nothing left the device: the fixture records any outbound request and the test fails if one appears.");
    },
  },
  {
    slug: "13-maya",
    behavior: "create",
    name: "Maya Okonkwo",
    bio: "19, community college student, first time using a planner. Pokes at everything.",
    async run(c) {
      const { ops, page } = c;
      await c.step("tap the app icon", () => page.getByRole("button", { name: "Spread, home" }).click());
      await c.step("rename Work to School", () => ops.renameSpread("Work", "School"));
      await c.step("open the color dot for School", () => page.getByRole("button", { name: "Color for School" }).click());
      await c.step("pick another color", async () => {
        const options = page.getByRole("button", { name: /^Use / });
        c.note("info", `Color picker offers ${await options.count()} colors.`);
        await options.nth(3).click();
      });
      await c.step("add two tasks", async () => {
        await ops.addTask("School", "Read chapter 3");
        await ops.addTask("School", "Email professor");
      });
      await c.step("hide and show School tasks", async () => {
        await page.getByRole("button", { name: "Hide tasks for School" }).click();
        await page.getByRole("button", { name: "Show tasks for School" }).click();
      });
      await c.step("jump to Health from the hours bar", () => page.getByRole("button", { name: /^Jump to Health/ }).click());
      await c.step("adjust Home hours up and down", async () => {
        await ops.setHours("Home", 6);
        await ops.setHours("Home", 3);
      });
      await c.step("open New Spread and try every symbol", async () => {
        await page.getByRole("button", { name: /New Spread/ }).click();
        const dialog = page.getByRole("dialog", { name: "New Spread" });
        for (const s of ["Work", "School", "Home", "Health", "Family", "Fitness", "Business", "Project", "Church", "Personal"]) await dialog.getByRole("button", { name: s, exact: true }).click();
        await dialog.getByRole("textbox", { name: "Spread 1" }).fill("Study group");
        await dialog.getByRole("button", { name: "Increase Hours for spread 1" }).click();
        await dialog.getByRole("button", { name: "Decrease Hours for spread 1" }).click();
        await dialog.getByRole("button", { name: "Add another spread" }).click();
        await dialog.getByRole("textbox", { name: "Spread 2" }).fill("Part-time job");
        await dialog.getByRole("button", { name: "Save spreads" }).click();
      });
      await c.shot("explored setup");
      await c.step("remove the Part-time job spread in Edit mode", () => ops.removeSpread("Part-time job"));
      await c.step("settings: dark mode, light mode, system", async () => {
        await ops.openSettings();
        await ops.appearance("Dark");
        await c.shot("dark mode");
        await ops.appearance("Light");
        await ops.appearance("System");
      });
      await c.step("try every accent color", async () => {
        for (const col of ["Blue", "Indigo", "Purple", "Pink", "Red", "Orange", "Yellow", "Green", "Mint", "Teal", "Cyan", "Brown"]) await ops.accent(col);
        await c.shot("brown accent");
        await ops.accent("Blue");
        await ops.closeSettings();
      });
    },
  },
  {
    slug: "14-greg",
    behavior: "create",
    name: "Greg Paulsen",
    bio: "63, retired. Uses the keyboard for everything; never touches the mouse if he can help it.",
    async run(c) {
      const { ops, page } = c;
      await c.step("focus the view tabs and arrow between them", async () => {
        await page.getByRole("tab", { name: "Spread" }).focus();
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowLeft");
        const selected = await page.getByRole("tab", { name: "Spread" }).getAttribute("aria-selected");
        c.note(selected === "true" ? "worked" : "bug", `Arrow keys move between the Spread and Week tabs (Spread selected after Right then Left: ${selected}).`, selected === "true" ? undefined : "major");
      });
      await c.step("type tasks and press Enter", async () => {
        await page.getByRole("textbox", { name: "What matters most here?" }).first().focus();
        await page.keyboard.type("Plan the garden beds");
        await page.keyboard.press("Enter");
        await page.keyboard.type("Order mulch");
        await page.keyboard.press("Enter");
      });
      c.note("info", `Tasks typed from the keyboard: ${(await ops.taskNames()).join(", ")}.`);
      await c.step("arrow keys change the week", async () => {
        await page.getByRole("group", { name: /Use left and right/ }).focus().catch(() => undefined);
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(500);
        c.note("info", `After pressing Right the header reads: ${await ops.weekLabel()}.`);
        await page.keyboard.press("ArrowLeft");
        await page.waitForTimeout(500);
        c.note("info", `After pressing Left the header reads: ${await ops.weekLabel()}.`);
      });
      await c.step("Escape closes the New Spread dialog", async () => {
        await page.getByRole("button", { name: /New Spread/ }).focus();
        await page.keyboard.press("Enter");
        await page.getByRole("dialog", { name: "New Spread" }).waitFor();
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
        const closed = (await page.getByRole("dialog", { name: "New Spread" }).count()) === 0;
        c.note(closed ? "worked" : "bug", "Escape closes the New Spread dialog.", closed ? undefined : "minor");
      });
      await c.step("Escape closes Settings", async () => {
        await page.getByRole("button", { name: "Settings" }).focus();
        await page.keyboard.press("Enter");
        await page.getByRole("dialog", { name: "More" }).waitFor();
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
        const closed = (await page.getByRole("dialog", { name: "More" }).count()) === 0;
        c.note(closed ? "worked" : "bug", "Escape closes Settings.", closed ? undefined : "minor");
      });
      await c.step("Tab through the first screen", async () => {
        await page.locator("body").press("Tab");
        const stops: string[] = [];
        for (let i = 0; i < 12; i++) {
          await page.keyboard.press("Tab");
          stops.push(await page.evaluate(() => document.activeElement?.getAttribute("aria-label") || (document.activeElement as HTMLElement | null)?.innerText?.slice(0, 24) || document.activeElement?.tagName || ""));
        }
        c.note("info", `First 12 Tab stops: ${stops.join(" > ")}`);
      });
      await c.step("set hours with the keyboard", async () => {
        await page.getByRole("button", { name: /^Work, \d+ hours?\. Adjust$/ }).focus();
        await page.keyboard.press("Enter");
        await page.getByRole("button", { name: "Increase Work hours" }).focus();
        await page.keyboard.press("Enter");
        await page.keyboard.press("Enter");
        await page.getByRole("button", { name: "Done adjusting hours" }).focus();
        await page.keyboard.press("Enter");
        c.note("info", `Work reads ${await page.getByRole("button", { name: /^Work, \d+ hours?\. Adjust$/ }).innerText()} after two keyboard presses on +.`);
      });
      await c.shot("keyboard-only plan");
    },
  },
  {
    slug: "15-sofia",
    behavior: "create",
    name: "Sofia Marin",
    bio: "33, product manager. Wants notes, outlines and tables attached to tasks.",
    async run(c) {
      const { ops, page } = c;
      await c.step("add three tasks", async () => {
        await ops.addTask("Work", "Q3 roadmap");
        await ops.addTask("Work", "Interview scorecard");
        await ops.addTask("Work", "Old kickoff deck");
      });
      await c.step("open Q3 roadmap and rename it", async () => {
        await ops.openTask("Q3 roadmap");
        await page.getByRole("textbox", { name: "Task title" }).fill("Q3 roadmap v2");
      });
      const openFormat = async (label: RegExp) => {
        const dialog = page.getByRole("dialog");
        const add = dialog.getByRole("button", { name: "Add", exact: true });
        if (await add.isVisible().catch(() => false)) await add.click();
        await dialog.getByRole("button", { name: label }).click();
      };
      await c.step("add Notes, type, expand, done", async () => {
        const dialog = page.getByRole("dialog");
        await openFormat(/^Notes/);
        await dialog.getByRole("textbox", { name: "Notes" }).fill("I. Goals");
        await page.keyboard.press("Enter");
        await page.keyboard.type("Ship the planner");
        await dialog.getByRole("button", { name: "Expand" }).click();
        await c.shot("notes expanded");
        await dialog.getByRole("button", { name: "Done", exact: true }).click();
      });
      await c.step("add an Outline with an indented detail", async () => {
        const dialog = page.getByRole("dialog");
        await openFormat(/^Outline/);
        await dialog.getByRole("textbox", { name: /^Outline/ }).first().fill("Launch");
        await dialog.getByRole("button", { name: "Add a point" }).click();
        await page.keyboard.type("Beta list");
        await dialog.getByRole("button", { name: "Indent" }).click();
        await page.keyboard.press("Tab");
        await dialog.getByRole("button", { name: "Outdent" }).click();
      });
      await c.step("add a Table, grow and shrink it", async () => {
        const dialog = page.getByRole("dialog");
        await openFormat(/^Table/);
        await dialog.getByRole("textbox", { name: "Row 1, column 1" }).fill("Risk");
        await dialog.getByRole("textbox", { name: "Row 1, column 2" }).fill("Owner");
        await dialog.getByRole("button", { name: "Add row" }).click();
        await dialog.getByRole("button", { name: "Add column" }).click();
        await dialog.getByRole("button", { name: "Remove column" }).click();
        await dialog.getByRole("button", { name: "Remove row 3" }).click();
      });
      await c.step("add a Photo and replace it", async () => {
        const dialog = page.getByRole("dialog");
        const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
        await openFormat(/^Photo/);
        await dialog.getByRole("button", { name: "Choose a photo" }).click().catch(() => undefined);
        await dialog.locator("input[type=file]").setInputFiles({ name: "board.png", mimeType: "image/png", buffer: png });
        await dialog.getByRole("button", { name: "Replace photo" }).waitFor();
        await dialog.getByRole("button", { name: "Replace photo" }).click().catch(() => undefined);
        await dialog.locator("input[type=file]").setInputFiles({ name: "board2.png", mimeType: "image/png", buffer: png });
      });
      await c.shot("task with four blocks");
      await c.step("remove the Photo block", () => page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).last().click());
      await c.step("close the sheet", () => ops.closeTask());
      await c.step("reopen: blocks are still there", async () => {
        await ops.openTask("Q3 roadmap v2");
        c.note("info", `Reopened task shows ${await page.getByRole("dialog").getByRole("heading", { level: 2 }).count()} blocks.`);
        await ops.closeTask();
      });
      await c.step("delete the old kickoff deck", async () => {
        await ops.openTask("Old kickoff deck");
        await page.getByRole("button", { name: "Delete task" }).click();
        await page.getByRole("button", { name: "Old kickoff deck", exact: true }).waitFor({ state: "detached" });
      });
    },
  },
];
