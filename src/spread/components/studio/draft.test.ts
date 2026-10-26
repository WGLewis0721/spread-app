import assert from "node:assert/strict";
import test from "node:test";
import { originalStudioAppearance, parseStudioAppearance } from "../../../lib/spread/studio/contract.ts";
import { STUDIO_ASSET_MESSAGES } from "../../../lib/spread/studio/assets.ts";
import {
  draftIsDirty,
  draftIsOriginal,
  openStudioSession,
  plannerUnchanged,
  reduceStudioSession,
  type StudioSession,
} from "./draft.ts";
import { importFailureCopy, STUDIO_UI_COPY } from "./studio-copy.ts";

const PLANNER = JSON.stringify({
  marker: "PLANNER-BYTE-MARKER",
  hats: [{ id: "work", tasks: [{ text: "Outline the chapter" }] }],
});

function session(render = originalStudioAppearance()): StudioSession {
  return openStudioSession({ render, imageMessage: null, planner: PLANNER });
}

function plannerHeld(before: StudioSession, after: StudioSession) {
  assert.equal(after.planner, PLANNER);
  assert.equal(after.planner, before.planner);
  assert.equal(plannerUnchanged(after, PLANNER), true);
  assert.equal(JSON.stringify(after.draft).includes("PLANNER-BYTE-MARKER"), false);
  assert.equal(JSON.stringify(after.committed).includes("PLANNER-BYTE-MARKER"), false);
}

test("reset restores the original look and does not write", () => {
  let state = session();
  state = reduceStudioSession(state, { type: "set-mode", mode: "dark" }).state;
  state = reduceStudioSession(state, { type: "set-color", key: "accent", value: "#112233" }).state;
  const reset = reduceStudioSession(state, { type: "reset" });
  assert.equal(reset.effect.type, "none");
  assert.deepEqual(reset.state.draft, originalStudioAppearance());
  assert.equal(draftIsOriginal(reset.state), true);
  assert.deepEqual(reset.state.committed, originalStudioAppearance());
  plannerHeld(state, reset.state);
});

test("cancel discards the draft and apply is the only commit", () => {
  const opened = session();
  const edited = reduceStudioSession(opened, { type: "set-mode", mode: "light" });
  assert.equal(edited.effect.type, "none");
  assert.deepEqual(edited.state.committed, opened.committed);
  assert.equal(draftIsDirty(edited.state), true);
  const preview = reduceStudioSession(edited.state, {
    type: "set-wallpaper-number",
    key: "dim",
    value: 0.4,
  });
  assert.equal(preview.effect.type, "none");
  assert.deepEqual(preview.state.committed, opened.committed);
  const apply = reduceStudioSession(preview.state, { type: "apply" });
  assert.equal(apply.effect.type, "commit");
  if (apply.effect.type !== "commit") return;
  assert.deepEqual(apply.effect.appearance, preview.state.draft);
  assert.deepEqual(apply.state.committed, opened.committed);
  assert.equal(JSON.stringify(apply.effect.appearance).includes("PLANNER-BYTE-MARKER"), false);
  const saved = reduceStudioSession(apply.state, { type: "commit-succeeded" });
  assert.deepEqual(saved.state.committed, apply.state.draft);
  assert.equal(saved.state.pendingAssetId, null);
  assert.equal(saved.effect.type, "none");
  const dirty = reduceStudioSession(saved.state, { type: "set-mode", mode: "dark" });
  const cancelled = reduceStudioSession(dirty.state, { type: "cancel" });
  assert.deepEqual(cancelled.state.draft, saved.state.committed);
  assert.deepEqual(cancelled.state.committed, saved.state.committed);
  assert.equal(cancelled.effect.type, "none");
  plannerHeld(opened, cancelled.state);
});

test("preview edits leave committed data untouched", () => {
  let state = session();
  const committed = JSON.stringify(state.committed);
  const actions = [
    { type: "set-mode", mode: "dark" },
    { type: "set-fit", fit: "contain" },
    { type: "set-wallpaper-number", key: "positionX", value: 20 },
    { type: "set-wallpaper-number", key: "positionY", value: 80 },
    { type: "set-wallpaper-number", key: "blur", value: 6 },
    { type: "set-color", key: "surface", value: "#101010" },
    { type: "set-color", key: "text", value: "#f5f5f7" },
    { type: "set-color", key: "secondaryText", value: "#c7c7cc" },
    { type: "set-material", treatment: "glass" },
    { type: "set-material-number", key: "transparency", value: 0.3 },
    { type: "set-material-number", key: "depth", value: 0.5 },
    { type: "set-scale", value: 1.1 },
    { type: "set-numeral", value: 0.4 },
    { type: "set-density", density: "compact" },
    { type: "set-effect", key: "decorationIntensity", value: 0.2 },
    { type: "set-effect", key: "animationIntensity", value: 0.2 },
  ] as const;
  for (const action of actions) {
    const next = reduceStudioSession(state, action);
    assert.equal(next.effect.type, "none");
    assert.equal(JSON.stringify(next.state.committed), committed);
    assert.equal(next.state.draft.typography.presetId, "system");
    assert.equal(next.state.draft.controls.treatmentId, "original");
    assert.equal(parseStudioAppearance(next.state.draft).ok, true);
    state = next.state;
  }
  assert.equal(state.draft.id, "custom");
  assert.notEqual(state.draft.id, "original");
  plannerHeld(session(), state);
});

test("a new photo is suggested onto the original palette and is not stored as bytes", () => {
  const opened = session();
  const imported = reduceStudioSession(opened, {
    type: "imported",
    assetId: "a11",
    suggestion: {
      accent: "#aa0000",
      surface: "#111111",
      text: "#ffffff",
      secondaryText: "#dddddd",
    },
  });
  assert.equal(imported.state.draft.wallpaperAssetId, "a11");
  assert.equal(imported.state.draft.palette.accent, "#aa0000");
  assert.equal(imported.state.pendingAssetId, "a11");
  assert.equal(JSON.stringify(imported.state.committed), JSON.stringify(opened.committed));
  assert.equal(JSON.stringify(imported.state.draft).includes("data:"), false);
  assert.equal("bytes" in imported.state.draft, false);
  const apply = reduceStudioSession(imported.state, { type: "apply" });
  assert.equal(apply.effect.type, "commit");
  if (apply.effect.type !== "commit") return;
  assert.equal(apply.effect.pendingAssetId, "a11");
  assert.equal(JSON.stringify(apply.effect.appearance).includes("data:"), false);
  const cancelled = reduceStudioSession(imported.state, { type: "cancel" });
  assert.equal(cancelled.effect.type, "drop-pending");
  if (cancelled.effect.type !== "drop-pending") return;
  assert.equal(cancelled.effect.assetId, "a11");
  assert.equal(cancelled.state.draft.wallpaperAssetId, undefined);
  assert.deepEqual(cancelled.state.committed, opened.committed);
});

test("missing image opens on the original look", () => {
  const saved = { ...originalStudioAppearance(), id: "custom", name: "Custom", wallpaperAssetId: "gone" };
  const opened = openStudioSession({
    render: originalStudioAppearance(),
    imageMessage: "The wallpaper for this profile isn't on this device. Spread is showing the original look.",
    planner: PLANNER,
  });
  assert.deepEqual(opened.draft, originalStudioAppearance());
  assert.equal(opened.draft.wallpaperAssetId, undefined);
  assert.match(opened.imageMessage ?? "", /on this device/);
  assert.equal(JSON.stringify(saved).includes("PLANNER-BYTE-MARKER"), false);
  plannerHeld(opened, opened);
});

test("apply does not write when nothing changed, and a failed save drops the pending photo", () => {
  const opened = session();
  const idle = reduceStudioSession(opened, { type: "apply" });
  assert.equal(idle.effect.type, "none");
  const imported = reduceStudioSession(opened, {
    type: "imported",
    assetId: "a22",
    suggestion: originalStudioAppearance().palette,
  }).state;
  const failed = reduceStudioSession(imported, { type: "commit-failed", message: "The appearance could not be saved. Your planner was not changed." });
  assert.equal(failed.state.pendingAssetId, null);
  assert.equal(failed.state.draft.wallpaperAssetId, undefined);
  assert.deepEqual(failed.state.committed, opened.committed);
  plannerHeld(opened, failed.state);
});

test("an unchanged control stays on the original id, and a bad color is refused", () => {
  const opened = session();
  const same = reduceStudioSession(opened, { type: "set-mode", mode: "system" });
  assert.equal(same.state, opened);
  assert.equal(same.state.draft.id, "original");
  const edited = reduceStudioSession(opened, { type: "set-mode", mode: "dark" }).state;
  const invalid = reduceStudioSession(edited, { type: "set-color", key: "accent", value: "red" });
  assert.equal(invalid.state.draft.palette.accent, edited.draft.palette.accent);
  assert.equal(invalid.state.notice, STUDIO_UI_COPY.colorHint);
  assert.equal(JSON.stringify(invalid.state.committed), JSON.stringify(opened.committed));
});

test("corrupt photo copy uses the could-not-be-read line and offers a smaller photo", () => {
  const message = importFailureCopy("corrupt", STUDIO_ASSET_MESSAGES.corrupt);
  assert.match(message, /could not be read/);
  assert.match(message, /smaller photo/);
  assert.equal(importFailureCopy("too-many-pixels", STUDIO_ASSET_MESSAGES.tooManyPixels), STUDIO_ASSET_MESSAGES.tooManyPixels);
  assert.equal(message.includes(STUDIO_UI_COPY.smallerPhoto), true);
});
