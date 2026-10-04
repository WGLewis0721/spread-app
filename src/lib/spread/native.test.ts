import assert from "node:assert/strict";
import test from "node:test";
import { isNativeApp, isShareCancel } from "./native.ts";

test("the web build is never mistaken for the installed app", () => {
  assert.equal(isNativeApp(), false, "no window at all (server render)");
  const holder = globalThis as unknown as { window?: unknown };
  holder.window = {};
  assert.equal(isNativeApp(), false, "a browser with no Capacitor bridge");
  holder.window = { Capacitor: { isNativePlatform: () => false } };
  assert.equal(isNativeApp(), false, "Capacitor running as a web page");
  holder.window = { Capacitor: { isNativePlatform: () => true } };
  assert.equal(isNativeApp(), true);
  holder.window = { Capacitor: { isNativePlatform: () => { throw new Error("boom"); } } };
  assert.equal(isNativeApp(), false, "a broken bridge falls back to web behavior");
  delete holder.window;
});

test("dismissing the share sheet is a cancel, not a failure", () => {
  assert.equal(isShareCancel(new Error("Share canceled")), true);
  assert.equal(isShareCancel("Share cancelled"), true);
  assert.equal(isShareCancel(new Error("No space left on device")), false);
  assert.equal(isShareCancel(undefined), false);
});
