import { pinBackup } from "./cloud-backup.ts";
import { isNativeApp } from "./native.ts";
import { collectEntries, pinSnapshot } from "./native-mirror.ts";

/**
 * Everything that is stored, with the open profile taken from memory rather than from storage: if
 * the last debounced write did not reach storage, the copy must still hold what is on screen.
 */
async function liveEntries(): Promise<Record<string, string>> {
  const { flushSpread, useSpread } = await import("./store.ts");
  flushSpread();
  const entries = collectEntries(localStorage);
  const state = useSpread.getState();
  const open = state.profiles.find((profile) => profile.id === state.activeId);
  if (open) entries[open.store] = JSON.stringify(state.data);
  return entries;
}

/**
 * A copy of everything, written and read back, before something that replaces data. In the
 * installed app the caller must not go ahead when this resolves false. The iCloud copy is extra
 * and only made when the person has agreed to iCloud backup; the local copy is the one that counts.
 * On the web there is no device storage to copy to, and restores work as they always did.
 */
export async function localSafetyCopy(label: string): Promise<boolean> {
  if (!isNativeApp()) return true;
  return pinSnapshot(label, await liveEntries());
}

export async function ensureSafetyCopy(label: string): Promise<boolean> {
  if (!(await localSafetyCopy(label))) return false;
  if (isNativeApp()) void pinBackup(label);
  return true;
}
