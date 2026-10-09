import assert from "node:assert/strict";
import test from "node:test";
import { deriveLocalStatus, getSaveFacts, noteSaveFailed, noteSaved } from "./local-status.ts";

const now = new Date("2026-10-08T15:00:00");

test("a healthy save says saved here, last time, and works offline", () => {
  const s = deriveLocalStatus({ lastSavedAt: now.getTime() - 5 * 60_000, failed: null }, now);
  assert.equal(s.tone, "ok");
  assert.match(s.detail, /5 min ago/);
  assert.match(s.detail, /no connection/);
});

test("before any save this session it still tells the truth without a time", () => {
  const s = deriveLocalStatus({ lastSavedAt: null, failed: null }, now);
  assert.equal(s.title, "Saved on this device");
  assert.doesNotMatch(s.detail, /Last saved/);
});

test("every failure is a problem and never claims it saved", () => {
  for (const failed of ["full", "unavailable", "newer"] as const) {
    const s = deriveLocalStatus({ lastSavedAt: now.getTime(), failed }, now);
    assert.equal(s.tone, "problem", failed);
    assert.doesNotMatch(s.title, /^Saved/, failed);
  }
});

test("it never mentions iCloud", () => {
  for (const failed of [null, "full", "unavailable", "newer"] as const) {
    const s = deriveLocalStatus({ lastSavedAt: now.getTime(), failed }, now);
    assert.doesNotMatch(`${s.title} ${s.detail}`, /icloud/i);
  }
});

test("a later good save clears an earlier failure", () => {
  noteSaveFailed("full");
  assert.equal(getSaveFacts().failed, "full");
  noteSaved(1);
  assert.deepEqual(getSaveFacts(), { lastSavedAt: 1, failed: null });
});
