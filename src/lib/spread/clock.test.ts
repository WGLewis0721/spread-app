import assert from "node:assert/strict";
import test from "node:test";
import { bump, cleanVector, compareVectors, mergeVectors, type VersionVector } from "./clock.ts";

// Small deterministic generator so failures are reproducible.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function randomVector(next: () => number): VersionVector {
  const v: VersionVector = {};
  for (const device of ["a", "b", "c"]) if (next() < 0.7) v[device] = 1 + Math.floor(next() * 4);
  return v;
}

test("an edit on one device orders after its parent; independent edits are concurrent", () => {
  const base = bump({}, "phone");
  const onPhone = bump(base, "phone");
  const onPad = bump(base, "pad");
  assert.equal(compareVectors(base, onPhone), "before");
  assert.equal(compareVectors(onPhone, base), "after");
  assert.equal(compareVectors(onPhone, onPad), "concurrent");
  assert.equal(compareVectors(onPhone, onPhone), "equal");
});

test("merge is commutative, associative, idempotent and dominates both inputs", () => {
  const next = rng(7);
  for (let i = 0; i < 500; i += 1) {
    const a = randomVector(next);
    const b = randomVector(next);
    const c = randomVector(next);
    assert.deepEqual(mergeVectors(a, b), mergeVectors(b, a));
    assert.deepEqual(mergeVectors(mergeVectors(a, b), c), mergeVectors(a, mergeVectors(b, c)));
    assert.deepEqual(mergeVectors(a, a), a);
    const m = mergeVectors(a, b);
    assert.notEqual(compareVectors(m, a), "before");
    assert.notEqual(compareVectors(m, a), "concurrent");
    assert.notEqual(compareVectors(m, b), "before");
    assert.notEqual(compareVectors(m, b), "concurrent");
  }
});

test("compare is antisymmetric", () => {
  const next = rng(11);
  const flip = { equal: "equal", before: "after", after: "before", concurrent: "concurrent" } as const;
  for (let i = 0; i < 500; i += 1) {
    const a = randomVector(next);
    const b = randomVector(next);
    assert.equal(compareVectors(b, a), flip[compareVectors(a, b)]);
  }
});

test("cleanVector drops anything that is not a positive whole count", () => {
  assert.deepEqual(cleanVector({ a: 2, b: 0, c: -1, d: 1.5, e: "3", "": 4 }), { a: 2 });
  for (const bad of [null, undefined, 3, "x", [1, 2]]) assert.deepEqual(cleanVector(bad), {});
});
