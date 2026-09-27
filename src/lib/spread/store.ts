import { backupFile } from "@/lib/spread/backup";
import { saveFile } from "@/lib/spread/save-file";
import {
  ACTIVE_PERSON_KEY,
  PEOPLE_KEY,
  legacyPerson,
  parsePeople,
  withPerson,
  cleanName,
  type Person,
} from "@/lib/spread/people";
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

export const ACCENTS = [
  { id: "blue", label: "Blue", color: "#007AFF", on: "#ffffff" },
  { id: "indigo", label: "Indigo", color: "#5856D6", on: "#ffffff" },
  { id: "purple", label: "Purple", color: "#AF52DE", on: "#ffffff" },
  { id: "pink", label: "Pink", color: "#FF2D55", on: "#ffffff" },
  { id: "red", label: "Red", color: "#FF3B30", on: "#ffffff" },
  { id: "orange", label: "Orange", color: "#FF9500", on: "#ffffff" },
  { id: "yellow", label: "Yellow", color: "#FFCC00", on: "#1d1d1f" },
  { id: "green", label: "Green", color: "#34C759", on: "#ffffff" },
  { id: "mint", label: "Mint", color: "#00C7BE", on: "#1d1d1f" },
  { id: "teal", label: "Teal", color: "#30B0C7", on: "#ffffff" },
  { id: "cyan", label: "Cyan", color: "#32ADE6", on: "#ffffff" },
  { id: "brown", label: "Brown", color: "#A2845E", on: "#ffffff" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

const ACCENT_KEY = "spread-accent";

type Store = {
  ready: boolean;
  license: License | null;
  people: Person[];
  activeId: string | null;
  data: SpreadData;
  theme: ThemeChoice;
  accent: AccentId | null;
  boot: () => void;
  beginTrial: (name?: string) => void;
  unlock: (code: string, name?: string) => boolean;
  logout: () => void;
  setTheme: (theme: ThemeChoice) => void;
  setAccent: (accent: AccentId) => void;
  addPerson: (name: string) => boolean;
  renamePerson: (id: string, name: string) => boolean;
  switchPerson: (id: string) => void;
  removePerson: (id: string) => boolean;
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
    const raw = localStorage.getItem(activeStore);
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

export function applyAccent(accent: AccentId | null) {
  const root = document.documentElement;
  const item = ACCENTS.find((entry) => entry.id === accent);
  if (!item) {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--on-accent");
    return;
  }
  root.style.setProperty("--accent", item.color);
  root.style.setProperty("--on-accent", item.on);
}

function readAccent(): AccentId | null {
  return accentFrom(localStorage.getItem(ACCENT_KEY));
}

function accentFrom(value: string | null): AccentId | null {
  return ACCENTS.some((entry) => entry.id === value) ? (value as AccentId) : null;
}

let activeStore = STORE_KEY;

function writePeople(people: Person[]) {
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(people));
}

function loadPeople(license: License | null): Person[] {
  const saved = parsePeople(localStorage.getItem(PEOPLE_KEY));
  if (saved.length > 0) return saved;
  if (localStorage.getItem(STORE_KEY)) {
    const person = legacyPerson(uid(), readTheme(), readAccent());
    writePeople([person]);
    localStorage.setItem(ACTIVE_PERSON_KEY, person.id);
    return [person];
  }
  if (!license) return [];
  const created = withPerson([], "Me", uid());
  if (!created) return [];
  writePeople(created);
  localStorage.setItem(ACTIVE_PERSON_KEY, created[0].id);
  return created;
}

function adopt(person: Person) {
  activeStore = person.store;
  const theme = person.theme;
  const accent = accentFrom(person.accent);
  applyTheme(theme);
  applyAccent(accent);
  return { theme, accent, data: readData() };
}

function ensurePerson(set: (partial: Partial<Store>) => void, get: () => Store, name?: string) {
  if (get().people.length > 0) return;
  const next = withPerson([], name ?? "", uid());
  if (!next) return;
  const person = next[0];
  writePeople(next);
  localStorage.setItem(ACTIVE_PERSON_KEY, person.id);
  activeStore = person.store;
  applyTheme(person.theme);
  applyAccent(null);
  set({ people: next, activeId: person.id, theme: person.theme, accent: null });
}

let flushBound = false;

function bindFlush() {
  if (flushBound) return;
  flushBound = true;
  window.addEventListener("pagehide", flushSpread);
  window.addEventListener("blur", flushSpread);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSpread();
  });
}

function persist(data: SpreadData) {
  localStorage.setItem(activeStore, JSON.stringify(data));
}

let pending: SpreadData | null = null;
let persistTimer: number | null = null;

export function flushSpread() {
  if (persistTimer !== null) {
    window.clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (!pending) return;
  const data = pending;
  pending = null;
  persist(data);
}

function commit(set: (partial: { data: SpreadData }) => void, next: SpreadData) {
  pending = null;
  if (persistTimer !== null) {
    window.clearTimeout(persistTimer);
    persistTimer = null;
  }
  persist(next);
  set({ data: next });
}

function stage(set: (partial: { data: SpreadData }) => void, next: SpreadData) {
  pending = next;
  set({ data: next });
  if (persistTimer !== null) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(flushSpread, 400);
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
  people: [],
  activeId: null,
  data: defaultData(),
  theme: "system",
  accent: null,
  boot: () => {
    if (get().ready) return;
    bindFlush();
    const license = readLicense();
    const people = loadPeople(license);
    const savedId = localStorage.getItem(ACTIVE_PERSON_KEY);
    const active = people.find((person) => person.id === savedId) ?? people[0] ?? null;
    if (active && savedId !== active.id) localStorage.setItem(ACTIVE_PERSON_KEY, active.id);
    const loaded = active
      ? adopt(active)
      : { theme: readTheme(), accent: readAccent(), data: defaultData() };
    if (!active) {
      applyTheme(loaded.theme);
      applyAccent(loaded.accent);
    }
    set({ ready: true, license, people, activeId: active?.id ?? null, ...loaded });
  },
  beginTrial: (name) => {
    ensurePerson(set, get, name);
    const license: License = { ok: true, plan: "demo" };
    localStorage.setItem(LICENSE_KEY, JSON.stringify(license));
    set({ license });
  },
  unlock: (code, name) => {
    const license = validateLicense(code);
    if (!license) return false;
    ensurePerson(set, get, name);
    localStorage.setItem(LICENSE_KEY, JSON.stringify(license));
    set({ license });
    return true;
  },
  logout: () => {
    flushSpread();
    localStorage.removeItem(LICENSE_KEY);
    set({ license: null });
  },
  setTheme: (theme) => {
    applyTheme(theme);
    const people = get().people.map((person) => (person.id === get().activeId ? { ...person, theme } : person));
    if (people.length > 0) writePeople(people);
    set({ theme, people: people.length > 0 ? people : get().people });
  },
  setAccent: (accent) => {
    applyAccent(accent);
    const people = get().people.map((person) => (person.id === get().activeId ? { ...person, accent } : person));
    if (people.length > 0) writePeople(people);
    set({ accent, people: people.length > 0 ? people : get().people });
  },
  addPerson: (name) => {
    if (!cleanName(name)) return false;
    const next = withPerson(get().people, name, uid());
    const person = next?.[next.length - 1];
    if (!next || !person) return false;
    flushSpread();
    const data = defaultData();
    localStorage.setItem(person.store, JSON.stringify(data));
    writePeople(next);
    localStorage.setItem(ACTIVE_PERSON_KEY, person.id);
    activeStore = person.store;
    applyTheme(person.theme);
    applyAccent(null);
    set({ people: next, activeId: person.id, data, theme: person.theme, accent: null });
    return true;
  },
  renamePerson: (id, name) => {
    const label = cleanName(name);
    if (!label) return false;
    const people = get().people.map((person) => (person.id === id ? { ...person, name: label } : person));
    writePeople(people);
    set({ people });
    return true;
  },
  switchPerson: (id) => {
    if (id === get().activeId) return;
    const person = get().people.find((item) => item.id === id);
    if (!person) return;
    flushSpread();
    localStorage.setItem(ACTIVE_PERSON_KEY, person.id);
    const loaded = adopt(person);
    set({ activeId: person.id, ...loaded });
  },
  removePerson: (id) => {
    const people = get().people;
    if (people.length <= 1) return false;
    const person = people.find((item) => item.id === id);
    if (!person) return false;
    flushSpread();
    const next = people.filter((item) => item.id !== id);
    localStorage.removeItem(person.store);
    writePeople(next);
    if (get().activeId !== id) {
      set({ people: next });
      return true;
    }
    localStorage.setItem(ACTIVE_PERSON_KEY, next[0].id);
    const loaded = adopt(next[0]);
    set({ people: next, activeId: next[0].id, ...loaded });
    return true;
  },
  moveWeek: (direction) => {
    const data = get().data;
    const currentWeek = direction === "today" ? weekKey() : shiftWeek(data.currentWeek, direction);
    const next = ensureWeek({ ...data, currentWeek });
    commit(set, next);
  },
  setHours: (hatId, hours) => {
    const current = ensureWeek(get().data);
    const value = clampHours(hours);
    const data = mapBox(current, hatId, (box) => ({ ...box, hours: value }));
    data.hats = data.hats.map((hat) => (hat.id === hatId ? { ...hat, defaultHours: value } : hat));
    commit(set, data);
  },
  renameHat: (hatId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const data = get().data;
    const next = { ...data, hats: data.hats.map((hat) => (hat.id === hatId ? { ...hat, name: trimmed } : hat)) };
    commit(set, next);
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
    commit(set, next);
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
    commit(set, next);
  },
  addTask: (hatId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const next = mapBox(get().data, hatId, (box) => ({
      ...box,
      tasks: [...box.tasks, { id: uid(), text: trimmed, done: false }],
    }));
    commit(set, next);
  },
  toggleTask: (hatId, taskId) => {
    const next = mapBox(get().data, hatId, (box) => ({
      ...box,
      tasks: box.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)),
    }));
    commit(set, next);
  },
  deleteTask: (hatId, taskId) => {
    const next = mapBox(get().data, hatId, (box) => ({
      ...box,
      tasks: box.tasks.filter((task) => task.id !== taskId),
    }));
    commit(set, next);
  },
  setTaskText: (hatId, taskId, text) => {
    const next = mapBox(get().data, hatId, (box) => ({
      ...box,
      tasks: box.tasks.map((task) => (task.id === taskId ? { ...task, text } : task)),
    }));
    stage(set, next);
  },
  setTaskContent: (hatId, taskId, content) => {
    const next = mapBox(get().data, hatId, (box) => ({
      ...box,
      tasks: box.tasks.map((task) => (task.id === taskId ? { ...task, content } : task)),
    }));
    stage(set, next);
  },
  setHatColor: (hatId, color) => {
    if (!ROLE_COLORS.includes(color as (typeof ROLE_COLORS)[number]) && !/^#[0-9A-Fa-f]{6}$/.test(color)) return;
    const data = get().data;
    const next = { ...data, hats: data.hats.map((hat) => (hat.id === hatId ? { ...hat, color } : hat)) };
    commit(set, next);
  },
  setHatCategory: (hatId, category) => {
    const preset = SPREAD_CATEGORIES.find((item) => item.id === category);
    if (!preset) return;
    const data = get().data;
    const next = {
      ...data,
      hats: data.hats.map((hat) => (hat.id === hatId ? { ...hat, category: preset.id, color: preset.color } : hat)),
    };
    commit(set, next);
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
    commit(set, next);
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
    commit(set, next);
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
    commit(set, next);
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
    commit(set, next);
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
    commit(set, next);
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
    commit(set, next);
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
    commit(set, next);
    return true;
  },
  replaceData: (incoming) => {
    const data = normalizeData(incoming);
    commit(set, data);
  },
}));

export function saveBackup(data: SpreadData) {
  const file = backupFile(data);
  const blob = new Blob([JSON.stringify(file)], { type: "application/octet-stream" });
  saveFile(blob, `Spread-${data.currentWeek}.spread`);
}
