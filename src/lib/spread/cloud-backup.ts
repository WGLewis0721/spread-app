/**
 * Automatic iCloud backup for the installed app. Wires the pure pieces together:
 * `createBackupRunner` (when) + the native plugin (where) + `deriveBackupStatus` (what to say).
 * Nothing here runs unless `CLOUD_FLAGS.backup` is on inside the installed app.
 */
import { create } from "zustand";
import { collectFullPayload, fullBackupText } from "./backup.ts";
import { CLOUD_FLAGS } from "./cloud-flags.ts";
import { cloudPlugin, type RemoteBackup } from "./cloud.ts";
import { deriveBackupStatus, type BackupStatus, type NativeFacts } from "./cloud-status.ts";
import { createBackupRunner, type BackupRunner, type RunnerState } from "./backup-runner.ts";
import { isNativeApp } from "./native.ts";
import { onStorageChanged } from "./native-mirror.ts";

export const BACKUP_PREF_KEY = "spread.cloud.backup";
/** Set once the person has been told what is uploaded and chose. Nothing is uploaded before it. */
export const BACKUP_ACK_KEY = "spread.cloud.backup.ack";

type CloudStore = {
  enabled: boolean;
  /** The person has seen the disclosure and answered it. */
  acknowledged: boolean;
  native: NativeFacts | null;
  runner: RunnerState;
  now: number;
};

export const useCloudBackup = create<CloudStore>(() => ({
  enabled: false,
  acknowledged: false,
  native: null,
  runner: { busy: false, lastError: null, lastSuccessAt: null },
  now: Date.now(),
}));

export function backupAvailable(): boolean {
  return CLOUD_FLAGS.backup && isNativeApp();
}

/**
 * Backup is on unless the person turned it off. If the preference cannot be read it is treated
 * as off: an unreadable opt-out must never become an opt-in.
 */
function readEnabled(): boolean {
  try {
    return localStorage.getItem(BACKUP_PREF_KEY) !== "off";
  } catch {
    return false;
  }
}

function readAcknowledged(): boolean {
  try {
    return localStorage.getItem(BACKUP_ACK_KEY) === "yes";
  } catch {
    return false;
  }
}

/** The one gate for writing anything to iCloud: the feature, the person's choice and their acknowledgement. */
export function canWriteICloud(): boolean {
  const state = useCloudBackup.getState();
  return backupAvailable() && state.enabled && state.acknowledged;
}

/** The person answered the first-run notice. "Turn on" keeps backup on; "Not now" turns it off. */
export function acknowledgeBackup(turnOn: boolean): void {
  try {
    localStorage.setItem(BACKUP_ACK_KEY, "yes");
  } catch {
    /* asked again next launch */
  }
  useCloudBackup.setState({ acknowledged: true });
  setBackupEnabled(turnOn);
}

export function currentBackupStatus(state: CloudStore): BackupStatus {
  return deriveBackupStatus({
    enabled: state.enabled,
    native: state.native,
    busy: state.runner.busy,
    lastError: state.runner.lastError,
    now: new Date(state.now),
  });
}

let runner: BackupRunner | null = null;
let started = false;
let deviceId: string | null = null;
let stopStorage: (() => void) | null = null;

export async function refreshBackupStatus(): Promise<void> {
  try {
    const plugin = await cloudPlugin();
    const facts = await plugin.status();
    deviceId = facts.deviceId;
    useCloudBackup.setState({ native: facts, now: Date.now() });
  } catch {
    useCloudBackup.setState({ native: null, now: Date.now() });
  }
}

async function buildBackup() {
  const { flushSpread } = await import("./store.ts");
  flushSpread();
  const payload = collectFullPayload(localStorage, new Date(), deviceId);
  const hasData = payload.roster.length > 0 && Object.keys(payload.stores).length > 0;
  // The signature ignores the timestamp, so an unchanged planner is never backed up twice.
  const signature = JSON.stringify({ ...payload, createdAt: "" });
  return { text: await fullBackupText(payload), signature, hasData };
}

/** Start (once) after the planner has opened. Safe to call repeatedly. */
export async function startCloudBackup(): Promise<void> {
  if (started || !backupAvailable()) return;
  started = true;
  const acknowledged = readAcknowledged();
  // Until the person has answered the first-run notice, backup shows as off and uploads nothing.
  useCloudBackup.setState({ enabled: readEnabled() && acknowledged, acknowledged });
  await refreshBackupStatus();
  const plugin = await cloudPlugin();
  runner = createBackupRunner({
    transport: { write: (text, pin) => plugin.backupWrite({ text, pin }) },
    build: buildBackup,
    onState: (state) => {
      useCloudBackup.setState({ runner: state, now: Date.now() });
      if (!state.busy) void refreshBackupStatus();
    },
  });
  if (canWriteICloud()) attach();
  void plugin.addListener("accountChanged", () => void refreshBackupStatus());
  window.addEventListener("pagehide", () => void runner?.flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void runner?.flush();
    else void refreshBackupStatus();
  });
}

function attach() {
  if (!runner || stopStorage) return;
  stopStorage = onStorageChanged(() => runner?.changed());
  const last = useCloudBackup.getState().native?.lastBackupAt;
  runner.launch(last ? Date.parse(last) : null);
}

export function setBackupEnabled(on: boolean) {
  try {
    if (on) localStorage.removeItem(BACKUP_PREF_KEY);
    else localStorage.setItem(BACKUP_PREF_KEY, "off");
  } catch {
    /* the choice still applies for this run */
  }
  // Turning it on from Settings is itself the person's consent.
  if (on) {
    try {
      localStorage.setItem(BACKUP_ACK_KEY, "yes");
    } catch {
      /* the choice still applies for this run */
    }
  }
  useCloudBackup.setState({ enabled: on, ...(on ? { acknowledged: true } : {}) });
  if (on) {
    attach();
  } else {
    stopStorage?.();
    stopStorage = null;
  }
}

/**
 * A labelled copy before something risky (a restore). The planner is read before the first
 * `await`, so the copy is the state as it was when this was called, even if the caller changes
 * storage straight afterwards. Resolves false if the copy could not be made.
 */
export async function pinBackup(label: string): Promise<boolean> {
  if (!canWriteICloud() || !started) return false;
  try {
    const payload = collectFullPayload(localStorage, new Date(), deviceId);
    if (payload.roster.length === 0) return false;
    const textPromise = fullBackupText(payload);
    const plugin = await cloudPlugin();
    const result = await plugin.backupWrite({ text: await textPromise, pin: label });
    return result.verified;
  } catch {
    return false;
  }
}

export async function backupNow(): Promise<void> {
  if (!canWriteICloud()) return;
  runner?.changed();
  await runner?.flush();
}

export async function listBackups(): Promise<RemoteBackup[]> {
  const plugin = await cloudPlugin();
  const { backups } = await plugin.backupList({ ownOnly: false });
  return backups;
}

export async function readBackupText(deviceIdValue: string, name: string): Promise<string> {
  const plugin = await cloudPlugin();
  const { text } = await plugin.backupRead({ deviceId: deviceIdValue, name });
  return text;
}
