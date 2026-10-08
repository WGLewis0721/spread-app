/**
 * Three-way merge for iCloud sync. Pure and deterministic: it moves no bytes and touches no
 * storage, so every rule below is covered by `node --test`.
 *
 * The planner is flattened into items (a task, an allocation, a week's settings, ...). Each item
 * carries a version vector (see clock.ts). Merging two replicas of the same synced profile obeys
 * three rules that exist to protect people's data:
 *
 *   1. Nothing is lost. Every item id on either side ends up merged or in `conflicts`.
 *   2. No value is invented. A merged field always equals the local or the remote value.
 *   3. Anything the algorithm cannot prove safe is a conflict for the person to resolve, never a
 *      silent "newest wins". A delete that raced an edit is always a conflict.
 *
 * Only edits to different fields of one item, or to different items, merge automatically, and each
 * of those is reported in `log` so the app can say what happened.
 */
import { bump, compareVectors, mergeVectors, type VersionVector } from "./clock.ts";

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type SyncItem = {
  id: string;
  fields: Record<string, Json>;
  v: VersionVector;
  /** A tombstone. `fields` is ignored. */
  deleted?: boolean;
  at?: string;
};

export type ConflictKind = "edit-edit" | "delete-edit" | "add-add";

export type Conflict = {
  id: string;
  kind: ConflictKind;
  local: SyncItem;
  remote: SyncItem;
  base: SyncItem | null;
  /** The fields that differ and cannot be combined. Empty for delete-edit. */
  fields: string[];
};

export type LogKind = "took-remote" | "took-local" | "auto-merged" | "identical" | "added-from-remote";

export type LogEntry = { id: string; kind: LogKind; fields?: string[] };

export type MergeResult = { merged: SyncItem[]; conflicts: Conflict[]; log: LogEntry[] };

export type MergeInput = {
  /** Last state both sides agreed on. May be empty when the profile was just linked. */
  base: SyncItem[];
  local: SyncItem[];
  remote: SyncItem[];
  /** The device doing the merge. A combined item is stamped as an edit by this device. */
  device: string;
};

export function canonical(value: Json | undefined): string {
  if (value === undefined) return "\u0000undefined";
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: Json): Json {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: { [key: string]: Json } = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
    return out;
  }
  return value;
}

function sameValue(a: Json | undefined, b: Json | undefined): boolean {
  return canonical(a) === canonical(b);
}

function sameItem(a: SyncItem, b: SyncItem): boolean {
  if (!!a.deleted !== !!b.deleted) return false;
  if (a.deleted) return true;
  return sameValue(a.fields, b.fields);
}

function index(items: SyncItem[]): Map<string, SyncItem> {
  const map = new Map<string, SyncItem>();
  for (const item of items) map.set(item.id, item);
  return map;
}

export function mergeItems(input: MergeInput): MergeResult {
  const base = index(input.base);
  const local = index(input.local);
  const remote = index(input.remote);
  const ids = [...new Set([...local.keys(), ...remote.keys()])].sort();
  const merged: SyncItem[] = [];
  const conflicts: Conflict[] = [];
  const log: LogEntry[] = [];

  for (const id of ids) {
    const l = local.get(id);
    const r = remote.get(id);
    if (l && !r) {
      merged.push(l);
      continue;
    }
    if (!l && r) {
      merged.push(r);
      log.push({ id, kind: "added-from-remote" });
      continue;
    }
    if (!l || !r) continue;

    const order = compareVectors(l.v, r.v);
    if (order === "equal" || (order !== "concurrent" && sameItem(l, r))) {
      merged.push(order === "before" ? r : l);
      continue;
    }
    if (order === "after") {
      merged.push(l);
      log.push({ id, kind: "took-local" });
      continue;
    }
    if (order === "before") {
      merged.push(r);
      log.push({ id, kind: "took-remote" });
      continue;
    }

    // Concurrent edits from here on.
    const joined = bump(mergeVectors(l.v, r.v), input.device);
    if (sameItem(l, r)) {
      merged.push({ ...l, v: joined });
      log.push({ id, kind: "identical" });
      continue;
    }
    if (l.deleted || r.deleted) {
      if (l.deleted && r.deleted) {
        merged.push({ ...l, v: joined });
        continue;
      }
      conflicts.push({ id, kind: "delete-edit", local: l, remote: r, base: base.get(id) ?? null, fields: [] });
      continue;
    }

    const b = base.get(id) ?? null;
    const baseFields = b && !b.deleted ? b.fields : {};
    const combined: Record<string, Json> = {};
    const clashing: string[] = [];
    for (const key of [...new Set([...Object.keys(l.fields), ...Object.keys(r.fields), ...Object.keys(baseFields)])].sort()) {
      const lv = l.fields[key];
      const rv = r.fields[key];
      const bv = baseFields[key];
      let pick: Json | undefined;
      if (sameValue(lv, rv)) pick = lv;
      else if (sameValue(lv, bv)) pick = rv;
      else if (sameValue(rv, bv)) pick = lv;
      else {
        clashing.push(key);
        continue;
      }
      if (pick !== undefined) combined[key] = pick;
    }
    if (clashing.length > 0) {
      conflicts.push({ id, kind: b ? "edit-edit" : "add-add", local: l, remote: r, base: b, fields: clashing });
      continue;
    }
    merged.push({ id, fields: combined, v: joined });
    log.push({ id, kind: "auto-merged", fields: Object.keys(combined).filter((key) => !sameValue(combined[key], baseFields[key])) });
  }
  return { merged, conflicts, log };
}

export type Choice = "local" | "remote" | "both";

/**
 * Turn one conflict into the items to store. The result always dominates both sides' vectors, so
 * once synced it settles the conflict everywhere instead of coming back.
 *
 * "both" keeps the local item and stores the remote one as a separate item under `copyId`, so
 * nothing the other device wrote is dropped. For a delete-edit conflict, "both" keeps the edited
 * item and discards the tombstone.
 */
export function resolveConflict(conflict: Conflict, choice: Choice, device: string, copyId: () => string): SyncItem[] {
  const v = bump(mergeVectors(conflict.local.v, conflict.remote.v), device);
  if (choice === "local") return [{ ...conflict.local, v }];
  if (choice === "remote") return [{ ...conflict.remote, v }];
  if (conflict.kind === "delete-edit") {
    const edited = conflict.local.deleted ? conflict.remote : conflict.local;
    return [{ ...edited, v }];
  }
  return [
    { ...conflict.local, v },
    { id: copyId(), fields: conflict.remote.fields, v: bump({}, device) },
  ];
}
