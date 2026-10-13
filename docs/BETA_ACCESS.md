# Beta access (web planner)

The web planner at https://thespreadapp.com opens only for people you approve. The
**Spread Beta Waitlist** Google Sheet is the allowlist. The installed iPhone app has
no sign-in; TestFlight is its gate. The landing page and the waitlist form stay public.

Implementation: `src/lib/beta-access.ts` (rules), `src/lib/beta-access.server.ts`
(Sheet lookup), the `hooks` block in `src/lib/auth/server.ts` (enforcement),
`src/lib/beta-status.ts` (session check), `src/spread/components/beta-access.tsx` and
`use-beta-gate.ts` (screens). Tests: `src/lib/beta-access.test.ts`, run by `npm test`.

## Running the beta

Sheet columns, tab and header row as in [WAITLIST_API.md](WAITLIST_API.md), plus an
optional column F:

```
submitted_at | email | name | consent_version | status | access_until
```

| `status` (column E) | Effect |
|---|---|
| `waitlisted` | Joined the list. Cannot create an account or sign in. |
| `approved` | Can create an account (once) and sign in. |
| `paused`, `revoked`, anything else | Cannot sign in. A signed-in tester is signed out at their next check. |

- **Approve:** set `status` to `approved`, then email them (iPhone: TestFlight invitation;
  Android/desktop: the site address). They choose **Create beta account** and pick their own
  password. You never see or send a password.
- **Limit how long:** put a date in `access_until` (e.g. `2026-11-30`). After it passes the person
  is locked out. A value that isn't a readable date also locks them out. Blank means no end.
- **Control the pace:** approve in waves. Only rows set to `approved` have access.
- **Revoke or pause:** change `status`. It takes effect within about a minute for new sign-ins,
  and a signed-in tester is signed out at their next check (every 5 minutes, or when they return to the tab).
- **Matching:** emails match case-insensitively with spaces trimmed. If a row is duplicated, the first one decides.

## What testers see

- **Create account, not approved:** "We can't create an account for that email yet. Check the spelling, or reply to your invite email. If you've joined the waitlist, we'll email you when you're approved."
- **Sign in, wrong password or not approved:** the same message, "That email or password isn't right." (identical on the wire, so the form can't be used to find out who is on the list).
- **Signed in, then revoked:** "Beta access isn't active for this account. Contact us if you think that's a mistake."
- **Sheet unreachable:** "We couldn't check your access just now. Try again in a moment." The check fails closed.

## Deploy settings (Vercel → Settings → Environment Variables)

Sign-up and sign-in **refuse** until all of these are set, so a half-configured deploy can't create
accounts that vanish. Production and Preview:

| Variable | Value |
|---|---|
| `DATABASE_URL` | A Postgres database (Neon, via Vercel Storage). The build applies `migrations/0001_auth.sql` to it. |
| `BETTER_AUTH_SECRET` | A long random string, e.g. `openssl rand -base64 32`. Keep it stable; changing it signs everyone out. |
| `BETTER_AUTH_URL` | `https://thespreadapp.com` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `WAITLIST_SPREADSHEET_ID`, `WAITLIST_SHEET_TAB` | As already set for the waitlist. The service account needs to read the Sheet (it already has Editor on the folder). |

Then redeploy. Check: create an account for an approved test email, sign out, sign in, then set the
row to `revoked` and confirm the next sign-in fails.

## Security notes and limits

- **Planner data stays on each tester's device.** The login protects the front door. The page's
  JavaScript is public, so a determined developer could patch it to skip the screen; they would
  still have no account, no data and no sync to reach. A stored value in the browser can no longer open the planner.
- **First to register an approved email wins.** There is no email verification. Someone who knows an
  approved tester's address could register it before the tester does. Approve an email only when
  you're ready for that person to sign up, and tell them to do it straight away. Email verification (needs an email service) closes this.
- **No password reset yet.** A tester who forgets their password needs you to help (phase 2: a
  reset approved from a Sheet tab, no email service needed).
- **Rate limits** are per server instance (8 sign-ups and 12 sign-ins per 10 minutes per address). For a durable limit add a Vercel Firewall rule on `/api/auth/*`.
- **Local development:** with no Sheet configured every check fails closed. For local testing set
  `BETA_DEV_ALLOW="you@example.com"` (or `BETA_DEV_ALLOW_FILE=/path/to/list`). Both are ignored on Vercel and in production.
- The old public trial key (`SPR-DEMO-2026`) and license keys no longer open the web planner.
