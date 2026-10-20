// Server-only: decides who may use the web planner, from the Spread Beta Waitlist
// Sheet. Imported by the Better Auth hooks (src/lib/auth/server.ts) and by the
// session check (src/lib/beta-status.ts). Never import from client code.
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import {
  createAccessChecker,
  lookupAccessWithDirect,
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
  const databaseUrl = process.env["DATABASE_URL"]?.trim();
  // Owned by the same server-only database role as Better Auth. The one-off
  // tester is approved directly in Postgres; all other emails use the Sheet.
  const directDb = databaseUrl
    ? new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 3_000 })
    : null;
  return createAccessChecker({
    lookup: async (email) =>
      lookupAccessWithDirect(
        email,
        async (candidate) => {
          if (!directDb) return null;
          const { rows } = await directDb.query<{ status: string; access_until: Date | null }>(
            "SELECT status, access_until FROM beta_direct_access WHERE email = $1 LIMIT 1",
            [candidate],
          );
          const direct = rows[0];
          return direct
            ? { status: direct.status, accessUntil: direct.access_until?.toISOString() ?? "" }
            : null;
        },
        async (candidate) => {
          // No Sheet configured: all unlisted emails fail closed.
          if (!store) throw new Error("Beta Sheet is not configured.");
          return store.lookupAccess(candidate);
        },
      ),
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
