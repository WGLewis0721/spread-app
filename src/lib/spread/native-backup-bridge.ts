import type { ParsedBackup } from "./backup.ts";
import { NO_REMOVALS, type MergeOptions, type MergePreview } from "./plan-merge.ts";

/**
 * The backup requests the modern native sheet can send through the planner's bridge. They reuse the same file code
 * as the web planner's More sheet: the `.spread` file is built, read and restored by the existing functions, and the
 * plan file is built, checked and merged by plan-file.ts, plan-merge.ts and backup-intake.ts.
 */
export type BackupRequest =
  | { type: "backupFile" }
  | { type: "restorePreview"; text: string; options: MergeOptions }
  | { type: "restoreApply"; text: string; select: string[] }
  | { type: "mergeApply"; text: string; options: MergeOptions; revision: string };

export type BackupProfile = { id: string; name: string; readable: boolean; weeks: number; tasks: number; range: string };

export type BackupReply =
  | { ok: true; kind: "file"; name: string; text: string; planName: string; planText: string }
  | { ok: true; kind: "preview"; profiles: BackupProfile[]; weeks: number; tasks: number }
  | { ok: true; kind: "merge"; merge: MergePreview }
  | { ok: true; kind: "restored"; message: string }
  | {
      ok: false;
      error: "unreadable" | "week-file" | "no-selection" | "failed" | "merge-refused";
      message: string;
      issues?: string[];
    };

/** What reading a file gives back: a backup or a profile-creating plan to preview and restore, a merge to preview, or the reasons it cannot be used. */
export type Inspected =
  | { kind: "backup"; parsed: ParsedBackup }
  | { kind: "merge"; merge: MergePreview }
  | { kind: "failed"; message: string; issues?: string[] };

export type BackupDeps = {
  buildText: () => Promise<string>;
  buildPlan: () => Promise<{ name: string; text: string }>;
  fileName: () => string;
  inspect: (text: string, options: MergeOptions) => Promise<Inspected>;
  apply: (backup: ParsedBackup, select: string[]) => Promise<{ ok: boolean; message: string }>;
  mergeApply: (text: string, options: MergeOptions, revision: string) => Promise<{ ok: boolean; message: string; issues?: string[] }>;
};

const TYPES = new Set(["backupFile", "restorePreview", "restoreApply", "mergeApply"]);

function optionsOf(item: { removeAreas?: unknown; removeItems?: unknown }): MergeOptions {
  return { removeAreas: item.removeAreas === true, removeItems: item.removeItems === true };
}

/** The backup request in a bridge message, or null when the message is a planner command. */
export function backupRequestOf(value: unknown): BackupRequest | null {
  if (!value || typeof value !== "object") return null;
  const action = (value as { action?: unknown }).action;
  if (!action || typeof action !== "object") return null;
  const item = action as {
    type?: unknown; text?: unknown; select?: unknown; removeAreas?: unknown; removeItems?: unknown; revision?: unknown;
  };
  if (typeof item.type !== "string" || !TYPES.has(item.type)) return null;
  if (item.type === "backupFile") return { type: "backupFile" };
  if (typeof item.text !== "string") return null;
  if (item.type === "restorePreview") return { type: "restorePreview", text: item.text, options: optionsOf(item) };
  if (item.type === "mergeApply") {
    return {
      type: "mergeApply",
      text: item.text,
      options: optionsOf(item),
      // A missing revision never matches, so the apply refuses rather than merging blind.
      revision: typeof item.revision === "string" ? item.revision : "",
    };
  }
  const select = Array.isArray(item.select) && item.select.every((id) => typeof id === "string") ? item.select : [];
  return { type: "restoreApply", text: item.text, select };
}

export async function handleBackupRequest(request: BackupRequest, deps: BackupDeps): Promise<BackupReply> {
  if (request.type === "backupFile") {
    try {
      const plan = await deps.buildPlan();
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
  if (request.type === "mergeApply") {
    const outcome = await deps.mergeApply(request.text, request.options, request.revision);
    return outcome.ok
      ? { ok: true, kind: "restored", message: outcome.message }
      : { ok: false, error: "merge-refused", message: outcome.message, ...(outcome.issues ? { issues: outcome.issues } : {}) };
  }
  const inspected = await deps.inspect(request.text, request.type === "restorePreview" ? request.options : NO_REMOVALS);
  if (inspected.kind === "failed") {
    return { ok: false, error: "unreadable", message: inspected.message, ...(inspected.issues ? { issues: inspected.issues } : {}) };
  }
  if (inspected.kind === "merge") {
    if (request.type === "restorePreview") return { ok: true, kind: "merge", merge: inspected.merge };
    return { ok: false, error: "failed", message: "This plan changes the open profile. Use Merge to apply it." };
  }
  const parsed = inspected.parsed;
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
