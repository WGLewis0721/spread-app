// Astra A08: consent is one value; a failed write or an unreadable store never becomes permission.
import assert from "node:assert/strict";
import test from "node:test";
import { CONSENT_KEY, readConsent, writeConsent, type ConsentStore } from "./consent.ts";

function mem(): ConsentStore & { map: Map<string, string>; failSet: boolean; failGet: boolean } {
  const map = new Map<string, string>();
  const s = {
    map,
    failSet: false,
    failGet: false,
    getItem(k: string) {
      if (s.failGet) throw new Error("blocked");
      return map.get(k) ?? null;
    },
    setItem(k: string, v: string) {
      if (s.failSet) throw new Error("quota");
      map.set(k, v);
    },
    removeItem(k: string) {
      map.delete(k);
    },
  };
  return s;
}

test("A08: a new install is unanswered, and nothing is permitted", () => {
  assert.equal(readConsent(mem()), "unanswered");
});

test("A08: 'Not now' whose write fails is not remembered as permission on the next launch", () => {
  const s = mem();
  s.failSet = true;
  assert.equal(writeConsent(s, "off"), false);
  s.failSet = false;
  assert.equal(readConsent(s), "unanswered", "the question is asked again; nothing was ever turned on");
});

test("A08: turning on whose write fails does not turn anything on", () => {
  const s = mem();
  s.failSet = true;
  assert.equal(writeConsent(s, "on"), false);
  s.failSet = false;
  assert.notEqual(readConsent(s), "on");
});

test("A08: an unreadable store reads as off, never on", () => {
  const s = mem();
  assert.equal(writeConsent(s, "on"), true);
  s.failGet = true;
  assert.equal(readConsent(s), "off");
});

test("A08: an unrecognised value is not consent", () => {
  const s = mem();
  s.map.set(CONSENT_KEY, "yes please");
  assert.equal(readConsent(s), "off");
});

test("A08: answers from earlier builds carry over, and an old opt-out stays an opt-out", () => {
  const optedOut = mem();
  optedOut.map.set("spread.cloud.backup.ack", "yes");
  optedOut.map.set("spread.cloud.backup", "off");
  assert.equal(readConsent(optedOut), "off");
  const optedIn = mem();
  optedIn.map.set("spread.cloud.backup.ack", "yes");
  assert.equal(readConsent(optedIn), "on");
  // The earlier build wrote 'answered' then 'off'; if only the first landed, it is unanswered here, not on.
  const half = mem();
  half.map.set("spread.cloud.backup", "off");
  assert.equal(readConsent(half), "off");
});

test("A08: a successful write replaces the older keys", () => {
  const s = mem();
  s.map.set("spread.cloud.backup.ack", "yes");
  s.map.set("spread.cloud.backup", "off");
  assert.equal(writeConsent(s, "on"), true);
  assert.equal(readConsent(s), "on");
  assert.equal(s.map.has("spread.cloud.backup"), false);
});
