/**
 * Durable snapshot of the planner for the installed iOS app.
 *
 * Spread stays local-first: web storage in the app's WebView is still the live store. iOS can
 * discard WebView storage (low disk space, a reset of the WebView's data), so the app also keeps
 * a copy of every `spread.*` key in a file under the app's own Library folder. At launch, if web
 * storage holds no planner data at all and a valid snapshot exists, the snapshot is put back.
 * Nothing is read from the snapshot while web storage has data, so the normal path is unchanged.
 *
 * Two files are written in turn, so an interrupted write can never take out the only good copy.
 */
import { STORE_KEY } from "./model.ts";
import { PROFILES_KEY } from "./profiles.ts";

export const MIRROR_VERSION = 1;

export type MirrorSlot = "a" | "b";

export type MirrorAdapter = {
  read(slot: MirrorSlot): Promise<string | null>;
  write(slot: MirrorSlot, text: string): Promise<void>;
};

export type KeyStore = {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type MirrorEnvelope = {
  kind: "spread-mirror";
  version: typeof MIRROR_VERSION;
  seq: number;
  savedAt: string;
  entries: Record<string, string>;
};

/** Every key the planner owns: `spread.*` plus the accent key, which predates the dotted names. */
export function isMirrorKey(key: string): boolean {
  return key === "spread-accent" || key.startsWith("spread.");
}

/** Keys that hold planner content (the roster or a profile's weeks), as opposed to settings. */
export function isPlannerKey(key: string): boolean {
  return key === PROFILES_KEY || key === "spread.people" || key === STORE_KEY || key.startsWith(`${STORE_KEY}.`);
}

export function hasPlannerData(storage: KeyStore): boolean {
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && isPlannerKey(key)) return true;
  }
  return false;
}

export function collectEntries(storage: KeyStore): Record<string, string> {
  const entries: Record<string, string> = {};
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !isMirrorKey(key)) continue;
    const value = storage.getItem(key);
    if (typeof value === "string") entries[key] = value;
  }
  return entries;
}

export function buildEnvelope(storage: KeyStore, seq: number, savedAt: Date): MirrorEnvelope {
  return { kind: "spread-mirror", version: MIRROR_VERSION, seq, savedAt: savedAt.toISOString(), entries: collectEntries(storage) };
}

export function parseEnvelope(text: string | null): MirrorEnvelope | null {
  if (!text) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const file = raw as Record<string, unknown>;
  if (file.kind !== "spread-mirror" || file.version !== MIRROR_VERSION) return null;
  if (typeof file.seq !== "number" || !Number.isFinite(file.seq) || file.seq < 0) return null;
  if (typeof file.savedAt !== "string") return null;
  const entries = file.entries;
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) return null;
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(entries as Record<string, unknown>)) {
    if (typeof value !== "string" || !isMirrorKey(key)) return null;
    clean[key] = value;
  }
  if (!Object.keys(clean).some(isPlannerKey)) return null;
  return { kind: "spread-mirror", version: MIRROR_VERSION, seq: file.seq, savedAt: file.savedAt, entries: clean };
}

export function newestEnvelope(texts: (string | null)[]): MirrorEnvelope | null {
  let best: MirrorEnvelope | null = null;
  for (const text of texts) {
    const candidate = parseEnvelope(text);
    if (!candidate) continue;
    if (!best || candidate.seq > best.seq || (candidate.seq === best.seq && candidate.savedAt > best.savedAt)) best = candidate;
  }
  return best;
}

export function restoreEntries(storage: KeyStore, entries: Record<string, string>): number {
  let failed = 0;
  for (const [key, value] of Object.entries(entries)) {
    if (!isMirrorKey(key)) continue;
    try {
      storage.setItem(key, value);
    } catch {
      failed += 1;
    }
  }
  return failed;
}

export type RestoreResult = { restored: boolean; seq: number };

/**
 * Put the snapshot back only when web storage has no planner data. `cancelled` lets a caller
 * that gave up waiting (see `prepareNativeStorage`) stop a late restore from landing after the
 * planner has already opened.
 */
export async function restoreIfEmpty(
  storage: KeyStore,
  adapter: MirrorAdapter,
  cancelled: () => boolean = () => false,
): Promise<RestoreResult> {
  const [a, b] = await Promise.all([adapter.read("a").catch(() => null), adapter.read("b").catch(() => null)]);
  const newest = newestEnvelope([a, b]);
  const seq = newest?.seq ?? 0;
  if (!newest || hasPlannerData(storage) || cancelled()) return { restored: false, seq };
  restoreEntries(storage, newest.entries);
  return { restored: hasPlannerData(storage), seq };
}

export type MirrorWriter = {
  /** Note a change. Writes after `delayMs`, and a burst of changes shares one write. */
  schedule(): void;
  /** Write now (the app is going to the background). Resolves when the write has settled. */
  flush(): Promise<void>;
};

export function createMirrorWriter(
  storage: KeyStore,
  adapter: MirrorAdapter,
  options: { seq: number; delayMs?: number; now?: () => Date },
): MirrorWriter {
  const delayMs = options.delayMs ?? 1000;
  const now = options.now ?? (() => new Date());
  let seq = options.seq;
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let chain: Promise<void> = Promise.resolve();

  function run(): Promise<void> {
    chain = chain.then(async () => {
      if (!dirty) return;
      dirty = false;
      // Never replace a good snapshot with one that holds no planner data.
      if (!hasPlannerData(storage)) return;
      seq += 1;
      const text = JSON.stringify(buildEnvelope(storage, seq, now()));
      try {
        await adapter.write(seq % 2 === 0 ? "a" : "b", text);
      } catch {
        dirty = true;
      }
    });
    return chain;
  }

  return {
    schedule() {
      dirty = true;
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        void run();
      }, delayMs);
    },
    flush() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      return run();
    },
  };
}

// --- Device glue: the only part that touches Capacitor. -------------------------------------

let writer: MirrorWriter | null = null;
let preparing: Promise<{ restored: boolean }> | null = null;

const changeListeners = new Set<() => void>();

/** Hear about every planner write (the iCloud backup uses this). Returns the unsubscribe. */
export function onStorageChanged(listener: () => void) {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

/** Called whenever planner data is written to web storage. A no-op until the mirror is running. */
export function notifyStorageChanged() {
  writer?.schedule();
  for (const listener of changeListeners) {
    try {
      listener();
    } catch {
      /* a listener must never break a save */
    }
  }
}

/** Called when the app is going to the background. */
export function flushMirror() {
  if (writer) void writer.flush();
}

async function filesystemAdapter(): Promise<MirrorAdapter> {
  const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
  const path = (slot: MirrorSlot) => `spread-mirror-${slot}.json`;
  return {
    async read(slot) {
      try {
        const result = await Filesystem.readFile({ path: path(slot), directory: Directory.Library, encoding: Encoding.UTF8 });
        return typeof result.data === "string" ? result.data : null;
      } catch {
        return null;
      }
    },
    async write(slot, text) {
      await Filesystem.writeFile({ path: path(slot), data: text, directory: Directory.Library, encoding: Encoding.UTF8 });
    },
  };
}

/**
 * Keep a labelled copy of the planner that is never overwritten by the rolling snapshot, e.g.
 * just before a migration. Best effort: a failure here never blocks the caller. `entries` must
 * already be copied, because the write happens later.
 */
export function pinSnapshot(label: string, entries: Record<string, string>): void {
  const safe = label.replace(/[^a-z0-9-]/gi, "-");
  void (async () => {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const text = JSON.stringify({ kind: "spread-pinned", version: 1, label, savedAt: new Date().toISOString(), entries });
    await Filesystem.writeFile({ path: `spread-pinned-${safe}.json`, data: text, directory: Directory.Library, encoding: Encoding.UTF8 });
  })().catch(() => undefined);
}

function timeout<T>(work: Promise<T>, ms: number): Promise<T | "timeout"> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve("timeout"), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve("timeout");
      },
    );
  });
}

/**
 * Run once at launch, before the planner reads web storage. Restores a snapshot if web storage
 * was emptied, then starts keeping the snapshot current. Never blocks launch for long and never
 * throws: if anything goes wrong the planner simply opens from web storage as it always did.
 */
export function prepareNativeStorage(storage?: KeyStore, waitMs = 3000): Promise<{ restored: boolean }> {
  preparing ??= (async () => {
    try {
      const target = storage ?? window.localStorage;
      const adapter = await filesystemAdapter();
      let gaveUp = false;
      const result = await timeout(restoreIfEmpty(target, adapter, () => gaveUp), waitMs);
      if (result === "timeout") {
        gaveUp = true;
        return { restored: false };
      }
      writer = createMirrorWriter(target, adapter, { seq: result.seq });
      writer.schedule();
      return { restored: result.restored };
    } catch {
      return { restored: false };
    }
  })();
  return preparing;
}
