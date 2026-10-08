import { normalizeData, type SpreadData } from "../lib/spread/model.ts";
import { createSyncSession, type SessionDeps, type SyncRow, type SyncTransport } from "../lib/spread/sync-session.ts";
import type { SyncState } from "../lib/spread/sync-state.ts";

// A simulated iCloud plus the native engine in front of it, per device.
export class Cloud {
  rows = new Map<string, { row: SyncRow; tag: number; seq: number }>();
  seq = 0;
}

export class FakeNative implements SyncTransport {
  outboxRows = new Map<string, SyncRow>();
  // Names the engine will try to send. A rejected write leaves the outbox but is not retried.
  sending = new Set<string>();
  inboxRows = new Map<string, SyncRow>();
  tags = new Map<string, number>();
  cursor = 0;
  started = false;
  online = true;
  cloud: Cloud;
  constructor(cloud: Cloud) {
    this.cloud = cloud;
  }
  async start() {
    this.started = true;
  }
  async stop() {
    this.started = false;
  }
  async queue(rows: SyncRow[]) {
    for (const row of rows) {
      this.outboxRows.set(`${row.syncId}|${row.itemId}`, row);
      this.sending.add(`${row.syncId}|${row.itemId}`);
    }
    this.flush();
  }
  async inbox() {
    this.flush();
    return [...this.inboxRows.values()];
  }
  /** Compare-and-remove, like the native inbox: a newer version staged since the read stays. */
  async ack(rows: SyncRow[]) {
    for (const row of rows) {
      const name = `${row.syncId}|${row.itemId}`;
      const now = this.inboxRows.get(name);
      if (now && now.v === row.v && now.fields === row.fields && now.deleted === row.deleted && now.at === row.at) this.inboxRows.delete(name);
    }
  }
  async outbox() {
    return [...this.outboxRows.keys()];
  }
  async drop(names: string[]) {
    for (const n of names) {
      this.outboxRows.delete(n);
      this.sending.delete(n);
    }
  }
  async syncNow() {
    this.flush();
  }
  // Like CKSyncEngine: send what is queued, refuse writes made on a stale version (and hand back the newer one), fetch what is new.
  flush() {
    if (!this.online || !this.started) return;
    for (const [name, row] of [...this.outboxRows]) {
      if (!this.sending.has(name)) continue;
      const server = this.cloud.rows.get(name);
      if (server && server.tag !== this.tags.get(name)) {
        this.inboxRows.set(name, server.row);
        this.tags.set(name, server.tag);
        this.sending.delete(name);
        continue;
      }
      this.cloud.seq += 1;
      const tag = (server?.tag ?? 0) + 1;
      this.cloud.rows.set(name, { row, tag, seq: this.cloud.seq });
      this.tags.set(name, tag);
      this.outboxRows.delete(name);
      this.sending.delete(name);
    }
    for (const [name, entry] of this.cloud.rows) {
      if (entry.seq > this.cursor && !this.outboxRows.has(name)) {
        if (this.tags.get(name) !== entry.tag) {
          this.inboxRows.set(name, entry.row);
          this.tags.set(name, entry.tag);
        }
      }
    }
    this.cursor = this.cloud.seq;
  }
}

export let clock = 0;
export type Harness = ReturnType<typeof device>;
export function device(cloud: Cloud, name: string, data: SpreadData, syncId = "S1") {
  const native = new FakeNative(cloud);
  const h = {
    /** What reached durable storage. A restart loads exactly this. */
    durable: null as SyncState | null,
    failSave: false,
    /** Number of upcoming apply() calls that throw, like a planner whose write is refused. */
    failApply: 0,
    /** Number of upcoming snapshots that fail (throw), like a safety copy that cannot be written. */
    failSnapshot: 0,
  };
  const env = { data, name: "Me", snapshots: [] as string[] };
  const deps: SessionDeps = {
    syncId,
    deviceId: name,
    transport: native,
    loadState: () => h.durable,
    saveState: (s) => {
      if (h.failSave) return false;
      h.durable = s;
    },
    isActive: () => true,
    current: () => ({ data: env.data, name: env.name }),
    apply: (next, nm) => {
      if (h.failApply > 0) {
        h.failApply -= 1;
        throw new Error("planner write refused");
      }
      env.data = normalizeData({ ...next, currentWeek: env.data.currentWeek });
      if (nm) env.name = nm;
    },
    snapshot: (label) => {
      if (h.failSnapshot > 0) {
        h.failSnapshot -= 1;
        throw new Error("snapshot not written");
      }
      env.snapshots.push(label);
    },
    newId: () => `n${clock++}`,
    now: () => `2026-10-08T12:${String(clock++ % 60).padStart(2, "0")}:00Z`,
  };
  const session = createSyncSession({ ...deps, apply: (...args) => deps.apply(...args) });
  return {
    env,
    native,
    session,
    deps,
    h,
    get state() {
      return h.durable;
    },
    /** The app was killed and reopened: same device storage and native queues, a new session. */
    restart() {
      return createSyncSession({ ...deps, apply: (...args) => deps.apply(...args) });
    },
  };
}

export const taskIds = (d: Harness) => Object.values(d.env.data.weeks).flatMap((w) => w.boxes.flatMap((b) => b.tasks.map((t) => t.id))).sort();
export const addTask = (d: Harness, id: string, text: string) => d.env.data.weeks[d.env.data.currentWeek].boxes[0].tasks.push({ id, text, done: false });
export const settle = async (...ds: Harness[]) => {
  for (let i = 0; i < 6; i += 1) for (const d of ds) await d.session.syncNow();
};
