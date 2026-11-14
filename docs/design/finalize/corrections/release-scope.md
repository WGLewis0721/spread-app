# Correction: release scope, device families and the App Store link

> Part of the Spread design brain. Start at [../../README.md](../../README.md). Register: [../corrections.json](../corrections.json). Status: **open**. Decision owner: **owner**. Blocked on the App Store listing.

| Field | Value |
| --- | --- |
| Screens | P01 landing shell, P07 privacy facts, P08 start and TestFlight |
| Severity | High: store copy and device claims are not yet settled |
| Owner decision needed | Device families for 1.0; the landing CTA target and wording before the listing exists |

## Observed

- `CLAUDE.md` says the native iOS app is **iPhone only**.
- `APP_STORE_RELEASE_PLAN.md` (direction revised 2026-10-08) says Spread 1.0 is a **$2.99 universal app (iPhone and iPad)**, with iPad supporting all orientations. Its release checklist says to advertise only device families with accepted physical-device QA.
- The landing page says "Spread is in private beta on TestFlight" and links the TestFlight invitation in `src/lib/links.ts`. It has no App Store link. The plan says to "update the landing page App Store CTA only after the public listing is live".
- The privacy fact "Nothing to sync" is accurate while the cloud flags in `src/lib/spread/cloud-flags.ts` stay off. The plan says iCloud may be advertised only after its QA passes.

## Expected

One documented device scope. The landing copy names only what has passed QA. No App Store URL is added until the listing exists and the owner supplies it.

## Root cause

The product direction changed on 2026-10-08 (universal app), but `CLAUDE.md` was not updated, and the landing copy was written for the TestFlight stage.

## Affected files

- `CLAUDE.md` (owner-maintained; not changed here)
- `src/spread/screens/spread-app.tsx` (landing start copy; lane E, landing only)
- `src/lib/links.ts` (not changed)

## Safe corrective plan

1. Owner confirms the 1.0 device scope. Then align `CLAUDE.md` and the release plan in one change.
2. Landing copy stays on the TestFlight wording until the owner confirms the beta is open. This lane does not add an App Store link.
3. When a listing exists, the owner supplies its URL. Then the CTA and the nav "Join the beta" label change together.
4. Do not claim iPad or iCloud support in landing copy before QA.

## Exception for the owner

**No App Store link has been added.** There is no listing URL in the repo, and the release plan forbids updating the CTA before the listing is live. The landing CTA keeps the TestFlight link.

## Before and after evidence

Landing captures show the current TestFlight wording (`evidence/landing/`).

## Regression scenarios

- Start section and nav link open the TestFlight invitation in a new tab with `rel="noopener noreferrer"`.
- No claim of iPad or iCloud support appears on the landing page.
- Privacy facts stay true with cloud flags off.

## Reviewer approval

Empty. Not closed.

## Rollback

Revert the landing copy commit.
