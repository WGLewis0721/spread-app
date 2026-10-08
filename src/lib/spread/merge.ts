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
      if (key.endsWith(ID_LIST_SUFFIX) && !sameValue(lv, rv) && isIdList(lv) && isIdList(rv) && (bv === undefined || isIdList(bv))) {
        const listed = mergeIdList(bv ?? [], lv, rv);
        if (!listed.ok) {
          clashing.push(key);
          continue;
        }
        pick = listed.value;
      } else if (sameValue(lv, rv)) pick = lv;
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

/** A field whose name ends in this holds an ordered list of ids and merges as a list, not as one value. */
export const ID_LIST_SUFFIX = "$ids";

function isIdList(value: Json | undefined): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

const inOrder = (list: string[], keep: Set<string>) => list.filter((id) => keep.has(id));
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

/**
 * Three-way merge of an ordered list of ids (the tasks in a box, the spreads in a profile).
 *
 * - An id on both sides stays. An id only on one side is an addition if the base did not have it,
 *   and a deletion by the other side if the base did.
 * - If both sides ordered the shared ids differently, and neither matches the base, it is a
 *   conflict. Otherwise the side that changed the order wins.
 * - Additions go after the nearest earlier shared id from the list they came from. Additions at
 *   the same spot are ordered by id, so the result is the same whichever side is "local".
 */
export function mergeIdList(base: string[], local: string[], remote: string[]): { ok: true; value: string[] } | { ok: false } {
  const inLocal = new Set(local);
  const inRemote = new Set(remote);
  const inBase = new Set(base);
  const common = new Set(local.filter((id) => inRemote.has(id)));

  const orderL = inOrder(local, common);
  const orderR = inOrder(remote, common);
  let chosen: string[];
  if (sameList(orderL, orderR)) chosen = orderL;
  else {
    const allInBase = [...common].every((id) => inBase.has(id));
    const orderB = allInBase ? inOrder(base, common) : null;
    if (orderB && sameList(orderL, orderB)) chosen = orderR;
    else if (orderB && sameList(orderR, orderB)) chosen = orderL;
    else return { ok: false };
  }

  const additions = (list: string[], other: Set<string>) => {
    const out: { id: string; anchor: string | null; run: string }[] = [];
    let anchor: string | null = null;
    for (const id of list) {
      if (common.has(id)) anchor = id;
      else if (!other.has(id) && !inBase.has(id)) out.push({ id, anchor, run: "" });
    }
    return out;
  };
  const added = [...additions(local, inRemote), ...additions(remote, inLocal)];
  const byAnchor = new Map<string | null, { id: string; origin: "l" | "r" }[]>();
  for (const item of added) {
    const origin: "l" | "r" = inLocal.has(item.id) ? "l" : "r";
    const group = byAnchor.get(item.anchor) ?? [];
    group.push({ id: item.id, origin });
    byAnchor.set(item.anchor, group);
  }
  const arranged = (anchor: string | null) => {
    const group = byAnchor.get(anchor) ?? [];
    const runs = (["l", "r"] as const).map((origin) => group.filter((g) => g.origin === origin).map((g) => g.id)).filter((run) => run.length > 0);
    runs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    return runs.flat();
  };
  const value = [...arranged(null)];
  for (const id of chosen) value.push(id, ...arranged(id));
  return { ok: true, value };
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
