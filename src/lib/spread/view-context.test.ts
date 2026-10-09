import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_VIEW, parseViewContext, readViewContext, viewContextKey, writeViewContext } from "./view-context.ts";

function fake(initial: Record<string, string> = {}, fail = false) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k: string) => {
      if (fail) throw new Error("denied");
      return map.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (fail) throw new Error("full");
      map.set(k, v);
    },
  };
}

test("the key stays outside the spread. prefix that backups sweep", () => {
  assert.equal(viewContextKey("p1").startsWith("spread."), false);
  assert.notEqual(viewContextKey("p1"), viewContextKey("p2"));
});

test("each profile remembers its own view", () => {
  const s = fake();
  writeViewContext(s, "a", { view: "week", plane: "month" });
  writeViewContext(s, "b", { view: "spread", plane: "week" });
  assert.deepEqual(readViewContext(s, "a"), { view: "week", plane: "month" });
  assert.deepEqual(readViewContext(s, "b"), { view: "spread", plane: "week" });
});

test("missing, damaged or hostile values fall back to Spread", () => {
  assert.deepEqual(parseViewContext(null), DEFAULT_VIEW);
  assert.deepEqual(parseViewContext("{ nope"), DEFAULT_VIEW);
  assert.deepEqual(parseViewContext('{"view":"admin","plane":7}'), DEFAULT_VIEW);
  assert.deepEqual(parseViewContext("null"), DEFAULT_VIEW);
});

test("unavailable storage never throws", () => {
  const s = fake({}, true);
  assert.deepEqual(readViewContext(s, "a"), DEFAULT_VIEW);
  writeViewContext(s, "a", { view: "week", plane: "week" });
  assert.deepEqual(readViewContext(null, "a"), DEFAULT_VIEW);
  assert.deepEqual(readViewContext(s, null), DEFAULT_VIEW);
});
