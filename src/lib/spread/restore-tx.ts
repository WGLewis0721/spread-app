/**
 * All-or-nothing restore. localStorage has no transactions, so this builds one:
 *
 *   1. write a journal that records, for every key about to change, what it held before
 *   2. write the profile bodies
 *   3. write the roster (the commit point: profiles exist only once the roster lists them)
 *   4. delete the journal
 *
 * Any failure rolls every key back to its journalled value. If the app is killed part-way, the
 * journal survives and `recoverRestore` finishes the job on the next launch: forward if the roster
 * already lists every restored profile, backward otherwise.
 */

export type TxStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export const RESTORE_JOURNAL_KEY = "spread.restore.journal";

type Journal = {
  version: 1;
  /** Previous value of every key touched, or null if the key did not exist. */
  before: Record<string, string | null>;
  rosterKey: string;
  /** The roster text that marks the restore as committed. */
  rosterAfter: string;
};

export type RestoreCommit = { ok: true } | { ok: false; rolledBack: boolean };

function set(storage: TxStorage, key: string, value: string | null): boolean {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function rollBack(storage: TxStorage, journal: Journal): boolean {
  let clean = true;
  for (const [key, value] of Object.entries(journal.before)) {
    // A key that already holds its old value needs no write (and may be exactly the one that failed).
    if (storage.getItem(key) === value) continue;
    if (!set(storage, key, value)) clean = false;
  }
  if (clean) set(storage, RESTORE_JOURNAL_KEY, null);
  return clean;
}

export function commitRestore(
  storage: TxStorage,
  plan: { writes: { key: string; value: string }[]; rosterKey: string; rosterValue: string },
): RestoreCommit {
  const before: Record<string, string | null> = {};
  for (const key of [...plan.writes.map((write) => write.key), plan.rosterKey]) if (!(key in before)) before[key] = storage.getItem(key);
  const journal: Journal = { version: 1, before, rosterKey: plan.rosterKey, rosterAfter: plan.rosterValue };
  // Nothing has changed yet. If the journal cannot be written, nothing is attempted.
  if (!set(storage, RESTORE_JOURNAL_KEY, JSON.stringify(journal))) {
    set(storage, RESTORE_JOURNAL_KEY, null);
    return { ok: false, rolledBack: true };
  }
  for (const write of plan.writes) {
    if (!set(storage, write.key, write.value)) return { ok: false, rolledBack: rollBack(storage, journal) };
  }
  if (!set(storage, plan.rosterKey, plan.rosterValue)) return { ok: false, rolledBack: rollBack(storage, journal) };
  // The restore is committed. A leftover journal is harmless: recovery sees the roster and drops it.
  set(storage, RESTORE_JOURNAL_KEY, null);
  return { ok: true };
}

/** Run at launch, before the planner is read. */
export function recoverRestore(storage: TxStorage): "none" | "committed" | "rolled-back" | "failed" {
  const raw = storage.getItem(RESTORE_JOURNAL_KEY);
  if (raw === null) return "none";
  let journal: Journal;
  try {
    journal = JSON.parse(raw) as Journal;
    if (journal.version !== 1 || typeof journal.before !== "object" || !journal.before || typeof journal.rosterAfter !== "string") throw new Error("shape");
  } catch {
    // An unreadable journal cannot be rolled back safely, and leaving it would block nothing: drop it.
    set(storage, RESTORE_JOURNAL_KEY, null);
    return "failed";
  }
  const listed = storage.getItem(journal.rosterKey) === journal.rosterAfter;
  if (listed) {
    set(storage, RESTORE_JOURNAL_KEY, null);
    return "committed";
  }
  return rollBack(storage, journal) ? "rolled-back" : "failed";
}
