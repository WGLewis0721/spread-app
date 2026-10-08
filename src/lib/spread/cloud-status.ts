/**
 * Turns facts about iCloud into the sentence a person reads. Pure, so every state the screen can
 * show is covered by a test. The native side reports facts only; the wording lives here.
 */
export type NativeFacts = {
  deviceId: string;
  /** "available" | "noAccount" | "restricted" | "couldNotDetermine" | "temporarilyUnavailable" | "unknown" */
  cloudKit: string;
  driveAvailable: boolean;
  backupCount: number;
  lastBackupAt?: string;
  lastBackupUploaded?: boolean;
  lastUploadedAt?: string;
  lastUploadError?: string;
};

export type BackupStatusKind =
  | "off"
  | "checking"
  | "needs-account"
  | "restricted"
  | "drive-off"
  | "saving"
  | "none-yet"
  | "local-only"
  | "synced"
  | "icloud-full"
  | "device-full"
  | "error";

export type Tone = "ok" | "wait" | "problem" | "off";

export type BackupStatus = { kind: BackupStatusKind; tone: Tone; title: string; detail: string };

export type BackupInputs = {
  enabled: boolean;
  native: NativeFacts | null;
  busy: boolean;
  /** The last attempt's failure, if the next attempt has not succeeded yet. */
  lastError: "noSpace" | "failed" | null;
  now: Date;
};

const FULL = /quota|storage|space|full/i;

export function whenText(iso: string | undefined, now: Date): string {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const minutes = Math.round((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const time = then.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const sameDay = then.toDateString() === now.toDateString();
  if (sameDay) return `today at ${time}`;
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (then.toDateString() === yesterday.toDateString()) return `yesterday at ${time}`;
  return `${then.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${time}`;
}

export function deriveBackupStatus(input: BackupInputs): BackupStatus {
  const { native, now } = input;
  if (!input.enabled) {
    return { kind: "off", tone: "off", title: "iCloud Backup is off", detail: "Turn it on to back up Spread automatically. Your planner stays on this device either way." };
  }
  if (input.busy) return { kind: "saving", tone: "wait", title: "Backing up…", detail: "Spread is saving a copy." };
  if (!native) return { kind: "checking", tone: "wait", title: "Checking iCloud…", detail: "" };

  if (native.cloudKit === "noAccount") {
    return {
      kind: "needs-account",
      tone: "problem",
      title: "Sign in to iCloud to back up",
      detail: "Open Settings and sign in to iCloud. Spread keeps working and saving on this device.",
    };
  }
  if (native.cloudKit === "restricted") {
    return { kind: "restricted", tone: "problem", title: "iCloud is restricted on this device", detail: "A setting or profile on this device stops apps from using iCloud." };
  }
  if (!native.driveAvailable) {
    return {
      kind: "drive-off",
      tone: "problem",
      title: "iCloud Drive is off for Spread",
      detail: "In Settings, open your name, then iCloud, and make sure iCloud Drive and Spread are on.",
    };
  }
  if (input.lastError === "noSpace") {
    return { kind: "device-full", tone: "problem", title: "This device is out of space", detail: "Free some space so Spread can save a backup." };
  }
  if (native.lastUploadError && FULL.test(native.lastUploadError)) {
    return { kind: "icloud-full", tone: "problem", title: "iCloud storage is full", detail: "Free iCloud space or change your plan. Your backup is still saved on this device." };
  }
  if (input.lastError === "failed") {
    return { kind: "error", tone: "problem", title: "Couldn’t back up", detail: "Spread will try again soon. Your planner is not affected." };
  }
  if (!native.lastBackupAt) {
    return { kind: "none-yet", tone: "wait", title: "No backup yet", detail: "Spread makes the first one after your next change." };
  }
  if (native.lastBackupUploaded) {
    return { kind: "synced", tone: "ok", title: "Backed up to iCloud", detail: whenText(native.lastBackupAt, now) };
  }
  return {
    kind: "local-only",
    tone: "wait",
    title: "Saved here, waiting for iCloud",
    detail: `${whenText(native.lastBackupAt, now)}. iCloud uploads when this device is online.`,
  };
}
