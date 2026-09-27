import assert from "node:assert/strict";
import test from "node:test";
import { bankedHours, depositHours, remainingHours } from "./model.ts";

test("day hours debit and credit the spread bank", () => {
  const bank = 5;
  const monday = [{ hatId: "work", hours: 3 }];
  assert.equal(remainingHours(bank, [], "work"), 5);
  assert.equal(remainingHours(bank, monday, "work"), 2);
  assert.equal(remainingHours(bank, [{ hatId: "work", hours: 1 }], "work"), 4);
});

test("a day cannot draw more than the bank has left", () => {
  assert.equal(bankedHours(3, 5, 2, 4), 3);
  assert.equal(bankedHours(1, 5, 0, 0), 0);
  assert.equal(depositHours(5, 5, 1), 0);
  assert.equal(depositHours(5, 2, 1), 1);
});
