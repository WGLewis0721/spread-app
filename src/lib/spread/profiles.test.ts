import assert from "node:assert/strict";
import test from "node:test";
import { PROFILE_LIMIT, legacyProfile, migrateRoster, parseProfiles, profileStore, withProfile } from "./profiles.ts";

test("two profiles never share a store", () => {
  const first = withProfile([], "Alex", "a");
  const both = first && withProfile(first, "Blair", "b");
  assert.ok(both);
  assert.equal(both[0].store, profileStore("a"));
  assert.equal(both[1].store, profileStore("b"));
  assert.notEqual(both[0].store, both[1].store);
  assert.equal(both[1].theme, "system");
  assert.equal(both[1].accent, null);
});

test("the eleventh profile is refused", () => {
  let profiles = withProfile([], "One", "p0");
  assert.ok(profiles);
  for (let index = 1; index < PROFILE_LIMIT; index += 1) {
    profiles = withProfile(profiles, `P${index}`, `p${index}`);
    assert.ok(profiles);
  }
  assert.equal(profiles.length, 10);
  assert.equal(withProfile(profiles, "Extra", "px"), null);
});

test("a saved roster drops foreign stores and stops at ten", () => {
  const rows: Record<string, unknown>[] = [
    { id: "me", name: "  Me  ", store: "spread.v1", theme: "dark", accent: "mint" },
    { id: "other", name: "Other", store: "spread.v1.nope" },
    { id: "ok", name: "Ok", store: profileStore("ok"), theme: "nope", accent: 4 },
  ];
  for (let index = 0; index < 12; index += 1) {
    rows.push({ id: `n${index}`, name: `N${index}`, store: profileStore(`n${index}`), theme: "light", accent: null });
  }
  const profiles = parseProfiles(JSON.stringify(rows));
  assert.equal(profiles.length, 10);
  assert.equal(profiles[0].name, "Me");
  assert.equal(profiles[0].theme, "dark");
  assert.equal(profiles[0].accent, "mint");
  assert.equal(profiles[1].id, "ok");
  assert.equal(profiles[1].theme, "system");
  assert.equal(profiles[1].accent, null);
  assert.equal(parseProfiles("nope").length, 0);
  assert.equal(legacyProfile("me", "light", null).store, "spread.v1");
});

test("a roster saved before the profile name keeps its weeks", () => {
  const saved = new Map<string, string>([
    ["spread.people", JSON.stringify([{ id: "a", name: "Alex", store: "spread.v1", theme: "dark", accent: null }])],
    ["spread.person", "a"],
  ]);
  const storage = {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => {
      saved.set(key, value);
    },
    removeItem: (key: string) => {
      saved.delete(key);
    },
  };
  const profiles = migrateRoster(storage);
  assert.equal(profiles[0].name, "Alex");
  assert.equal(saved.get("spread.profile"), "a");
  assert.equal(saved.has("spread.people"), false);
  assert.equal(saved.has("spread.person"), false);
  assert.equal(migrateRoster(storage)[0].id, "a");
});
