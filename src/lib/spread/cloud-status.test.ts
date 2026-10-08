import assert from "node:assert/strict";
import test from "node:test";
import { deriveBackupStatus, whenText, type BackupInputs, type NativeFacts } from "./cloud-status.ts";

const now = new Date("2026-10-08T15:00:00");
const facts = (over: Partial<NativeFacts> = {}): NativeFacts => ({
  deviceId: "d",
  cloudKit: "available",
  driveAvailable: true,
  backupCount: 1,
  lastBackupAt: new Date("2026-10-08T14:58:00").toISOString(),
  lastBackupUploaded: true,
  ...over,
});
const status = (over: Partial<BackupInputs> = {}) =>
  deriveBackupStatus({ enabled: true, native: facts(), busy: false, lastError: null, now, ...over });

test("off wins over everything, and says the planner is unaffected", () => {
  const s = status({ enabled: false, native: facts({ cloudKit: "noAccount" }) });
  assert.equal(s.kind, "off");
  assert.match(s.detail, /stays on this device/);
});

test("each failure to reach iCloud names its own fix and says the planner still works", () => {
  assert.equal(status({ native: facts({ cloudKit: "noAccount" }) }).kind, "needs-account");
  assert.equal(status({ native: facts({ cloudKit: "restricted" }) }).kind, "restricted");
  assert.equal(status({ native: facts({ driveAvailable: false }) }).kind, "drive-off");
  assert.match(status({ native: facts({ cloudKit: "noAccount" }) }).detail, /keeps working/);
});

test("full iCloud, full device and a generic failure are told apart", () => {
  assert.equal(status({ native: facts({ lastUploadError: "The iCloud storage quota was exceeded" }) }).kind, "icloud-full");
  assert.equal(status({ lastError: "noSpace" }).kind, "device-full");
  assert.equal(status({ lastError: "failed" }).kind, "error");
});

test("a verified upload is the only thing that says Backed up to iCloud", () => {
  assert.equal(status().kind, "synced");
  assert.equal(status({ native: facts({ lastBackupUploaded: false }) }).kind, "local-only");
  assert.equal(status({ native: facts({ lastBackupAt: undefined, lastBackupUploaded: undefined, backupCount: 0 }) }).kind, "none-yet");
});

test("busy and not-yet-known states never claim success", () => {
  assert.equal(status({ busy: true }).kind, "saving");
  assert.equal(status({ native: null }).kind, "checking");
  assert.notEqual(status({ native: null }).tone, "ok");
});

test("only the synced state has the ok tone", () => {
  const kinds = [
    status({ enabled: false }),
    status({ busy: true }),
    status({ native: null }),
    status({ native: facts({ cloudKit: "noAccount" }) }),
    status({ native: facts({ lastBackupUploaded: false }) }),
    status({ lastError: "failed" }),
  ];
  assert.ok(kinds.every((s) => s.tone !== "ok"));
  assert.equal(status().tone, "ok");
});

test("times read naturally", () => {
  assert.equal(whenText(new Date("2026-10-08T14:59:40").toISOString(), now), "just now");
  assert.equal(whenText(new Date("2026-10-08T14:30:00").toISOString(), now), "30 min ago");
  assert.match(whenText(new Date("2026-10-08T08:05:00").toISOString(), now), /^today at 8:05/);
  assert.match(whenText(new Date("2026-10-07T21:00:00").toISOString(), now), /^yesterday at 9:00/);
  assert.match(whenText(new Date("2026-10-01T09:00:00").toISOString(), now), /^Oct 1 at 9:00/);
  assert.equal(whenText(undefined, now), "");
  assert.equal(whenText("nonsense", now), "");
});
