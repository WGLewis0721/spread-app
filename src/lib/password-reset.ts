// Password reset for the web beta, with no email service. The tester asks for a reset and gets a
// short code on screen; they send you that code; you approve the request in the Sheet; they set a
// new password in the same browser. Pure and runtime-neutral (WebCrypto only) so it can be tested;
// the Sheet/database wiring lives in password-reset.server.ts.
//
// Two different secrets, on purpose:
//  - `code` (XXXX-XXXX) is NOT a secret. It is written in plain text on the Sheet row so you can
//    match what a tester tells you to the request. It proves nothing by itself.
//  - `token` is a long random secret that never leaves the requesting browser. Only its SHA-256
//    hash is stored. Completing a reset needs the token AND your approval, so someone who merely
//    knows an email address (or sees a code) cannot finish a reset.

import { normalizeEmail, validatePassword, type AccessResult } from "./beta-access.ts";

export const RESET_TTL_MS = 24 * 60 * 60_000;
/** Most pending requests written to the Sheet per email per day, however many times the form is used. */
export const RESET_ROWS_PER_DAY = 5;
export const RESET_REQUESTS_PER_DAY = 3;
export const RESET_ATTEMPTS_PER_HOUR = 10;

/** Sheet tab holding the requests. Row 1 is the header. */
export const RESET_TAB_DEFAULT = "Reset requests";
export const RESET_HEADERS = ["requested_at", "email", "code", "token_hash", "status"] as const;

export const RESET_STATUS = { pending: "pending", approved: "approved", denied: "denied", used: "used" } as const;

export const RESET_MESSAGES = {
  waiting: "Not approved yet. Send us your code and we'll approve it, usually within a day. Then come back here and try again.",
  denied: "That reset wasn't approved. Contact us if you think that's a mistake.",
  expired: "That reset has expired. Request a new code.",
  used: "That reset was already used. Request a new code.",
  inactive: "Beta access isn't active for this account. Contact us if you think that's a mistake.",
  limited: "Too many tries. Wait a while and try again.",
  unavailable: "We couldn't process that just now. Try again in a moment.",
  invalidEmail: "Enter a valid email address.",
  noRequest: "Start a reset first to get your code.",
} as const;

export interface ResetRow {
  requestedAt: string;
  email: string;
  code: string;
  tokenHash: string;
  status: string;
}
export interface ResetStore {
  append(row: ResetRow): Promise<void>;
  /** Every row, oldest first. `index` is the zero-based position below the header. */
  list(): Promise<{ row: ResetRow; index: number }[]>;
  setStatus(index: number, status: string): Promise<void>;
}

export type RequestResult =
  | { ok: true; code: string; token: string; expiresAt: string }
  | { ok: false; reason: "invalid-email" | "limited" | "unavailable" };

export type CompleteResult =
  | { ok: true }
  | {
      ok: false;
      reason: "weak-password" | "waiting" | "denied" | "expired" | "used" | "inactive" | "limited" | "unavailable";
      message: string;
    };

// No 0/O, 1/I/L: the code is read aloud and retyped.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newResetCode(random: (n: number) => Uint8Array = randomBytes): string {
  const bytes = random(8);
  const chars = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export function newResetToken(random: (n: number) => Uint8Array = randomBytes): string {
  let binary = "";
  for (const byte of random(32)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

/** Plain, uniform limiter: counts events per key in a sliding window. Best effort, per instance. */
export function createWindowLimiter({ limit, windowMs, now = Date.now, maxKeys = 10_000 }: { limit: number; windowMs: number; now?: () => number; maxKeys?: number }) {
  const hits = new Map<string, number[]>();
  return (key: string): boolean => {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((at) => t - at < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(t);
    hits.delete(key);
    hits.set(key, recent);
    if (hits.size > maxKeys) hits.delete(hits.keys().next().value as string);
    return true;
  };
}

const EMAIL = /^[^\s@"<>()[\],;:\\]+@[^\s@"<>()[\],;:\\]+\.[^\s@"<>()[\],;:\\]{2,}$/;
const validEmail = (email: string) => email.length <= 254 && EMAIL.test(email) && !/^[=+\-@']/.test(email);

export interface ResetServiceOptions {
  store: ResetStore;
  /** True when an account with a password exists for this (normalized) email. */
  hasAccount: (email: string) => Promise<boolean>;
  /** The beta allowlist check. A revoked tester cannot reset their way back in. */
  access: (email: string) => Promise<AccessResult>;
  /** Sets the new password and ends every existing session. False when there is no such account. */
  setPassword: (email: string, password: string) => Promise<boolean>;
  now?: () => number;
  random?: (n: number) => Uint8Array;
}

export function createResetService({ store, hasAccount, access, setPassword, now = Date.now, random }: ResetServiceOptions) {
  // Uniform for every email, so hitting a limit says nothing about whether an account exists.
  const requestLimit = createWindowLimiter({ limit: RESET_REQUESTS_PER_DAY, windowMs: RESET_TTL_MS, now });
  const attemptLimit = createWindowLimiter({ limit: RESET_ATTEMPTS_PER_HOUR, windowMs: 60 * 60_000, now });
  const inFlight = new Set<string>();

  const fail = (reason: Exclude<CompleteResult, { ok: true }>["reason"], message: string): CompleteResult => ({ ok: false, reason, message });

  return {
    /**
     * Always answers the same way for any well-formed email: a code and a token. A row reaches the
     * Sheet only when the email is approved AND has an account, so strangers can't fill it and
     * the answer never reveals who is registered.
     */
    async request(rawEmail: unknown): Promise<RequestResult> {
      const email = normalizeEmail(rawEmail);
      if (!validEmail(email)) return { ok: false, reason: "invalid-email" };
      if (!requestLimit(email)) return { ok: false, reason: "limited" };
      try {
        const allowed = await access(email);
        if (allowed === "unavailable") return { ok: false, reason: "unavailable" };
        const code = newResetCode(random);
        const token = newResetToken(random);
        const requestedAt = new Date(now());
        if (allowed === "allowed" && (await hasAccount(email))) {
          const rows = await store.list();
          const recent = rows.filter(
            ({ row }) => row.email === email && now() - Date.parse(row.requestedAt) < RESET_TTL_MS,
          ).length;
          if (recent < RESET_ROWS_PER_DAY) {
            await store.append({
              requestedAt: requestedAt.toISOString(),
              email,
              code,
              tokenHash: await hashToken(token),
              status: RESET_STATUS.pending,
            });
          }
        }
        return { ok: true, code, token, expiresAt: new Date(requestedAt.getTime() + RESET_TTL_MS).toISOString() };
      } catch {
        return { ok: false, reason: "unavailable" };
      }
    },

    async complete({ email: rawEmail, token, password }: { email: unknown; token: unknown; password: unknown }): Promise<CompleteResult> {
      const email = normalizeEmail(rawEmail);
      const weak = validatePassword(password);
      if (weak) return fail("weak-password", weak);
      if (!validEmail(email) || typeof token !== "string" || token.length < 20 || token.length > 200) {
        return fail("waiting", RESET_MESSAGES.waiting);
      }
      if (!attemptLimit(email)) return fail("limited", RESET_MESSAGES.limited);
      const tokenHash = await hashToken(token);
      if (inFlight.has(tokenHash)) return fail("waiting", RESET_MESSAGES.waiting);
      inFlight.add(tokenHash);
      try {
        const found = (await store.list()).find(({ row }) => row.tokenHash === tokenHash && row.email === email);
        // No row looks exactly like a pending one: the token holder learns nothing about eligibility.
        if (!found) return fail("waiting", RESET_MESSAGES.waiting);
        const { row, index } = found;
        const age = now() - Date.parse(row.requestedAt);
        if (!Number.isFinite(age) || age >= RESET_TTL_MS || age < 0) return fail("expired", RESET_MESSAGES.expired);
        const status = row.status.trim().toLowerCase();
        if (status === RESET_STATUS.used) return fail("used", RESET_MESSAGES.used);
        if (status === RESET_STATUS.denied) return fail("denied", RESET_MESSAGES.denied);
        if (status !== RESET_STATUS.approved) return fail("waiting", RESET_MESSAGES.waiting);
        const allowed = await access(email);
        if (allowed === "unavailable") return fail("unavailable", RESET_MESSAGES.unavailable);
        if (allowed === "denied") return fail("inactive", RESET_MESSAGES.inactive);
        // Spend the approval first: if anything later fails the tester just asks again, and an
        // approval can never be replayed.
        await store.setStatus(index, RESET_STATUS.used);
        if (!(await setPassword(email, password as string))) return fail("unavailable", RESET_MESSAGES.unavailable);
        return { ok: true };
      } catch {
        return fail("unavailable", RESET_MESSAGES.unavailable);
      } finally {
        inFlight.delete(tokenHash);
      }
    },
  };
}

export type ResetService = ReturnType<typeof createResetService>;

export function memoryResetStore(): ResetStore & { rows: ResetRow[] } {
  const rows: ResetRow[] = [];
  return {
    rows,
    async append(row) {
      rows.push({ ...row });
    },
    async list() {
      return rows.map((row, index) => ({ row: { ...row }, index }));
    },
    async setStatus(index, status) {
      if (rows[index]) rows[index].status = status;
    },
  };
}
