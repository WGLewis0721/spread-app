import type { ParsedBackup } from "./backup.ts";
import { ensureSafetyCopy } from "./safety.ts";
import { useSpread } from "./store.ts";

/**
 * Apply a confirmed restore. Shared by the web planner's restore sheet and the modern native sheet, so both
 * tell the person the same thing and both take the same safety copy first.
 */
export async function applyRestore(backup: ParsedBackup, select?: string[]): Promise<{ ok: boolean; message: string }> {
  if (!(await ensureSafetyCopy("pre-restore"))) {
    return { ok: false, message: "Couldn’t save a safety copy first, so nothing was changed. Free some space and try again." };
  }
  const state = useSpread.getState();
  if (backup.kind === "full") {
    const result = await state.restoreAsNew(backup.payload, select);
    if (!result.ok) {
      return {
        ok: false,
        message:
          result.reason === "no-room"
            ? `There is room for ${result.free} more. Choose fewer profiles to restore.`
            : result.reason === "rollback-failed"
              ? "Couldn’t finish adding the profiles, and couldn’t fully undo it. Quit and reopen Spread, which will finish putting things back."
              : "Couldn’t add the profiles. Nothing was changed.",
      };
    }
    const skipped = result.skipped.length > 0 ? ` ${result.skipped.length === 1 ? `“${result.skipped[0]}” was damaged in the backup and was not restored.` : `${result.skipped.length} profiles were damaged in the backup and were not restored.`}` : "";
    const base = result.added === 1 ? "Profile restored." : `${result.added} profiles restored.`;
    return { ok: true, message: `${base}${skipped}` };
  }
  if (!state.replaceData(backup.data)) {
    return { ok: false, message: "This profile syncs with iCloud, so a restore would change your other devices too. Turn sync off for it first, or restore into a new profile." };
  }
  return { ok: true, message: "Backup restored." };
}
