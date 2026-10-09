import assert from "node:assert/strict";
import test from "node:test";
import { completionHaptic } from "./haptics.ts";

const env = (over: Partial<Parameters<typeof completionHaptic>[0]> = {}) => {
  let taps = 0;
  return {
    taps: () => taps,
    env: { native: () => true, reducedMotion: () => false, tap: async () => void taps++, ...over },
  };
};

test("a finished task taps once on the device", async () => {
  const t = env();
  assert.equal(await completionHaptic(t.env as never), true);
  assert.equal(t.taps(), 1);
});

test("no tap on the web or with reduced motion", async () => {
  const web = env({ native: () => false });
  const calm = env({ reducedMotion: () => true });
  assert.equal(await completionHaptic(web.env as never), false);
  assert.equal(await completionHaptic(calm.env as never), false);
  assert.equal(web.taps() + calm.taps(), 0);
});

test("a failing plugin is swallowed", async () => {
  const bad = env({ tap: async () => Promise.reject(new Error("no plugin")) });
  assert.equal(await completionHaptic(bad.env as never), false);
});
