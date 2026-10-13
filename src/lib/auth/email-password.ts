/**
 * Local email/password sign-in (this app's Better Auth DB — not the broker).
 *
 * Spread's web beta turns this ON, but only for emails approved in the beta Sheet
 * (see the `hooks` block in `server.ts` and src/lib/beta-access.ts). Off by default in the template. To enable: set `emailAndPasswordEnabled` to `true` below,
 * then build sign-up / sign-in forms with `authClient.signUp.email` /
 * `authClient.signIn.email` from `@/lib/auth/client` (see the auth skill).
 *
 * Do NOT edit `server.ts` for this — that file is frozen pre-wired config.
 */
export const emailAndPasswordEnabled = true;
