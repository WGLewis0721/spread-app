// OD21: Health is teal everywhere, including the default Health role, so it no longer shares School's blue.
import assert from "node:assert/strict";
import test from "node:test";
import { defaultData, SPREAD_CATEGORIES } from "./model.ts";

const categoryColor = (id: string) => SPREAD_CATEGORIES.find((item) => item.id === id)?.color;
const defaultHealth = () => defaultData().hats.find((hat) => hat.id === "health");

test("OD21: the default Health role uses the Health category teal", () => {
  assert.equal(defaultHealth()?.color, "#30B0C7");
  assert.equal(defaultHealth()?.color, categoryColor("health"));
});

test("OD21: the default Health role no longer shares School's blue", () => {
  assert.notEqual(defaultHealth()?.color, categoryColor("school"));
});
