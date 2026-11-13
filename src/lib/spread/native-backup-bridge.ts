import type { ParsedBackup } from "./backup.ts";

/**
 * The backup requests the modern native sheet can send through the planner's bridge. They reuse the same file code
 * as the web planner's More sheet: the `.spread` file is built, read and restored by the existing functions, and the
 * editable plan file is built and read by plan-file.ts.
 */
export type BackupRequest =
  | { type: "backupFile" }
  | { type: "restorePreview"; text: string }
  | { type: "restoreApply"; text: string; select: string[] };

export type BackupProfile = { id: string; name: string; readable: boolean; weeks: number; tasks: number; range: string };

export type BackupReply =
  | { ok: true; kind: "file"; name: string; text: string; planName: string; planText: string }
  | { ok: true; kind: "preview"; profiles: BackupProfile[]; weeks: number; tasks: number }
  | { ok: true; kind: "restored"; message: string }
  | { ok: false; error: "unreadable" | "week-file" | "no-selection" | "failed"; message: string };

/** What reading a file gives back: a backup to preview and restore, or the plain reasons it cannot be used. */
export type ReadResult = { ok: true; parsed: ParsedBackup } | { ok: false; message: string };

export type BackupDeps = {
  buildText: () => Promise<string>;
  buildPlan: () => { name: string; text: string };
  fileName: () => string;
  parse: (text: string) => Promise<ReadResult>;
  apply: (backup: ParsedBackup, select: string[]) => Promise<{ ok: boolean; message: string }>;
};

const TYPES = new Set(["backupFile", "restorePreview", "restoreApply"]);

/** The backup request in a bridge message, or null when the message is a planner command. */
export function backupRequestOf(value: unknown): BackupRequest | null {
  if (!value || typeof value !== "object") return null;
  const action = (value as { action?: unknown }).action;
  if (!action || typeof action !== "object") return null;
  const item = action as { type?: unknown; text?: unknown; select?: unknown };
  if (typeof item.type !== "string" || !TYPES.has(item.type)) return null;
  if (item.type === "backupFile") return { type: "backupFile" };
  if (typeof item.text !== "string") return null;
  if (item.type === "restorePreview") return { type: "restorePreview", text: item.text };
  const select = Array.isArray(item.select) && item.select.every((id) => typeof id === "string") ? item.select : [];
  return { type: "restoreApply", text: item.text, select };
}

export async function handleBackupRequest(request: BackupRequest, deps: BackupDeps): Promise<BackupReply> {
  if (request.type === "backupFile") {
    try {
      const plan = deps.buildPlan();
      return {
        ok: true,
        kind: "file",
        name: deps.fileName(),
        text: await deps.buildText(),
        planName: plan.name,
        planText: plan.text,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      return { ok: false, error: "failed", message: `The backup could not be made. Nothing was saved. ${reason}`.trim() };
    }
  }
  const read = await deps.parse(request.text);
  if (!read.ok) return { ok: false, error: "unreadable", message: read.message };
  const parsed = read.parsed;
  if (parsed.kind !== "full") {
    return {
      ok: false,
      error: "week-file",
      message: "This is a one-week backup from an older version. Modern Spread restores full backups.",
    };
  }
  if (request.type === "restorePreview") {
    const { profiles, weeks, tasks } = parsed.summary;
    return {
      ok: true,
      kind: "preview",
      profiles: profiles.map(({ id, name, readable, weeks: profileWeeks, tasks: profileTasks, range }) => ({
        id, name, readable, weeks: profileWeeks, tasks: profileTasks, range,
      })),
      weeks,
      tasks,
    };
  }
  if (request.select.length === 0) {
    return { ok: false, error: "no-selection", message: "Choose at least one profile to restore." };
  }
  const outcome = await deps.apply(parsed, request.select);
  return outcome.ok
    ? { ok: true, kind: "restored", message: outcome.message }
    : { ok: false, error: "failed", message: outcome.message };
}
