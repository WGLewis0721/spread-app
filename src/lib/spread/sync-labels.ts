/**
 * Words for a conflict, so the person can choose with the facts in front of them. Pure and tested:
 * the app never shows "task:ab12cd34" or raw JSON.
 */
import { whenText, type Tone } from "./cloud-status.ts";
import type { Conflict, Json } from "./merge.ts";

export type ConflictLine = { label: string; local: string; remote: string };
export type ConflictCard = { id: string; title: string; kind: Conflict["kind"]; lines: ConflictLine[]; canKeepBoth: boolean };

const FIELD_LABELS: Record<string, string> = {
  text: "Text",
  done: "Done",
  hours: "Hours",
  name: "Name",
  color: "Color",
  defaultHours: "Hours each week",
  day: "Day",
  hatId: "Spread",
  hat: "Spread",
  week: "Week",
  allocationId: "Scheduled block",
  content: "Notes and attachments",
};

function show(value: Json | undefined): string {
  if (value === undefined) return "(none)";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value === "" ? "(empty)" : value.length > 140 ? `${value.slice(0, 137)}…` : value;
  if (typeof value === "number") return String(value);
  if (value === null) return "(none)";
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  return "Changed";
}

function kindWord(id: string): string {
  if (id.startsWith("task:")) return "task";
  if (id.startsWith("hat:")) return "spread";
  if (id.startsWith("box:")) return "week’s hours";
  if (id.startsWith("alloc:")) return "scheduled block";
  if (id.startsWith("week:")) return "week";
  return "item";
}

export function describeConflict(conflict: Conflict, hatName: (hatId: string) => string | null = () => null): ConflictCard {
  const word = kindWord(conflict.id);
  const base = conflict.local.deleted ? conflict.remote : conflict.local;
  const titleText = typeof base.fields.text === "string" ? `“${show(base.fields.text)}”` : typeof base.fields.name === "string" ? `“${show(base.fields.name)}”` : "";
  const title = `${word[0].toUpperCase()}${word.slice(1)}${titleText ? ` ${titleText}` : ""}`;

  if (conflict.kind === "delete-edit") {
    const deletedHere = !!conflict.local.deleted;
    return {
      id: conflict.id,
      title,
      kind: conflict.kind,
      canKeepBoth: false,
      lines: [{ label: "What happened", local: deletedHere ? "Deleted on this device" : "Changed on this device", remote: deletedHere ? "Changed on your other device" : "Deleted on your other device" }],
    };
  }

  const lines: ConflictLine[] = conflict.fields.map((key) => {
    const label = key.endsWith("$ids") ? (key.startsWith("tasks") ? "Order of tasks" : "Order") : (FIELD_LABELS[key] ?? key);
    const l = conflict.local.fields[key];
    const r = conflict.remote.fields[key];
    const named = key === "hat" || key === "hatId";
    return {
      label,
      local: named && typeof l === "string" ? (hatName(l) ?? show(l)) : show(l),
      remote: named && typeof r === "string" ? (hatName(r) ?? show(r)) : show(r),
    };
  });
  return { id: conflict.id, title, kind: conflict.kind, canKeepBoth: conflict.id.startsWith("task:"), lines };
}

export type SyncDescribeInput = {
  linked: boolean;
  paused: null | "signOut" | "switchAccounts" | "zoneDeleted";
  started: boolean;
  busy: boolean;
  waitingToSend: number;
  conflicts: number;
  lastSyncAt: string | null;
  lastError: string | null;
  quotaExceeded: boolean;
  /** The planner looks emptied by accident and sync is waiting for a choice. */
  blocked?: boolean;
  now: Date;
};

export type SyncDescription = { title: string; detail: string; tone: Tone };

/** One honest sentence about sync for the open profile. It never says "synced" unless iCloud confirmed it. */
export function describeSync(input: SyncDescribeInput): SyncDescription {
  if (!input.linked) {
    return { title: "iCloud Sync is off", detail: "This profile stays on this device until you turn sync on. Nothing is shared or combined.", tone: "off" };
  }
  if (input.blocked) {
    return {
      title: "Sync is paused: this profile looks empty",
      detail: "Nothing has been deleted in iCloud or on your other devices. Put your last synced planner back, or confirm you meant to clear it.",
      tone: "problem",
    };
  }
  if (input.paused === "switchAccounts" || input.paused === "signOut") {
    return {
      title: "Sync is paused",
      detail:
        input.paused === "signOut"
          ? "You signed out of iCloud. Everything on this device is untouched. Sign back in, or turn sync off for this profile."
          : "The iCloud account on this device changed. Nothing was uploaded to the new account and nothing here was changed. Turn sync off for this profile to continue.",
      tone: "problem",
    };
  }
  if (input.paused === "zoneDeleted") {
    return {
      title: "The iCloud copy was removed",
      detail: "iCloud data for Spread was deleted. Your profile on this device is untouched and was not uploaded again. Turn sync off, then on again to upload it.",
      tone: "problem",
    };
  }
  const needs = input.conflicts > 0 ? ` ${input.conflicts} ${input.conflicts === 1 ? "change needs" : "changes need"} your choice.` : "";
  if (input.quotaExceeded) return { title: "iCloud storage is full", detail: `Your changes are safe on this device and will send when there is room.${needs}`, tone: "problem" };
  if (input.lastError) return { title: "Couldn’t sync", detail: `Your changes are safe on this device. Spread will try again.${needs}`, tone: "problem" };
  if (!input.started) return { title: "Starting sync…", detail: needs.trim(), tone: "wait" };
  if (input.busy || input.waitingToSend > 0) {
    const n = input.waitingToSend;
    return { title: "Syncing…", detail: `${n > 0 ? `${n} ${n === 1 ? "change" : "changes"} waiting to send.` : ""}${needs}`.trim(), tone: "wait" };
  }
  if (input.conflicts > 0) return { title: "Synced, with a choice to make", detail: needs.trim(), tone: "wait" };
  return { title: "Synced with iCloud", detail: input.lastSyncAt ? whenText(input.lastSyncAt, input.now) : "", tone: "ok" };
}
