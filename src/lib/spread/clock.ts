/**
 * Version vectors for iCloud sync. Wall clocks are never used to decide which edit wins: two
 * devices' clocks disagree, and a "newest wins" rule silently throws one person's work away.
 * A vector records how many edits each device has made to an item. If neither vector contains
 * the other, the edits were concurrent and the item is a conflict for the person to resolve.
 */
export type VersionVector = Record<string, number>;

export type Order = "equal" | "before" | "after" | "concurrent";

/** Metadata carried by a synced item. `at` is for display only. */
export type ItemMeta = { v: VersionVector; at: string };

/** A deletion is kept as a record so it can be compared with a concurrent edit. */
export type Tombstone = { id: string; v: VersionVector; at: string };

export function cleanVector(value: unknown): VersionVector {
  const out: VersionVector = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [device, count] of Object.entries(value as Record<string, unknown>)) {
    if (device && typeof count === "number" && Number.isInteger(count) && count > 0) out[device] = count;
  }
  return out;
}

export function compareVectors(a: VersionVector, b: VersionVector): Order {
  let aAhead = false;
  let bAhead = false;
  for (const device of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[device] ?? 0;
    const y = b[device] ?? 0;
    if (x > y) aAhead = true;
    if (y > x) bAhead = true;
  }
  if (aAhead && bAhead) return "concurrent";
  if (aAhead) return "after";
  if (bAhead) return "before";
  return "equal";
}

/** Record one more edit by `device`. */
export function bump(vector: VersionVector, device: string): VersionVector {
  return { ...vector, [device]: (vector[device] ?? 0) + 1 };
}

/** The smallest vector that has seen everything both inputs have seen. */
export function mergeVectors(a: VersionVector, b: VersionVector): VersionVector {
  const out: VersionVector = { ...a };
  for (const [device, count] of Object.entries(b)) out[device] = Math.max(out[device] ?? 0, count);
  return out;
}
