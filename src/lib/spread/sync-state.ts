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
import { bump, compareVectors, type VersionVector } from "./clock.ts";
import { canonical, mergeItems, resolveConflict, type Choice, type Conflict, type Json, type LogEntry, type SyncItem } from "./merge.ts";
import type { SpreadData } from "./model.ts";
import { assemble, flatten } from "./sync-model.ts";

export type StoredItem = { fields: Record<string, Json>; v: VersionVector; deleted?: boolean; at: string };

export type SyncState = {
  version: 1;
  syncId: string;
  deviceId: string;
  items: Record<string, StoredItem>;
  base: Record<string, StoredItem>;
  pending: string[];
  conflicts: Conflict[];
  lastSyncAt: string | null;
};

export function newSyncState(syncId: string, deviceId: string): SyncState {
  return { version: 1, syncId, deviceId, items: {}, base: {}, pending: [], conflicts: [], lastSyncAt: null };
}

const toItem = (id: string, stored: StoredItem): SyncItem => ({ id, fields: stored.fields, v: stored.v, ...(stored.deleted ? { deleted: true } : {}), at: stored.at });
const toStored = (item: SyncItem, now: string): StoredItem => ({ fields: item.fields, v: item.v, ...(item.deleted ? { deleted: true } : {}), at: item.at ?? now });

function sameStored(a: StoredItem | undefined, b: StoredItem | undefined): boolean {
  if (!a || !b) return a === b;
  return !!a.deleted === !!b.deleted && compareVectors(a.v, b.v) === "equal" && (a.deleted || canonical(a.fields) === canonical(b.fields));
}

/**
 * Record what the person changed on this device. Items whose content differs from what the state
 * holds get a new version stamped by this device; items that vanished become tombstones.
 */
export function captureLocal(state: SyncState, data: SpreadData, name: string, now: string): { state: SyncState; changed: string[] } {
  const items = { ...state.items };
  const pending = new Set(state.pending);
  const conflicts = state.conflicts.slice();
  const changed: string[] = [];
  const seen = new Set<string>();

  for (const plain of flatten(data, name)) {
    seen.add(plain.id);
    const current = items[plain.id];
    if (current && !current.deleted && canonical(current.fields) === canonical(plain.fields)) continue;
    const next: StoredItem = { fields: plain.fields, v: bump(current?.v ?? {}, state.deviceId), at: now };
    items[plain.id] = next;
    pending.add(plain.id);
    changed.push(plain.id);
    const at = conflicts.findIndex((c) => c.id === plain.id);
    if (at >= 0) conflicts[at] = { ...conflicts[at], local: toItem(plain.id, next) };
  }
  for (const [id, current] of Object.entries(items)) {
    if (seen.has(id) || current.deleted) continue;
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
  return state.pending.filter((id) => !held.has(id) && state.items[id]).map((id) => toItem(id, state.items[id]));
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
  return { ...state, items, pending: [...pending].sort(), conflicts: state.conflicts.filter((c) => c.id !== id) };
}

export function liveData(state: SyncState, currentWeek: string): { data: SpreadData; name: string | null } {
  const live = Object.entries(state.items)
    .filter(([, item]) => !item.deleted)
    .map(([id, item]) => ({ id, fields: item.fields }));
  return assemble(live, currentWeek);
}
