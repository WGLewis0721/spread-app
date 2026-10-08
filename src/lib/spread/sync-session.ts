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
import { isDamagedRow, toItems } from "./sync-link.ts";
import {
  applyRemote,
  captureLocal,
  type Discarded,
  restoreDiscarded,
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
  /** Remove exactly these rows from the native inbox. A newer version staged since the read must stay. */
  ack(rows: SyncRow[]): Promise<void>;
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
  /** May reject (or resolve false) when the state could not be written; the session then reports it. */
  saveState(state: SyncState): void | boolean | Promise<void | boolean>;
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
  /** Records from iCloud that were unreadable or incomplete. They are kept aside, never merged. */
  damaged: number;
  discarded: Discarded[];
  /** Choices the person made that could not be applied yet. The conflict is still there; the choice is kept and retried. */
  failedChoices: { id: string; choice: Choice }[];
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
  /** Put back a version set aside when a conflict was settled. */
  restoreDiscarded(index: number): Promise<void>;
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
  let damaged = 0;
  const failedChoices = new Map<string, Choice>();
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
    damaged,
    discarded: state.discarded ?? [],
    failedChoices: [...failedChoices].map(([id, choice]) => ({ id, choice })),
  });
  const publish = () => {
    for (const listener of listeners) listener(view());
  };
  const save = () => {
    const report = () => {
      lastError = "state-not-saved";
      publish();
    };
    try {
      const done = deps.saveState(state);
      if (done === false) report();
      else if (done instanceof Promise) void done.then((ok) => (ok === false ? report() : undefined), report);
    } catch {
      report();
    }
  };

  /** Resolves true only once the state is durably saved. Nothing is acknowledged or sent before that. */
  async function persist(next: SyncState): Promise<boolean> {
    try {
      const done = await deps.saveState(next);
      return done !== false;
    } catch {
      return false;
    }
  }

  /**
   * Settle one conflict as a unit: build the result off to the side, change the planner, save the
   * state. The live state is replaced only when the planner took the change, so a refused write
   * leaves the conflict (and the person's choice, kept for a retry) exactly as they were.
   */
  async function settleConflict(id: string, choice: Choice): Promise<boolean> {
    if (!running || !deps.isActive()) return false;
    const here = deps.current();
    // Capture first so an edit made a moment ago is not lost when the resolution is applied.
    const captured = captureLocal(state, here.data, here.name, deps.now());
    if (captured.blocked) {
      // Do not settle a conflict on top of a planner that looks accidentally emptied.
      blocked = captured.blocked;
      publish();
      return false;
    }
    const candidate = resolve(captured.state, id, choice, deps.newId, deps.now());
    const merged = liveData(candidate, here.data.currentWeek);
    try {
      deps.snapshot("pre-resolve");
      deps.apply(merged.data, merged.name);
    } catch (error) {
      failedChoices.set(id, choice);
      lastError = error instanceof Error ? error.message : "couldn’t apply that choice";
      publish();
      return false;
    }
    state = candidate;
    failedChoices.delete(id);
    if (!(await persist(state))) lastError = "state-not-saved";
    publish();
    return true;
  }

  async function pass(): Promise<void> {
    if (!running) return;
    const started = generation;
    busy = true;
    publish();
    try {
      for (const [id, choice] of [...failedChoices]) await settleConflict(id, choice);
      // Read iCloud's side first. This is the only slow step, so nothing is captured until it is
      // done: the person may have kept typing while it ran, and capture, merge and apply below
      // run with no pause between them, so a fresh edit can never be overwritten.
      const incoming = (await deps.transport.inbox()).filter((row) => row.syncId === deps.syncId);
      const rows = incoming.filter((row) => !isDamagedRow(row));
      damaged = incoming.length - rows.length;

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
        // iCloud's version may be the only copy of the other side of a conflict. It is acknowledged
        // only after the state that records it is safely on disk; until then it stays in the inbox.
        if (!(await persist(state))) throw new Error("state-not-saved");
        await deps.transport.ack(rows);
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
      let applied = false;
      await queue(async () => {
        applied = await settleConflict(id, choice);
      });
      // A refused choice is kept and retried on the next pass; it is not retried in the same breath.
      if (applied) await queue(pass);
    },
    async restoreDiscarded(index) {
      await queue(async () => {
        if (!running || !deps.isActive()) return;
        const here = deps.current();
        const captured = captureLocal(state, here.data, here.name, deps.now());
        if (captured.blocked) {
          blocked = captured.blocked;
          publish();
          return;
        }
        const candidate = restoreDiscarded(captured.state, index, deps.now());
        const merged = liveData(candidate, here.data.currentWeek);
        try {
          deps.snapshot("pre-restore-discarded");
          deps.apply(merged.data, merged.name);
        } catch (error) {
          lastError = error instanceof Error ? error.message : "couldn’t put that back";
          publish();
          return;
        }
        state = candidate;
        if (!(await persist(state))) lastError = "state-not-saved";
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
