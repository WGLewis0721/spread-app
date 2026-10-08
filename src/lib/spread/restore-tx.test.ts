// Astra A02: restore is all-or-nothing, including when the app is killed part-way.
import assert from "node:assert/strict";
import test from "node:test";
import { commitRestore, recoverRestore, RESTORE_JOURNAL_KEY, type TxStorage } from "./restore-tx.ts";

class Mem implements TxStorage {
  map = new Map<string, string>();
  /** Operations allowed before the "process dies". Infinity = never. */
  budget = Infinity;
  failKey: string | null = null;
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  private spend(k: string) {
    if (this.budget <= 0) throw new Error("killed");
    this.budget -= 1;
    if (this.failKey === k) throw new Error("quota");
  }
  setItem(k: string, v: string) {
    this.spend(k);
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.spend(k);
    this.map.delete(k);
  }
}

const plan = {
  writes: [
    { key: "spread.v1.a", value: "A" },
    { key: "spread.v1.b", value: "B" },
    { key: "spread.v1.old", value: "RESTORED-OVER-EMPTY" },
  ],
  rosterKey: "spread.profiles",
  rosterValue: '["old","a","b"]',
};

function seeded() {
  const m = new Mem();
  m.map.set("spread.v1.old", "PRISTINE");
  m.map.set("spread.profiles", '["old"]');
  return m;
}
const dump = (m: Mem) => JSON.stringify([...m.map].sort());

test("A02: success writes everything and leaves no journal", () => {
  const m = seeded();
  assert.deepEqual(commitRestore(m, plan), { ok: true });
  assert.equal(m.map.get("spread.profiles"), plan.rosterValue);
  assert.equal(m.map.get("spread.v1.old"), "RESTORED-OVER-EMPTY");
  assert.equal(m.map.has(RESTORE_JOURNAL_KEY), false);
});

test("A02: a failure at any single write undoes all of it", () => {
  for (const key of [RESTORE_JOURNAL_KEY, "spread.v1.a", "spread.v1.b", "spread.v1.old", "spread.profiles"]) {
    const m = seeded();
    const before = dump(m);
    m.failKey = key;
    const result = commitRestore(m, plan);
    assert.equal(result.ok, false, key);
    assert.equal(result.ok === false && result.rolledBack, true, key);
    m.failKey = null;
    assert.equal(dump(m), before, `state restored after failing ${key}`);
  }
});

test("A02: killed after any number of operations, the next launch lands on exactly old or exactly new", () => {
  const total = (() => {
    const probe = seeded();
    probe.budget = Infinity;
    let ops = 0;
    const counting: TxStorage = { getItem: (k) => probe.getItem(k), setItem: (k, v) => (ops++, probe.setItem(k, v)), removeItem: (k) => (ops++, probe.removeItem(k)) };
    commitRestore(counting, plan);
    return ops;
  })();
  const oldState = dump(seeded());
  const done = seeded();
  commitRestore(done, plan);
  const newState = dump(done);
  for (let budget = 0; budget <= total; budget += 1) {
    const m = seeded();
    m.budget = budget;
    try {
      commitRestore(m, plan);
    } catch {
      /* the process died inside a storage call */
    }
    m.budget = Infinity;
    recoverRestore(m);
    const now = dump(m);
    assert.ok(now === oldState || now === newState, `budget ${budget}: ${now}`);
  }
});

test("A02: if rollback itself fails the journal stays so the next launch can finish it", () => {
  const m = seeded();
  const before = dump(m);
  let writes = 0;
  // Fail the roster write, then fail the first undo as well.
  m.failKey = "spread.profiles";
  const flaky: TxStorage = {
    getItem: (k) => m.getItem(k),
    setItem: (k, v) => {
      if (k === "spread.v1.a" && ++writes > 1) throw new Error("disk");
      m.setItem(k, v);
    },
    removeItem: (k) => {
      if (k === "spread.v1.a") throw new Error("disk");
      m.removeItem(k);
    },
  };
  const result = commitRestore(flaky, plan);
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.rolledBack, false);
  assert.ok(m.map.has(RESTORE_JOURNAL_KEY));
  m.failKey = null;
  assert.equal(recoverRestore(m), "rolled-back");
  assert.equal(dump(m), before);
});

test("A02: recovery with no journal does nothing; an unreadable journal is dropped, not trusted", () => {
  const m = seeded();
  assert.equal(recoverRestore(m), "none");
  m.map.set(RESTORE_JOURNAL_KEY, "{not json");
  assert.equal(recoverRestore(m), "failed");
  assert.equal(m.map.has(RESTORE_JOURNAL_KEY), false);
});
