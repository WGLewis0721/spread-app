import { toast } from "sonner";

/** How long the Undo action stays on screen. Long enough to read, short enough not to nag. */
export const UNDO_MS = 6000;

/**
 * The one way Spread offers Undo. Built on the themed sonner toast, so it already uses the planner
 * tokens, sits under the status bar on the phone and is announced politely to screen readers.
 *
 * `onUndo` returns false when the change can no longer be reversed safely (something else changed
 * since). The person is then told so instead of being left wondering.
 */
let showing: string | number | null = null;

export function showUndoToast(message: string, onUndo: () => boolean) {
  // Only the latest change can be undone (an older one would find its week changed), so an older
  // Undo is taken away rather than left to fail.
  if (showing !== null) toast.dismiss(showing);
  const id = toast(message, {
    duration: UNDO_MS,
    action: {
      label: "Undo",
      onClick: () => {
        const done = onUndo();
        toast.dismiss(id);
        if (!done) toast("Can’t undo that now. Something changed since.");
      },
    },
  });
  showing = id;
  return id;
}
