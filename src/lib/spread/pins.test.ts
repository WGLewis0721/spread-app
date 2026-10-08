// Astra A09: routine copies never evict the copies taken before destructive steps.
import assert from "node:assert/strict";
import test from "node:test";
import { pinsToDelete } from "./pins.ts";

const name = (i: number, label: string) => `spread-pinned-${String(20261008000000000 + i)}-${label}.json`;

test("A09: sixteen routine copies after a restore copy do not delete it", () => {
  const names = [name(0, "pre-restore"), ...Array.from({ length: 40 }, (_, i) => name(i + 1, "pre-sync"))];
  const doomed = pinsToDelete(names);
  assert.equal(doomed.includes(name(0, "pre-restore")), false);
  assert.equal(doomed.length, 25, "only routine copies beyond the newest 15 go");
});

test("A09: the newest routine copies are kept", () => {
  const names = Array.from({ length: 20 }, (_, i) => name(i, "pre-sync"));
  const doomed = pinsToDelete(names);
  assert.deepEqual(doomed, names.slice(0, 5));
});

test("A09: protected copies are bounded too, oldest first", () => {
  const names = Array.from({ length: 33 }, (_, i) => name(i, "pre-sync-link"));
  assert.deepEqual(pinsToDelete(names), names.slice(0, 3));
});

test("A09: unrelated files are never touched", () => {
  assert.deepEqual(pinsToDelete(["spread-mirror-a.json", "notes.txt"]), []);
});
