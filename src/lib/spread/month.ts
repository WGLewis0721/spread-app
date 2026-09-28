import { isoDate, parseKey, weekKey, type SpreadData } from "./model.ts";

export type MonthCell = { date: string; inMonth: boolean; day: number };
export type MonthCursor = { year: number; month: number };

export function monthGrid(year: number, month: number): MonthCell[] {
  const lead = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const cells: MonthCell[] = [];
  for (let i = lead; i > 0; i -= 1) {
    const date = new Date(year, month, 1 - i);
    cells.push({ date: isoDate(date), inMonth: false, day: date.getDate() });
  }
  for (let day = 1; day <= count; day += 1) {
    cells.push({ date: isoDate(new Date(year, month, day)), inMonth: true, day });
  }
  let trail = 1;
  while (cells.length % 7 !== 0) {
    const date = new Date(year, month + 1, trail);
    cells.push({ date: isoDate(date), inMonth: false, day: date.getDate() });
    trail += 1;
  }
  return cells;
}

export function shiftMonth(year: number, month: number, delta: number): MonthCursor {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function formatMonth(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function dominantMonth(key: string): MonthCursor {
  const start = parseKey(key);
  let best: MonthCursor & { n: number } = { year: start.getFullYear(), month: start.getMonth(), n: 0 };
  const seen = new Map<string, MonthCursor & { n: number }>();
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const id = `${date.getFullYear()}-${date.getMonth()}`;
    const row = seen.get(id) ?? { year: date.getFullYear(), month: date.getMonth(), n: 0 };
    row.n += 1;
    seen.set(id, row);
    if (row.n > best.n) best = row;
  }
  return { year: best.year, month: best.month };
}

export function dayMarks(data: SpreadData, date: string): { colors: string[]; extra: number } {
  const allocations = data.weeks[weekKey(parseKey(date))]?.allocations ?? [];
  const colorsByHat = new Map(data.hats.map((hat) => [hat.id, hat.color]));
  const colors: string[] = [];
  const seen = new Set<string>();
  const mine = allocations.filter((item) => item.day === date).sort((a, b) => a.order - b.order);
  for (const item of mine) {
    if (seen.has(item.hatId)) continue;
    const color = colorsByHat.get(item.hatId);
    if (!color) continue;
    seen.add(item.hatId);
    colors.push(color);
  }
  if (colors.length <= 3) return { colors, extra: 0 };
  return { colors: colors.slice(0, 3), extra: colors.length - 3 };
}
