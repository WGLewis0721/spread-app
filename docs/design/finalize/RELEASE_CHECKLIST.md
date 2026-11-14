# Spread | Release Evidence (publish finalize)

> Part of the Spread design brain. Start at [../README.md](../README.md). Folder index: [README.md](README.md).

> Summary: the Gray Matter release template, filled for Spread at base `6f53a60`. Verdict **NO-GO**. Web checks pass. Native, device and store checks are unverified. Source review (2026-11-14) finds the core decisions in code, a release blocker in the Xcode device-family setting (X1), and four owner decisions before code (X2 to X5). The proof still owed is the iPhone script in [DEVICE_TEST_SCRIPT.md](DEVICE_TEST_SCRIPT.md), run on a Codemagic TestFlight build. Build green does not mean the app is complete or approved.

Gray Matter's `templates/RELEASE_CHECKLIST.md` is mapped here. The App Store gate is the authority for App Review: [docs/APP_STORE_REVIEW_CHECKLIST.md](../../APP_STORE_REVIEW_CHECKLIST.md). This file does not repeat it.

**Version:** 1.0 (`MARKETING_VERSION = 1.0`; build `CURRENT_PROJECT_VERSION = 1` in the project. Raise the build number for each upload.)
**Commit SHA:** base `6f53a60` on `main` (2026-11-14). The branch head is recorded in the pull request, not here, because a committed file cannot contain its own commit.
**Branch/PR:** `claude/finalize-w2-review-device-script` (draft PR against `main`; the link is in the PR).
**Candidate URL or TestFlight build:** none. No Codemagic build has been run for this base.
**Date:** 2026-11-14
**Owner/reviewer:** owner (pending)

## Product and design

- [ ] First core journey with real data: **not verified** on device. Life is the default root (OD18, applied in source). Device script steps A1 to A3, C1 and D1 to D7 cover it.
- [ ] Empty/loading/error/offline/permission states: **source review only**. Life and Classic empty states now have a heading, one sentence and an action (OD22, [CROSS_SURFACE_REVIEW.md](CROSS_SURFACE_REVIEW.md) section 3). Two title-only empties remain (X11). No screen has device evidence.
- [ ] Consistent brand/art/type and app icon: **open**. Applied in source: OD1 (Classic and Week), OD3, OD10, OD11, OD12, OD13, OD14, OD18, OD22 (most creation copy). Still open: Life's priority mark (C1, W2-3), the shared create-sheet title (C3, W2-4), the over-capacity word (X5, owner), the removal verb (X3, owner), "Not now" (X8), Recently Deleted casing (X9). See [corrections/copy-voice.md](corrections/copy-voice.md), [corrections/color-drift.md](corrections/color-drift.md) and [corrections/wave2-tokens-icons.md](corrections/wave2-tokens-icons.md). The app icon source exists; a person has not yet inspected it.
- [ ] Supported phone/tablet layouts; no clipping: **not verified**. OD20 says iPhone only, but the build still targets iPad (X1, [corrections/release-scope.md](corrections/release-scope.md)).
- [ ] Scroll, swipes, interruption, haptics: **not verified** on device. The completion haptic is correct in source (OD2). Other haptics are an owner decision (X4).
- [ ] Dynamic Type/text zoom, focus/screen reader, reduced motion: **not verified** on device. Reduce Motion is read in 15 native files (re-counted 2026-11-14). Focus transport buttons are 44 pt (OD10).
- [ ] Screenshot/video evidence: landing before and after captures in `evidence/landing/`. **No native screenshots or video.**

## Engineering

- [x] Web build succeeded: `npm run build` exit 0 at the base (see the PR for the branch run).
- [x] Typecheck: `npm run typecheck` exit 0 at the base.
- [x] Lint: `npm run lint` exit 0 with 0 errors and 6 existing warnings at the base.
- [x] Unit tests: `npm test`, 282 tests: 278 passed, 4 skipped, 0 failed at the base.
- [x] Docs: `node scripts/design-docs.mjs` (`npm run docs:check`) exit 0 at the base. Rerun on this branch; the router is at its 9,000-byte budget (see the PR).
- [x] App Store preflight, unit tests: 16 of 16 pass at the base.
- [x] App Store preflight, source checks: 14 pass, 0 fail at the base.
- [x] Cross-surface source review: done. [CROSS_SURFACE_REVIEW.md](CROSS_SURFACE_REVIEW.md) lists findings X1 to X12 and covered findings C1 to C7, with file:line evidence on `6f53a60`.
- [ ] Native build (Codemagic, native-typecheck on GitHub macOS): **not run for this base**. No Swift toolchain here. Check the PR's native checks, if any run.
- [ ] Integration, E2E and device tests: **not run**. XCUITest sources exist (`ios/App/SpreadNativeUITests/`); no run record was inspected. No UI test asserts the old "Manage Life area" title (checked 2026-11-14).
- [ ] Local persistence, migrations, undo: **not verified**. Undo is inconsistent on Life (X2). Persistence is owned by the planner, which this program does not change.
- [N/A] Auth, account deletion, cross-user access: N/A. The native app has no account and no server path in the local-first contract. Re-check if sync or iCloud is enabled.
- [ ] Secrets, dependencies and licensing: no new dependency was added in this pass. Lucide license file present. Inter font license not reviewed. Other licenses not reviewed.
- [ ] Crash monitoring, backup, rollback: rollback is documented per correction. Crash monitoring is not verified.

## Business and launch

- [ ] Offers, prices and entitlements: **open**. The plan says $2.99, one-time. App Store Connect was not checked.
- [N/A] Test purchases, restore, cancellation, refund: N/A. The plan forbids in-app purchase for 1.0.
- [N/A] iOS IAP rules for digital goods: N/A for the same reason.
- [ ] Privacy, terms, support and metadata: the privacy policy link is on the landing page. The live page was not fetched. Metadata is not written. `docs/APP_STORE_REVIEW_CHECKLIST.md` lines 12 and 28 still say iPhone/iPad (X1).
- [ ] Store screenshots, reviewer demo account, signing: **not done**. Screenshots for iPad are needed only if iPad is in scope, which OD20 says it is not.
- [ ] Controlled publish and post-publish smoke test: **not planned in this program**. Owner authorization is required for any upload or submission.

**Decided (OD25):** the landing page has **no App Store link** until the listing exists (no `apps.apple.com` in `src/`, checked 2026-11-14). The TestFlight invitation stays. See [corrections/release-scope.md](corrections/release-scope.md).

## Verdict

**Verdict: NO-GO**

**Decided and recorded (not blocking):**

- OD20: Spread 1.0 is iPhone only, in the docs and copy. The build setting is still open (X1).
- OD25: no App Store link until the listing exists. The landing page keeps the TestFlight invitation.
- OD21: Health is teal `#30B0C7` on the landing page. The native default is still `#007AFF` (W2-4).
- OD18: Life is the default root. Applied in source (`SpreadLiveRoot.swift:16`).
- OD1 (Classic and Week), OD3, OD10, OD11, OD12, OD13, OD14: applied in source (see the Product section).
- OD7, OD8, OD22: "Life area", "Details", "Add Life" and "Add responsibility" are applied on the sheets and empties. The shared create-sheet title is W2-4.
- OD23 and OD24: the gradient stays on one lit action, and Life's Details delete with Undo stays as it is.

**Blocking issues (these keep the verdict at NO-GO):**

1. **No candidate build.** No Codemagic TestFlight build of a candidate SHA exists, and `native-typecheck` has not been checked for this base.
2. **Device script not run.** [DEVICE_TEST_SCRIPT.md](DEVICE_TEST_SCRIPT.md) (about 40 minutes) must pass on a candidate build. Its section 2 lists the steps expected to fail until fixes land.
3. **Build targets iPad (X1).** `TARGETED_DEVICE_FAMILY = "1,2"` in six places, against OD20. This is a release blocker. Needs the owner's confirmation and a native config change, which this docs lane does not make.
4. **Owner decisions before code.** X2 (one Undo row in Life, and whether Redo stays), X3 (one verb for removing a responsibility), X4 (the haptic policy beyond completion), and X5 (one over-capacity word).
5. **Wave-2 lanes not yet merged on `main`.** W2-1 deletes the dead Week Focus code (OD19). W2-2 adds the eight Lucide assets (OD11). W2-3 adds the disabled and scrim tokens (OD16, OD17), the shared ! mark on Life (OD1) and token adoption (C2). W2-4 sets the Health default (OD21) and the create-sheet title (OD7, OD22).
6. **No owner authorization** of a specific commit and build for release.

**Unverified checks:**

- Native build, native-typecheck, all XCUITest runs
- Device checks, all in [DEVICE_TEST_SCRIPT.md](DEVICE_TEST_SCRIPT.md): layout at 390, 820 and 1024, light and dark, Reduce Motion, VoiceOver, the largest Dynamic Type size, haptic count, the Undo row count, and the Undo position above the home indicator
- Contrast (no contrast tool was run)
- Landing: reduced-motion frames for the story and the week preview; the live privacy page; phone touch on the hero tray
- App Store Connect state, pricing, screenshots, age rating, support URL
- `docs/evidence/` (not readable in this session) and `docs/IOS_RELEASE.md` physical checklist items 4, 5 and 9 (backup, restore, upgrade)
- Gray Matter guides marked `inspected: false` in [REFERENCES.md](REFERENCES.md)
- Design skills (`design:design-critique`, `design:design-system`, `design:accessibility-review`, `design:ux-copy`): not available in the session that wrote this review

**Rollback:**

- Landing: revert the landing commit. The landing renders illustrative data only and never touches the planner.
- Native: revert the lane's commit or the corrective commit. Keep the last TestFlight build and the golden commit available, as the release plan requires. Do not change a `golden/*` branch.
- Corrections: each record names its rollback in its own file.

**Reviewer:** owner (pending)

**Post-launch observation:** not applicable until a release is authorized.

---

**Build green is not app complete, data secure, payments collected, or App Store approved.** A release needs the owner's written authorization of a specific commit and build, separate from CI passing.
