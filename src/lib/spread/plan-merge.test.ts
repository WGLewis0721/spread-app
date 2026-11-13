import assert from "node:assert/strict";
import test from "node:test";
import { normalizeData, type SpreadData } from "./model.ts";
import { buildPlanText, parsePlanDocument, type PlanDoc } from "./plan-file.ts";
import { NO_REMOVALS, emptyCounts, mergeSchedule, planTargetIssues, type MergeOptions, type MergeResult } from "./plan-merge.ts";

// 2026-11-09 is a Monday. The tests check that, so a wrong date fails here and not in a later assertion.
const MON = "2026-11-09";
const NEXT = "2026-11-16";
const TUE = "2026-11-10";
const WED = "2026-11-11";
const NEXT_DAY = "2026-11-17";

const META = { profileId: "p-1", basedOn: "0123456789abcdef", exportedAt: "2026-11-13T09:00:00.000Z" };

/** A profile as the planner holds it: normalised, so the fixture is the same shape the store would load. */
function profile(): SpreadData {
  return normalizeData({
    hats: [
      { id: "work", name: "Work", defaultHours: 20, color: "#34C759", category: "work" },
      { id: "health", name: "Health", defaultHours: 3, color: "#30B0C7", category: "health" },
    ],
    weeks: {
      [MON]: {
        boxes: [
          {
            hatId: "work", hours: 12, tasks: [
              {
                id: "t-report", text: "Quarterly report", done: false, allocationId: "a-work-tue", estimateMinutes: 120, important: true,
                content: { blocks: [{ id: "b1", type: "notes", text: "Draft the outline first" }] },
              },
              { id: "t-call", text: "Call the client", done: true },
            ],
          },
          { hatId: "health", hours: 3, tasks: [{ id: "t-walk", text: "Walk", done: false, allocationId: "a-health-wed" }] },
        ],
        allocations: [
          { id: "a-work-tue", hatId: "work", day: TUE, hours: 2, order: 0 },
          { id: "a-health-wed", hatId: "health", day: WED, hours: 1, order: 0 },
        ],
        life: { version: 1, capacityHours: 30 },
      },
      [NEXT]: {
        boxes: [
          { hatId: "work", hours: 8, tasks: [] },
          { hatId: "health", hours: 2, tasks: [] },
        ],
        allocations: [{ id: "a-next-health", hatId: "health", day: NEXT_DAY, hours: 2, order: 0 }],
      },
    },
    currentWeek: MON,
    recurringPlans: [{ id: "rp-1", roleId: "health", startWeek: MON, everyWeeks: 1, hours: 2, capacityHours: 30 }],
  } as unknown as SpreadData);
}

/** The plan file the planner exports for a profile, read back the way a merge reads an edited one. */
function editOf(data: SpreadData, change: (plan: Record<string, any>) => void = () => {}): PlanDoc {
  const plan = JSON.parse(buildPlanText(data, "Life", META));
  change(plan);
  const read = parsePlanDocument(JSON.stringify(plan));
  if (!read.ok) throw new Error(`fixture refused: ${read.issues.join(" | ")}`);
  return read.doc;
}

function mergeEdited(change: (plan: Record<string, any>) => void, options: MergeOptions = NO_REMOVALS): MergeResult {
  const current = profile();
  return mergeSchedule(current, editOf(current, change), options);
}

function mustMerge(result: MergeResult): Extract<MergeResult, { ok: true }> {
  assert.equal(result.ok, true, result.ok ? "" : `expected a merge, got: ${result.issues.join(" | ")}`);
  if (!result.ok) throw new Error("unreachable");
  return result;
}

/** The task with this id, in whichever area of the week holds it. */
function taskIn(data: SpreadData, week: string, id: string) {
  for (const box of data.weeks[week].boxes) {
    const task = box.tasks.find((item) => item.id === id);
    if (task) return { hatId: box.hatId, task };
  }
  return undefined;
}

test("the test dates are right: MON is a Monday and NEXT is the week after", () => {
  assert.equal(new Date(`${MON}T00:00:00Z`).getUTCDay(), 1);
  assert.equal(new Date(`${NEXT}T00:00:00Z`).getUTCDay(), 1);
  assert.equal(new Date(`${WED}T00:00:00Z`).getUTCDay(), 3);
});

test("the profile in the fixture keeps its recurring plan through normalising, so the checks below mean something", () => {
  assert.equal(profile().recurringPlans?.length, 1);
});

test("exporting and merging the same file changes nothing, and keeps rich notes and ids", () => {
  const current = profile();
  const result = mustMerge(mergeSchedule(current, editOf(current), NO_REMOVALS));
  assert.deepEqual({ ...result.summary.counts, weeks: 0 }, emptyCounts(), "only the file's weeks are counted as listed");
  assert.deepEqual(result.summary.areas, []);
  assert.deepEqual(result.data.hats, current.hats);
  assert.deepEqual(result.data.weeks, current.weeks);
  assert.deepEqual(result.data.recurringPlans, current.recurringPlans);
});

test("a changed hour, an edited task and a new area merge, and matched items keep their ids", () => {
  const result = mustMerge(mergeEdited((plan) => {
    plan.profile.areas[0].weeklyHours = 22;
    plan.profile.areas.push({ name: "Learning", weeklyHours: 2 });
    plan.profile.weeks[0].areas[0].hours = 10;
    plan.profile.weeks[0].areas[0].tasks[0].text = "Quarterly report, final";
    plan.profile.weeks[0].areas.push({ name: "Learning", hours: 2, tasks: [] });
  }));
  const work = result.data.hats.find((hat) => hat.name === "Work");
  assert.equal(work?.id, "work", "a matched area keeps its id");
  assert.equal(work?.defaultHours, 22);
  assert.ok(result.data.hats.some((hat) => hat.name === "Learning"), "the new area is added");
  const edited = taskIn(result.data, MON, "t-report");
  assert.equal(edited?.task.text, "Quarterly report, final");
  assert.equal(edited?.task.content?.blocks[0].type, "notes", "rich notes the file does not carry are kept");
  assert.equal(result.summary.counts.areasAdded, 1);
  assert.equal(result.summary.counts.areasChanged, 1);
  assert.equal(result.summary.counts.tasksChanged, 1);
  assert.equal(result.summary.counts.hoursChanged, 2, "Work's hours and the new area's hours change in the listed week");
  assert.equal(result.summary.counts.weeksChanged, 1, "only the week with changed hours counts as changed");
});

test("day hours and capacity changes are counted", () => {
  const result = mustMerge(mergeEdited((plan) => {
    plan.profile.weeks[0].allocations[0].hours = 1;
    plan.profile.weeks[0].capacityHours = 32;
  }));
  assert.equal(result.summary.counts.daysChanged, 1);
  assert.equal(result.summary.counts.capacityChanged, 1);
});

test("an area the file leaves out is kept by default, and removed only when removal is chosen", () => {
  const dropHealth = (plan: Record<string, any>) => {
    plan.profile.areas = plan.profile.areas.filter((area: { name: string }) => area.name !== "Health");
    for (const week of plan.profile.weeks) {
      week.areas = week.areas.filter((area: { name: string }) => area.name !== "Health");
      week.allocations = week.allocations.filter((item: { area: string }) => item.area !== "health");
    }
  };
  const kept = mustMerge(mergeEdited(dropHealth));
  assert.ok(kept.data.hats.some((hat) => hat.id === "health"), "Health stays");
  assert.ok(taskIn(kept.data, MON, "t-walk"), "its task stays");
  assert.equal(kept.summary.counts.areasKept, 1);
  assert.equal(kept.summary.counts.areasRemoved, 0);

  const removed = mustMerge(mergeEdited(dropHealth, { removeAreas: true, removeItems: false }));
  assert.equal(removed.data.hats.some((hat) => hat.id === "health"), false, "Health is removed");
  assert.equal(taskIn(removed.data, MON, "t-walk"), undefined, "its tasks go with it");
  for (const week of Object.values(removed.data.weeks)) {
    assert.equal(week.boxes.some((box) => box.hatId === "health"), false);
    assert.equal(week.allocations.some((a) => a.hatId === "health"), false, "its day hours go in every week");
  }
  assert.equal(removed.summary.counts.areasRemoved, 1);
  assert.equal(removed.summary.counts.plansStopped, 1, "the recurring plan for the removed area is counted");
  assert.deepEqual(removed.data.recurringPlans ?? [], [], "the recurring plan for the removed area stops");
});

test("a task the file leaves out stays unless removal is chosen", () => {
  const dropCall = (plan: Record<string, any>) => {
    plan.profile.weeks[0].areas[0].tasks = plan.profile.weeks[0].areas[0].tasks.filter((task: { text: string }) => task.text !== "Call the client");
  };
  const kept = mustMerge(mergeEdited(dropCall));
  assert.ok(taskIn(kept.data, MON, "t-call"), "the task stays in its area");
  assert.equal(kept.summary.counts.tasksKept, 1);

  const removed = mustMerge(mergeEdited(dropCall, { removeAreas: false, removeItems: true }));
  assert.equal(taskIn(removed.data, MON, "t-call"), undefined);
  assert.equal(removed.summary.counts.tasksRemoved, 1);
});

test("a task moved to another area keeps its id and rich notes, and is never in two areas", () => {
  const result = mustMerge(mergeEdited((plan) => {
    const work = plan.profile.weeks[0].areas[0];
    const report = work.tasks.find((task: { id: string }) => task.id === "t-report");
    work.tasks = work.tasks.filter((task: { id: string }) => task.id !== "t-report");
    plan.profile.weeks[0].areas[1].tasks = [{ ...report, day: WED }];
  }));
  const copies = result.data.weeks[MON].boxes.flatMap((box) => box.tasks).filter((task) => task.id === "t-report");
  assert.equal(copies.length, 1, "the task appears once");
  const moved = taskIn(result.data, MON, "t-report");
  assert.equal(moved?.hatId, "health");
  assert.equal(moved?.task.allocationId, "a-health-wed", "it is placed on that area's hours for the day");
  assert.equal(moved?.task.content?.blocks[0].type, "notes");
  assert.equal(result.summary.counts.tasksMoved, 1);
});

test("day hours that a kept area still needs must fit its budget, or the merge is refused", () => {
  const shrink = (plan: Record<string, any>) => {
    plan.profile.weeks[0].allocations = plan.profile.weeks[0].allocations.filter((item: { area: string }) => item.area !== "work");
    delete plan.profile.weeks[0].areas[0].tasks[0].day;
    plan.profile.weeks[0].areas[0].hours = 1;
  };
  const refused = mergeEdited(shrink, { removeAreas: false, removeItems: false });
  assert.equal(refused.ok, false);
  if (refused.ok) return;
  assert.match(refused.issues.join(" "), /more than its 1-hour budget/);
  assert.match(refused.issues.join(" "), /Turn on removing items/);

  const allowed = mustMerge(mergeEdited(shrink, { removeAreas: false, removeItems: true }));
  assert.equal(allowed.data.weeks[MON].allocations.some((item) => item.hatId === "work"), false);
});

test("a week the file leaves out is kept, except for the areas being removed", () => {
  const withoutNext = (plan: Record<string, any>) => {
    plan.profile.weeks = plan.profile.weeks.filter((week: { weekStart: string }) => week.weekStart !== NEXT);
  };
  const current = profile();
  const kept = mustMerge(mergeEdited(withoutNext));
  assert.deepEqual(kept.data.weeks[NEXT], current.weeks[NEXT]);

  const removed = mustMerge(mergeEdited((plan) => {
    withoutNext(plan);
    plan.profile.areas = plan.profile.areas.filter((area: { name: string }) => area.name !== "Health");
    plan.profile.weeks[0].areas = plan.profile.weeks[0].areas.filter((area: { name: string }) => area.name !== "Health");
    plan.profile.weeks[0].allocations = plan.profile.weeks[0].allocations.filter((item: { area: string }) => item.area !== "health");
  }, { removeAreas: true, removeItems: false }));
  assert.equal(removed.data.weeks[NEXT].boxes.some((box) => box.hatId === "health"), false);
  assert.equal(removed.data.weeks[NEXT].allocations.some((item) => item.hatId === "health"), false);
  assert.equal(removed.data.weeks[NEXT].boxes.some((box) => box.hatId === "work"), true, "other areas stay");
});

test("planTargetIssues: a merge needs the open profile, and a syncing profile cannot merge", () => {
  const doc = editOf(profile());
  assert.deepEqual(planTargetIssues(doc, "p-1", false), []);
  assert.match(planTargetIssues(doc, "p-2", false).join(" "), /different profile/);
  assert.match(planTargetIssues(doc, "p-1", true).join(" "), /syncs with iCloud/);
  const create = parsePlanDocument(buildPlanText(profile(), "New"));
  assert.equal(create.ok, true);
  if (create.ok) assert.deepEqual(planTargetIssues(create.doc, "p-2", true), [], "a create plan is not a merge");
});
