import assert from "node:assert/strict";
import test from "node:test";
import { createBackupRunner, type BackupBuild, type RunnerState } from "./backup-runner.ts";

function harness(over: { build?: () => Promise<BackupBuild>; write?: (text: string, pin?: string) => Promise<{ name: string; verified: boolean; inICloudContainer: boolean }> } = {}) {
  let clock = 1_000_000;
  const timers: { id: number; at: number; run: () => void }[] = [];
  let nextId = 1;
  const writes: { text: string; pin?: string }[] = [];
  const states: RunnerState[] = [];
  let content = "v1";
  const runner = createBackupRunner({
    transport: {
      write:
        over.write ??
        (async (text, pin) => {
          writes.push({ text, pin });
          return { name: "n", verified: true, inICloudContainer: true };
        }),
    },
    build: over.build ?? (async () => ({ text: content, signature: content, hasData: true })),
    now: () => clock,
    setTimer: (run, ms) => {
      const t = { id: nextId++, at: clock + ms, run };
      timers.push(t);
      return t.id;
    },
    clearTimer: (id) => {
      const i = timers.findIndex((t) => t.id === id);
      if (i >= 0) timers.splice(i, 1);
    },
    onState: (s) => states.push(s),
    debounceMs: 1000,
    retryBaseMs: 100,
    retryMaxMs: 400,
    staleMs: 10_000,
    launchDelayMs: 50,
  });
  const advance = async (ms: number) => {
    clock += ms;
    for (const t of timers.filter((x) => x.at <= clock).sort((a, b) => a.at - b.at)) {
      timers.splice(timers.indexOf(t), 1);
      t.run();
    }
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
  };
  return { runner, writes, states, timers, advance, setContent: (v: string) => (content = v), clock: () => clock };
}

test("a burst of changes becomes one backup after the debounce", async () => {
  const h = harness();
  h.runner.changed();
  h.runner.changed();
  h.runner.changed();
  assert.equal(h.timers.length, 1);
  await h.advance(999);
  assert.equal(h.writes.length, 0);
  await h.advance(2);
  assert.equal(h.writes.length, 1);
  assert.equal(h.runner.state().lastError, null);
  assert.ok(h.runner.state().lastSuccessAt);
});

test("identical content is not written twice", async () => {
  const h = harness();
  h.runner.changed();
  await h.advance(1000);
  h.runner.changed();
  await h.advance(1000);
  assert.equal(h.writes.length, 1);
  h.setContent("v2");
  h.runner.changed();
  await h.advance(1000);
  assert.equal(h.writes.length, 2);
});

test("flush backs up at once when something changed, and does nothing when nothing did", async () => {
  const h = harness();
  await h.runner.flush();
  assert.equal(h.writes.length, 0);
  h.runner.changed();
  await h.runner.flush();
  assert.equal(h.writes.length, 1);
});

test("a failed write is retried with backoff, reports the failure, and recovers", async () => {
  let attempts = 0;
  const h = harness({
    write: async (text) => {
      attempts += 1;
      if (attempts < 3) throw Object.assign(new Error("x"), { code: attempts === 1 ? "noSpace" : "failed" });
      return { name: "n", verified: true, inICloudContainer: false };
    },
  });
  h.runner.changed();
  await h.advance(1000);
  assert.equal(h.runner.state().lastError, "noSpace");
  await h.advance(100);
  assert.equal(h.runner.state().lastError, "failed");
  await h.advance(200);
  assert.equal(h.runner.state().lastError, null);
  assert.equal(attempts, 3);
});

test("a write that was not verified counts as a failure", async () => {
  const h = harness({ write: async () => ({ name: "n", verified: false, inICloudContainer: false }) });
  h.runner.changed();
  await h.advance(1000);
  assert.equal(h.runner.state().lastError, "failed");
  assert.equal(h.runner.state().lastSuccessAt, null);
});

test("an empty planner is never backed up", async () => {
  const h = harness({ build: async () => ({ text: "", signature: "", hasData: false }) });
  h.runner.changed();
  await h.advance(1000);
  assert.equal(h.runner.state().lastError, null);
  assert.equal(h.writes.length, 0);
});

test("launch backs up when there is no recent backup, and stays quiet when there is one", async () => {
  const stale = harness();
  stale.runner.launch(stale.clock() - 20_000);
  await stale.advance(60);
  assert.equal(stale.writes.length, 1);
  const none = harness();
  none.runner.launch(null);
  await none.advance(60);
  assert.equal(none.writes.length, 1);
  const fresh = harness();
  fresh.runner.launch(fresh.clock() - 1000);
  await fresh.advance(60);
  assert.equal(fresh.writes.length, 0);
});

test("pin writes a labelled copy even when nothing changed, and reports failure instead of throwing", async () => {
  const h = harness();
  assert.equal(await h.runner.pin("pre-restore"), true);
  assert.equal(h.writes[0].pin, "pre-restore");
  const broken = harness({ write: async () => { throw new Error("no"); } });
  assert.equal(await broken.runner.pin("pre-restore"), false);
});

test("a change during a write is picked up afterwards", async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let first = true;
  const h = harness({
    write: async (text, pin) => {
      if (first) {
        first = false;
        await gate;
      }
      h.writes.push({ text, pin });
      return { name: "n", verified: true, inICloudContainer: true };
    },
  });
  h.runner.changed();
  await h.advance(1000);
  h.setContent("v2");
  h.runner.changed();
  release();
  await h.advance(0);
  await h.advance(1000);
  assert.equal(h.writes.length, 2);
  assert.equal(h.writes[1].text, "v2");
});

test("dispose stops everything", async () => {
  const h = harness();
  h.runner.changed();
  h.runner.dispose();
  await h.advance(5000);
  assert.equal(h.writes.length, 0);
});
