import { isNativeApp } from "@/lib/spread/native";
import { isoDate, weekKey, type SpreadData } from "@/lib/spread/model";

/**
 * What the Lock Screen and Home Screen widget may know. Counts and hours only by default, because
 * Lock Screen content is visible to anyone holding the phone. Task titles appear only when the
 * owner turned "Show task names" on. Nothing here leaves the device.
 */
export type WidgetSnapshot = {
  version: 1;
  date: string;
  done: number;
  total: number;
  hours: number;
  titles?: string[];
};

export type WidgetOptions = { showTaskNames: boolean };

export const WIDGET_MAX_TITLES = 3;
export const WIDGET_TITLE_LENGTH = 40;
/** Convenience keys. They do not start with `spread.`, so the storage mirror and backups ignore them. */
export const WIDGET_ENABLED_KEY = "widget.enabled";
export const WIDGET_NAMES_KEY = "widget.names";

function clip(text: string) {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length > WIDGET_TITLE_LENGTH ? `${one.slice(0, WIDGET_TITLE_LENGTH - 1)}…` : one;
}

/** Today's plan as the widget sees it. A task counts for today when its allocation sits on today's date. */
export function buildWidgetSnapshot(data: SpreadData, options: WidgetOptions, now: Date = new Date()): WidgetSnapshot {
  const date = isoDate(now);
  const week = data.weeks[weekKey(now)];
  const base: WidgetSnapshot = { version: 1, date, done: 0, total: 0, hours: 0 };
  if (!week) return options.showTaskNames ? { ...base, titles: [] } : base;
  const today = week.allocations.filter((item) => item.day === date);
  const ids = new Set(today.map((item) => item.id));
  const tasks = week.boxes.flatMap((box) => box.tasks).filter((task) => task.allocationId !== undefined && ids.has(task.allocationId));
  const snapshot: WidgetSnapshot = {
    version: 1,
    date,
    done: tasks.filter((task) => task.done).length,
    total: tasks.length,
    hours: Math.round(today.reduce((sum, item) => sum + item.hours, 0) * 10) / 10,
  };
  if (options.showTaskNames) {
    snapshot.titles = tasks
      .filter((task) => !task.done)
      .slice(0, WIDGET_MAX_TITLES)
      .map((task) => clip(task.text))
      .filter(Boolean);
  }
  return snapshot;
}

export type WidgetEnv = {
  native: () => boolean;
  write: (json: string) => Promise<void>;
  clear: () => Promise<void>;
};

const liveEnv: WidgetEnv = {
  native: isNativeApp,
  write: async (json) => {
    const { registerPlugin } = await import("@capacitor/core");
    await registerPlugin<{ write(o: { json: string }): Promise<void> }>("SpreadWidget").write({ json });
  },
  clear: async () => {
    const { registerPlugin } = await import("@capacitor/core");
    await registerPlugin<{ clear(): Promise<void> }>("SpreadWidget").clear();
  },
};

/**
 * Writes the snapshot when the owner opted in, deletes it when they did not. Native only; on the
 * web it does nothing. A missing or failing plugin is never an error. Resolves true when the
 * widget data was written.
 */
export async function syncWidget(
  data: SpreadData,
  prefs: { enabled: boolean; showTaskNames: boolean },
  env: WidgetEnv = liveEnv,
  now: Date = new Date(),
): Promise<boolean> {
  if (!env.native()) return false;
  try {
    if (!prefs.enabled) {
      await env.clear();
      return false;
    }
    await env.write(JSON.stringify(buildWidgetSnapshot(data, { showTaskNames: prefs.showTaskNames }, now)));
    return true;
  } catch {
    return false;
  }
}
