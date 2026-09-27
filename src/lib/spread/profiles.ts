import { STORE_KEY } from "./model.ts";

export const PROFILE_LIMIT = 10;
export const PROFILES_KEY = "spread.profiles";
export const ACTIVE_PROFILE_KEY = "spread.profile";

export type ProfileTheme = "system" | "light" | "dark";

export type Profile = {
  id: string;
  name: string;
  store: string;
  theme: ProfileTheme;
  accent: string | null;
};

type RosterStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function cleanName(name: string) {
  return name.trim().replace(/\s+/g, " ").slice(0, 24);
}

export function profileStore(id: string) {
  return `${STORE_KEY}.${id}`;
}

function isTheme(value: unknown): value is ProfileTheme {
  return value === "system" || value === "light" || value === "dark";
}

export function parseProfiles(raw: string | null): Profile[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    const profiles: Profile[] = [];
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (typeof row.id !== "string" || !row.id) continue;
      if (typeof row.name !== "string" || !cleanName(row.name)) continue;
      const store = row.store === STORE_KEY || row.store === profileStore(row.id) ? row.store : null;
      if (!store) continue;
      profiles.push({
        id: row.id,
        name: cleanName(row.name),
        store,
        theme: isTheme(row.theme) ? row.theme : "system",
        accent: typeof row.accent === "string" ? row.accent : null,
      });
      if (profiles.length === PROFILE_LIMIT) break;
    }
    return profiles;
  } catch {
    return [];
  }
}

export function legacyProfile(id: string, theme: ProfileTheme, accent: string | null): Profile {
  return { id, name: "Me", store: STORE_KEY, theme, accent };
}

export function withProfile(profiles: Profile[], name: string, id: string): Profile[] | null {
  if (profiles.length >= PROFILE_LIMIT) return null;
  if (!id || profiles.some((profile) => profile.id === id)) return null;
  const label = cleanName(name) || "Me";
  return [...profiles, { id, name: label, store: profileStore(id), theme: "system", accent: null }];
}

export function migrateRoster(storage: RosterStorage): Profile[] {
  const current = parseProfiles(storage.getItem(PROFILES_KEY));
  if (current.length > 0) return current;
  const previous = parseProfiles(storage.getItem("spread.people"));
  if (previous.length === 0) return [];
  storage.setItem(PROFILES_KEY, JSON.stringify(previous));
  storage.removeItem("spread.people");
  if (!storage.getItem(ACTIVE_PROFILE_KEY)) {
    const active = storage.getItem("spread.person");
    if (active) storage.setItem(ACTIVE_PROFILE_KEY, active);
  }
  storage.removeItem("spread.person");
  return previous;
}
