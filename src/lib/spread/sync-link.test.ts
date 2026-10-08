import assert from "node:assert/strict";
import test from "node:test";
import { defaultData } from "./model.ts";
import { PROFILE_LIMIT } from "./profiles.ts";
import { isPristine, planLink, summarizeCloud, toItems } from "./sync-link.ts";

const row = (syncId: string, itemId: string, fields: Record<string, unknown> = {}, deleted = false, at = "2026-10-08T10:00:00Z") => ({ syncId, itemId, deleted, at, fields });

test("a new planner is pristine; one with a task, an allocation or a renamed spread is not", () => {
  assert.equal(isPristine(defaultData()), true);
  const withTask = defaultData();
  withTask.weeks[withTask.currentWeek].boxes[0].tasks.push({ id: "t", text: "x", done: false });
  assert.equal(isPristine(withTask), false);
  const renamed = defaultData();
  renamed.hats[0].name = "Day job";
  assert.equal(isPristine(renamed), false);
  const scheduled = defaultData();
  scheduled.weeks[scheduled.currentWeek].allocations.push({ id: "a", hatId: "work", day: scheduled.currentWeek, hours: 1, order: 0 });
  assert.equal(isPristine(scheduled), false);
});

test("iCloud is summarised per profile and deleted items do not count", () => {
  const out = summarizeCloud([
    row("s1", "profile", { name: "Will" }),
    row("s1", "task:a"),
    row("s1", "task:b", {}, true),
    row("s1", "week:2026-10-05", {}, false, "2026-10-09T10:00:00Z"),
    row("s2", "profile", { name: "Work" }),
    row("s2", "task:c"),
  ]);
  assert.deepEqual(out.map((s) => [s.name, s.tasks, s.weeks, s.lastChangeAt]), [["Will", 1, 1, "2026-10-09T10:00:00Z"], ["Work", 1, 0, "2026-10-08T10:00:00Z"]]);
});

test("with nothing in iCloud the only choice is to upload", () => {
  assert.deepEqual(planLink({ data: defaultData(), profileCount: 1 }, []), [{ kind: "upload" }]);
});

test("a profile with content can never be merged into or replaced by an iCloud profile", () => {
  const data = defaultData();
  data.weeks[data.currentWeek].boxes[0].tasks.push({ id: "t", text: "mine", done: false });
  const cloud = summarizeCloud([row("s1", "profile", { name: "Will" }), row("s1", "task:a")]);
  const plan = planLink({ data, profileCount: 1 }, cloud);
  assert.deepEqual(plan.map((c) => c.kind).sort(), ["add-copy", "upload-separate"]);
  assert.ok(plan.every((c) => c.kind !== "adopt"));
});

test("an empty profile may become the iCloud profile in place", () => {
  const cloud = summarizeCloud([row("s1", "profile", { name: "Will" }), row("s1", "task:a")]);
  const plan = planLink({ data: defaultData(), profileCount: 1 }, cloud);
  assert.deepEqual(plan.map((c) => c.kind), ["adopt"]);
});

test("with no free profile slot, adding a copy says so, and uploading separately is still offered", () => {
  const data = defaultData();
  data.weeks[data.currentWeek].boxes[0].tasks.push({ id: "t", text: "mine", done: false });
  const cloud = summarizeCloud([row("s1", "profile", { name: "Will" }), row("s1", "task:a")]);
  const full = planLink({ data, profileCount: PROFILE_LIMIT }, cloud);
  assert.ok(full.some((c) => c.kind === "add-copy" && c.needsSlot));
  assert.ok(full.some((c) => c.kind === "upload-separate"));
});

test("rows from the bridge that do not parse are skipped, not guessed at", () => {
  const items = toItems([
    { itemId: "task:a", fields: '{"text":"x"}', v: '{"phone":1}', deleted: false, at: "t" },
    { itemId: "task:b", fields: "{nope", v: "{}", deleted: false, at: "t" },
    { itemId: "task:c", fields: "{}", v: "7", deleted: false, at: "t" },
  ]);
  assert.deepEqual(items.map((i) => i.id), ["task:a"]);
});
