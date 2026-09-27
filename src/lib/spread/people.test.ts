import assert from "node:assert/strict";
import test from "node:test";
import { PEOPLE_LIMIT, legacyPerson, parsePeople, personStore, withPerson } from "./people.ts";

test("two people never share a store", () => {
  const first = withPerson([], "Alex", "a");
  const both = first && withPerson(first, "Blair", "b");
  assert.ok(both);
  assert.equal(both[0].store, personStore("a"));
  assert.equal(both[1].store, personStore("b"));
  assert.notEqual(both[0].store, both[1].store);
  assert.equal(both[1].theme, "system");
  assert.equal(both[1].accent, null);
});

test("the eleventh person is refused", () => {
  let people = withPerson([], "One", "p0");
  assert.ok(people);
  for (let index = 1; index < PEOPLE_LIMIT; index += 1) {
    people = withPerson(people, `P${index}`, `p${index}`);
    assert.ok(people);
  }
  assert.equal(people.length, 10);
  assert.equal(withPerson(people, "Extra", "px"), null);
});

test("a saved roster drops foreign stores and stops at ten", () => {
  const rows: Record<string, unknown>[] = [
    { id: "me", name: "  Me  ", store: "spread.v1", theme: "dark", accent: "mint" },
    { id: "other", name: "Other", store: "spread.v1.nope" },
    { id: "ok", name: "Ok", store: personStore("ok"), theme: "nope", accent: 4 },
  ];
  for (let index = 0; index < 12; index += 1) {
    rows.push({ id: `n${index}`, name: `N${index}`, store: personStore(`n${index}`), theme: "light", accent: null });
  }
  const people = parsePeople(JSON.stringify(rows));
  assert.equal(people.length, 10);
  assert.equal(people[0].name, "Me");
  assert.equal(people[0].theme, "dark");
  assert.equal(people[0].accent, "mint");
  assert.equal(people[1].id, "ok");
  assert.equal(people[1].theme, "system");
  assert.equal(people[1].accent, null);
  assert.equal(parsePeople("nope").length, 0);
  assert.equal(legacyPerson("me", "light", null).store, "spread.v1");
});
