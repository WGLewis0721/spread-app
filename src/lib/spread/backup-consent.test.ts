// Astra A08 (opting out stops every upload) and A13 (a local-only save is retried until it reaches iCloud).
import assert from "node:assert/strict";
import test from "node:test";
import { createBackupRunner } from "./backup-runner.ts";

function rig(opts: { inICloud?: () => boolean; built?: () => Promise<void> } = {}) {
  const timers: (() => void)[] = [];
  const writes: string[] = [];
  let allowed = true;
  let content = "v1";
  const runner = createBackupRunner({
    transport: {
      write: async (text) => {
        writes.push(text);
        return { name: "n", verified: true, inICloudContainer: opts.inICloud ? opts.inICloud() : true };
      },
    },
    build: async () => {
      await opts.built?.();
      return { text: content, signature: content, hasData: true };
    },
    allowed: () => allowed,
    setTimer: (run) => {
      timers.push(run);
      return timers.length;
    },
    clearTimer: () => {},
    debounceMs: 1000,
    retryBaseMs: 100,
    launchDelayMs: 50,
  });
  const fireTimers = async () => {
    for (const run of timers.splice(0)) run();
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
  };
  return { runner, writes, fireTimers, setAllowed: (v: boolean) => (allowed = v), setContent: (v: string) => (content = v) };
}

test("A08: turning backup off between a change and its timer writes nothing", async () => {
  const r = rig();
  r.runner.changed();
  r.setAllowed(false);
  await r.fireTimers();
  assert.equal(r.writes.length, 0);
});

test("A08: the background flush after opting out writes nothing", async () => {
  const r = rig();
  r.runner.changed();
  r.setAllowed(false);
  await r.runner.flush();
  assert.equal(r.writes.length, 0);
});

test("A08: turning backup off while the backup is being built stops the hand-off", async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  const r = rig({ built: () => gate });
  r.runner.changed();
  const pending = r.runner.flush();
  r.setAllowed(false);
  release();
  await pending;
  assert.equal(r.writes.length, 0, "content collected before the opt-out is not uploaded after it");
});

test("A08: cancel() drops pending and retry work, and a later flush does nothing until something changes", async () => {
  const r = rig();
  r.runner.changed();
  r.runner.cancel();
  await r.runner.flush();
  await r.fireTimers();
  assert.equal(r.writes.length, 0);
});

test("A08: after being turned back on, a change is backed up again", async () => {
  const r = rig();
  r.runner.changed();
  r.setAllowed(false);
  await r.fireTimers();
  r.setAllowed(true);
  r.runner.changed();
  await r.runner.flush();
  assert.equal(r.writes.length, 1);
});

test("A13: a copy saved only on this device is handed to iCloud again even though nothing changed", async () => {
  let inICloud = false;
  const r = rig({ inICloud: () => inICloud });
  r.runner.changed();
  await r.runner.flush();
  assert.equal(r.writes.length, 1);
  assert.equal(r.runner.state().lastError, null, "saving here is not an error");
  assert.equal(r.runner.state().waitingForICloud, true);
  // iCloud Drive comes back; the unchanged planner must still be delivered.
  inICloud = true;
  await r.fireTimers();
  assert.equal(r.writes.length, 2);
  assert.equal(r.runner.state().waitingForICloud, false);
  // Delivered: an unchanged planner is not written again.
  r.runner.changed();
  await r.runner.flush();
  assert.equal(r.writes.length, 2);
});

test("A13: 'back up now' with unchanged data still retries an undelivered copy", async () => {
  let inICloud = false;
  const r = rig({ inICloud: () => inICloud });
  r.runner.changed();
  await r.runner.flush();
  inICloud = true;
  r.runner.changed();
  await r.runner.flush();
  assert.equal(r.writes.length, 2);
});
