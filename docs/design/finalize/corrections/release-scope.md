# Correction: release scope, device families and the App Store link

> Part of the Spread design brain. Start at [../../README.md](../../README.md). Register: [../corrections.json](../corrections.json). Status: **open** for reviewer approval. OD20 is applied on main: the superseding note is in `APP_STORE_RELEASE_PLAN.md`. OD25 keeps the landing copy as it is. Decision: **resolved** by OD20 (iPhone only) and OD25 (no App Store link until the listing exists).

| Field | Value |
| --- | --- |
| Screens | P01 landing shell, P07 privacy facts, P08 start and TestFlight |
| Severity | High: store copy and device claims are not yet settled |
| Decided | OD20: Spread 1.0 is iPhone only; this supersedes the October universal line. OD25: the landing page keeps the TestFlight invitation |

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

## Added by the cross-surface review (base `6f53a60`, 2026-11-14)

Source: [../CROSS_SURFACE_REVIEW.md](../CROSS_SURFACE_REVIEW.md), finding X1 (high, blocks release).

- **The build still targets iPad.** `ios/App/App.xcodeproj/project.pbxproj` has six `TARGETED_DEVICE_FAMILY = "1,2"` entries. OD20 and `CLAUDE.md` say iPhone only. The OD20 record above is therefore applied in the docs and copy, not in the build settings.
- **The App Store checklist still says iPad.** `docs/APP_STORE_REVIEW_CHECKLIST.md:12` ("supported iPhone/iPad") and `:28` ("every supported iPhone/iPad layout") disagree with OD20.
- **Fix, owner first.** Confirm that 1.0 is iPhone only. Then set the family to `1` in every target, and align the checklist and the release plan in one change. The native config change sits outside the docs lane and was not made in this review.
- **Device evidence.** The device script records the device family result in its notes. Testing iPad is out of scope under OD20.

**OD28 (2026-11-14) decides X1:** 1.0 ships iPhone only. Wave 3 sets every target's family to `1`, and the checklist and preflight change in the same PR. The record stays open until that lands.

## Reviewer approval

Empty. Not closed.

## Rollback

Revert the landing copy commit.
