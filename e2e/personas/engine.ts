import { mkdirSync, writeFileSync } from "node:fs";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { addTask, dayCard, markDone, openSpreadTab as rawSpreadTab, openWeekTab as rawWeekTab, placeHours, setHours } from "../helpers";

/** A person who is done in Settings closes it (or it closes itself after an action) before going back to the plan. */
async function closeSettingsIfOpen(page: Page) {
  const sheet = page.getByRole("dialog", { name: "More" });
  if (!(await sheet.isVisible().catch(() => false))) return;
  await page.waitForTimeout(900);
  if (await sheet.isVisible().catch(() => false)) await sheet.getByRole("button", { name: "Close" }).click().catch(() => undefined);
  await sheet.waitFor({ state: "hidden" }).catch(() => undefined);
}
const openSpreadTab = async (page: Page) => {
  await closeSettingsIfOpen(page);
  await rawSpreadTab(page);
};
const openWeekTab = async (page: Page) => {
  await closeSettingsIfOpen(page);
  await rawWeekTab(page);
};

export type NoteKind = "worked" | "bug" | "confusing" | "missing" | "info";
export type Severity = "blocker" | "major" | "minor" | "polish";
export type Behavior = "create" | "allocate" | "rearrange" | "unfinished" | "recover";
export type Variation = "overcommitment" | "future-weeks";
export type Note = { kind: NoteKind; text: string; severity?: Severity; shot?: string };

export type Ctx = {
  page: Page;
  mobile: boolean;
  note: (kind: NoteKind, text: string, severity?: Severity) => void;
  shot: (label: string, full?: boolean) => Promise<string>;
  /** Runs one user action. A failure is recorded as friction and the persona carries on, like a real person would. */
  step: (label: string, fn: () => Promise<void>) => Promise<boolean>;
  ops: ReturnType<typeof makeOps>;
  /** Raw files on the fake device (what the iPhone app would persist, including exported backups). */
  deviceFiles: Map<string, string>;
};

export type Persona = {
  slug: string;
  behavior: Behavior;
  variations?: Variation[];
  name: string;
  bio: string;
  run: (c: Ctx) => Promise<void>;
};

const total = (page: Page) => page.getByText(/hours across \d+ spreads?/).first().innerText();

export function makeOps(page: Page, note: Ctx["note"], deviceFiles: Map<string, string>) {
  const weekGroup = () => page.getByRole("group", { name: /Use left and right/ });
  return {
    total: async () => {
      await openSpreadTab(page);
      return total(page);
    },
    async renameSpread(from: string, to: string) {
      await openSpreadTab(page);
      await page.getByRole("textbox", { name: `${from} name`, exact: true }).fill(to);
      await page.keyboard.press("Enter");
      await expect(page.getByRole("textbox", { name: `${to} name`, exact: true })).toBeVisible();
    },
    async createSpread(name: string, hours = 2) {
      await openSpreadTab(page);
      await page.getByRole("button", { name: /New Spread/ }).click();
      const dialog = page.getByRole("dialog", { name: "New Spread" });
      await dialog.getByRole("textbox", { name: "Spread 1" }).fill(name);
      for (let h = 2; h < hours; h++) await dialog.getByRole("button", { name: "Increase Hours for spread 1" }).click();
      await dialog.getByRole("button", { name: "Save spreads" }).click();
      await expect(page.getByRole("textbox", { name: `${name} name`, exact: true })).toBeVisible();
    },
    async removeSpread(name: string) {
      await openSpreadTab(page);
      await page.getByRole("button", { name: "Edit" }).click();
      await page.getByRole("button", { name: `Remove ${name}` }).click();
      const confirm = page.getByRole("alertdialog");
      if (await confirm.isVisible().catch(() => false)) await confirm.getByRole("button", { name: /Remove|Delete/ }).last().click();
      await expect(page.getByRole("textbox", { name: `${name} name`, exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "Done" }).first().click().catch(() => undefined);
    },
    setHours: async (spread: string, hours: number) => {
      await openSpreadTab(page);
      await setHours(page, spread, hours);
    },
    addTask: async (spread: string, text: string) => {
      await openSpreadTab(page);
      await addTask(page, spread, text);
    },
    markDone: async (text: string) => {
      await openSpreadTab(page);
      await markDone(page, text);
    },
    place: (spread: string, day: string, hours = 1) => placeHours(page, spread, day, hours),
    spreadTab: () => openSpreadTab(page),
    weekTab: () => openWeekTab(page),
    async weekLabel() {
      return (await weekGroup().innerText()).replace(/\s+/g, " ");
    },
    async nextWeek() {
      const before = await weekGroup().innerText();
      await page.getByRole("button", { name: "Next week" }).click();
      await expect(weekGroup()).not.toHaveText(before);
    },
    async prevWeek() {
      const before = await weekGroup().innerText();
      await page.getByRole("button", { name: "Previous week" }).click();
      await expect(weekGroup()).not.toHaveText(before);
    },
    async backToThisWeek() {
      await page.getByRole("button", { name: "Back to this week" }).click();
      await expect(page.getByText("This week", { exact: true })).toBeVisible();
    },
    async taskNames() {
      await openSpreadTab(page);
      return page.getByRole("checkbox").evaluateAll((els) => els.map((e) => (e.getAttribute("aria-label") ?? "").replace(/^Mark (not )?done: /, "")));
    },
    async rollover() {
      await openSpreadTab(page);
      await page.getByRole("button", { name: "Rollover" }).click();
    },
    async reviewOpenTasks(move = true) {
      await openSpreadTab(page);
      await page.getByRole("button", { name: "Review open tasks" }).click();
      const dialog = page.getByRole("dialog", { name: "Open tasks" });
      const rows = await dialog.getByRole("listitem").allInnerTexts();
      if (move) await dialog.getByRole("button", { name: /^Move \d+/ }).click();
      else await dialog.getByRole("button", { name: "Not now" }).click();
      return rows.map((r) => r.replace(/\s+/g, " ").trim());
    },
    async dayHours(day: string, spread: string) {
      const g = dayCard(page, day).getByRole("group", { name: `${spread} on ${day}` });
      if (!(await g.count())) return 0;
      return Number(((await g.innerText()).match(/(\d+)h/) ?? [])[1] ?? 0);
    },
    /** Pushes a day's hours up with the + button until it stops, returning the final hours. */
    async pushDay(day: string, spread: string, max = 60) {
      const g = dayCard(page, day).getByRole("group", { name: `${spread} on ${day}` });
      const inc = g.getByRole("button", { name: `Increase ${spread} on ${day}` });
      for (let i = 0; i < max; i++) {
        if (await inc.isDisabled()) break;
        await inc.click();
      }
      return this.dayHours(day, spread);
    },
    note,

    // Settings, profiles, appearance
    async expandToPlace(spread: string) {
      const group = page.getByRole("button", { name: new RegExp(`^${spread.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\d+ tasks?$`) }).first();
      if ((await group.getAttribute("aria-expanded")) !== "true") await group.click();
    },
    async openSettings() {
      const sheet = page.getByRole("dialog", { name: "More" });
      if (await sheet.isVisible().catch(() => false)) {
        await page.waitForTimeout(1200);
        if (await sheet.isVisible().catch(() => false)) return;
      }
      await page.getByRole("button", { name: "Settings" }).click();
      await expect(page.getByRole("dialog", { name: "More" })).toBeVisible();
    },
    async closeSettings() {
      await page.getByRole("dialog", { name: "More" }).getByRole("button", { name: "Close" }).click();
      await expect(page.getByRole("dialog", { name: "More" })).toBeHidden();
    },
    async appearance(mode: "System" | "Light" | "Dark") {
      await page.getByRole("radiogroup", { name: "Appearance" }).getByRole("radio", { name: mode }).click();
    },
    async accent(color: string) {
      await page.getByRole("listbox", { name: "Accent color" }).getByRole("option", { name: color }).click();
    },
    async addProfile(name: string) {
      await page.getByRole("button", { name: "Add profile" }).click();
      await page.getByRole("textbox", { name: "New profile" }).fill(name);
      await page.keyboard.press("Enter");
    },
    async switchProfile(name: string) {
      await page.getByRole("listbox", { name: "Profiles" }).getByRole("option", { name }).click();
    },
    /** Names of every profile in the Settings list, including the open one (shown as an editable field). */
    async profileNames(): Promise<string[]> {
      const wasOpen = await page.getByRole("dialog", { name: "More" }).isVisible().catch(() => false);
      await this.openSettings();
      const list = page.getByRole("listbox", { name: "Profiles" });
      const options = await list.getByRole("option").allInnerTexts();
      const open = await list.getByRole("textbox", { name: "Profile name" }).inputValue().catch(() => "");
      if (!wasOpen) await this.closeSettings();
      return [open, ...options.map((s) => s.replace(/\s+/g, " ").trim())].filter(Boolean);
    },
    async renameOpenProfile(to: string) {
      await page.getByRole("textbox", { name: "Profile name" }).fill(to);
      await page.keyboard.press("Enter");
    },
    async removeProfile(name: string, confirm = true) {
      await page.getByRole("button", { name: `Remove ${name}`, exact: true }).click();
      const dialog = page.getByRole("alertdialog");
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: confirm ? "Remove" : "Cancel" }).click();
      await dialog.waitFor({ state: "hidden" });
    },

    // Backup and restore
    async backup(): Promise<string> {
      for (const k of [...deviceFiles.keys()]) if (k.startsWith("export/") && k.endsWith(".spread")) deviceFiles.delete(k);
      await page.getByRole("button", { name: "Back Up Spread" }).click();
      await expect.poll(() => [...deviceFiles.keys()].some((k) => k.startsWith("export/") && k.endsWith(".spread"))).toBe(true);
      const key = [...deviceFiles.keys()].filter((k) => k.startsWith("export/") && k.endsWith(".spread")).pop()!;
      const raw = deviceFiles.get(key)!;
      return raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    },
    /** Picks a file in Restore Spread and returns what the confirmation says. Confirms or cancels as asked. */
    async restore(text: string, answer: "confirm" | "cancel" | "none" = "confirm"): Promise<string> {
      const sheet = page.getByRole("dialog", { name: "More" });
      if (!(await sheet.isVisible().catch(() => false))) {
        await page.getByRole("button", { name: "Settings" }).click();
        await sheet.waitFor();
      }
      await sheet.getByRole("button", { name: "Restore Spread" }).click({ timeout: 3000 }).catch(() => undefined);
      await page.getByLabel("Choose a Spread backup").setInputFiles({ name: "backup.spread", mimeType: "application/json", buffer: Buffer.from(text) });
      const dialog = page.getByRole("alertdialog");
      const toast = page.getByRole("region", { name: /Notifications/ });
      let shown = false;
      let message = "";
      for (let i = 0; i < 24 && !shown && !message; i++) {
        shown = await dialog.isVisible().catch(() => false);
        if (!shown) message = (await toast.innerText().catch(() => "")).replace(/\s+/g, " ").trim().replace(/^Backup (exported|saved)\.?\s*/, "");
        if (!shown && !message) await page.waitForTimeout(250);
      }
      if (!shown) return message;
      const said = (await dialog.innerText()).replace(/\s+/g, " ");
      if (answer === "confirm") await dialog.getByRole("button", { name: /^(Restore|Add)/ }).click();
      if (answer === "cancel") await dialog.getByRole("button", { name: "Cancel" }).click();
      if (answer !== "none") await dialog.waitFor({ state: "hidden" });
      return said;
    },
    async toastText() {
      return (await page.getByRole("region", { name: /Notifications/ }).innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    },

    // Task sheet
    async openTask(text: string) {
      await page.getByRole("button", { name: text, exact: true }).first().click();
      await expect(page.getByRole("textbox", { name: "Task title" })).toBeVisible();
    },
    async closeTask() {
      await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
      await expect(page.getByRole("textbox", { name: "Task title" })).toBeHidden();
    },
  };
}

/** Facts any real person would notice, checked after every persona finishes. */
async function audit(c: Ctx) {
  const { page } = c;
  await openSpreadTab(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 0) c.note("bug", `Page scrolls sideways by ${overflow}px in the Spread view.`, "major");
  const small = async (view: string) => {
    const found = await page.evaluate(() => {
      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll<HTMLElement>("button,[role=checkbox],[role=tab],input"))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.width < 44 || r.height < 44) out.push(`${el.getAttribute("aria-label") || el.innerText || el.tagName} (${Math.round(r.width)}x${Math.round(r.height)})`);
      }
      return out;
    });
    if (c.mobile && found.length) c.note("bug", `${found.length} tap targets under 44pt in ${view}: ${[...new Set(found)].slice(0, 6).join("; ")}`, "minor");
  };
  await small("Spread");

  const totals = new Map<string, number>();
  for (const b of await page.getByRole("button", { name: /^.+, \d+ hours?\. Adjust$/ }).all()) {
    const m = ((await b.getAttribute("aria-label")) ?? "").match(/^(.+), (\d+) hours?\. Adjust$/);
    if (m) totals.set(m[1], Number(m[2]));
  }
  await openWeekTab(page);
  const left = new Map<string, number>();
  for (const b of await page.getByRole("button", { name: /^.+ \d+h$/ }).all()) {
    const m = ((await b.innerText()).replace(/\s+/g, " ").trim()).match(/^(.+) (\d+)h$/);
    if (m) left.set(m[1], Number(m[2]));
  }
  const placed = new Map<string, number>();
  for (const g of await page.getByRole("group", { name: /^.+ on (Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day$/ }).all()) {
    const m = ((await g.getAttribute("aria-label")) ?? "").match(/^(.+) on \w+day$/);
    const h = Number(((await g.innerText()).match(/(\d+)h/) ?? [])[1] ?? 0);
    if (m) placed.set(m[1], (placed.get(m[1]) ?? 0) + h);
  }
  for (const [name, t] of totals) {
    const l = left.get(name) ?? 0;
    const p = placed.get(name) ?? 0;
    if (l + p !== t) c.note("bug", `Hours don't add up for ${name}: ${t}h planned, ${p}h on days, ${l}h left (${l + p}h).`, "major");
  }
  c.note("info", `Hours audit: ${[...totals].map(([n, t]) => `${n} ${t}h = ${placed.get(n) ?? 0} placed + ${left.get(n) ?? 0} left`).join(", ")}`);
  await small("Week");
  const warn = await page.getByText(/over ?(booked|committed|capacity)|too many hours|exceeds|not enough time/i).count();
  c.note("info", warn ? "The app showed an overbooking message." : "The app never showed an overbooking or over-capacity message.");
}

export async function runPersona(persona: Persona, page: Page, testInfo: TestInfo, consoleErrors: string[], deviceFiles: Map<string, string>, hits: string[]) {
  const project = testInfo.project.name;
  const mobile = project.includes("mobile");
  const dir = `user-testing/personas/${persona.slug}`;
  mkdirSync(dir, { recursive: true });
  const notes: Note[] = [];
  const shots: { file: string; label: string }[] = [];
  let n = 0;
  page.setDefaultTimeout(mobile ? 10_000 : 6000);

  const note: Ctx["note"] = (kind, text, severity) => {
    notes.push({ kind, text, severity });
  };
  const shot: Ctx["shot"] = async (label, full = false) => {
    const file = `${dir}/${project}-${String(++n).padStart(2, "0")}-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
    await page.screenshot({ path: file, fullPage: full });
    shots.push({ file, label });
    return file;
  };
  const step: Ctx["step"] = async (label, fn) => {
    try {
      await fn();
      return true;
    } catch (e) {
      const msg = String((e as Error).message).split("\n")[0].slice(0, 180);
      const file = await shot(`stuck-${label}`).catch(() => "");
      notes.push({ kind: "confusing", text: `Got stuck: ${label} (${msg})`, shot: file });
      return false;
    }
  };

  const ctx: Ctx = { page, mobile, note, shot, step, ops: makeOps(page, note, deviceFiles), deviceFiles };
  await persona.run(ctx);
  const back = page.getByRole("button", { name: "Back to this week" });
  if (await back.isVisible().catch(() => false)) await back.click().catch(() => undefined);
  await audit(ctx).catch((e) => note("info", `final audit failed: ${String(e.message).split("\n")[0]}`));
  if (consoleErrors.length) note("bug", `Console errors: ${consoleErrors.slice(0, 3).join(" | ")}`, "minor");
  writeFileSync(`${dir}/${project}-hits.json`, JSON.stringify([...new Set(hits)].sort(), null, 1));
  writeFileSync(`${dir}/${project}-notes.json`, JSON.stringify({ persona: persona.name, behavior: persona.behavior, variations: persona.variations ?? [], project, notes, shots }, null, 2));
  await testInfo.attach("persona-notes.json", { body: JSON.stringify(notes, null, 2), contentType: "application/json" });
}
