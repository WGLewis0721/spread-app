// Server-only: decides who may use the web planner, from the Spread Beta Waitlist
// Sheet. Imported by the Better Auth hooks (src/lib/auth/server.ts) and by the
// session check (src/lib/beta-status.ts). Never import from client code.
import { readFileSync } from "node:fs";
import {
  createAccessChecker,
  devAllowlist,
  normalizeEmail,
  type AccessChecker,
  type AccessResult,
} from "./beta-access.ts";
import { sheetsStoreFromEnv } from "./waitlist.server.ts";

let checker: AccessChecker | undefined;

function build(): AccessChecker {
  const dev = devAllowlist(process.env);
  if (dev) {
    // Local testing only (devAllowlist is null on Vercel / in production). BETA_DEV_ALLOW_FILE
    // is re-read on every check, so an email can be removed without restarting the server.
    const file = process.env["BETA_DEV_ALLOW_FILE"];
    const allowed = () =>
      file ? new Set(readFileSync(file, "utf8").split(/[\s,]+/).map(normalizeEmail).filter(Boolean)) : dev;
    return createAccessChecker({
      lookup: async (email) => (allowed().has(email) ? { status: "approved" } : null),
      ttlMs: 0,
    });
  }
  const store = sheetsStoreFromEnv(process.env);
  return createAccessChecker({
    // No Sheet configured: every check is "unavailable" (fail closed), never "allowed".
    lookup: async (email) => {
      if (!store) throw new Error("Beta Sheet is not configured.");
      return store.lookupAccess(email);
    },
  });
}

export const betaAccess = {
  check: (email: unknown): Promise<AccessResult> => (checker ??= build()).check(email),
  forget: (email?: string) => checker?.forget(email),
};

/**
 * A deployed server needs a real database and a stable secret, or accounts would
 * live in memory and vanish between requests. Sign-up and sign-in refuse until
 * both are set, rather than quietly creating accounts that disappear.
 */
export function betaAuthConfigured(env: Record<string, string | undefined> = process.env): boolean {
  const deployed = Boolean(env["VERCEL"]) || env["NODE_ENV"] === "production";
  if (!deployed) return true;
  return Boolean(env["DATABASE_URL"]?.trim() && env["BETTER_AUTH_SECRET"]?.trim() && env["BETTER_AUTH_URL"]?.trim());
}

export { normalizeEmail };
