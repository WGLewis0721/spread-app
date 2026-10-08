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
