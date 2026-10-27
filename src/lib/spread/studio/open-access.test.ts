import assert from "node:assert/strict";
import test from "node:test";
import { isLocalFirstAccessEnabled } from "../open-access.ts";

test("local-first access is opt-in only; production without the flag remains gated", () => {
  for (const value of [undefined, null, "", "0", "false", "true", 1, true, "yes"]) {
    assert.equal(isLocalFirstAccessEnabled(value), false);
  }
  assert.equal(isLocalFirstAccessEnabled("1"), true);
});
