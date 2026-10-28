import assert from "node:assert/strict";
import test from "node:test";
import { selectionTick, type TickEnv } from "./tick.ts";

const env = (over: Partial<TickEnv> = {}) => {
  let ticks = 0;
  const base: TickEnv = { native: () => true, reducedMotion: () => false, tick: async () => { ticks += 1; }, ...over };
  return { env: base, ticks: () => ticks };
};

test("ticks on a native app", async () => {
  const e = env();
  assert.equal(await selectionTick(e.env), true);
  assert.equal(e.ticks(), 1);
});

test("does nothing on the web", async () => {
  const e = env({ native: () => false });
  assert.equal(await selectionTick(e.env), false);
  assert.equal(e.ticks(), 0);
});

test("does nothing when the device asks for reduced motion", async () => {
  const e = env({ reducedMotion: () => true });
  assert.equal(await selectionTick(e.env), false);
  assert.equal(e.ticks(), 0);
});

test("a failing plugin is never an error", async () => {
  const e = env({ tick: async () => { throw new Error("no plugin"); } });
  assert.equal(await selectionTick(e.env), false);
});
