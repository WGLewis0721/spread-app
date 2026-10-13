import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACCESS_MESSAGES,
  createAccessChecker,
  devAllowlist,
  isAccessActive,
  normalizeEmail,
  PASSWORD_MAX,
  PASSWORD_MIN,
  validatePassword,
  type AccessRecord,
} from "./beta-access.ts";
import { createSheetsStore } from "./waitlist.server.ts";

const NOW = Date.parse("2026-10-13T12:00:00Z");

test("only an approved row opens the beta", () => {
  assert.equal(isAccessActive({ status: "approved" }, NOW), true);
  assert.equal(isAccessActive({ status: "  Approved " }, NOW), true);
  for (const status of ["waitlisted", "invited", "paused", "revoked", "unsubscribed", "", "approved!", "disapproved"]) {
    assert.equal(isAccessActive({ status }, NOW), false, status);
  }
  assert.equal(isAccessActive(null, NOW), false);
  assert.equal(isAccessActive(undefined, NOW), false);
});

test("access_until ends access, and a date that can't be read never extends it", () => {
  assert.equal(isAccessActive({ status: "approved", accessUntil: "2026-10-14" }, NOW), true);
  assert.equal(isAccessActive({ status: "approved", accessUntil: "2026-10-13T11:59:59Z" }, NOW), false);
  assert.equal(isAccessActive({ status: "approved", accessUntil: "2026-10-12" }, NOW), false);
  assert.equal(isAccessActive({ status: "approved", accessUntil: "next friday" }, NOW), false);
  assert.equal(isAccessActive({ status: "approved", accessUntil: "   " }, NOW), true);
});

test("passwords need 10 to 128 characters", () => {
  assert.equal(validatePassword("x".repeat(PASSWORD_MIN)), null);
  assert.equal(validatePassword("x".repeat(PASSWORD_MAX)), null);
  assert.equal(validatePassword("x".repeat(PASSWORD_MIN - 1)), ACCESS_MESSAGES.passwordShort);
  assert.equal(validatePassword("x".repeat(PASSWORD_MAX + 1)), ACCESS_MESSAGES.passwordLong);
  assert.equal(validatePassword(undefined), ACCESS_MESSAGES.passwordShort);
  assert.equal(validatePassword(12345678901), ACCESS_MESSAGES.passwordShort);
});

test("emails are matched trimmed and lowercased", () => {
  assert.equal(normalizeEmail("  Ada@Example.COM "), "ada@example.com");
  assert.equal(normalizeEmail(undefined), "");
  assert.equal(normalizeEmail(42), "");
});

function checker(rows: Record<string, AccessRecord>, opts: { fail?: () => boolean; ttlMs?: number } = {}) {
  let now = NOW;
  let reads = 0;
  const c = createAccessChecker({
    lookup: async (email) => {
      reads += 1;
      if (opts.fail?.()) throw new Error("sheet down");
      return rows[email] ?? null;
    },
    now: () => now,
    ttlMs: opts.ttlMs ?? 60_000,
  });
  return { c, reads: () => reads, advance: (ms: number) => (now += ms) };
}

test("the checker allows approved, denies everything else, and normalizes the email", async () => {
  const { c } = checker({ "ada@example.com": { status: "approved" }, "bob@example.com": { status: "revoked" } });
  assert.equal(await c.check(" ADA@example.com "), "allowed");
  assert.equal(await c.check("bob@example.com"), "denied");
  assert.equal(await c.check("nobody@example.com"), "denied");
  assert.equal(await c.check(""), "denied");
  assert.equal(await c.check(undefined), "denied");
});

test("results are cached for the TTL, then re-read so a Sheet change takes effect", async () => {
  const rows: Record<string, AccessRecord> = { "ada@example.com": { status: "approved" } };
  const { c, reads, advance } = checker(rows);
  assert.equal(await c.check("ada@example.com"), "allowed");
  assert.equal(await c.check("ada@example.com"), "allowed");
  assert.equal(reads(), 1);
  rows["ada@example.com"] = { status: "revoked" };
  advance(30_000);
  assert.equal(await c.check("ada@example.com"), "allowed");
  advance(31_000);
  assert.equal(await c.check("ada@example.com"), "denied");
  assert.equal(reads(), 2);
});

test("forget() makes a change apply immediately", async () => {
  const rows: Record<string, AccessRecord> = { "ada@example.com": { status: "approved" } };
  const { c } = checker(rows);
  assert.equal(await c.check("ada@example.com"), "allowed");
  rows["ada@example.com"] = { status: "paused" };
  c.forget("ADA@example.com");
  assert.equal(await c.check("ada@example.com"), "denied");
});

test("a Sheet outage fails closed, is not cached, and recovers", async () => {
  let down = true;
  const { c, reads } = checker({ "ada@example.com": { status: "approved" } }, { fail: () => down });
  assert.equal(await c.check("ada@example.com"), "unavailable");
  assert.equal(await c.check("ada@example.com"), "unavailable");
  assert.equal(reads(), 2);
  down = false;
  assert.equal(await c.check("ada@example.com"), "allowed");
});

test("simultaneous checks for one email share a single Sheet read", async () => {
  const { c, reads } = checker({ "ada@example.com": { status: "approved" } });
  const results = await Promise.all([c.check("ada@example.com"), c.check("ada@example.com"), c.check("ada@example.com")]);
  assert.deepEqual(results, ["allowed", "allowed", "allowed"]);
  assert.equal(reads(), 1);
});

test("the development allowlist is ignored in production and on Vercel", () => {
  assert.deepEqual([...(devAllowlist({ BETA_DEV_ALLOW: "A@x.com, b@y.com" }) ?? [])], ["a@x.com", "b@y.com"]);
  assert.equal(devAllowlist({ BETA_DEV_ALLOW: "a@x.com", NODE_ENV: "production" }), null);
  assert.equal(devAllowlist({ BETA_DEV_ALLOW: "a@x.com", VERCEL: "1" }), null);
  assert.equal(devAllowlist({}), null);
});

// --- the Sheet lookup ---------------------------------------------------------

let pemPromise: Promise<string> | undefined;
const testPem = () =>
  (pemPromise ??= (async () => {
    const keys = (await crypto.subtle.generateKey(
      { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
      true,
      ["sign", "verify"],
    )) as CryptoKeyPair;
    const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keys.privateKey));
    return `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...pkcs8)).match(/.{1,64}/g)!.join("\n")}\n-----END PRIVATE KEY-----\n`;
  })());

function sheetWith(rows: string[][]) {
  const urls: string[] = [];
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    if (url.startsWith("https://oauth2.googleapis.com/token"))
      return new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), { status: 200 });
    return new Response(JSON.stringify({ values: rows }), { status: 200 });
  }) as typeof fetch;
  return { urls, fetch: fetchImpl };
}

test("lookupAccess reads columns B:F and returns status and access_until", async () => {
  const sheet = sheetWith([
    ["ada@example.com", "Ada", "v1", "approved", "2026-12-31"],
    ["bob@example.com", "Bob", "v1", "waitlisted"], // trailing empty cells are omitted by Sheets
    ["  CAL@Example.com ", "Cal", "v1", "Approved"],
  ]);
  const store = createSheetsStore({ clientEmail: "bot@x", privateKey: await testPem(), spreadsheetId: "s", tab: "Beta", fetch: sheet.fetch });
  assert.deepEqual(await store.lookupAccess("ada@example.com"), { status: "approved", accessUntil: "2026-12-31" });
  assert.deepEqual(await store.lookupAccess("bob@example.com"), { status: "waitlisted", accessUntil: "" });
  assert.deepEqual(await store.lookupAccess("cal@example.com"), { status: "Approved", accessUntil: "" });
  assert.equal(await store.lookupAccess("nobody@example.com"), null);
  assert.ok(sheet.urls.some((url) => url.includes(encodeURIComponent("'Beta'!B2:F"))));
});

test("a failing Sheet read surfaces as an error (so the checker can fail closed)", async () => {
  const failing = (async (input: string | URL | Request) =>
    String(input).startsWith("https://oauth2")
      ? new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), { status: 200 })
      : new Response("{}", { status: 500 })) as typeof fetch;
  const store = createSheetsStore({ clientEmail: "bot@x", privateKey: await testPem(), spreadsheetId: "s", fetch: failing });
  await assert.rejects(() => store.lookupAccess("ada@example.com"));
  const c = createAccessChecker({ lookup: (email) => store.lookupAccess(email) });
  assert.equal(await c.check("ada@example.com"), "unavailable");
});
