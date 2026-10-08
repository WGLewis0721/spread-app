import assert from "node:assert/strict";
import test from "node:test";
import { bump, compareVectors, type VersionVector } from "./clock.ts";
import { canonical, mergeItems, resolveConflict, type Json, type SyncItem } from "./merge.ts";

const item = (id: string, fields: Record<string, Json>, v: VersionVector, deleted = false): SyncItem => ({ id, fields, v, ...(deleted ? { deleted } : {}) });
const edit = (it: SyncItem, device: string, fields: Record<string, Json>): SyncItem => ({ ...it, fields: { ...it.fields, ...fields }, v: bump(it.v, device) });
const remove = (it: SyncItem, device: string): SyncItem => ({ id: it.id, fields: {}, v: bump(it.v, device), deleted: true });

const run = (base: SyncItem[], local: SyncItem[], remote: SyncItem[], device = "phone") => mergeItems({ base, local, remote, device });
const ids = (list: { id: string }[]) => list.map((x) => x.id).sort();

test("edits to different items merge with no conflict and keep both", () => {
  const a = item("a", { text: "one" }, { phone: 1 });
  const b = item("b", { text: "two" }, { phone: 1 });
  const result = run([a, b], [edit(a, "phone", { text: "ONE" }), b], [a, edit(b, "pad", { text: "TWO" })]);
  assert.equal(result.conflicts.length, 0);
  const text = Object.fromEntries(result.merged.map((m) => [m.id, m.fields.text]));
  assert.deepEqual(text, { a: "ONE", b: "TWO" });
});

test("different fields of the same item auto-merge and are logged", () => {
  const t = item("t", { text: "Call", done: false }, { phone: 1 });
  const result = run([t], [edit(t, "phone", { text: "Call Sam" })], [edit(t, "pad", { done: true })]);
  assert.equal(result.conflicts.length, 0);
  assert.deepEqual(result.merged[0].fields, { text: "Call Sam", done: true });
  assert.equal(result.log[0].kind, "auto-merged");
  assert.deepEqual(result.log[0].fields, ["done", "text"]);
});

test("the same field changed differently on both sides is a conflict, not a winner", () => {
  const t = item("t", { text: "Call" }, { phone: 1 });
  const result = run([t], [edit(t, "phone", { text: "Call Sam" })], [edit(t, "pad", { text: "Call Alex" })]);
  assert.equal(result.merged.length, 0);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].kind, "edit-edit");
  assert.deepEqual(result.conflicts[0].fields, ["text"]);
});

test("a delete that raced an edit is always a conflict", () => {
  const t = item("t", { text: "Call" }, { phone: 1 });
  const result = run([t], [remove(t, "phone")], [edit(t, "pad", { text: "Call Sam" })]);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].kind, "delete-edit");
  const flipped = run([t], [edit(t, "pad", { text: "Call Sam" })], [remove(t, "phone")]);
  assert.equal(flipped.conflicts[0].kind, "delete-edit");
});

test("a delete made after seeing the edit wins; an edit made after seeing the delete resurrects", () => {
  const t = item("t", { text: "Call" }, { phone: 1 });
  const edited = edit(t, "pad", { text: "Call Sam" });
  assert.equal(run([t], [remove(edited, "phone")], [edited]).merged[0].deleted, true);
  const deleted = remove(t, "phone");
  const revived = edit({ ...deleted, deleted: undefined, fields: { text: "Call" } }, "pad", { text: "Back" });
  assert.equal(run([t], [deleted], [revived]).merged[0].deleted, undefined);
});

test("an item that exists on only one side is kept", () => {
  const a = item("a", { text: "x" }, { phone: 1 });
  const b = item("b", { text: "y" }, { pad: 1 });
  const result = run([], [a], [b]);
  assert.deepEqual(ids(result.merged), ["a", "b"]);
  assert.equal(result.log.find((entry) => entry.id === "b")?.kind, "added-from-remote");
});

test("identical concurrent edits collapse", () => {
  const t = item("t", { text: "Call" }, { phone: 1 });
  const result = run([t], [edit(t, "phone", { text: "Same" })], [edit(t, "pad", { text: "Same" })]);
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.merged[0].fields.text, "Same");
});

test("two devices that each added an item with the same id and different content conflict", () => {
  const result = run([], [item("work", { name: "Alpha" }, { phone: 1 })], [item("work", { name: "Beta" }, { pad: 1 })]);
  assert.equal(result.conflicts[0].kind, "add-add");
});

test("resolving takes a vector that dominates both sides, so the conflict does not return", () => {
  const t = item("t", { text: "Call" }, { phone: 1 });
  const c = run([t], [edit(t, "phone", { text: "A" })], [edit(t, "pad", { text: "B" })]).conflicts[0];
  for (const choice of ["local", "remote", "both"] as const) {
    const out = resolveConflict(c, choice, "phone", () => "copy1");
    assert.equal(out[0].id, "t");
    assert.notEqual(compareVectors(out[0].v, c.local.v), "before");
    assert.notEqual(compareVectors(out[0].v, c.remote.v), "before");
    assert.notEqual(compareVectors(out[0].v, c.remote.v), "concurrent");
  }
  const both = resolveConflict(c, "both", "phone", () => "copy1");
  assert.deepEqual(both.map((x) => x.fields.text), ["A", "B"]);
  assert.equal(both[1].id, "copy1");
});

test("keeping both on a delete-edit conflict keeps the edited item", () => {
  const t = item("t", { text: "Call" }, { phone: 1 });
  const c = run([t], [remove(t, "phone")], [edit(t, "pad", { text: "Call Sam" })]).conflicts[0];
  const out = resolveConflict(c, "both", "phone", () => "x");
  assert.equal(out.length, 1);
  assert.equal(out[0].deleted, undefined);
  assert.equal(out[0].fields.text, "Call Sam");
});

// --- Property tests ---------------------------------------------------------------------------

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function scenario(seed: number) {
  const next = rng(seed);
  const base: SyncItem[] = Array.from({ length: 6 }, (_, i) => item(`i${i}`, { text: `t${i}`, done: false, hours: i }, { origin: 1 }));
  const diverge = (device: string, tag: string) => {
    const out = new Map(base.map((x) => [x.id, x]));
    for (let step = 0; step < 4; step += 1) {
      const pick = base[Math.floor(next() * base.length)];
      const current = out.get(pick.id)!;
      const roll = next();
      if (current.deleted) continue;
      if (roll < 0.15) out.set(pick.id, remove(current, device));
      else if (roll < 0.6) out.set(pick.id, edit(current, device, { text: `${tag}${Math.floor(next() * 3)}` }));
      else if (roll < 0.9) out.set(pick.id, edit(current, device, { done: next() < 0.5 }));
      else out.set(`new-${device}-${step}`, item(`new-${device}-${step}`, { text: `${tag}-added` }, { [device]: 1 }));
    }
    return [...out.values()];
  };
  return { base, local: diverge("phone", "P"), remote: diverge("pad", "R") };
}

test("property: nothing is lost, nothing is invented, and the result does not depend on which side is local", () => {
  for (let seed = 1; seed <= 400; seed += 1) {
    const { base, local, remote } = scenario(seed);
    const ab = mergeItems({ base, local, remote, device: "phone" });
    const ba = mergeItems({ base, local: remote, remote: local, device: "phone" });

    const all = new Set([...local, ...remote].map((x) => x.id));
    const out = new Set([...ab.merged, ...ab.conflicts].map((x) => x.id));
    assert.deepEqual([...out].sort(), [...all].sort(), `seed ${seed}: an id was lost or invented`);
    assert.equal(out.size, ab.merged.length + ab.conflicts.length, `seed ${seed}: an id appears twice`);

    assert.deepEqual(ids(ab.merged), ids(ba.merged), `seed ${seed}: merged ids depend on direction`);
    assert.deepEqual(ids(ab.conflicts), ids(ba.conflicts), `seed ${seed}: conflicts depend on direction`);
    for (const m of ab.merged) {
      const twin = ba.merged.find((x) => x.id === m.id)!;
      assert.equal(canonical(m.fields), canonical(twin.fields), `seed ${seed}: ${m.id} differs by direction`);
      assert.equal(!!m.deleted, !!twin.deleted);
    }

    for (const m of ab.merged) {
      if (m.deleted) continue;
      const l = local.find((x) => x.id === m.id);
      const r = remote.find((x) => x.id === m.id);
      for (const [key, value] of Object.entries(m.fields)) {
        const allowed = [l?.fields[key], r?.fields[key]].map((x) => canonical(x));
        assert.ok(allowed.includes(canonical(value)), `seed ${seed}: ${m.id}.${key} was invented`);
      }
      for (const side of [l, r]) if (side) assert.notEqual(compareVectors(m.v, side.v), "before", `seed ${seed}: ${m.id} went backwards`);
    }
  }
});

test("property: merging the result again changes nothing", () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const { base, local, remote } = scenario(seed);
    const first = mergeItems({ base, local, remote, device: "phone" });
    const settledLocal = [...first.merged, ...first.conflicts.map((c) => c.local)];
    const again = mergeItems({ base: first.merged, local: settledLocal, remote, device: "phone" });
    assert.deepEqual(ids(again.conflicts), ids(first.conflicts), `seed ${seed}: conflicts changed on re-merge`);
    for (const m of first.merged) {
      const twin = again.merged.find((x) => x.id === m.id);
      assert.ok(twin, `seed ${seed}: ${m.id} vanished`);
      assert.equal(canonical(twin.fields), canonical(m.fields));
    }
  }
});

test("property: when the two sides touch different items there are never any conflicts", () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const next = rng(seed);
    const base: SyncItem[] = Array.from({ length: 8 }, (_, i) => item(`i${i}`, { text: `t${i}` }, { origin: 1 }));
    const local = base.map((x, i) => (i % 2 === 0 && next() < 0.8 ? (next() < 0.3 ? remove(x, "phone") : edit(x, "phone", { text: `P${seed}` })) : x));
    const remote = base.map((x, i) => (i % 2 === 1 && next() < 0.8 ? (next() < 0.3 ? remove(x, "pad") : edit(x, "pad", { text: `R${seed}` })) : x));
    const result = mergeItems({ base, local, remote, device: "phone" });
    assert.equal(result.conflicts.length, 0, `seed ${seed}`);
    assert.equal(result.merged.length, 8);
  }
});

test("property: a delete racing an edit of the same item is never merged silently", () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const t = item("t", { text: "x", n: seed }, { origin: 1 });
    const result = mergeItems({ base: [t], local: [remove(t, "phone")], remote: [edit(t, "pad", { text: `y${seed}` })], device: "phone" });
    assert.equal(result.conflicts.length, 1);
    assert.equal(result.merged.length, 0);
  }
});
