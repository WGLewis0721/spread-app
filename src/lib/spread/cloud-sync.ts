/**
 * iCloud Sync for the installed app: ties the pure session (sync-session.ts) to the native
 * plugin, the planner store and the screens. Off unless `CLOUD_FLAGS.sync` is on, and even then
 * nothing syncs until a person turns it on for a profile.
 *
 * Only the profile that is open syncs. Switching profiles stops one session and starts the next
 * (if that profile is linked), so each profile's data is only ever touched while it is on screen.
 */
import { create } from "zustand";
import { CLOUD_FLAGS } from "./cloud-flags.ts";
import { cloudPlugin, type SyncNativeStatus } from "./cloud.ts";
import { pinBackup } from "./cloud-backup.ts";
import { ensureSafetyCopy, localSafetyCopy } from "./safety.ts";
import type { Choice } from "./merge.ts";
import { weekKey } from "./model.ts";
import { flushSpread, useSpread } from "./store.ts";
import { onStorageChanged } from "./native-mirror.ts";
import { isNativeApp } from "./native.ts";
import { isPristine, planLink, stillSafeToAdopt, summarizeCloud, toItems, type CloudProfileSummary, type LinkChoice } from "./sync-link.ts";
import { createSyncSession, type SessionView, type SyncSession, type SyncTransport } from "./sync-session.ts";
import { adoptRemote, dataFromItems, newSyncState, type SyncState } from "./sync-state.ts";
import { PROFILE_LIMIT } from "./profiles.ts";
import { createSerial } from "./serial.ts";

export type SyncPhase = "off" | "starting" | "syncing" | "synced" | "paused" | "problem";

type SyncStore = {
  /** The open profile is linked to iCloud. */
  linked: boolean;
  view: SessionView | null;
  native: SyncNativeStatus | null;
  /** Why sync is paused, if it is. Nothing is lost while paused. */
  paused: null | "signOut" | "switchAccounts" | "zoneDeleted";
  /** iCloud profiles found while linking. Null until looked up. */
  cloud: CloudProfileSummary[] | null;
  linking: boolean;
  now: number;
};

export const useCloudSync = create<SyncStore>(() => ({ linked: false, view: null, native: null, paused: null, cloud: null, linking: false, now: Date.now() }));

export function syncAvailable(): boolean {
  return CLOUD_FLAGS.sync && isNativeApp();
}

// --- State files (kept out of localStorage so a synced planner is not stored twice there) -------

const stateFile = (syncId: string) => `spread-sync-${syncId.replace(/[^A-Za-z0-9-]/g, "_")}.json`;

async function readStateFile(syncId: string): Promise<SyncState | null> {
  try {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const result = await Filesystem.readFile({ path: stateFile(syncId), directory: Directory.Library, encoding: Encoding.UTF8 });
    if (typeof result.data !== "string") return null;
    const parsed = JSON.parse(result.data) as SyncState;
    return parsed && parsed.version === 1 && parsed.syncId === syncId ? parsed : null;
  } catch {
    return null;
  }
}

let writeChain: Promise<void> = Promise.resolve();
function writeStateFile(state: SyncState): Promise<boolean> {
  const text = JSON.stringify(state);
  const done = writeChain.then(async () => {
    try {
      const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
      await Filesystem.writeFile({ path: stateFile(state.syncId), data: text, directory: Directory.Library, encoding: Encoding.UTF8 });
      return true;
    } catch {
      return false; // reported by the session; the next pass writes it again
    }
  });
  writeChain = done.then(() => undefined);
  return done;
}

async function deleteStateFile(syncId: string) {
  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    await Filesystem.deleteFile({ path: stateFile(syncId), directory: Directory.Library });
  } catch {
    /* already gone */
  }
}

const accountKeyKey = (syncId: string) => `spread.sync.account.${syncId}`;

// --- Transport -----------------------------------------------------------------------------------

async function transport(): Promise<SyncTransport> {
  const plugin = await cloudPlugin();
  return {
    start: () => plugin.syncStart(),
    stop: () => plugin.syncStop(),
    queue: (rows) => plugin.syncQueue({ items: rows }),
    inbox: async () => (await plugin.syncInbox()).items,
    ack: (rows) => plugin.syncAck({ items: rows }),
    drop: (names) => plugin.syncDrop({ names }),
    outbox: async () => (await plugin.syncOutbox()).names,
    syncNow: () => plugin.syncNow(),
  };
}

// --- Manager -------------------------------------------------------------------------------------

let session: SyncSession | null = null;
let activeSyncId: string | null = null;
let stopStorage: (() => void) | null = null;
let stopView: (() => void) | null = null;
let debounce: ReturnType<typeof setTimeout> | null = null;
let listening = false;
let lastBackupPin = 0;

async function refreshNative() {
  try {
    const plugin = await cloudPlugin();
    const native = await plugin.syncStatus();
    let paused: SyncStore["paused"] = null;
    if (native.zoneDeleted) paused = "zoneDeleted";
    else if (native.accountChanged) paused = native.accountChanged;
    else if (activeSyncId && native.accountKey) {
      const saved = localStorage.getItem(accountKeyKey(activeSyncId));
      if (saved && saved !== native.accountKey) paused = "switchAccounts";
    }
    useCloudSync.setState({ native, paused, now: Date.now() });
    if (paused && session) await session.stop();
  } catch {
    useCloudSync.setState({ native: null, now: Date.now() });
  }
}

async function stopSession() {
  stopStorage?.();
  stopStorage = null;
  stopView?.();
  stopView = null;
  if (debounce) clearTimeout(debounce);
  debounce = null;
  const old = session;
  session = null;
  activeSyncId = null;
  useCloudSync.setState({ linked: false, view: null, paused: null });
  if (old) await old.stop().catch(() => undefined);
}

async function startSessionFor(profileId: string, syncId: string, name: string) {
  const state = (await readStateFile(syncId)) ?? newSyncState(syncId, await deviceId());
  let saved: SyncState | null = state;
  const created = createSyncSession({
    syncId,
    deviceId: state.deviceId,
    transport: await transport(),
    loadState: () => saved,
    saveState: (next) => {
      saved = next;
      return writeStateFile(next);
    },
    isActive: () => useSpread.getState().activeId === profileId,
    current: () => {
      flushSpread();
      const s = useSpread.getState();
      const profile = s.profiles.find((p) => p.id === s.activeId);
      return { data: s.data, name: profile?.name ?? name };
    },
    apply: (data, nextName) => {
      // applySynced writes into whichever profile is open, so refuse if it is not this one.
      if (useSpread.getState().activeId !== profileId) throw new Error("another profile is open");
      useSpread.getState().applySynced(data, nextName);
    },
    // Resolves false when the copy was not written and verified; the session then changes nothing.
    snapshot: async (label) => {
      if (!(await localSafetyCopy(label))) return false;
      if (Date.now() - lastBackupPin > 6 * 3_600_000) {
        lastBackupPin = Date.now();
        void pinBackup(label);
      }
      return true;
    },
    newId: () => Math.random().toString(36).slice(2, 10),
    now: () => new Date().toISOString(),
  });
  session = created;
  activeSyncId = syncId;
  stopView = created.onChange((view) => useCloudSync.setState({ view, now: Date.now() }));
  stopStorage = onStorageChanged(() => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => void created.localChanged(), 1500);
  });
  useCloudSync.setState({ linked: true, view: created.view(), paused: null });
  await refreshNative();
  if (useCloudSync.getState().paused) return;
  // Profile switched while this was starting: leave it to the next alignment.
  if (useSpread.getState().activeId !== profileId) {
    await stopSession();
    return;
  }
  const native = useCloudSync.getState().native;
  if (native?.accountKey && !localStorage.getItem(accountKeyKey(syncId))) localStorage.setItem(accountKeyKey(syncId), native.accountKey);
  await created.start();
  // Only now may native send: the engine is up, the account matches and nothing is paused.
  try {
    await (await cloudPlugin()).syncResume();
  } catch {
    await refreshNative();
    return;
  }
  void profileId;
}

async function deviceId(): Promise<string> {
  const plugin = await cloudPlugin();
  return (await plugin.status()).deviceId;
}

/** Call once after the planner has opened, and the manager keeps itself in step with the open profile. */
export async function startSyncManager(): Promise<void> {
  if (!syncAvailable() || listening) return;
  listening = true;
  const serially = createSerial();
  const alignOnce = async () => {
    const s = useSpread.getState();
    const profile = s.profiles.find((p) => p.id === s.activeId);
    const wanted = profile?.syncId ?? null;
    if (wanted === activeSyncId) return;
    await stopSession();
    if (profile && wanted) await startSessionFor(profile.id, wanted, profile.name);
  };
  const align = () => serially(alignOnce);
  useSpread.subscribe(() => void align().catch(() => undefined));
  const plugin = await cloudPlugin();
  const wake = () => {
    void refreshNative();
    void session?.nativeEvent();
  };
  void plugin.addListener("syncInbound", wake);
  void plugin.addListener("syncStatus", () => void refreshNative());
  void plugin.addListener("accountChanged", () => void refreshNative());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void session?.syncNow();
    else void session?.localChanged();
  });
  await align();
}

// --- What the screens do ----------------------------------------------------------------------

export function syncPhase(state: SyncStore): SyncPhase {
  if (!state.linked) return "off";
  if (state.paused) return "paused";
  if (!state.view) return "starting";
  if (state.view.lastError || state.native?.quotaExceeded) return "problem";
  if (state.view.busy || state.view.waitingToSend > 0) return "syncing";
  return state.view.lastSyncAt ? "synced" : "starting";
}

/** Look at what iCloud already holds, so linking can show real choices. */
export async function loadCloudProfiles(): Promise<CloudProfileSummary[]> {
  const plugin = await cloudPlugin();
  useCloudSync.setState({ linking: true });
  try {
    // Read-only: nothing is created or sent in iCloud while the person is only looking.
    await plugin.syncBrowse();
    const { items } = await plugin.syncInbox();
    const parsed = items.map((row) => ({ syncId: row.syncId, itemId: row.itemId, deleted: row.deleted, at: row.at, fields: safeParse(row.fields) }));
    const cloud = summarizeCloud(parsed);
    useCloudSync.setState({ cloud, linking: false });
    return cloud;
  } catch (error) {
    useCloudSync.setState({ cloud: null, linking: false });
    throw error;
  }
}

function safeParse(text: string): Record<string, unknown> {
  try {
    const value = JSON.parse(text) as unknown;
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function linkChoices(): Promise<LinkChoice[]> {
  const everything = useCloudSync.getState().cloud ?? (await loadCloudProfiles());
  const s = useSpread.getState();
  // An iCloud profile this device already has linked is not offered again.
  const linkedHere = new Set(s.profiles.map((profile) => profile.syncId).filter(Boolean));
  const cloud = everything.filter((summary) => !linkedHere.has(summary.syncId));
  return planLink({ data: s.data, profileCount: s.profiles.length }, cloud);
}

function newSyncId(): string {
  return crypto.randomUUID();
}

async function takeSafetyCopies(label: string): Promise<boolean> {
  return ensureSafetyCopy(label);
}

/** Upload the open profile as a new iCloud profile. */
export async function linkUpload(): Promise<boolean> {
  const s = useSpread.getState();
  if (!s.activeId) return false;
  if (!(await takeSafetyCopies("pre-sync-link"))) return false;
  const syncId = newSyncId();
  return s.setSyncId(s.activeId, syncId);
}

/** The open profile is empty: it becomes the iCloud profile in place. */
export async function linkAdopt(cloud: CloudProfileSummary): Promise<boolean> {
  const s = useSpread.getState();
  if (!s.activeId || !isPristine(s.data)) return false;
  if (!(await takeSafetyCopies("pre-sync-link"))) return false;
  const plugin = await cloudPlugin();
  const { items } = await plugin.syncInbox();
  const mine = items.filter((row) => row.syncId === cloud.syncId);
  const remote = toItems(mine);
  if (remote.length === 0) return false;
  // Start from iCloud's version of everything, so an empty profile can never disagree with it.
  const state = adoptRemote(cloud.syncId, await deviceId(), remote, new Date().toISOString());
  writeStateFile(state);
  await writeChain;
  // The steps above took a while. Look again, in the same breath as the replacement, so nothing
  // typed in the meantime is overwritten.
  const latest = useSpread.getState();
  if (!stillSafeToAdopt({ profileId: s.activeId }, { profileId: latest.activeId, data: latest.data })) {
    await deleteStateFile(cloud.syncId);
    return false;
  }
  const { data, name } = dataFromItems(remote, latest.data.currentWeek);
  latest.applySynced(data, name);
  // Link first; only a link that reached storage lets the inbox rows go.
  if (!latest.setSyncId(latest.activeId as string, cloud.syncId)) return false;
  await plugin.syncAck({ items: mine });
  return true;
}

/** Add the iCloud profile to this device as a new profile and leave the open one alone. */
export async function linkAddCopy(cloud: CloudProfileSummary): Promise<string | null> {
  if (useSpread.getState().profiles.length >= PROFILE_LIMIT) return null;
  if (!(await takeSafetyCopies("pre-sync-link"))) return null;
  const plugin = await cloudPlugin();
  const { items } = await plugin.syncInbox();
  const mine = items.filter((row) => row.syncId === cloud.syncId);
  const remote = toItems(mine);
  if (remote.length === 0) return null;
  const { data, name } = dataFromItems(remote, weekKey());
  const id = useSpread.getState().addSyncedProfile(name ?? cloud.name ?? "Me", cloud.syncId, data);
  if (!id) return null;
  writeStateFile(adoptRemote(cloud.syncId, await deviceId(), remote, new Date().toISOString()));
  await writeChain;
  await plugin.syncAck({ items: mine });
  return id;
}

/** The person confirmed: lift the pause and upload this profile to the iCloud that is signed in now. */
export async function uploadAgain(): Promise<void> {
  const plugin = await cloudPlugin();
  const id = activeSyncId;
  await plugin.syncClearPause();
  if (id) localStorage.removeItem(accountKeyKey(id));
  const s = useSpread.getState();
  const profile = s.profiles.find((p) => p.id === s.activeId);
  await stopSession();
  if (profile?.syncId) await startSessionFor(profile.id, profile.syncId, profile.name);
}

export async function unlink(): Promise<void> {
  const s = useSpread.getState();
  if (!s.activeId) return;
  const id = activeSyncId;
  // If the roster cannot be written the profile stays linked and its sync state is kept.
  if (!s.setSyncId(s.activeId, null)) return;
  if (id) {
    localStorage.removeItem(accountKeyKey(id));
    await deleteStateFile(id);
  }
}

export async function syncNowAction(): Promise<void> {
  await session?.syncNow();
  await refreshNative();
}

export async function resolveBlockedSync(choice: "restore" | "keep-deletion"): Promise<void> {
  await session?.resolveBlocked(choice);
}

export async function restoreDiscardedChange(index: number): Promise<void> {
  await session?.restoreDiscarded(index);
}

export async function resolveSyncConflict(id: string, choice: Choice): Promise<void> {
  await session?.resolveConflict(id, choice);
}
