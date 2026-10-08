/**
 * Bridge to the native `SpreadCloud` plugin. Like native.ts it is inert on the web, and the
 * plugin is only looked up on demand, so the website never loads any of it.
 */
import { isNativeApp } from "./native.ts";
import type { NativeFacts } from "./cloud-status.ts";

export type RemoteBackup = {
  deviceId: string;
  name: string;
  createdAt: string;
  bytes: number;
  uploaded: boolean;
  downloaded: boolean;
  own: boolean;
  pin?: string;
  uploadError?: string;
};

export type WriteResult = { name: string; bytes: number; createdAt: string; verified: boolean; inICloudContainer: boolean };

export type SyncRowDTO = { syncId: string; itemId: string; fields: string; v: string; deleted: boolean; at: string };

export type SyncNativeStatus = {
  running: boolean;
  zoneDeleted: boolean;
  quotaExceeded: boolean;
  outboxCount: number;
  inboxCount: number;
  accountChanged?: "signOut" | "switchAccounts";
  accountKey?: string;
  lastError?: string;
};

type SpreadCloudPlugin = {
  status(): Promise<NativeFacts>;
  backupWrite(options: { text: string; pin?: string }): Promise<WriteResult>;
  backupList(options: { ownOnly?: boolean }): Promise<{ backups: RemoteBackup[] }>;
  backupRead(options: { deviceId: string; name: string }): Promise<{ text: string }>;
  syncStart(): Promise<void>;
  syncStop(): Promise<void>;
  syncQueue(options: { items: SyncRowDTO[] }): Promise<void>;
  syncInbox(): Promise<{ items: SyncRowDTO[] }>;
  syncOutbox(): Promise<{ names: string[] }>;
  syncAck(options: { names: string[] }): Promise<void>;
  syncDrop(options: { names: string[] }): Promise<void>;
  syncStatus(): Promise<SyncNativeStatus>;
  syncNow(): Promise<void>;
  addListener(event: "accountChanged" | "syncInbound" | "syncStatus", handler: () => void): Promise<{ remove(): Promise<void> }>;
};

let plugin: Promise<SpreadCloudPlugin> | null = null;

export function cloudPlugin(): Promise<SpreadCloudPlugin> {
  if (!isNativeApp()) return Promise.reject(new Error("iCloud is only available in the installed app."));
  plugin ??= import("@capacitor/core").then(({ registerPlugin }) => registerPlugin<SpreadCloudPlugin>("SpreadCloud"));
  return plugin;
}
