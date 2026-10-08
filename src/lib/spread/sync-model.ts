/**
 * How a planner is split into items for iCloud Sync, and put back together.
 *
 * Each item is small and edited on its own, so two devices working on different tasks, weeks or
 * spreads never touch the same item. Order is kept in id-list fields (see `ID_LIST_SUFFIX` in
 * merge.ts) so adding a task on each device does not conflict.
 *
 *   profile            the spreads (hats) list and the profile name
 *   hat:<id>           one spread
 *   week:<key>         which spreads have a box that week, and the week's allocations in order
 *   box:<key>:<hat>    hours for one spread in one week, and its tasks in order
 *   task:<id>          one task (text, done, content, and which week and spread it sits in)
 *   alloc:<id>         one scheduled block of hours
 *
 * `assemble` never drops a task: one that points at a missing box or spread is kept in a box (and
 * a stand-in spread) instead, so a merge can lose a place for something but never the thing.
 */
import { ID_LIST_SUFFIX, type Json } from "./merge.ts";
import { normalizeData, type Allocation, type Box, type Hat, type SpreadData, type Task, type WeekData } from "./model.ts";

export type PlainItem = { id: string; fields: Record<string, Json> };

const ids = (key: string) => `${key}${ID_LIST_SUFFIX}`;

export const PROFILE_ITEM = "profile";
export const hatItem = (id: string) => `hat:${id}`;
export const weekItem = (week: string) => `week:${week}`;
export const boxItem = (week: string, hat: string) => `box:${week}:${hat}`;
export const taskItem = (id: string) => `task:${id}`;
export const allocItem = (id: string) => `alloc:${id}`;

const json = (value: unknown): Json => JSON.parse(JSON.stringify(value)) as Json;

function put(out: PlainItem[], id: string, fields: Record<string, Json | undefined>) {
  const clean: Record<string, Json> = {};
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) clean[key] = value;
  out.push({ id, fields: clean });
}

export function flatten(data: SpreadData, profileName: string): PlainItem[] {
  const out: PlainItem[] = [];
  put(out, PROFILE_ITEM, { name: profileName, [ids("hats")]: data.hats.map((hat) => hat.id) });
  for (const hat of data.hats) {
    put(out, hatItem(hat.id), { name: hat.name, defaultHours: hat.defaultHours, color: hat.color, category: hat.category });
  }
  for (const [week, body] of Object.entries(data.weeks)) {
    put(out, weekItem(week), { [ids("boxes")]: body.boxes.map((box) => box.hatId), [ids("allocations")]: body.allocations.map((a) => a.id) });
    for (const box of body.boxes) {
      put(out, boxItem(week, box.hatId), { hours: box.hours, [ids("tasks")]: box.tasks.map((task) => task.id) });
      for (const task of box.tasks) {
        put(out, taskItem(task.id), {
          text: task.text,
          done: task.done,
          allocationId: task.allocationId,
          content: task.content === undefined ? undefined : json(task.content),
          week,
          hat: box.hatId,
        });
      }
    }
    for (const alloc of body.allocations) {
      put(out, allocItem(alloc.id), { hatId: alloc.hatId, day: alloc.day, hours: alloc.hours, order: alloc.order, week });
    }
  }
  return out;
}

const text = (value: Json | undefined, fallback = "") => (typeof value === "string" ? value : fallback);
const num = (value: Json | undefined, fallback = 0) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
const list = (value: Json | undefined): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

function inOrder<T extends { id: string }>(wanted: string[], all: Map<string, T>): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const id of wanted) {
    const found = all.get(id);
    if (found && !seen.has(id)) {
      seen.add(id);
      out.push(found);
    }
  }
  for (const id of [...all.keys()].sort()) {
    if (!seen.has(id)) out.push(all.get(id)!);
  }
  return out;
}

/** `live` holds only items that are not deleted. `currentWeek` stays whatever this device is viewing. */
export function assemble(live: PlainItem[], currentWeek: string): { data: SpreadData; name: string | null } {
  const byId = new Map(live.map((item) => [item.id, item.fields]));
  const profile = byId.get(PROFILE_ITEM);

  const hatMap = new Map<string, Hat & { id: string }>();
  for (const [id, fields] of byId) {
    if (!id.startsWith("hat:")) continue;
    const hatId = id.slice(4);
    const hat: Hat = { id: hatId, name: text(fields.name, "Spread"), defaultHours: num(fields.defaultHours), color: text(fields.color, "#8E8E93") };
    if (typeof fields.category === "string") hat.category = fields.category as Hat["category"];
    hatMap.set(hatId, hat);
  }

  const taskMap = new Map<string, Task & { week: string; hat: string }>();
  for (const [id, fields] of byId) {
    if (!id.startsWith("task:")) continue;
    const taskId = id.slice(5);
    const task: Task & { week: string; hat: string } = { id: taskId, text: text(fields.text), done: fields.done === true, week: text(fields.week), hat: text(fields.hat) };
    if (typeof fields.allocationId === "string") task.allocationId = fields.allocationId;
    if (fields.content && typeof fields.content === "object") task.content = fields.content as unknown as Task["content"];
    taskMap.set(taskId, task);
  }

  const allocMap = new Map<string, Allocation & { week: string }>();
  for (const [id, fields] of byId) {
    if (!id.startsWith("alloc:")) continue;
    allocMap.set(id.slice(6), {
      id: id.slice(6),
      hatId: text(fields.hatId),
      day: text(fields.day),
      hours: num(fields.hours),
      order: num(fields.order),
      week: text(fields.week),
    });
  }

  const weekKeys = new Set<string>();
  for (const id of byId.keys()) if (id.startsWith("week:")) weekKeys.add(id.slice(5));
  for (const task of taskMap.values()) if (task.week) weekKeys.add(task.week);

  const claimed = new Set<string>();
  const weeks: Record<string, WeekData> = {};
  for (const week of [...weekKeys].sort()) {
    const weekFields = byId.get(weekItem(week)) ?? {};
    const hatOrder = list(weekFields[ids("boxes")]);
    for (const task of taskMap.values()) if (task.week === week && !hatOrder.includes(task.hat)) hatOrder.push(task.hat);
    const boxes: Box[] = [];
    for (const hatId of [...new Set(hatOrder)]) {
      const fields = byId.get(boxItem(week, hatId)) ?? {};
      const listed = list(fields[ids("tasks")]).filter((id) => taskMap.has(id) && !claimed.has(id));
      const listedSet = new Set(listed);
      const stray = [...taskMap.values()]
        .filter((task) => task.week === week && task.hat === hatId && !listedSet.has(task.id) && !claimed.has(task.id))
        .map((task) => task.id)
        .sort();
      const tasks = [...listed, ...stray].map((id) => {
        claimed.add(id);
        const { week: _week, hat: _hat, ...task } = taskMap.get(id)!;
        void _week;
        void _hat;
        return task as Task;
      });
      if (!hatMap.has(hatId)) hatMap.set(hatId, { id: hatId, name: "Recovered spread", defaultHours: 0, color: "#8E8E93" });
      boxes.push({ hatId, hours: num(fields.hours, hatMap.get(hatId)!.defaultHours), tasks });
    }
    const inWeek = new Map([...allocMap].filter(([, a]) => a.week === week));
    const allocations = inOrder(list(weekFields[ids("allocations")]).map((id) => id), new Map([...inWeek].map(([id, a]) => [id, a]))).map((a) => {
      const { week: _week, ...rest } = a;
      void _week;
      return rest as Allocation;
    });
    weeks[week] = { boxes, allocations };
  }

  const hats = inOrder(list(profile?.[ids("hats")]), hatMap) as Hat[];
  const name = profile && typeof profile.name === "string" ? profile.name : null;
  return { data: normalizeData({ hats, weeks, currentWeek }), name };
}
