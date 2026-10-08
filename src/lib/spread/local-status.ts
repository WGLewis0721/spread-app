import { whenText } from "./cloud-status.ts";

/**
 * What Spread can truthfully say about saving. Spread writes to this device first, always, and
 * works with no network at all. This reports only that: whether the last save landed here, and
 * when. It says nothing about iCloud; that has its own row and only appears when it is switched on.
 */
export type SaveFacts = { lastSavedAt: number | null; failed: "full" | "unavailable" | "newer" | null };
export type LocalStatus = { tone: "ok" | "problem"; title: string; detail: string };

export function deriveLocalStatus(facts: SaveFacts, now: Date): LocalStatus {
  if (facts.failed === "full") {
    return { tone: "problem", title: "Couldn’t save on this device", detail: "This device is out of storage. Free some space; changes since the last save may not be kept." };
  }
  if (facts.failed === "unavailable") {
    return { tone: "problem", title: "Couldn’t save on this device", detail: "Storage is blocked here (private browsing, perhaps). Changes won’t be kept after you close Spread." };
  }
  if (facts.failed === "newer") {
    return { tone: "problem", title: "Saving is paused", detail: "This planner was saved by a newer version of Spread. Update the app to keep editing." };
  }
  const when = facts.lastSavedAt === null ? "" : whenText(new Date(facts.lastSavedAt).toISOString(), now);
  return {
    tone: "ok",
    title: "Saved on this device",
    detail: when ? `Last saved ${when}. Works with no connection.` : "Works with no connection.",
  };
}

type Listener = () => void;
let facts: SaveFacts = { lastSavedAt: null, failed: null };
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((listener) => listener());

export function noteSaved(at: number = Date.now()) {
  facts = { lastSavedAt: at, failed: null };
  emit();
}

export function noteSaveFailed(failed: NonNullable<SaveFacts["failed"]>) {
  facts = { ...facts, failed };
  emit();
}

export function getSaveFacts(): SaveFacts {
  return facts;
}

export function subscribeSaveFacts(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
