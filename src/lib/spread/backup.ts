import { formatWeek, normalizeData, type SpreadData } from "./model.ts";
import { formatDocDay } from "./week-document.ts";

export type BackupSummary = {
  spreads: string[];
  weeks: number;
  tasks: number;
  range: string;
};

export type SpreadBackup = { data: SpreadData; summary: BackupSummary };

export function backupFile(data: SpreadData) {
  return {
    kind: "spread-backup",
    version: 1,
    savedAt: new Date().toISOString(),
    data: { hats: data.hats, weeks: data.weeks, currentWeek: data.currentWeek },
  };
}

export function parseBackup(text: string): SpreadBackup | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const payload = envelopeData(raw) ?? raw;
  if (!isPayload(payload)) return null;
  const data = normalizeData(payload);
  return { data, summary: summarize(data) };
}

export function summarize(data: SpreadData): BackupSummary {
  const keys = Object.keys(data.weeks).sort();
  const tasks = Object.values(data.weeks).reduce(
    (sum, week) => sum + week.boxes.reduce((count, box) => count + box.tasks.length, 0),
    0,
  );
  const range = keys.length === 0 ? "No weeks" : keys.length === 1 ? formatWeek(keys[0]) : `${formatDocDay(keys[0])} – ${formatDocDay(keys[keys.length - 1])}`;
  return { spreads: data.hats.map((hat) => hat.name), weeks: keys.length, tasks, range };
}

function envelopeData(value: unknown): unknown {
  if (!value || typeof value !== "object") return null;
  const file = value as { kind?: unknown; version?: unknown; data?: unknown };
  if (file.kind !== "spread-backup" || file.version !== 1) return null;
  return file.data ?? null;
}

function isPayload(value: unknown): value is SpreadData {
  if (!value || typeof value !== "object") return false;
  const record = value as { hats?: unknown; weeks?: unknown };
  if (!Array.isArray(record.hats) || !record.weeks || typeof record.weeks !== "object" || Array.isArray(record.weeks)) {
    return false;
  }
  return record.hats.every((hat) => {
    if (!hat || typeof hat !== "object") return false;
    const item = hat as { id?: unknown; name?: unknown; defaultHours?: unknown };
    return typeof item.id === "string" && typeof item.name === "string" && typeof item.defaultHours === "number";
  });
}
