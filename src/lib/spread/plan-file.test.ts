import assert from "node:assert/strict";
import test from "node:test";
import type { SpreadData } from "./model.ts";
import { PLAN_KIND, PLAN_LIMITS, PLAN_MAX_CHARS, buildPlanText, parsePlanFile, planParsedBackup } from "./plan-file.ts";

// 2026-11-09 is a Monday. The tests check that, so a wrong date fails here and not in a later assertion.
const MON = "2026-11-09";
const TUE = "2026-11-10";
const WED = "2026-11-11";

test("the test dates are right: MON is a Monday and TUE/WED are the days after it", () => {
  assert.equal(new Date(`${MON}T00:00:00Z`).getUTCDay(), 1);
  assert.equal(new Date(`${TUE}T00:00:00Z`).getUTCDay(), 2);
  assert.equal(new Date(`${WED}T00:00:00Z`).getUTCDay(), 3);
});

/** An edited plan the way a person or an AI tool would write it: the guide is kept, the fields are the listed ones. */
function example(): Record<string, unknown> {
  return {
    kind: PLAN_KIND,
    formatVersion: 1,
    guide: "Edit only the profile.",
    profile: {
      name: "My week",
      currentWeek: MON,
      areas: [
        { name: "Work", weeklyHours: 20, color: "#34C759", category: "work" },
        { name: "Health", weeklyHours: 3 },
      ],
      weeks: [
        {
          weekStart: MON,
          capacityHours: 30,
          areas: [
            { name: "Work", hours: 12, tasks: [{ text: "Quarterly report", done: false, day: TUE, estimateMinutes: 120, important: true }] },
            { name: "health", hours: 3 },
          ],
          allocations: [
            { area: "Work", day: TUE, hours: 2 },
            { area: "Health", day: WED, hours: 1 },
          ],
        },
      ],
    },
  };
}

function edited(change: (plan: Record<string, any>) => void): string {
  const plan = structuredClone(example()) as Record<string, any>;
  change(plan);
  return JSON.stringify(plan);
}

function issuesOf(text: string): string[] {
  const parsed = parsePlanFile(text);
  assert.equal(parsed.ok, false, "the file should be refused");
  return parsed.ok ? [] : parsed.issues;
}

test("an edited plan in the listed form is read into a schedule, with links made from the names", () => {
  const parsed = parsePlanFile(JSON.stringify(example()));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.name, "My week");
  assert.deepEqual(parsed.data.hats.map((hat) => hat.name), ["Work", "Health"]);
  assert.equal(parsed.data.currentWeek, MON);
  const week = parsed.data.weeks[MON];
  assert.equal(week.life?.capacityHours, 30);
  const work = parsed.data.hats[0];
  const workBox = week.boxes.find((box) => box.hatId === work.id);
  assert.equal(workBox?.hours, 12);
  const task = workBox?.tasks[0];
  assert.equal(task?.text, "Quarterly report");
  assert.equal(task?.important, true);
  assert.equal(task?.estimateMinutes, 120);
  const link = week.allocations.find((a) => a.day === TUE);
  assert.equal(task?.allocationId, link?.id, "a task with a day is placed on that day's hours for its area");
  assert.equal(week.allocations.length, 2);
});

test("every id in a read plan is new: nothing from the file is used as an identifier", () => {
  const parsed = parsePlanFile(JSON.stringify(example()));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const ids = [
    ...parsed.data.hats.map((hat) => hat.id),
    ...Object.values(parsed.data.weeks).flatMap((week) => [
      ...week.allocations.map((a) => a.id),
      ...week.boxes.flatMap((box) => box.tasks.map((task) => task.id)),
    ]),
  ];
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^[a-z0-9]{1,12}$/.test(id)));
});

test("a schedule written out and read back is the same schedule", () => {
  const data: SpreadData = {
    hats: [
      { id: "h1", name: "Work", defaultHours: 20, color: "#34C759", category: "work" },
      { id: "h2", name: "Health", defaultHours: 3, color: "#30B0C7" },
    ],
    weeks: {
      [MON]: {
        boxes: [
          { hatId: "h1", hours: 12, tasks: [{ id: "t1", text: "Quarterly report", done: false, allocationId: "a1", estimateMinutes: 120, important: true }] },
          { hatId: "h2", hours: 3, tasks: [] },
        ],
        allocations: [
          { id: "a1", hatId: "h1", day: TUE, hours: 2, order: 0 },
          { id: "a2", hatId: "h2", day: WED, hours: 1, order: 0 },
        ],
        life: { version: 1, capacityHours: 30 },
      },
    },
    currentWeek: MON,
  };
  const text = buildPlanText(data, "My week");
  const parsed = parsePlanFile(text);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.data.hats.map((h) => [h.name, h.defaultHours, h.color, h.category]), [
    ["Work", 20, "#34C759", "work"],
    ["Health", 3, "#30B0C7", undefined],
  ]);
  const week = parsed.data.weeks[MON];
  assert.equal(week.life?.capacityHours, 30);
  assert.equal(week.boxes[0].hours, 12);
  assert.equal(week.boxes[0].tasks[0].text, "Quarterly report");
  assert.equal(week.allocations.map((a) => a.hours).sort().join(","), "1,2");
});

test("the plan file holds only the schedule: no settings, keys, recovery copies, recurring plans, bin or rich notes", () => {
  const data = {
    hats: [{ id: "h1", name: "Work", defaultHours: 5, color: "#34C759" }],
    weeks: { [MON]: { boxes: [{ hatId: "h1", hours: 5, tasks: [] }], allocations: [] } },
    currentWeek: MON,
    recurringPlans: [{ id: "rp1", roleId: "h1" }],
    deletedTasks: [{ id: "d1" }],
  } as unknown as SpreadData;
  const text = buildPlanText(data, "My week");
  for (const word of ["recurringPlans", "deletedTasks", "recovery", "spread.", "license", "syncId", "accent", "theme", "content", "nativeFiles"]) {
    assert.equal(text.includes(word), false, `the plan file must not contain "${word}"`);
  }
  assert.equal(JSON.parse(text).kind, PLAN_KIND);
});

test("a field the guide does not list is refused, at the top, in an area and in a task", () => {
  assert.match(issuesOf(edited((p) => { p.extra = 1; })).join(" "), /unknown field "extra"/);
  assert.match(issuesOf(edited((p) => { p.profile.areas[0].secret = "x"; })).join(" "), /unknown field "secret"/);
  assert.match(issuesOf(edited((p) => { p.profile.weeks[0].areas[0].tasks[0].note = "x"; })).join(" "), /unknown field "note"/);
});

test("prototype keys are refused and do not change the program", () => {
  const text = JSON.stringify(example()).replace('"name":"Work"', '"name":"Work","__proto__":{"polluted":true}');
  assert.match(issuesOf(text).join(" "), /not allowed/);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test("dates must be real days, and a week must start on a Monday", () => {
  assert.match(issuesOf(edited((p) => { p.profile.weeks[0].weekStart = "2026-02-30"; })).join(" "), /real date/);
  assert.match(issuesOf(edited((p) => { p.profile.weeks[0].weekStart = TUE; })).join(" "), /must be a Monday/);
  assert.match(issuesOf(edited((p) => { p.profile.currentWeek = "2026-11-16"; })).join(" "), /one of the weeks/);
});

test("hours must be half-hour steps inside their limits", () => {
  assert.match(issuesOf(edited((p) => { p.profile.areas[0].weeklyHours = 1.25; })).join(" "), /half hours/);
  assert.match(issuesOf(edited((p) => { p.profile.areas[0].weeklyHours = 169; })).join(" "), /half hours/);
  assert.match(issuesOf(edited((p) => { p.profile.weeks[0].allocations[0].hours = 0.25; })).join(" "), /half hours/);
  assert.match(issuesOf(edited((p) => { p.profile.weeks[0].areas[0].hours = -1; })).join(" "), /half hours/);
});

test("the planner's budget rules hold: placed hours within an area's budget, and areas within capacity", () => {
  assert.match(issuesOf(edited((p) => { p.profile.weeks[0].allocations[0].hours = 13; })).join(" "), /more than its 12-hour budget/);
  assert.match(issuesOf(edited((p) => { p.profile.weeks[0].capacityHours = 10; })).join(" "), /more than its capacity/);
});

test("a task on a day needs hours for its area that day, and that day must be in its week", () => {
  assert.match(issuesOf(edited((p) => { p.profile.weeks[0].allocations = []; })).join(" "), /has no hours that day/);
  assert.match(issuesOf(edited((p) => { p.profile.weeks[0].areas[0].tasks[0].day = "2026-11-16"; })).join(" "), /outside its week/);
  assert.match(issuesOf(edited((p) => { p.profile.weeks[0].allocations[0].day = "2026-11-16"; })).join(" "), /outside its week/);
});

test("allocations need an area listed in their week, and an area's name must be unique", () => {
  assert.match(issuesOf(edited((p) => { p.profile.weeks[0].areas = [p.profile.weeks[0].areas[1]]; })).join(" "), /needs that area/);
  assert.match(issuesOf(edited((p) => { p.profile.areas.push({ name: "WORK", weeklyHours: 1 }); })).join(" "), /listed twice/);
  assert.match(issuesOf(edited((p) => { p.profile.weeks.push(structuredClone(p.profile.weeks[0])); })).join(" "), /listed twice/);
});

test("task text must be plain, non-empty, and within its length", () => {
  assert.match(issuesOf(edited((p) => { p.profile.weeks[0].areas[0].tasks[0].text = "bad\u0007text"; })).join(" "), /not allowed/);
  assert.match(issuesOf(edited((p) => { p.profile.weeks[0].areas[0].tasks[0].text = "   "; })).join(" "), /is empty/);
  assert.match(issuesOf(edited((p) => { p.profile.weeks[0].areas[0].tasks[0].text = "x".repeat(PLAN_LIMITS.textChars + 1); })).join(" "), /longer than/);
});

test("the estimate, category and colour must be ones the planner uses", () => {
  assert.match(issuesOf(edited((p) => { p.profile.weeks[0].areas[0].tasks[0].estimateMinutes = 17; })).join(" "), /estimateMinutes/);
  assert.match(issuesOf(edited((p) => { p.profile.areas[0].category = "gardening"; })).join(" "), /category must be one of/);
  assert.match(issuesOf(edited((p) => { p.profile.areas[0].color = "red"; })).join(" "), /color must look like/);
});

test("a file over the size limit is not read", () => {
  const big = " ".repeat(PLAN_MAX_CHARS + 1);
  assert.match(issuesOf(big).join(" "), /larger than 5 MB/);
});

test("text that is not JSON, or is not a plan, is refused with a plain reason", () => {
  assert.match(issuesOf("not json").join(" "), /not valid JSON/);
  assert.match(issuesOf(edited((p) => { p.kind = "something-else"; })).join(" "), /"kind" must be/);
  assert.match(issuesOf(edited((p) => { p.formatVersion = 2; })).join(" "), /"formatVersion" must be 1/);
});

test("every problem is listed, up to the cap, so the person can fix them in one pass", () => {
  const issues = issuesOf(edited((p) => {
    p.profile.weeks[0].allocations = Array.from({ length: 30 }, () => ({ area: "Work", day: "2026-13-01", hours: 1 }));
  }));
  assert.ok(issues.length > 1);
  assert.ok(issues.length <= PLAN_LIMITS.issues);
});

test("a plan file that reads cleanly is shaped like any backup, so the same preview and restore apply", () => {
  const parsed = parsePlanFile(JSON.stringify(example()));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const backup = planParsedBackup(parsed.data, parsed.name);
  assert.equal(backup.kind, "full");
  assert.equal(backup.summary.profiles.length, 1);
  assert.equal(backup.summary.profiles[0].readable, true);
  assert.equal(backup.summary.profiles[0].name, "My week");
  assert.equal(backup.summary.weeks, 1);
  assert.equal(backup.summary.tasks, 1);
  assert.equal(backup.payload.settings && Object.keys(backup.payload.settings).length, 0);
});

test("an empty plan is allowed: areas with no weeks yet", () => {
  const parsed = parsePlanFile(JSON.stringify({
    kind: PLAN_KIND, formatVersion: 1,
    profile: { name: "Fresh", areas: [{ name: "Work", weeklyHours: 5 }] },
  }));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.data.hats.length, 1);
  assert.equal(Object.keys(parsed.data.weeks).length, 0);
});
