import { createServerFn } from "@tanstack/react-start";

/**
 * Where this visitor stands with the web beta. Asked on load, on focus and every few
 * minutes, so a row set to `paused`/`revoked` (or an expired `access_until`) in the
 * Sheet locks the person out at their next check.
 *
 *  - "ok"          signed in and still approved
 *  - "signed-out"  no session
 *  - "denied"      signed in, but the Sheet no longer approves this email (session ended)
 *  - "unavailable" the Sheet couldn't be read; keep the current state and retry
 */
export type BetaStatus =
  | { state: "ok"; email: string; name: string }
  | { state: "signed-out" | "denied" | "unavailable" };

export const getBetaStatus = createServerFn({ method: "GET" }).handler(async (): Promise<BetaStatus> => {
  const { betaAccess, betaAuthConfigured } = await import("@/lib/beta-access.server");
  if (!betaAuthConfigured()) return { state: "unavailable" };
  const [{ getRequestHeaders }, { auth }] = await Promise.all([
    import("@tanstack/react-start/server"),
    import("@/lib/auth/server"),
  ]);
  const headers = getRequestHeaders();
  // Bypass Better Auth's 5-minute signed-cookie cache so the database decides: a session ended by a
  // password reset or a sign-out elsewhere must stop opening the planner at the next check.
  const session = await auth.api
    .getSession({ headers: new Headers(headers as HeadersInit), query: { disableCookieCache: true } })
    .catch(() => null);
  const email = session?.user?.email;
  if (!session || !email) return { state: "signed-out" };
  const access = await betaAccess.check(email);
  if (access === "unavailable") return { state: "unavailable" };
  if (access === "denied") {
    await auth.api.signOut({ headers: new Headers(headers as HeadersInit) }).catch(() => undefined);
    return { state: "denied" };
  }
  return { state: "ok", email, name: session.user.name ?? "" };
});
