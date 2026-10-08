import assert from "node:assert/strict";
import test from "node:test";
import { isDamagedRow } from "./sync-link.ts";

const row = (itemId: string, fields: unknown, extra: Partial<{ v: string; deleted: boolean }> = {}) => ({
  itemId,
  fields: typeof fields === "string" ? fields : JSON.stringify(fields),
  v: "{}",
  deleted: false,
  ...extra,
});

test("a task without its text is damaged, not an empty task", () => {
  assert.equal(isDamagedRow(row("task:a", {})), true);
  assert.equal(isDamagedRow(row("task:a", { done: false, week: "w", hat: "h" })), true);
  assert.equal(isDamagedRow(row("task:a", { text: "x", week: "w", hat: "h" })), false);
});

test("truncated or non-object payloads are damaged", () => {
  assert.equal(isDamagedRow(row("task:a", '{"text":"x"')), true);
  assert.equal(isDamagedRow(row("hat:a", "[]")), true);
  assert.equal(isDamagedRow(row("hat:a", "null")), true);
  assert.equal(isDamagedRow(row("hat:a", { name: "A" }, { v: "oops" })), true);
});

test("a tombstone may carry no fields", () => {
  assert.equal(isDamagedRow(row("task:a", {}, { deleted: true })), false);
});

test("empty hat, box and week items are damaged; other kinds follow their keys", () => {
  assert.equal(isDamagedRow(row("hat:h", {})), true);
  assert.equal(isDamagedRow(row("box:w:h", {})), true);
  assert.equal(isDamagedRow(row("week:w", {})), true);
  assert.equal(isDamagedRow(row("alloc:a", { hatId: "h", day: "mon", week: "w" })), false);
});

// Astra A10: required keys are not enough; their types and the version vector must be right.
test("A10: a task with null text, week and hat is damaged, not a blank edit", () => {
  assert.equal(isDamagedRow(row("task:a", { text: null, week: null, hat: null })), true);
  assert.equal(isDamagedRow(row("task:a", { text: "x", week: "w", hat: 5 })), true);
  assert.equal(isDamagedRow(row("task:a", { text: "x", week: "w", hat: "h", done: "yes" })), true);
});

test("A10: version vectors must be objects of whole non-negative counters", () => {
  const ok = { text: "x", week: "w", hat: "h" };
  for (const v of ["[]", '"x"', "null", '{"a":"1"}', '{"a":-1}', '{"a":1.5}', '{"a":null}']) assert.equal(isDamagedRow(row("task:a", ok, { v })), true, v);
  assert.equal(isDamagedRow(row("task:a", ok, { v: '{"phone":3}' })), false);
});

test("A10: hats, boxes and allocations are type checked", () => {
  assert.equal(isDamagedRow(row("hat:h", { name: "A", defaultHours: "8", color: "#000" })), true);
  assert.equal(isDamagedRow(row("hat:h", { name: "A", defaultHours: 8, color: "#000" })), false);
  assert.equal(isDamagedRow(row("box:w:h", { hours: "3" })), true);
  assert.equal(isDamagedRow(row("alloc:a", { hatId: "h", day: 1, week: "w" })), true);
});

test("A10: id lists must be lists of strings", () => {
  assert.equal(isDamagedRow(row("week:w", { "boxes$ids": "not a list", "allocations$ids": [] })), true);
});

test("A10: an item kind this version does not know is held back, not guessed at", () => {
  assert.equal(isDamagedRow(row("mystery:1", { a: 1 })), true);
});
