import { parseAnyBackup } from "./backup.ts";
import type { Inspected } from "./native-backup-bridge.ts";
import { PLAN_LIMITS, buildPlanText, buildSchedule, parsePlanDocument, planParsedBackup, revisionOf } from "./plan-file.ts";
import { emptyCounts, mergeSchedule, planTargetIssues, type MergeOptions, type MergePreview } from "./plan-merge.ts";
import { ensureSafetyCopy } from "./safety.ts";
import { useSpread } from "./store.ts";

const PLAN_MARK = /"kind"\s*:\s*"spread-plan"/;

/**
 * The plan file for the open profile. It names the profile and carries a version code for the schedule, so a later
 * merge can tell the person when the profile has changed since the file was made.
 */
export async function buildPlanFile(): Promise<{ name: string; text: string }> {
  const state = useSpread.getState();
  if (!state.activeId) throw new Error("No profile is open.");
  const open = state.profiles.find((profile) => profile.id === state.activeId);
  const text = buildPlanText(state.data, open?.name ?? "Spread plan", {
    profileId: state.activeId,
    basedOn: await revisionOf(state.data),
    exportedAt: new Date().toISOString(),
  });
  return { name: `Spread-plan-${state.data.currentWeek}.json`, text };
}

/**
 * Reads a file the person chose and says what it would do. A `.spread` backup, or a plan that creates a profile, is
 * previewed for restore as before. A plan that merges is previewed as a merge. Nothing is written by reading.
 */
export async function inspectBackupFile(text: string, options: MergeOptions): Promise<Inspected> {
  const backup = await parseAnyBackup(text);
  if (backup) return { kind: "backup", parsed: backup };
  const read = parsePlanDocument(text);
  if (!read.ok) {
    return PLAN_MARK.test(text)
      ? { kind: "failed", message: "This plan file has problems, so nothing was changed.", issues: read.issues }
      : { kind: "failed", message: "That file isn’t a Spread backup or plan, or it is damaged." };
  }
  const doc = read.doc;
  if (doc.action === "create") {
    return { kind: "backup", parsed: planParsedBackup(buildSchedule(doc), doc.name) };
  }
  const state = useSpread.getState();
  const open = state.profiles.find((profile) => profile.id === state.activeId);
  const revision = await revisionOf(state.data);
  const target = planTargetIssues(doc, state.activeId, Boolean(open?.syncId));
  const merged = target.length > 0 ? null : mergeSchedule(state.data, doc, options);
  const issues = [...target, ...(merged && !merged.ok ? merged.issues : [])].slice(0, PLAN_LIMITS.issues);
  const ready = merged?.ok === true;
  const preview: MergePreview = {
    profileName: open?.name ?? "this profile",
    revision,
    basedOn: doc.basedOn,
    stale: doc.basedOn !== null && doc.basedOn !== revision,
    counts: ready ? merged.summary.counts : emptyCounts(),
    areas: ready ? merged.summary.areas : [],
    areasOmitted: ready ? merged.summary.areasOmitted : 0,
    issues,
  };
  return { kind: "merge", merge: preview };
}

/**
 * Merges a checked plan into the open profile. It refuses when the profile changed since the preview, so the person
 * always merges what they saw. A safety copy is saved first, so the merge can be undone from that copy.
 */
export async function applyPlanMerge(
  text: string,
  options: MergeOptions,
  expectedRevision: string,
): Promise<{ ok: boolean; message: string; issues?: string[] }> {
  const read = parsePlanDocument(text);
  if (!read.ok) return { ok: false, message: "This plan file has problems, so nothing was changed.", issues: read.issues };
  const doc = read.doc;
  if (doc.action !== "merge") return refused("This plan makes a new profile. Use Restore to add it.");
  const before = useSpread.getState();
  const open = before.profiles.find((profile) => profile.id === before.activeId);
  const target = planTargetIssues(doc, before.activeId, Boolean(open?.syncId));
  if (target.length > 0) return { ok: false, message: "This plan can’t be merged, so nothing was changed.", issues: target };
  if ((await revisionOf(before.data)) !== expectedRevision) {
    return refused("The profile changed after this preview, so nothing was changed. Preview the plan again.");
  }
  const merged = mergeSchedule(before.data, doc, options);
  if (!merged.ok) return { ok: false, message: "This plan can’t be merged, so nothing was changed.", issues: merged.issues };
  if (!(await ensureSafetyCopy("pre-merge"))) {
    return refused("Couldn’t save a safety copy first, so nothing was changed. Free some space and try again.");
  }
  if (!useSpread.getState().replaceData(merged.data)) {
    return refused("This profile syncs with iCloud, so a merge would change your other devices too. Turn sync off for it first.");
  }
  const weeks = merged.summary.counts.weeksChanged;
  const name = open?.name ?? "this profile";
  return {
    ok: true,
    message: `Plan merged into ${name}. ${weeks} ${weeks === 1 ? "week" : "weeks"} changed. A safety copy was saved first.`,
  };
}

function refused(message: string): { ok: false; message: string } {
  return { ok: false, message };
}
