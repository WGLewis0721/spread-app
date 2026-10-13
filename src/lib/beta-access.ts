// Beta access rules for the web planner. Pure and runtime-neutral so it can be
// unit-tested; the Sheet lookup and Better Auth wiring live in beta-access.server.ts.
//
// The Spread Beta Waitlist Sheet is the allowlist: a person can create an account
// or sign in only while their row says `approved` (and `access_until`, if set, is
// still in the future). Anything else — unknown, waitlisted, paused, revoked,
// expired, malformed — is denied. Failures to reach the Sheet are "unavailable",
// never "allowed".

export const APPROVED_STATUS = "approved";
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

export type AccessRecord = { status: string; accessUntil?: string };
export type AccessResult = "allowed" | "denied" | "unavailable";

/** Wording shown to people. Kept here so server and tests agree. */
export const ACCESS_MESSAGES = {
  notApproved:
    "We can't create an account for that email yet. Check the spelling, or reply to your invite email. If you've joined the waitlist, we'll email you when you're approved.",
  badCredentials: "That email or password isn't right.",
  unavailable: "We couldn't check your access just now. Try again in a moment.",
  inactive: "Beta access isn't active for this account. Contact us if you think that's a mistake.",
  passwordShort: `Use at least ${PASSWORD_MIN} characters.`,
  passwordLong: `Use at most ${PASSWORD_MAX} characters.`,
  notConfigured: "Beta sign-in isn't available yet. Try again later.",
} as const;

export const normalizeEmail = (email: unknown) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

/**
 * Approved, and not past `access_until`. A date that can't be read denies,
 * so a typo in the Sheet can never extend access.
 */
export function isAccessActive(record: AccessRecord | null | undefined, now = Date.now()): boolean {
  if (!record) return false;
  if (String(record.status ?? "").trim().toLowerCase() !== APPROVED_STATUS) return false;
  const until = String(record.accessUntil ?? "").trim();
  if (!until) return true;
  const time = Date.parse(until);
  return Number.isFinite(time) && time > now;
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length < PASSWORD_MIN) return ACCESS_MESSAGES.passwordShort;
  if (password.length > PASSWORD_MAX) return ACCESS_MESSAGES.passwordLong;
  return null;
}

export interface AccessCheckerOptions {
  /** Returns the person's Sheet row, or null when the email isn't listed. Throws when the Sheet can't be read. */
  lookup: (email: string) => Promise<AccessRecord | null>;
  now?: () => number;
  /** How long a result is reused. Keeps a busy site inside Google's read quota. */
  ttlMs?: number;
  maxEntries?: number;
}

/** Cached, fail-closed access check. Errors are never cached. */
export function createAccessChecker({
  lookup,
  now = Date.now,
  ttlMs = 60_000,
  maxEntries = 5_000,
}: AccessCheckerOptions) {
  const cache = new Map<string, { at: number; record: AccessRecord | null }>();
  const pending = new Map<string, Promise<AccessRecord | null>>();

  async function record(email: string): Promise<AccessRecord | null> {
    const hit = cache.get(email);
    if (hit && now() - hit.at < ttlMs) return hit.record;
    let read = pending.get(email);
    if (!read) {
      read = lookup(email).finally(() => pending.delete(email));
      pending.set(email, read);
    }
    const found = await read;
    cache.delete(email);
    cache.set(email, { at: now(), record: found });
    if (cache.size > maxEntries) cache.delete(cache.keys().next().value as string);
    return found;
  }

  return {
    async check(rawEmail: unknown): Promise<AccessResult> {
      const email = normalizeEmail(rawEmail);
      if (!email) return "denied";
      try {
        return isAccessActive(await record(email), now()) ? "allowed" : "denied";
      } catch {
        return "unavailable";
      }
    },
    /** Forget one email (or all), so a change in the Sheet takes effect at once. */
    forget(email?: string) {
      if (email === undefined) cache.clear();
      else cache.delete(normalizeEmail(email));
    },
  };
}

export type AccessChecker = ReturnType<typeof createAccessChecker>;

/**
 * Local development only: BETA_DEV_ALLOW="a@x.com,b@y.com" (or BETA_DEV_ALLOW_FILE, re-read
 * on every check) stands in for the Sheet. Ignored whenever NODE_ENV is production or on Vercel.
 */
export function devAllowlist(env: Record<string, string | undefined>): Set<string> | null {
  if (env["NODE_ENV"] === "production" || env["VERCEL"]) return null;
  const raw = env["BETA_DEV_ALLOW"] ?? (env["BETA_DEV_ALLOW_FILE"] ? "" : undefined);
  if (raw === undefined) return null;
  return new Set(raw.split(",").map(normalizeEmail).filter(Boolean));
}
