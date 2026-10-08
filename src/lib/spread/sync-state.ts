/**
 * The per-profile bookkeeping behind iCloud Sync, as pure functions over a plain state object.
 * No timers, no storage, no network: the device glue loads a `SyncState`, calls one of these, and
 * saves the result, so every rule is tested with simulated devices.
 *
 *   items    this device's current view of every synced item (tombstones included)
 *   base     what the cloud last agreed to for each item (the common ancestor for a 3-way merge)
 *   pending  items changed here that the cloud has not confirmed yet
 *   conflicts items both devices changed in ways that cannot be combined, waiting for the person
 */
import { bump, compareVectors, mergeVectors, type VersionVector } from "./clock.ts";
import { canonical, mergeItems, resolveConflict, type Choice, type Conflict, type Json, type LogEntry, type SyncItem } from "./merge.ts";
import type { SpreadData } from "./model.ts";
import { assemble, flatten } from "./sync-model.ts";

export type StoredItem = { fields: Record<string, Json>; v: VersionVector; deleted?: boolean; at: string };

/** The side a person chose not to keep, held so it can be put back. */
export type Discarded = { id: string; item: SyncItem; side: "this-device" | "icloud"; at: string };
export const DISCARD_KEEP_DAYS = 30;

export type SyncState = {
  version: 1;
  syncId: string;
  deviceId: string;
  items: Record<string, StoredItem>;
  base: Record<string, StoredItem>;
  pending: string[];
  /** Versions handed to the native sync engine and not yet confirmed by iCloud, by item id. */
  queued: Record<string, VersionVector>;
  conflicts: Conflict[];
  /** Versions set aside when a conflict was settled. Kept for 30 days. Absent in older state files. */
  discarded?: Discarded[];
  lastSyncAt: string | null;
};

export function newSyncState(syncId: string, deviceId: string): SyncState {
  return { version: 1, syncId, deviceId, items: {}, base: {}, pending: [], queued: {}, conflicts: [], lastSyncAt: null };
}

const toItem = (id: string, stored: StoredItem): SyncItem => ({ id, fields: stored.fields, v: stored.v, ...(stored.deleted ? { deleted: true } : {}), at: stored.at });
const toStored = (item: SyncItem, now: string): StoredItem => ({ fields: item.fields, v: item.v, ...(item.deleted ? { deleted: true } : {}), at: item.at ?? now });

function sameStored(a: StoredItem | undefined, b: StoredItem | undefined): boolean {
  if (!a || !b) return a === b;
  return !!a.deleted === !!b.deleted && compareVectors(a.v, b.v) === "equal" && (a.deleted || canonical(a.fields) === canonical(b.fields));
}

export type CaptureBlock = { deleting: number; live: number; reason: "everything" | "most" | "all-tasks" };

/** Thresholds for treating a capture as a likely accident rather than an edit. */
const MASS_MIN = 5;
const TASKS_MIN = 3;

/**
 * Would capturing this planner delete so much that it is more likely a failed or empty read than
 * a decision? Deleting one task, or a handful, is an edit. Everything vanishing, more than half
 * of a sizeable planner vanishing, or every task vanishing at once is not.
 */
export function assessDeletion(state: SyncState, vanished: string[]): CaptureBlock | null {
  const live = Object.entries(state.items).filter(([, item]) => !item.deleted).map(([id]) => id);
  if (vanished.length === 0 || live.length === 0) return null;
  const liveTasks = live.filter((id) => id.startsWith("task:"));
  const vanishedTasks = vanished.filter((id) => id.startsWith("task:"));
  if (vanished.length >= live.length) return { deleting: vanished.length, live: live.length, reason: "everything" };
  if (vanished.length >= MASS_MIN && vanished.length * 2 > live.length) return { deleting: vanished.length, live: live.length, reason: "most" };
  if (liveTasks.length >= TASKS_MIN && vanishedTasks.length === liveTasks.length) return { deleting: vanished.length, live: live.length, reason: "all-tasks" };
  return null;
}

/**
 * Record what the person changed on this device. Items whose content differs from what the state
 * holds get a new version stamped by this device; items that vanished become tombstones.
 *
 * If the deletions look like an accident (see `assessDeletion`) nothing is recorded and `blocked`
 * says why, unless the caller has been told the person confirmed it with `allowMassDelete`.
 */
export function captureLocal(
  state: SyncState,
  data: SpreadData,
  name: string,
  now: string,
  options: { allowMassDelete?: boolean } = {},
): { state: SyncState; changed: string[]; blocked?: CaptureBlock } {
  const plain = flatten(data, name);
  const seen = new Set(plain.map((item) => item.id));
  const vanished = Object.entries(state.items).filter(([id, current]) => !seen.has(id) && !current.deleted).map(([id]) => id);
  if (!options.allowMassDelete) {
    const blocked = assessDeletion(state, vanished);
    if (blocked) return { state, changed: [], blocked };
  }

  const items = { ...state.items };
  const pending = new Set(state.pending);
  const conflicts = state.conflicts.slice();
  const changed: string[] = [];

  for (const item of plain) {
    const current = items[item.id];
    if (current && !current.deleted && canonical(current.fields) === canonical(item.fields)) continue;
    const next: StoredItem = { fields: item.fields, v: bump(current?.v ?? {}, state.deviceId), at: now };
    items[item.id] = next;
    pending.add(item.id);
    changed.push(item.id);
    const at = conflicts.findIndex((c) => c.id === item.id);
    if (at >= 0) conflicts[at] = { ...conflicts[at], local: toItem(item.id, next) };
  }
  for (const id of vanished) {
    const current = items[id];
    const next: StoredItem = { fields: {}, v: bump(current.v, state.deviceId), deleted: true, at: now };
    items[id] = next;
    pending.add(id);
    changed.push(id);
    const at = conflicts.findIndex((c) => c.id === id);
    if (at >= 0) conflicts[at] = { ...conflicts[at], local: toItem(id, next) };
  }
  return { state: { ...state, items, pending: [...pending].sort(), conflicts }, changed };
}

export type RemoteResult = { state: SyncState; log: LogEntry[]; newConflicts: string[]; dataChanged: boolean };

/** Merge items that arrived from the cloud. Local content is never discarded without a conflict. */
export function applyRemote(state: SyncState, remote: SyncItem[], now: string): RemoteResult {
  const ids = new Set(remote.map((item) => item.id));
  const local = [...ids].filter((id) => state.items[id]).map((id) => toItem(id, state.items[id]));
  const base = [...ids].filter((id) => state.base[id]).map((id) => toItem(id, state.base[id]));
  const result = mergeItems({ base, local, remote, device: state.deviceId });

  const items = { ...state.items };
  const baseMap = { ...state.base };
  const pending = new Set(state.pending);
  let dataChanged = false;
  const remoteById = new Map(remote.map((item) => [item.id, item]));
  const conflictIds = new Set(result.conflicts.map((c) => c.id));

  for (const item of result.merged) {
    const stored = toStored(item, now);
    if (!sameStored(items[item.id], stored) && canonical(items[item.id]?.fields ?? {}) !== canonical(stored.fields)) dataChanged = true;
    if (!!items[item.id]?.deleted !== !!stored.deleted) dataChanged = true;
    items[item.id] = stored;
    const theirs = remoteById.get(item.id);
    if (theirs && compareVectors(theirs.v, item.v) === "equal" && !theirs.deleted === !item.deleted) {
      baseMap[item.id] = toStored(theirs, now);
      pending.delete(item.id);
    } else {
      pending.add(item.id);
    }
  }

  const resolvedNow = state.conflicts.filter((c) => ids.has(c.id) && !conflictIds.has(c.id)).map((c) => c.id);
  const conflicts = state.conflicts.filter((c) => !resolvedNow.includes(c.id) && !conflictIds.has(c.id)).concat(result.conflicts);
  return {
    state: { ...state, items, base: baseMap, pending: [...pending].sort(), conflicts, lastSyncAt: now },
    log: result.log,
    newConflicts: result.conflicts.map((c) => c.id).filter((id) => !state.conflicts.some((c) => c.id === id)),
    dataChanged,
  };
}

/** Items to send. Anything still in conflict waits: it is not pushed until the person decides. */
export function itemsToPush(state: SyncState): SyncItem[] {
  const held = new Set(state.conflicts.map((c) => c.id));
  return state.pending
    .filter((id) => !held.has(id) && state.items[id])
    .filter((id) => !state.queued[id] || compareVectors(state.queued[id], state.items[id].v) !== "equal")
    .map((id) => toItem(id, state.items[id]));
}

/** These versions were handed to the native engine. They stay pending until iCloud confirms them. */
export function markQueued(state: SyncState, items: SyncItem[]): SyncState {
  const queued = { ...state.queued };
  for (const item of items) queued[item.id] = item.v;
  return { ...state, queued };
}

/**
 * The native engine's outbox no longer holds some queued items: iCloud has them. Those become the
 * new agreed base. An item edited again since it was queued stays pending with its newer version.
 */
export function confirmQueued(state: SyncState, stillInOutbox: Set<string>, now: string): SyncState {
  let next = state;
  const queued = { ...state.queued };
  for (const [id, vector] of Object.entries(state.queued)) {
    if (stillInOutbox.has(id)) continue;
    delete queued[id];
    const current = state.items[id];
    if (current && compareVectors(current.v, vector) === "equal") {
      next = markPushed(next, [toItem(id, { ...current, v: vector })], now);
    }
  }
  return { ...next, queued };
}

/** The cloud accepted these exactly as sent. */
export function markPushed(state: SyncState, pushed: SyncItem[], now: string): SyncState {
  const base = { ...state.base };
  const pending = new Set(state.pending);
  for (const item of pushed) {
    base[item.id] = toStored(item, now);
    const current = state.items[item.id];
    if (current && compareVectors(current.v, item.v) === "equal") pending.delete(item.id);
  }
  return { ...state, base, pending: [...pending].sort(), lastSyncAt: now };
}

/** "Keep both" only makes sense for a task that was edited differently on both devices. */
export function canKeepBoth(conflict: Conflict): boolean {
  return conflict.id.startsWith("task:") && conflict.kind !== "delete-edit";
}

/** Settle one conflict. The result dominates both sides, so it replaces them everywhere once pushed. */
export function resolve(state: SyncState, id: string, choice: Choice, newTaskId: () => string, now: string): SyncState {
  const conflict = state.conflicts.find((c) => c.id === id);
  if (!conflict) return state;
  const effective: Choice = choice === "both" && !canKeepBoth(conflict) && conflict.kind !== "delete-edit" ? "local" : choice;
  const out = resolveConflict(conflict, effective, state.deviceId, () => `task:${newTaskId()}`);
  const items = { ...state.items };
  const pending = new Set(state.pending);
  for (const item of out) {
    items[item.id] = toStored({ ...item, at: now }, now);
    pending.add(item.id);
  }
  const kept = (state.discarded ?? []).filter((d) => Date.parse(now) - Date.parse(d.at) < DISCARD_KEEP_DAYS * 86_400_000);
  if (effective === "local") kept.push({ id, item: conflict.remote, side: "icloud", at: now });
  if (effective === "remote") kept.push({ id, item: conflict.local, side: "this-device", at: now });
  return { ...state, items, pending: [...pending].sort(), conflicts: state.conflicts.filter((c) => c.id !== id), discarded: kept };
}

/** Put a set-aside version back. It becomes a new edit that dominates what is there now. */
export function restoreDiscarded(state: SyncState, index: number, now: string): SyncState {
  const list = state.discarded ?? [];
  const entry = list[index];
  if (!entry) return state;
  const current = state.items[entry.id];
  const v = bump(mergeVectors(current?.v ?? {}, entry.item.v), state.deviceId);
  const items = { ...state.items, [entry.id]: toStored({ ...entry.item, v, at: now }, now) };
  return {
    ...state,
    items,
    pending: [...new Set([...state.pending, entry.id])].sort(),
    discarded: list.filter((_, i) => i !== index),
  };
}

export function liveData(state: SyncState, currentWeek: string): { data: SpreadData; name: string | null } {
  const live = Object.entries(state.items)
    .filter(([, item]) => !item.deleted)
    .map(([id, item]) => ({ id, fields: item.fields }));
  return assemble(live, currentWeek);
}

/** Build a planner from items that came straight from iCloud (used to add an iCloud profile to a device). */
export function dataFromItems(items: SyncItem[], currentWeek: string): { data: SpreadData; name: string | null } {
  return assemble(
    items.filter((item) => !item.deleted).map((item) => ({ id: item.id, fields: item.fields })),
    currentWeek,
  );
}

/**
 * Start a state that already agrees with iCloud: used when an empty profile becomes an iCloud
 * profile in place, or an iCloud profile is added to the device. Nothing is pending and nothing
 * can conflict, because there is no local content to disagree with.
 */
export function adoptRemote(syncId: string, deviceId: string, remote: SyncItem[], now: string): SyncState {
  const state = newSyncState(syncId, deviceId);
  const items: Record<string, StoredItem> = {};
  for (const item of remote) items[item.id] = toStored(item, now);
  return { ...state, items, base: { ...items }, lastSyncAt: now };
}
