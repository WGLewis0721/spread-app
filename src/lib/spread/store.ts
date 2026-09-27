import { backupFile } from "@/lib/spread/backup";
import { saveFile } from "@/lib/spread/save-file";
import { create } from "zustand";
import {
  cloneWeek,
  clampHours,
  defaultData,
  depositHours,
  bankedHours,
  ensureWeek,
  LICENSE_KEY,
  normalizeData,
  ROLE_COLORS,
  SPREAD_CATEGORIES,
  shiftWeek,
  STORE_KEY,
  syncAllocationHours,
  THEME_KEY,
  uid,
  validateLicense,
  weekIsPopulated,
  weekKey,
  type Allocation,
  type License,
  type SpreadCategory,
  type SpreadData,
  type TaskContent,
  type WeekData,
} from "@/lib/spread/model";

export type ThemeChoice = "system" | "light" | "dark";

type Store = {
  ready: boolean;
  license: License | null;
  data: SpreadData;
  theme: ThemeChoice;
  boot: () => void;
  beginTrial: () => void;
  unlock: (code: string) => boolean;
  logout: () => void;
  setTheme: (theme: ThemeChoice) => void;
  moveWeek: (direction: -1 | 1 | "today") => void;
  setHours: (hatId: string, hours: number) => void;
  renameHat: (hatId: string, name: string) => void;
  removeHat: (hatId: string) => void;
  addHat: (name: string, hours: number, options?: { category?: SpreadCategory }) => void;
  addTask: (hatId: string, text: string) => void;
  toggleTask: (hatId: string, taskId: string) => void;
  deleteTask: (hatId: string, taskId: string) => void;
  setTaskText: (hatId: string, taskId: string, text: string) => void;
  setTaskContent: (hatId: string, taskId: string, content: TaskContent) => void;
  setHatColor: (hatId: string, color: string) => void;
  setHatCategory: (hatId: string, category: SpreadCategory) => void;
  addAllocation: (hatId: string, day: string, hours?: number) => void;
  setAllocationHours: (allocationId: string, hours: number) => void;
  moveAllocation: (allocationId: string, day: string, order?: number) => void;
  reorderAllocation: (allocationId: string, beforeId: string | null) => void;
  moveSpreadToDay: (hatId: string, day: string, hours?: number) => void;
  changeWeek: (direction: -1 | 1 | "today") => void;
  removeAllocation: (allocationId: string) => void;
  rollover: (force?: boolean) => "done" | "confirm" | "empty";
  copyLastWeek: () => boolean;
  replaceData: (data: SpreadData) => void;
};

function readLicense(): License | null {
  try {
    const raw = localStorage.getItem(LICENSE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as License;
    if (parsed && parsed.ok === true && (parsed.plan === "demo" || parsed.plan === "personal")) {
      return parsed;
    }
  } catch {
    /* ignore broken storage */
  }
  return null;
}

function readData(): SpreadData {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultData();
    return normalizeData(JSON.parse(raw));
  } catch {
    return defaultData();
  }
}

function readTheme(): ThemeChoice {
  const value = localStorage.getItem(THEME_KEY);
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

export function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#000000" : "#F2F2F7");
}

function persist(data: SpreadData) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

function mapBox(data: SpreadData, hatId: string, update: (box: WeekData["boxes"][number]) => WeekData["boxes"][number]) {
  const next = ensureWeek(data);
  const key = next.currentWeek;
  const week = next.weeks[key];
  return {
    ...next,
    weeks: {
      ...next.weeks,
      [key]: {
        ...week,
        boxes: week.boxes.map((box) => (box.hatId === hatId ? update(box) : box)),
      },
    },
  };
}

function writeWeek(data: SpreadData, week: WeekData) {
  const next = ensureWeek(data);
  const synced = syncAllocationHours(week);
  return {
    ...next,
    weeks: { ...next.weeks, [next.currentWeek]: synced },
  };
}

export const useSpread = create<Store>((set, get) => ({
  ready: false,
  license: null,
  data: defaultData(),
  theme: "system",
  boot: () => {
    if (get().ready) return;
    const theme = readTheme();
    applyTheme(theme);
    set({ ready: true, license: readLicense(), data: readData(), theme });
  },
  beginTrial: () => {
    const license: License = { ok: true, plan: "demo" };
    localStorage.setItem(LICENSE_KEY, JSON.stringify(license));
    set({ license });
  },
  unlock: (code) => {
    const license = validateLicense(code);
    if (!license) return false;
    localStorage.setItem(LICENSE_KEY, JSON.stringify(license));
    set({ license });
    return true;
  },
  logout: () => {
    localStorage.removeItem(LICENSE_KEY);
    set({ license: null });
  },
  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },
  moveWeek: (direction) => {
    const data = get().data;
    const currentWeek = direction === "today" ? weekKey() : shiftWeek(data.currentWeek, direction);
    const next = ensureWeek({ ...data, currentWeek });
    persist(next);
    set({ data: next });
  },
  setHours: (hatId, hours) => {
    const current = ensureWeek(get().data);
    const value = clampHours(hours);
    const data = mapBox(current, hatId, (box) => ({ ...box, hours: value }));
    data.hats = data.hats.map((hat) => (hat.id === hatId ? { ...hat, defaultHours: value } : hat));
    persist(data);
    set({ data });
  },
  renameHat: (hatId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const data = get().data;
    const next = { ...data, hats: data.hats.map((hat) => (hat.id === hatId ? { ...hat, name: trimmed } : hat)) };
    persist(next);
    set({ data: next });
  },
  removeHat: (hatId) => {
    const data = get().data;
    const weeks: SpreadData["weeks"] = {};
    for (const [key, week] of Object.entries(data.weeks)) {
      weeks[key] = {
        boxes: week.boxes.filter((box) => box.hatId !== hatId),
        allocations: (week.allocations ?? []).filter((item) => item.hatId !== hatId),
      };
    }
    const next = { ...data, hats: data.hats.filter((hat) => hat.id !== hatId), weeks };
    persist(next);
    set({ data: next });
  },
  addHat: (name, hours, options) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const data = get().data;
    const preset = SPREAD_CATEGORIES.find((item) => item.id === options?.category);
    const hat = {
      id: uid(),
      name: trimmed,
      defaultHours: clampHours(hours),
      color: preset?.color ?? ROLE_COLORS[data.hats.length % ROLE_COLORS.length],
      ...(preset ? { category: preset.id } : {}),
    };
    const withHat = ensureWeek({ ...data, hats: [...data.hats, hat] });
    const next = mapBox(withHat, hat.id, (box) => ({ ...box, hours: hat.defaultHours }));
    persist(next);
    set({ data: next });
  },
  addTask: (hatId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const next = mapBox(get().data, hatId, (box) => ({
      ...box,
      tasks: [...box.tasks, { id: uid(), text: trimmed, done: false }],
    }));
    persist(next);
    set({ data: next });
  },
  toggleTask: (hatId, taskId) => {
    const next = mapBox(get().data, hatId, (box) => ({
      ...box,
      tasks: box.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)),
    }));
    persist(next);
    set({ data: next });
  },
  deleteTask: (hatId, taskId) => {
    const next = mapBox(get().data, hatId, (box) => ({
      ...box,
      tasks: box.tasks.filter((task) => task.id !== taskId),
    }));
    persist(next);
    set({ data: next });
  },
  setTaskText: (hatId, taskId, text) => {
    const next = mapBox(get().data, hatId, (box) => ({
      ...box,
      tasks: box.tasks.map((task) => (task.id === taskId ? { ...task, text } : task)),
    }));
    persist(next);
    set({ data: next });
  },
  setTaskContent: (hatId, taskId, content) => {
    const next = mapBox(get().data, hatId, (box) => ({
      ...box,
      tasks: box.tasks.map((task) => (task.id === taskId ? { ...task, content } : task)),
    }));
    persist(next);
    set({ data: next });
  },
  setHatColor: (hatId, color) => {
    if (!ROLE_COLORS.includes(color as (typeof ROLE_COLORS)[number]) && !/^#[0-9A-Fa-f]{6}$/.test(color)) return;
    const data = get().data;
    const next = { ...data, hats: data.hats.map((hat) => (hat.id === hatId ? { ...hat, color } : hat)) };
    persist(next);
    set({ data: next });
  },
  setHatCategory: (hatId, category) => {
    const preset = SPREAD_CATEGORIES.find((item) => item.id === category);
    if (!preset) return;
    const data = get().data;
    const next = {
      ...data,
      hats: data.hats.map((hat) => (hat.id === hatId ? { ...hat, category: preset.id, color: preset.color } : hat)),
    };
    persist(next);
    set({ data: next });
  },
  addAllocation: (hatId, day, hours = 1) => {
    const data = ensureWeek(get().data);
    const week = data.weeks[data.currentWeek];
    const bank = week.boxes.find((box) => box.hatId === hatId)?.hours ?? 0;
    const spent = week.allocations.filter((item) => item.hatId === hatId).reduce((sum, item) => sum + item.hours, 0);
    const existing = week.allocations.find((item) => item.hatId === hatId && item.day === day);
    let allocations: Allocation[];
    if (existing) {
      const nextHours = bankedHours(existing.hours, bank, spent - existing.hours, existing.hours + hours);
      if (nextHours === existing.hours) return;
      allocations = week.allocations.map((item) => (item.id === existing.id ? { ...item, hours: nextHours } : item));
    } else {
      const take = depositHours(bank, spent, hours);
      if (take <= 0) return;
      const order = week.allocations.filter((item) => item.day === day).reduce((max, item) => Math.max(max, item.order), -1) + 1;
      allocations = [...week.allocations, { id: uid(), hatId, day, hours: take, order }];
    }
    const next = writeWeek(data, { ...week, allocations });
    persist(next);
    set({ data: next });
  },
  setAllocationHours: (allocationId, hours) => {
    const data = ensureWeek(get().data);
    const week = data.weeks[data.currentWeek];
    const current = week.allocations.find((item) => item.id === allocationId);
    if (!current) return;
    const bank = week.boxes.find((box) => box.hatId === current.hatId)?.hours ?? 0;
    const others = week.allocations
      .filter((item) => item.hatId === current.hatId && item.id !== allocationId)
      .reduce((sum, item) => sum + item.hours, 0);
    const nextHours = bankedHours(current.hours, bank, others, hours);
    if (nextHours === current.hours) return;
    const allocations = week.allocations.map((item) => (item.id === allocationId ? { ...item, hours: nextHours } : item));
    const next = writeWeek(data, { ...week, allocations });
    persist(next);
    set({ data: next });
  },
  moveAllocation: (allocationId, day, order) => {
    const data = ensureWeek(get().data);
    const week = data.weeks[data.currentWeek];
    const current = week.allocations.find((item) => item.id === allocationId);
    if (!current) return;
    const sameDay = week.allocations.find((item) => item.hatId === current.hatId && item.day === day && item.id !== allocationId);
    let allocations = week.allocations.filter((item) => item.id !== allocationId);
    if (sameDay && day !== current.day) {
      allocations = allocations.map((item) =>
        item.id === sameDay.id ? { ...item, hours: clampHours(item.hours + current.hours) } : item,
      );
    } else {
      const siblings = allocations.filter((item) => item.day === day);
      const nextOrder = order ?? siblings.reduce((max, item) => Math.max(max, item.order), -1) + 1;
      allocations = [...allocations, { ...current, day, order: nextOrder }];
      allocations = allocations
        .filter((item) => item.day === day)
        .sort((a, b) => a.order - b.order)
        .map((item, index) => ({ ...item, order: index }))
        .concat(allocations.filter((item) => item.day !== day));
    }
    const next = writeWeek(data, { ...week, allocations });
    persist(next);
    set({ data: next });
  },
  reorderAllocation: (allocationId, beforeId) => {
    const data = ensureWeek(get().data);
    const week = data.weeks[data.currentWeek];
    const current = week.allocations.find((item) => item.id === allocationId);
    if (!current) return;
    const siblings = week.allocations
      .filter((item) => item.day === current.day && item.id !== allocationId)
      .sort((a, b) => a.order - b.order);
    const index = beforeId ? siblings.findIndex((item) => item.id === beforeId) : siblings.length;
    if (index < 0) return;
    siblings.splice(index, 0, current);
    const allocations = week.allocations
      .filter((item) => item.day !== current.day)
      .concat(siblings.map((item, order) => ({ ...item, order })));
    const next = writeWeek(data, { ...week, allocations });
    persist(next);
    set({ data: next });
  },
  moveSpreadToDay: (hatId, day, hours = 1) => {
    get().addAllocation(hatId, day, hours);
  },
  changeWeek: (direction) => {
    get().moveWeek(direction);
  },
  removeAllocation: (allocationId) => {
    const data = ensureWeek(get().data);
    const week = data.weeks[data.currentWeek];
    const allocations = week.allocations.filter((item) => item.id !== allocationId);
    const boxes = week.boxes.map((box) => ({
      ...box,
      tasks: box.tasks.map((task) => (task.allocationId === allocationId ? { ...task, allocationId: undefined } : task)),
    }));
    const next = writeWeek(data, { boxes, allocations });
    persist(next);
    set({ data: next });
  },
  rollover: (force = false) => {
    const data = ensureWeek(get().data);
    const source = data.weeks[data.currentWeek];
    if (!source || source.boxes.length === 0) return "empty";
    const nextKey = shiftWeek(data.currentWeek, 1);
    const destination = data.weeks[nextKey];
    if (!force && weekIsPopulated(destination)) return "confirm";
    const copied = cloneWeek(source);
    const next = {
      ...data,
      currentWeek: nextKey,
      weeks: { ...data.weeks, [nextKey]: copied },
    };
    persist(next);
    set({ data: next });
    return "done";
  },
  copyLastWeek: () => {
    const data = ensureWeek(get().data);
    const previous = data.weeks[shiftWeek(data.currentWeek, -1)];
    if (!previous) return false;
    const copy = structuredClone(previous);
    for (const box of copy.boxes) {
      for (const task of box.tasks) task.done = false;
    }
    const next = {
      ...data,
      weeks: { ...data.weeks, [data.currentWeek]: copy },
    };
    persist(next);
    set({ data: next });
    return true;
  },
  replaceData: (incoming) => {
    const data = normalizeData(incoming);
    persist(data);
    set({ data });
  },
}));

export function saveBackup(data: SpreadData) {
  const file = backupFile(data);
  const blob = new Blob([JSON.stringify(file)], { type: "application/octet-stream" });
  saveFile(blob, `Spread-${data.currentWeek}.spread`);
}
