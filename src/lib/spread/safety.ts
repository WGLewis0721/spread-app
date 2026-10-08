import { pinBackup } from "./cloud-backup.ts";
import { isNativeApp } from "./native.ts";
import { collectEntries, pinSnapshot } from "./native-mirror.ts";

/**
 * A copy of everything, written and read back, before something that replaces data. In the
 * installed app the caller must not go ahead when this resolves false. The iCloud copy is extra
 * and only made when the person has agreed to iCloud backup; the local copy is the one that counts.
 * On the web there is no device storage to copy to, and restores work as they always did.
 */
export async function ensureSafetyCopy(label: string): Promise<boolean> {
  if (!isNativeApp()) return true;
  const { flushSpread } = await import("./store.ts");
  flushSpread();
  const saved = await pinSnapshot(label, collectEntries(localStorage));
  if (!saved) return false;
  void pinBackup(label);
  return true;
}
