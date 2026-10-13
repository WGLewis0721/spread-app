import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createResetService,
  createWindowLimiter,
  hashToken,
  memoryResetStore,
  newResetCode,
  newResetToken,
  RESET_MESSAGES,
  RESET_ROWS_PER_DAY,
  RESET_TTL_MS,
  type CompleteResult,
} from "./password-reset.ts";
import type { AccessResult } from "./beta-access.ts";
import { sheetsResetStore } from "./password-reset.server.ts";
import type { SheetsStore } from "./waitlist.server.ts";

const NOW = Date.parse("2026-10-13T12:00:00Z");
const GOOD = "brand-new-pass-1";

function setup(opts: { accounts?: string[]; access?: Record<string, AccessResult>; unavailable?: boolean } = {}) {
  let now = NOW;
  const store = memoryResetStore();
  const accounts = new Set(opts.accounts ?? ["ada@example.com"]);
  const access = opts.access ?? { "ada@example.com": "allowed" };
  const passwords: Record<string, string> = {};
  let storeDown = Boolean(opts.unavailable);
  const flaky = { ...store } as typeof store;
  flaky.list = async () => (storeDown ? Promise.reject(new Error("down")) : store.list());
  flaky.append = async (row) => (storeDown ? Promise.reject(new Error("down")) : store.append(row));
  flaky.setStatus = async (i, s) => (storeDown ? Promise.reject(new Error("down")) : store.setStatus(i, s));
  const service = createResetService({
    store: flaky,
    hasAccount: async (email) => accounts.has(email),
    access: async (email) => access[email] ?? "denied",
    setPassword: async (email, password) => {
      if (!accounts.has(email)) return false;
      passwords[email] = password;
      return true;
    },
    now: () => now,
  });
  return {
    service,
    store,
    passwords,
    access,
    advance: (ms: number) => (now += ms),
    down: (value: boolean) => (storeDown = value),
  };
}

const approve = (store: { rows: { status: string }[] }, i = 0) => (store.rows[i]!.status = "approved");
const reason = (r: CompleteResult) => (r.ok ? "ok" : r.reason);

test("codes are readable, tokens are long, and the hash of a token is stable", async () => {
  const code = newResetCode();
  assert.match(code, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/);
  const a = newResetToken();
  const b = newResetToken();
  assert.notEqual(a, b);
  assert.ok(a.length >= 40);
  assert.match(a, /^[A-Za-z0-9_-]+$/);
  assert.equal(await hashToken("x"), await hashToken("x"));
  assert.match(await hashToken("x"), /^[0-9a-f]{64}$/);
});

test("request: an approved tester with an account gets a code and one pending row", async () => {
  const { service, store } = setup();
  const r = await service.request("  Ada@Example.COM ");
  assert.ok(r.ok);
  assert.equal(store.rows.length, 1);
  const row = store.rows[0]!;
  assert.equal(row.email, "ada@example.com");
  assert.equal(row.status, "pending");
  assert.equal(row.code, r.code);
  assert.equal(row.requestedAt, new Date(NOW).toISOString());
  assert.equal(r.expiresAt, new Date(NOW + RESET_TTL_MS).toISOString());
  // The secret token is never stored; only its hash.
  assert.notEqual(row.tokenHash, r.token);
  assert.equal(row.tokenHash, await hashToken(r.token));
  assert.ok(!JSON.stringify(row).includes(r.token));
});

test("request: strangers and unapproved emails get the same answer and write nothing", async () => {
  const { service, store } = setup({ accounts: ["ada@example.com", "bob@example.com"], access: { "ada@example.com": "allowed", "bob@example.com": "denied" } });
  for (const email of ["nobody@example.com", "bob@example.com"]) {
    const r = await service.request(email);
    assert.ok(r.ok, email);
    assert.match(r.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.ok(r.token.length >= 40);
  }
  assert.equal(store.rows.length, 0);
});

test("request: approved email with no account (never signed up) writes nothing", async () => {
  const { service, store } = setup({ accounts: [], access: { "new@example.com": "allowed" } });
  assert.ok((await service.request("new@example.com")).ok);
  assert.equal(store.rows.length, 0);
});

test("request: bad email, a Sheet outage and an access outage are reported without a code", async () => {
  const bad = setup();
  for (const email of ["", "nope", "a@b", "=cmd@x.com", undefined, 12]) {
    assert.deepEqual(await bad.service.request(email), { ok: false, reason: "invalid-email" });
  }
  const down = setup({ unavailable: true });
  assert.deepEqual(await down.service.request("ada@example.com"), { ok: false, reason: "unavailable" });
  const accessDown = setup({ access: { "ada@example.com": "unavailable" } });
  assert.deepEqual(await accessDown.service.request("ada@example.com"), { ok: false, reason: "unavailable" });
  assert.equal(accessDown.store.rows.length, 0);
});

test("request: limited to 3 a day for any email, so a limit reveals nothing", async () => {
  const known = setup();
  const stranger = setup();
  for (const { service } of [known, stranger]) {
    const email = service === known.service ? "ada@example.com" : "ghost@example.com";
    const answers = [];
    for (let i = 0; i < 4; i++) answers.push(await service.request(email));
    assert.deepEqual(answers.map((a) => (a.ok ? "ok" : a.reason)), ["ok", "ok", "ok", "limited"]);
  }
});

test("request: never writes more than the daily row cap, but still answers normally", async () => {
  const { service, store } = setup();
  for (let i = 0; i < RESET_ROWS_PER_DAY; i++) {
    await store.append({ requestedAt: new Date(NOW - 1000).toISOString(), email: "ada@example.com", code: "AAAA-BBBB", tokenHash: `h${i}`, status: "pending" });
  }
  const r = await service.request("ada@example.com");
  assert.ok(r.ok);
  assert.equal(store.rows.length, RESET_ROWS_PER_DAY);
});

test("complete: waits for approval, then sets the password once and spends the approval", async () => {
  const { service, store, passwords } = setup();
  const r = await service.request("ada@example.com");
  assert.ok(r.ok);
  const args = { email: "ADA@example.com", token: r.token, password: GOOD };
  assert.equal(reason(await service.complete(args)), "waiting");
  assert.equal(passwords["ada@example.com"], undefined);
  approve(store);
  assert.deepEqual(await service.complete(args), { ok: true });
  assert.equal(passwords["ada@example.com"], GOOD);
  assert.equal(store.rows[0]!.status, "used");
  passwords["ada@example.com"] = "untouched";
  assert.equal(reason(await service.complete(args)), "used");
  assert.equal(passwords["ada@example.com"], "untouched");
});

test("complete: a denied request, an expired request and a wrong token or email all fail", async () => {
  const { service, store, advance } = setup({ accounts: ["ada@example.com", "eve@example.com"], access: { "ada@example.com": "allowed", "eve@example.com": "allowed" } });
  const r = await service.request("ada@example.com");
  assert.ok(r.ok);
  approve(store);
  // Someone who only knows the email, or has a different token, gets nothing.
  assert.equal(reason(await service.complete({ email: "ada@example.com", token: newResetToken(), password: GOOD })), "waiting");
  assert.equal(reason(await service.complete({ email: "eve@example.com", token: r.token, password: GOOD })), "waiting");
  assert.equal(reason(await service.complete({ email: "ada@example.com", token: "short", password: GOOD })), "waiting");
  store.rows[0]!.status = "denied";
  assert.equal(reason(await service.complete({ email: "ada@example.com", token: r.token, password: GOOD })), "denied");
  store.rows[0]!.status = "approved";
  advance(RESET_TTL_MS);
  assert.equal(reason(await service.complete({ email: "ada@example.com", token: r.token, password: GOOD })), "expired");
});

test("complete: knowing the code is not enough, and the code is not the token", async () => {
  const { service, store, passwords } = setup();
  const r = await service.request("ada@example.com");
  assert.ok(r.ok);
  approve(store);
  assert.equal(reason(await service.complete({ email: "ada@example.com", token: r.code, password: GOOD })), "waiting");
  assert.equal(passwords["ada@example.com"], undefined);
});

test("complete: a revoked tester cannot reset their way back in, and the approval is not spent", async () => {
  const { service, store, access, passwords } = setup();
  const r = await service.request("ada@example.com");
  assert.ok(r.ok);
  approve(store);
  access["ada@example.com"] = "denied";
  const args = { email: "ada@example.com", token: r.token, password: GOOD };
  assert.equal(reason(await service.complete(args)), "inactive");
  assert.equal(store.rows[0]!.status, "approved");
  assert.equal(passwords["ada@example.com"], undefined);
  access["ada@example.com"] = "allowed";
  assert.deepEqual(await service.complete(args), { ok: true });
});

test("complete: weak passwords are refused before anything is spent", async () => {
  const { service, store, passwords } = setup();
  const r = await service.request("ada@example.com");
  assert.ok(r.ok);
  approve(store);
  for (const password of ["short", "", undefined, 123456789012]) {
    assert.equal(reason(await service.complete({ email: "ada@example.com", token: r.token, password })), "weak-password");
  }
  assert.equal(store.rows[0]!.status, "approved");
  assert.equal(passwords["ada@example.com"], undefined);
});

test("complete: a Sheet outage, or an account that vanished, is reported and never reports success", async () => {
  const outage = setup();
  const r = await outage.service.request("ada@example.com");
  assert.ok(r.ok);
  approve(outage.store);
  outage.down(true);
  assert.equal(reason(await outage.service.complete({ email: "ada@example.com", token: r.token, password: GOOD })), "unavailable");

  const gone = setup();
  const g = await gone.service.request("ada@example.com");
  assert.ok(g.ok);
  approve(gone.store);
  (gone.passwords as Record<string, string>)["x"] = "";
  // The account is deleted after the request: the approval is spent, the tester asks again.
  const noAccount = createResetService({
    store: gone.store,
    hasAccount: async () => true,
    access: async () => "allowed",
    setPassword: async () => false,
    now: () => NOW,
  });
  assert.equal(reason(await noAccount.complete({ email: "ada@example.com", token: g.token, password: GOOD })), "unavailable");
});

test("complete: two simultaneous attempts with one approval set the password once", async () => {
  const { service, store, passwords } = setup();
  const r = await service.request("ada@example.com");
  assert.ok(r.ok);
  approve(store);
  const args = { email: "ada@example.com", token: r.token, password: GOOD };
  const results = (await Promise.all([service.complete(args), service.complete(args)])).map(reason);
  // Exactly one wins; the other is either turned away while the first is in flight ("waiting")
  // or arrives after the approval is spent ("used").
  assert.equal(results.filter((r) => r === "ok").length, 1);
  assert.ok(results.some((r) => r === "waiting" || r === "used"));
  assert.equal(store.rows[0]!.status, "used");
  assert.equal(passwords["ada@example.com"], GOOD);
});

test("complete: repeated guessing is rate limited per email", async () => {
  const { service } = setup();
  const outcomes: string[] = [];
  for (let i = 0; i < 12; i++) outcomes.push(reason(await service.complete({ email: "ada@example.com", token: newResetToken(), password: GOOD })));
  assert.equal(outcomes.filter((o) => o === "limited").length, 2);
  assert.equal(outcomes[0], "waiting");
});

test("the window limiter lets events through again once the window passes", () => {
  let now = 0;
  const allow = createWindowLimiter({ limit: 2, windowMs: 1000, now: () => now });
  assert.deepEqual([allow("a"), allow("a"), allow("a"), allow("b")], [true, true, false, true]);
  now = 1001;
  assert.equal(allow("a"), true);
});

test("the Sheet tab maps columns A:E, and statuses are written to the row's own cell", async () => {
  const calls: unknown[][] = [];
  const sheets = {
    readValues: async (tab: string, cells: string) => {
      calls.push(["read", tab, cells]);
      return [
        ["2026-10-13T11:00:00.000Z", " Ada@Example.com ", "K7M2-9QXP", " abc123 ", "approved"],
        ["2026-10-13T11:30:00.000Z", "bob@example.com", "AAAA-BBBB", "def456"],
      ];
    },
    appendValues: async (tab: string, cells: string, row: string[]) => void calls.push(["append", tab, cells, row]),
    writeValue: async (tab: string, cell: string, value: string) => void calls.push(["write", tab, cell, value]),
  } as unknown as SheetsStore;
  const store = sheetsResetStore(sheets, "Reset requests");
  const rows = await store.list();
  assert.deepEqual(rows[0], { index: 0, row: { requestedAt: "2026-10-13T11:00:00.000Z", email: "ada@example.com", code: "K7M2-9QXP", tokenHash: "abc123", status: "approved" } });
  assert.equal(rows[1]!.row.status, ""); // a missing cell reads as "not approved"
  await store.setStatus(1, "used");
  await store.append({ requestedAt: "t", email: "e", code: "c", tokenHash: "h", status: "pending" });
  assert.deepEqual(calls, [
    ["read", "Reset requests", "A2:E"],
    ["write", "Reset requests", "E3", "used"],
    ["append", "Reset requests", "A:E", ["t", "e", "c", "h", "pending"]],
  ]);
});

test("messages tell people what to do", () => {
  assert.match(RESET_MESSAGES.waiting, /Send us your code/);
  assert.match(RESET_MESSAGES.expired, /Request a new code/);
});
