import assert from "node:assert/strict";
import test from "node:test";
import { originalStudioAppearance } from "../../../lib/spread/studio/contract.ts";
import { openStudioSession, reduceStudioSession, draftIsDirty } from "./draft.ts";

test("the three looks are previewed as drafts, with no planner writes before apply", () => {
  const marker = "PLAN-CANNOT-CHANGE";
  const opened = openStudioSession({render: originalStudioAppearance(), imageMessage: null, planner: marker});
  for (const id of ["personal", "retro", "glass"] as const) {
    const previewed = reduceStudioSession(opened, {type: "use-starter", id});
    assert.equal(previewed.state.planner, marker);
    assert.equal(previewed.state.committed.id, "original");
    assert.equal(draftIsDirty(previewed.state), true);
    const applied = reduceStudioSession(previewed.state, {type: "apply"});
    assert.equal(applied.effect.type, "commit");
    assert.equal(applied.state.planner, marker);
    const undone = reduceStudioSession(previewed.state, {type: "cancel"});
    assert.equal(undone.state.draft.id, "original");
  }
});

test("type and shape remain selected while scaling and changing density", () => {
  const opened = openStudioSession({render: originalStudioAppearance(), imageMessage: null, planner: "SAFE"});
  let s = reduceStudioSession(opened, {type: "use-starter", id: "retro"}).state;
  s = reduceStudioSession(s, {type: "set-scale", value: 1.2}).state;
  s = reduceStudioSession(s, {type: "set-density", density: "compact"}).state;
  assert.equal(s.draft.typography.presetId, "mono");
  assert.equal(s.draft.controls.treatmentId, "desktop");
  s = reduceStudioSession(s, {type: "set-typeface", presetId: "editorial"}).state;
  s = reduceStudioSession(s, {type: "set-control-treatment", treatmentId: "soft-glass"}).state;
  assert.equal(s.draft.typography.presetId, "editorial");
  assert.equal(s.draft.controls.treatmentId, "soft-glass");
});

test("per-element styling previews are reversible and never write planning data", () => {
  const start = openStudioSession({ render: originalStudioAppearance(), imageMessage: null, planner: "DO-NOT-EDIT" });
  let current = reduceStudioSession(start, { type: "use-starter", id: "illustrated" }).state;
  for (const part of ["crown", "responsibilities", "week", "tasks", "dock"] as const) {
    current = reduceStudioSession(current, { type: "set-element-style", part, style: "outline" }).state;
    assert.equal(current.draft.controls.parts?.[part], "outline");
    assert.equal(current.planner, "DO-NOT-EDIT");
    assert.deepEqual(current.committed, start.committed);
  }
  current = reduceStudioSession(current, { type: "set-color", key: "highlight", value: "#ff9900" }).state;
  assert.equal(current.draft.palette.highlight, "#ff9900");
  const apply = reduceStudioSession(current, { type: "apply" });
  assert.equal(apply.effect.type, "commit");
  assert.equal(apply.state.planner, "DO-NOT-EDIT");
  const cancel = reduceStudioSession(current, { type: "cancel" });
  assert.deepEqual(cancel.state.draft, start.committed);
});
test("changing the entire control treatment clears manual section overrides", () => {
  let state = openStudioSession({ render: originalStudioAppearance(), imageMessage: null, planner: "UNCHANGED" });
  state = reduceStudioSession(state, {type: "set-element-style", part: "week", style: "comic"}).state;
  state = reduceStudioSession(state, {type: "set-control-treatment", treatmentId: "desktop"}).state;
  assert.equal(state.draft.controls.treatmentId, "desktop");
  assert.equal(state.draft.controls.parts, undefined);
  assert.equal(state.planner, "UNCHANGED");
});