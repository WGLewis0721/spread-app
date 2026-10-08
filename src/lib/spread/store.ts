import { collectFullPayload, fullBackupText, planRestoreAsNew, restoreCapacity, type FullBackupPayload } from "@/lib/spread/backup";
import { isNativeApp, syncStatusBar } from "@/lib/spread/native";
import { flushMirror, notifyStorageChanged, pinSnapshot } from "@/lib/spread/native-mirror";
import { runMigrations } from "@/lib/spread/schema";
import { classifyStored } from "@/lib/spread/pristine";
import { commitRestore, recoverRestore } from "@/lib/spread/restore-tx";
import { saveFile, type SaveResult } from "@/lib/spread/save-file";
import {
  ACTIVE_PROFILE_KEY,
  PROFILES_KEY,
  legacyProfile,
  migrateRoster,
  withProfile,
  cleanName,
  type Profile,
} from "@/lib/spread/profiles";
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
  profiles: Profile[];
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
  addProfile: (name: string) => boolean;
  renameProfile: (id: string, name: string) => boolean;
  switchProfile: (id: string) => void;
  removeProfile: (id: string) => boolean;
  moveWeek: (direction: -1 | 1 | "today") => void;
  openWeek: (key: string) => void;
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
  /** False if nothing was replaced: the open profile is synced, so a restore would delete on every device. */
  replaceData: (data: SpreadData) => boolean;
  restoreAsNew: (payload: FullBackupPayload, select?: string[]) => RestoreResult;
  /** How many profiles a restore can add right now (free slots, plus an empty profile it may fill). */
  restoreRoom: () => number;
  /** Put a merged planner from iCloud Sync into the open profile. Keeps the week being viewed. */
  applySynced: (data: SpreadData, name: string | null) => void;
  setSyncId: (profileId: string, syncId: string | null) => boolean;
  /** Add a profile that is already linked to iCloud. Does not switch to it. Null if there is no room. */
  addSyncedProfile: (name: string, syncId: string, data: SpreadData) => string | null;
};

export type RestoreResult =
  | { ok: true; added: number; replacedEmpty: boolean; skipped: string[] }
  | { ok: false; reason: "no-room"; needed: number; free: number }
  | { ok: false; reason: "write-failed" }
  | { ok: false; reason: "rollback-failed" };

// The installed app has no sign-in step: whoever has the app has the planner. The license is
// never written to storage there, so it can't go stale or be removed by a storage reset.
const NATIVE_LICENSE: License = { ok: true, plan: "personal" };

function readLicense(): License | null {
  if (isNativeApp()) return NATIVE_LICENSE;
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
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(activeStore);
  } catch {
    return defaultData();
  }
  if (!raw) return defaultData();
  try {
    return normalizeData(JSON.parse(raw));
  } catch {
    // Unreadable text is about to be replaced by the next save. Keep a copy first so the
    // person (or support) can still recover it.
    keepUnreadable(activeStore, raw);
    return defaultData();
  }
}

export const RECOVERY_PREFIX = "spread.recovery.";

function keepUnreadable(store: string, raw: string) {
  const key = `${RECOVERY_PREFIX}${store}`;
  try {
    if (localStorage.getItem(key) === null) put(key, raw);
  } catch {
    /* storage is unavailable: nothing more to do */
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
  syncStatusBar(theme);
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

export type SaveFailure = "full" | "unavailable" | "newer";

const failureListeners = new Set<(failure: SaveFailure) => void>();
let failureReported = false;

/** Hear about a save that didn't land (storage full or blocked). Reported once per run of failures. */
export function onSaveFailure(listener: (failure: SaveFailure) => void) {
  failureListeners.add(listener);
  return () => {
    failureListeners.delete(listener);
  };
}

function isFullError(error: unknown) {
  if (!(error instanceof DOMException)) return false;
  return error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED" || error.code === 22 || error.code === 1014;
}

function reportFailure(failure: SaveFailure) {
  if (failureReported) return;
  failureReported = true;
  for (const listener of failureListeners) listener(failure);
}

/** Set when the stored planner was written by a newer build. Nothing may be written then. */
let schemaLocked = false;

/**
 * Every planner write goes through here. A full or blocked store used to throw out of the action
 * that caused it, which left the screen and the saved data out of step. Now the screen keeps the
 * change, the failure is announced once, and the next write that works clears the alarm.
 */
function put(key: string, value: string): boolean {
  if (schemaLocked) {
    reportFailure("newer");
    return false;
  }
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    reportFailure(isFullError(error) ? "full" : "unavailable");
    return false;
  }
  failureReported = false;
  notifyStorageChanged();
  return true;
}

function drop(key: string) {
  if (schemaLocked) return;
  try {
    localStorage.removeItem(key);
  } catch {
    return;
  }
  notifyStorageChanged();
}

const rosterStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    put(key, value);
  },
  removeItem: drop,
};

/**
 * An existing profile with nothing in it that is not linked to iCloud, which a restore may fill.
 * The open profile is preferred. Content is judged from what is saved, never guessed.
 */
function emptyProfileId(state: { profiles: Profile[]; activeId: string | null }): string | null {
  const candidates = [...state.profiles].sort((a, b) => Number(b.id === state.activeId) - Number(a.id === state.activeId));
  for (const profile of candidates) {
    if (profile.syncId) continue;
    try {
      // Judge what is saved (the caller has flushed pending edits). A profile whose saved text is
      // unreadable is not empty: it holds something, so it is never overwritten.
      const kind = classifyStored(localStorage.getItem(profile.store)).kind;
      if (kind === "absent" || kind === "pristine") return profile.id;
    } catch {
      /* unreadable: not treated as empty */
    }
  }
  return null;
}

/** True only if the roster reached storage. Callers must not change what the screen shows when it did not. */
function writeProfiles(profiles: Profile[]): boolean {
  return put(PROFILES_KEY, JSON.stringify(profiles));
}

/** Storage as the restore transaction sees it: the same lock and failure rules as every other write. */
const txStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    if (schemaLocked) throw new Error("planner is locked");
    localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (schemaLocked) throw new Error("planner is locked");
    localStorage.removeItem(key);
  },
};

function loadProfiles(license: License | null): Profile[] {
  const saved = migrateRoster(rosterStorage);
  if (saved.length > 0) return saved;
  if (localStorage.getItem(STORE_KEY)) {
    const profile = legacyProfile(uid(), readTheme(), readAccent());
    writeProfiles([profile]);
    put(ACTIVE_PROFILE_KEY, profile.id);
    return [profile];
  }
  if (!license) return [];
  const created = withProfile([], "Me", uid());
  if (!created) return [];
  writeProfiles(created);
  put(ACTIVE_PROFILE_KEY, created[0].id);
  return created;
}

function adopt(profile: Profile) {
  activeStore = profile.store;
  const theme = profile.theme;
  const accent = accentFrom(profile.accent);
  applyTheme(theme);
  applyAccent(accent);
  return { theme, accent, data: readData() };
}

function ensureProfile(set: (partial: Partial<Store>) => void, get: () => Store, name?: string) {
  if (get().profiles.length > 0) return;
  const next = withProfile([], name ?? "", uid());
  if (!next) return;
  const profile = next[0];
  writeProfiles(next);
  put(ACTIVE_PROFILE_KEY, profile.id);
  activeStore = profile.store;
  applyTheme(profile.theme);
  applyAccent(null);
  set({ profiles: next, activeId: profile.id, theme: profile.theme, accent: null });
}

let flushBound = false;

function bindFlush() {
  if (flushBound) return;
  flushBound = true;
  const flushAll = () => {
    flushSpread();
    flushMirror();
  };
  window.addEventListener("pagehide", flushAll);
  window.addEventListener("blur", flushAll);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll();
  });
}

function persist(data: SpreadData) {
  put(activeStore, JSON.stringify(data));
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

let arriving = false;

export function consumeArrival() {
  const value = arriving;
  arriving = false;
  return value;
}

function readSession() {
  if (typeof window === "undefined") return null;
  try {
    bindFlush();
    // Finish or undo a restore that was interrupted before it committed.
    recoverRestore(txStorage);
    const migration = runMigrations(localStorage, {
      snapshot: (label, entries) => {
        if (isNativeApp()) void pinSnapshot(label, entries);
      },
    });
    schemaLocked = migration.status === "newer";
    const license = readLicense();
    const profiles = loadProfiles(license);
    const savedId = localStorage.getItem(ACTIVE_PROFILE_KEY);
    const active = profiles.find((profile) => profile.id === savedId) ?? profiles[0] ?? null;
    if (active && savedId !== active.id) put(ACTIVE_PROFILE_KEY, active.id);
    const loaded = active
      ? adopt(active)
      : { theme: readTheme(), accent: readAccent(), data: defaultData() };
    if (!active) {
      applyTheme(loaded.theme);
      applyAccent(loaded.accent);
    }
    if (license) document.documentElement.setAttribute("data-spread", "in");
    return {
      ready: true as const,
      license,
      profiles,
      activeId: active?.id ?? null,
      ...loaded,
    };
  } catch {
    return null;
  }
}

// The installed app restores its storage snapshot first (see native-mirror.ts), so it reads the
// session from `boot()` once that has finished instead of at import time.
const restored = isNativeApp() ? null : readSession();

export const useSpread = create<Store>((set, get) => ({
  ready: restored?.ready ?? false,
  license: restored?.license ?? null,
  profiles: restored?.profiles ?? [],
  activeId: restored?.activeId ?? null,
  data: restored?.data ?? defaultData(),
  theme: restored?.theme ?? "system",
  accent: restored?.accent ?? null,
  boot: () => {
    if (get().ready) return;
    const session = readSession();
    if (!session) return;
    set(session);
  },
  beginTrial: (name) => {
    ensureProfile(set, get, name);
    const license: License = { ok: true, plan: "demo" };
    put(LICENSE_KEY, JSON.stringify(license));
    document.documentElement.setAttribute("data-spread", "in");
    arriving = true;
    set({ license });
  },
  unlock: (code, name) => {
    const license = validateLicense(code);
    if (!license) return false;
    ensureProfile(set, get, name);
    put(LICENSE_KEY, JSON.stringify(license));
    document.documentElement.setAttribute("data-spread", "in");
    arriving = true;
    set({ license });
    return true;
  },
  logout: () => {
    if (isNativeApp()) return;
    flushSpread();
    drop(LICENSE_KEY);
    document.documentElement.removeAttribute("data-spread");
    set({ license: null });
  },
  setTheme: (theme) => {
    applyTheme(theme);
    const profiles = get().profiles.map((profile) => (profile.id === get().activeId ? { ...profile, theme } : profile));
    const saved = profiles.length > 0 ? writeProfiles(profiles) : true;
    set({ theme, profiles: saved && profiles.length > 0 ? profiles : get().profiles });
  },
  setAccent: (accent) => {
    applyAccent(accent);
    const profiles = get().profiles.map((profile) => (profile.id === get().activeId ? { ...profile, accent } : profile));
    const saved = profiles.length > 0 ? writeProfiles(profiles) : true;
    set({ accent, profiles: saved && profiles.length > 0 ? profiles : get().profiles });
  },
  addProfile: (name) => {
    if (!cleanName(name)) return false;
    const next = withProfile(get().profiles, name, uid());
    const profile = next?.[next.length - 1];
    if (!next || !profile) return false;
    flushSpread();
    const data = defaultData();
    if (!put(profile.store, JSON.stringify(data))) return false;
    if (!writeProfiles(next)) {
      drop(profile.store);
      return false;
    }
    put(ACTIVE_PROFILE_KEY, profile.id);
    activeStore = profile.store;
    applyTheme(profile.theme);
    applyAccent(null);
    set({ profiles: next, activeId: profile.id, data, theme: profile.theme, accent: null });
    return true;
  },
  renameProfile: (id, name) => {
    const label = cleanName(name);
    if (!label) return false;
    const profiles = get().profiles.map((profile) => (profile.id === id ? { ...profile, name: label } : profile));
    if (!writeProfiles(profiles)) return false;
    set({ profiles });
    return true;
  },
  switchProfile: (id) => {
    if (id === get().activeId) return;
    const profile = get().profiles.find((item) => item.id === id);
    if (!profile) return;
    flushSpread();
    put(ACTIVE_PROFILE_KEY, profile.id);
    const loaded = adopt(profile);
    set({ activeId: profile.id, ...loaded });
  },
  removeProfile: (id) => {
    const profiles = get().profiles;
    if (profiles.length <= 1 || schemaLocked) return false;
    const profile = profiles.find((item) => item.id === id);
    if (!profile) return false;
    flushSpread();
    const next = profiles.filter((item) => item.id !== id);
    // The roster goes first: if it cannot be written the profile stays listed, with its data.
    if (!writeProfiles(next)) return false;
    drop(profile.store);
    if (get().activeId !== id) {
      set({ profiles: next });
      return true;
    }
    put(ACTIVE_PROFILE_KEY, next[0].id);
    const loaded = adopt(next[0]);
    set({ profiles: next, activeId: next[0].id, ...loaded });
    return true;
  },
  moveWeek: (direction) => {
    const data = get().data;
    const currentWeek = direction === "today" ? weekKey() : shiftWeek(data.currentWeek, direction);
    const next = ensureWeek({ ...data, currentWeek });
    commit(set, next);
  },
  openWeek: (key) => {
    const data = get().data;
    if (data.currentWeek === key) return;
    commit(set, ensureWeek({ ...data, currentWeek: key }));
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
    const open = get().profiles.find((profile) => profile.id === get().activeId);
    if (open?.syncId) return false;
    const data = normalizeData(incoming);
    flushSpread();
    commit(set, data);
    return true;
  },
  applySynced: (incoming, name) => {
    const data = normalizeData(incoming);
    // A merge that did not reach storage must not look applied: the sync state would then run
    // ahead of the saved planner, and the next pass would read the old planner as an edit that
    // undoes iCloud's change. Throwing lets the session put its state back.
    pending = null;
    if (persistTimer !== null) {
      window.clearTimeout(persistTimer);
      persistTimer = null;
    }
    if (!put(activeStore, JSON.stringify(data))) throw new Error("couldn't save the synced changes");
    set({ data });
    const { activeId, profiles } = get();
    const label = name ? cleanName(name) : "";
    if (label && activeId) {
      const next = profiles.map((profile) => (profile.id === activeId && profile.name !== label ? { ...profile, name: label } : profile));
      if (next.some((profile, i) => profile !== profiles[i]) && writeProfiles(next)) set({ profiles: next });
    }
  },
  setSyncId: (profileId, syncId) => {
    const next = get().profiles.map((profile) => {
      if (profile.id !== profileId) return profile;
      const { syncId: _old, ...rest } = profile;
      void _old;
      return syncId ? { ...rest, syncId } : rest;
    });
    if (!writeProfiles(next)) return false;
    set({ profiles: next });
    return true;
  },
  addSyncedProfile: (name, syncId, incoming) => {
    const id = uid();
    const created = withProfile(get().profiles, name, id);
    const profile = created?.[created.length - 1];
    if (!created || !profile) return null;
    if (!put(profile.store, JSON.stringify(normalizeData(incoming)))) return null;
    const next = created.map((item) => (item.id === id ? { ...item, syncId } : item));
    if (!writeProfiles(next)) {
      drop(profile.store);
      return null;
    }
    set({ profiles: next });
    return id;
  },
  restoreRoom: () => {
    flushSpread();
    return restoreCapacity(get().profiles.length, emptyProfileId(get()) !== null);
  },
  restoreAsNew: (payload, select) => {
    flushSpread();
    const emptyId = emptyProfileId(get());
    const plan = planRestoreAsNew(payload, get().profiles, uid, { select, replaceEmpty: emptyId });
    if (!plan.ok) return plan;
    // All or nothing: bodies, then the roster as the commit point, with every key journalled so a
    // failure (or a kill part-way) puts everything back.
    const committed = commitRestore(txStorage, { writes: plan.writes, rosterKey: PROFILES_KEY, rosterValue: JSON.stringify(plan.profiles) });
    if (!committed.ok) return { ok: false, reason: committed.rolledBack ? "write-failed" : "rollback-failed" };
    failureReported = false;
    notifyStorageChanged();
    if (plan.replacedId && plan.replacedId === get().activeId) {
      const filled = plan.profiles.find((profile) => profile.id === plan.replacedId);
      if (filled) {
        const loaded = adopt(filled);
        set({ profiles: plan.profiles, ...loaded });
        return { ok: true, added: plan.writes.length, replacedEmpty: true, skipped: plan.skipped };
      }
    }
    set({ profiles: plan.profiles });
    return { ok: true, added: plan.writes.length, replacedEmpty: plan.replacedId !== null, skipped: plan.skipped };
  },
}));

/**
 * Back up the whole planner: every profile, the roster and the settings. The active profile is
 * taken from memory, so a change that has not reached storage yet is still in the file.
 */
export async function saveBackup(data: SpreadData): Promise<SaveResult> {
  flushSpread();
  const payload = collectFullPayload(localStorage, new Date(), null);
  const activeId = useSpread.getState().activeId;
  if (activeId) payload.stores[activeId] = JSON.stringify(data);
  const blob = new Blob([await fullBackupText(payload)], { type: "application/octet-stream" });
  return saveFile(blob, `Spread-${data.currentWeek}.spread`);
}
