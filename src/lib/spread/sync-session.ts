/**
 * Runs iCloud Sync for one profile on top of the pure state functions. Everything outside the
 * session (the native engine, storage, the planner) is injected, so the whole loop is exercised in
 * tests with a simulated iCloud.
 *
 * One pass, always in this order, one at a time:
 *   0. read      the native inbox (the one slow step, done before anything is captured)
 *   1. capture   what the person changed since last time becomes new item versions
 *   2. inbound   items from iCloud are merged; conflicts are held, nothing is overwritten
 *   3. apply     if merging changed the planner, a snapshot is taken and the planner is updated
 *   4. outbound  changed items are handed to the native engine
 *   5. confirm   items the native engine has finished sending become the agreed base
 * Steps 1 to 3 run without yielding, which is what keeps a just-typed edit safe.
 */
import type { Choice } from "./merge.ts";
import type { SpreadData } from "./model.ts";
import { toItems } from "./sync-link.ts";
import {
  applyRemote,
  captureLocal,
  type CaptureBlock,
  confirmQueued,
  itemsToPush,
  liveData,
  markQueued,
  newSyncState,
  resolve,
  type SyncState,
} from "./sync-state.ts";

export type SyncRow = { syncId: string; itemId: string; fields: string; v: string; deleted: boolean; at: string };

export type SyncTransport = {
  start(): Promise<void>;
  stop(): Promise<void>;
  queue(rows: SyncRow[]): Promise<void>;
  inbox(): Promise<SyncRow[]>;
  ack(names: string[]): Promise<void>;
  /** Names (`<syncId>|<itemId>`) the native engine has not finished sending. */
  outbox(): Promise<string[]>;
  /** Stop trying to send these: the merge made them unnecessary. */
  drop(names: string[]): Promise<void>;
  /** Ask the native engine to send and fetch now. */
  syncNow(): Promise<void>;
};

export type SessionDeps = {
  syncId: string;
  deviceId: string;
  transport: SyncTransport;
  loadState(): SyncState | null;
  saveState(state: SyncState): void;
  /**
   * True only while the profile this session belongs to is the one on screen. The planner calls
   * (`current`, `apply`) always act on the open profile, so every use is guarded by this: a
   * session must never read or write another profile's planner.
   */
  isActive(): boolean;
  /** The planner as it is right now, with any debounced edit already written. */
  current(): { data: SpreadData; name: string };
  /** Put a merged planner into the app. Must not touch the view (which week is open). */
  apply(data: SpreadData, name: string | null): void;
  /** Called before merged changes replace anything on screen. */
  snapshot(label: string): void;
  newId(): string;
  now(): string;
};

export type SessionView = {
  running: boolean;
  busy: boolean;
  lastSyncAt: string | null;
  waitingToSend: number;
  conflicts: SyncState["conflicts"];
  lastError: string | null;
  /** The planner looks emptied by accident. Nothing is recorded or sent until the person chooses. */
  blocked: CaptureBlock | null;
};

export type SyncSession = {
  start(): Promise<void>;
  stop(): Promise<void>;
  /** Something changed in the planner. Safe to call on every write. */
  localChanged(): Promise<void>;
  /** The native engine says iCloud has new items or finished sending. */
  nativeEvent(): Promise<void>;
  /** Send and fetch now, then run a pass. */
  syncNow(): Promise<void>;
  resolveConflict(id: string, choice: Choice): Promise<void>;
  /** "restore" puts the last synced planner back; "keep-deletion" confirms the deletion was meant. */
  resolveBlocked(choice: "restore" | "keep-deletion"): Promise<void>;
  view(): SessionView;
  onChange(listener: (view: SessionView) => void): () => void;
};

export function createSyncSession(deps: SessionDeps): SyncSession {
  let state: SyncState = deps.loadState() ?? newSyncState(deps.syncId, deps.deviceId);
  let running = false;
  let busy = false;
  let lastError: string | null = null;
  let blocked: CaptureBlock | null = null;
  // Bumped by stop(). A pass that started before a stop notices and does nothing further to the planner.
  let generation = 0;
  let allowMassDelete = false;
  let chain: Promise<void> = Promise.resolve();
  const listeners = new Set<(view: SessionView) => void>();

  const view = (): SessionView => ({
    running,
    busy,
    lastSyncAt: state.lastSyncAt,
    waitingToSend: state.pending.filter((id) => !state.conflicts.some((c) => c.id === id)).length,
    conflicts: state.conflicts,
    lastError,
    blocked,
  });
  const publish = () => {
    for (const listener of listeners) listener(view());
  };
  const save = () => deps.saveState(state);

  async function pass(): Promise<void> {
    if (!running) return;
    const started = generation;
    busy = true;
    publish();
    try {
      // Read iCloud's side first. This is the only slow step, so nothing is captured until it is
      // done: the person may have kept typing while it ran, and capture, merge and apply below
      // run with no pause between them, so a fresh edit can never be overwritten.
      const rows = (await deps.transport.inbox()).filter((row) => row.syncId === deps.syncId);

      // The read above is slow. If the session was stopped, or another profile was opened meanwhile,
      // this pass must not touch the planner at all.
      if (generation !== started || !running || !deps.isActive()) return;

      // 1. capture
      const here = deps.current();
      const captured = captureLocal(state, here.data, here.name, deps.now(), { allowMassDelete });
      allowMassDelete = false;
      if (captured.blocked) {
        // Likely an empty or failed read, not a decision. Record nothing, send nothing, apply nothing.
        blocked = captured.blocked;
        return;
      }
      blocked = null;
      state = captured.state;

      // 2. inbound, 3. apply
      if (rows.length > 0) {
        const merged = applyRemote(state, toItems(rows), deps.now());
        if (merged.dataChanged) {
          deps.snapshot("pre-sync");
          const next = liveData(merged.state, here.data.currentWeek);
          // If the planner cannot be updated, sync state stays as it was. Advancing it anyway
          // would make the next pass read the unchanged planner as an edit undoing iCloud's change.
          deps.apply(next.data, next.name);
        }
        state = merged.state;
        await deps.transport.ack(rows.map((row) => `${row.syncId}|${row.itemId}`));
      }

      // A queued version that the merge replaced with iCloud's own newer one no longer needs sending.
      const superseded = Object.keys(state.queued).filter((id) => !state.pending.includes(id));
      if (superseded.length > 0) {
        await deps.transport.drop(superseded.map((id) => `${deps.syncId}|${id}`));
        const queued = { ...state.queued };
        for (const id of superseded) delete queued[id];
        state = { ...state, queued };
      }

      // 4. outbound
      const out = itemsToPush(state);
      if (out.length > 0) {
        await deps.transport.queue(
          out.map((item) => ({
            syncId: deps.syncId,
            itemId: item.id,
            fields: JSON.stringify(item.fields),
            v: JSON.stringify(item.v),
            deleted: item.deleted === true,
            at: item.at ?? deps.now(),
          })),
        );
        state = markQueued(state, out);
      }

      // 5. confirm
      const stillSending = new Set((await deps.transport.outbox()).filter((name) => name.startsWith(`${deps.syncId}|`)).map((name) => name.slice(deps.syncId.length + 1)));
      state = confirmQueued(state, stillSending, deps.now());
      lastError = null;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "sync failed";
    } finally {
      busy = false;
      save();
      publish();
    }
  }

  const queue = (work: () => Promise<void>) => {
    chain = chain.then(work, work);
    return chain;
  };

  return {
    async start() {
      if (running) return;
      running = true;
      await deps.transport.start();
      await queue(pass);
    },
    async stop() {
      running = false;
      generation += 1;
      await deps.transport.stop();
      publish();
    },
    localChanged: () => queue(pass),
    nativeEvent: () => queue(pass),
    async syncNow() {
      await queue(async () => {
        try {
          await deps.transport.syncNow();
        } catch (error) {
          lastError = error instanceof Error ? error.message : "sync failed";
        }
      });
      await queue(pass);
    },
    async resolveConflict(id, choice) {
      await queue(async () => {
        if (!running || !deps.isActive()) return;
        const here = deps.current();
        // Capture first so an edit made a moment ago is not lost when the resolution is applied.
        const captured = captureLocal(state, here.data, here.name, deps.now());
        if (captured.blocked) {
          // Do not settle a conflict on top of a planner that looks accidentally emptied.
          blocked = captured.blocked;
          publish();
          return;
        }
        state = captured.state;
        state = resolve(state, id, choice, deps.newId, deps.now());
        const merged = liveData(state, here.data.currentWeek);
        deps.snapshot("pre-resolve");
        deps.apply(merged.data, merged.name);
        save();
        publish();
      });
      await queue(pass);
    },
    async resolveBlocked(choice) {
      await queue(async () => {
        if (!blocked || !running || !deps.isActive()) return;
        if (choice === "restore") {
          // The state still holds the last synced items, because the blocked capture changed nothing.
          const here = deps.current();
          deps.snapshot("pre-restore-guard");
          const back = liveData(state, here.data.currentWeek);
          deps.apply(back.data, back.name);
          blocked = null;
        } else {
          allowMassDelete = true;
          blocked = null;
        }
        publish();
      });
      await queue(pass);
    },
    view,
    onChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
