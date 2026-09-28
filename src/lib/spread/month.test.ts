import assert from "node:assert/strict";
import test from "node:test";
import { weekDays, weekKey, parseKey, type SpreadData } from "./model.ts";
import { dayMarks, dominantMonth, monthGrid, shiftMonth } from "./month.ts";

test("January 2026 starts Thursday and reaches back into December", () => {
  const cells = monthGrid(2026, 0);
  assert.equal(cells[0].date, "2025-12-28");
  assert.equal(cells[0].inMonth, false);
  assert.equal(cells[4].date, "2026-01-01");
  assert.equal(cells[4].inMonth, true);
  assert.equal(cells.at(-1)?.date, "2026-01-31");
  assert.equal(cells.length % 7, 0);
});

test("February 2024 keeps the leap day", () => {
  const days = monthGrid(2024, 1).filter((cell) => cell.inMonth);
  assert.equal(days.length, 29);
  assert.equal(days[0].date, "2024-02-01");
  assert.equal(days.at(-1)?.date, "2024-02-29");
});

test("December 2026 trails into January 2027", () => {
  const cells = monthGrid(2026, 11);
  assert.equal(cells.find((cell) => cell.date === "2026-12-01")?.inMonth, true);
  assert.equal(cells.at(-1)?.inMonth, false);
  assert.equal(cells.at(-1)?.date.startsWith("2027-01-"), true);
});

test("month steps cross the year", () => {
  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
});

test("a date stays on the week that lists it, including year edges", () => {
  for (const cursor of [{ year: 2025, month: 11 }, { year: 2026, month: 0 }, { year: 2026, month: 11 }, { year: 2027, month: 0 }]) {
    for (const cell of monthGrid(cursor.year, cursor.month)) {
      const listed = weekDays(weekKey(parseKey(cell.date))).map((day) => day.date);
      assert.ok(listed.includes(cell.date), cell.date);
    }
  }
});

test("the week of Sep 28 2026 belongs to October", () => {
  assert.deepEqual(dominantMonth("2026-09-28"), { year: 2026, month: 9 });
  assert.deepEqual(dominantMonth("2026-12-28"), { year: 2026, month: 11 });
});

function sample(days: { hatId: string; day: string; order: number }[]): SpreadData {
  return {
    currentWeek: "2026-09-28",
    hats: ["a", "b", "c", "d", "e"].map((id, index) => ({
      id,
      name: id,
      defaultHours: 1,
      color: `#${index}${index}${index}${index}${index}${index}`,
    })),
    weeks: {
      "2026-09-28": {
        boxes: [],
        allocations: days.map((day, index) => ({ id: String(index), hours: 1, ...day })),
      },
    },
  };
}

test("a day with nothing allocated has no marks", () => {
  assert.deepEqual(dayMarks(sample([]), "2026-10-01"), { colors: [], extra: 0 });
});

test("four spreads show three dots and a remainder", () => {
  const marks = dayMarks(
    sample([
      { hatId: "a", day: "2026-10-01", order: 0 },
      { hatId: "b", day: "2026-10-01", order: 1 },
      { hatId: "c", day: "2026-10-01", order: 2 },
      { hatId: "d", day: "2026-10-01", order: 3 },
      { hatId: "a", day: "2026-10-01", order: 4 },
      { hatId: "e", day: "2026-10-02", order: 0 },
    ]),
    "2026-10-01",
  );
  assert.equal(marks.colors.length, 3);
  assert.equal(marks.extra, 1);
  assert.deepEqual(marks.colors, ["#000000", "#111111", "#222222"]);
  assert.deepEqual(dayMarks(sample([{ hatId: "e", day: "2026-10-02", order: 0 }]), "2026-10-02").extra, 0);
});
