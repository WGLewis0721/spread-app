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
