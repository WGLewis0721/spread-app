import { STORE_KEY } from "./model.ts";

export const PEOPLE_LIMIT = 10;
export const PEOPLE_KEY = "spread.people";
export const ACTIVE_PERSON_KEY = "spread.person";

export type PersonTheme = "system" | "light" | "dark";

export type Person = {
  id: string;
  name: string;
  store: string;
  theme: PersonTheme;
  accent: string | null;
};

export function cleanName(name: string) {
  return name.trim().replace(/\s+/g, " ").slice(0, 24);
}

export function personStore(id: string) {
  return `${STORE_KEY}.${id}`;
}

function isTheme(value: unknown): value is PersonTheme {
  return value === "system" || value === "light" || value === "dark";
}

export function parsePeople(raw: string | null): Person[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    const people: Person[] = [];
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (typeof row.id !== "string" || !row.id) continue;
      if (typeof row.name !== "string" || !cleanName(row.name)) continue;
      const store = row.store === STORE_KEY || row.store === personStore(row.id) ? row.store : null;
      if (!store) continue;
      people.push({
        id: row.id,
        name: cleanName(row.name),
        store,
        theme: isTheme(row.theme) ? row.theme : "system",
        accent: typeof row.accent === "string" ? row.accent : null,
      });
      if (people.length === PEOPLE_LIMIT) break;
    }
    return people;
  } catch {
    return [];
  }
}

export function legacyPerson(id: string, theme: PersonTheme, accent: string | null): Person {
  return { id, name: "Me", store: STORE_KEY, theme, accent };
}

export function withPerson(people: Person[], name: string, id: string): Person[] | null {
  if (people.length >= PEOPLE_LIMIT) return null;
  if (!id || people.some((person) => person.id === id)) return null;
  const label = cleanName(name) || "Me";
  return [...people, { id, name: label, store: personStore(id), theme: "system", accent: null }];
}
