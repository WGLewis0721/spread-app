# Spread | Release Evidence (publish finalize)

> Part of the Spread design brain. Start at [../README.md](../README.md). Folder index: [README.md](README.md).

> Summary: the Gray Matter release template, filled for Spread. Verdict **NO-GO**. Web checks pass. Native and store checks are unverified. Decisions OD1 to OD25 are recorded; several are not yet in code. Five correction records stay open until the code lands. Build green does not mean the app is complete or approved.

Gray Matter's `templates/RELEASE_CHECKLIST.md` is mapped here. The App Store gate is the authority for App Review: [docs/APP_STORE_REVIEW_CHECKLIST.md](../../APP_STORE_REVIEW_CHECKLIST.md). This file does not repeat it.

**Version:** 1.0 (per the release notes in `ReleaseNotes.swift`; "Current version 1.0" in the preflight)
**Commit SHA:** base `9248935` on `main`. The branch head is recorded in the pull request, not here, because a committed file cannot contain its own commit.
**Branch/PR:** `claude/finalize-e-evidence-landing` (draft PR against `main`)
**Candidate URL or TestFlight build:** none. No Codemagic build was run in this session.
**Date:** 2026-11-14
**Owner/reviewer:** owner (pending)

## Product and design

- [ ] First core journey with real data: **not verified** on device. Responsibilities → Hours → Week → Tasks is designed; no run record.
- [ ] Empty/loading/error/offline/permission states: **source review only**. Empty and error copy is inventoried in `screens.json`; no screen has device evidence.
- [ ] Consistent brand/art/type and app icon: **open**. Words are decided (OD7, OD8) but not applied: [corrections/copy-voice.md](corrections/copy-voice.md). Color: [corrections/color-drift.md](corrections/color-drift.md). Icon and token assets for wave 2: [corrections/wave2-tokens-icons.md](corrections/wave2-tokens-icons.md). App icon source exists; the preflight check "visually inspect it" was not done by a person.
- [ ] Supported phone/tablet layouts; no clipping: **not verified**. Universal scope is open ([corrections/release-scope.md](corrections/release-scope.md)).
- [ ] Scroll, swipes, interruption, haptics: **not verified** on device.
- [ ] Dynamic Type/text zoom, focus/screen reader, reduced motion: **not verified** on device. Reduce Motion is read in 16 native files; landing reduced-motion checks ran for overflow and errors only.
- [ ] Screenshot/video evidence: landing before and after captures in `evidence/landing/`. **No native screenshots or video.**

## Engineering

- [x] Web build succeeded: `npm run build` exit 0 (baseline and after changes, see the PR).
- [x] Typecheck: `npm run typecheck` exit 0.
- [x] Lint: `npm run lint` exit 0 with 0 errors and 6 existing warnings (baseline; recheck in the PR).
- [x] Unit tests: `npm test`, 282 tests: 278 passed, 4 skipped, 0 failed (baseline; recheck in the PR).
- [x] Docs: `npm run docs:check` passes after this folder was added (rechecked in the PR).
- [x] App Store preflight, unit tests: 16 of 16 pass (`python3 -m unittest discover -s scripts -p test_app_store_preflight.py -v`).
- [x] App Store preflight, source checks: 14 pass, 0 fail (`python3 scripts/app-store-preflight.py`).
- [ ] Native build (Codemagic, native-typecheck on GitHub macOS): **not run**. No Swift toolchain here.
- [ ] Integration, E2E and device tests: **not run**. XCUITest sources exist (`ios/App/SpreadNativeUITests/`); no run record was inspected.
- [ ] Local persistence, migrations, undo: **not reviewed** in this lane. Undo behavior is inventoried; persistence is owned by the planner, which this program does not change.
- [N/A] Auth, account deletion, cross-user access: N/A. The native app has no account and no server path in the local-first contract. Re-check if sync or iCloud is enabled.
- [ ] Secrets, dependencies and licensing: no new dependency was added in this pass. Lucide license file present. Inter font license not reviewed. Other licenses not reviewed.
- [ ] Crash monitoring, backup, rollback: rollback is documented per correction. Crash monitoring is not verified.

## Business and launch

- [ ] Offers, prices and entitlements: **open**. The plan says $2.99, one-time. App Store Connect was not checked.
- [N/A] Test purchases, restore, cancellation, refund: N/A. The plan forbids in-app purchase for 1.0.
- [N/A] iOS IAP rules for digital goods: N/A for the same reason.
- [ ] Privacy, terms, support and metadata: the privacy policy link is on the landing page. The live page was not fetched. Metadata is not written.
- [ ] Store screenshots, reviewer demo account, signing: **not done**. The plan requires 13-inch iPad screenshots only if iPad is in scope.
- [ ] Controlled publish and post-publish smoke test: **not planned in this program**. Owner authorization is required for any upload or submission.

**Decided (OD25):** the landing page has **no App Store link** until the listing exists. The TestFlight invitation stays. See [corrections/release-scope.md](corrections/release-scope.md).

## Verdict

**Verdict: NO-GO**

**Decided and recorded (not blocking):**

- OD20: Spread 1.0 is iPhone only. The superseding note for `APP_STORE_RELEASE_PLAN.md` lives in the owner-docs PR, not on this branch.
- OD25: no App Store link until the listing exists. The landing page keeps the TestFlight invitation.
- OD21: Health is teal `#30B0C7`. The landing sample is updated in this PR.
- OD18: Life is the default root. Lane A applies it.
- OD7, OD8, OD22: the words "Life area", "Details", "Add Life" and "Add responsibility". Lanes A to D apply them.
- OD23 and OD24: the gradient stays on one lit action, and Life's Details delete with Undo stays as it is.

**Blocking issues (these keep the verdict at NO-GO):**

1. No native build. `native-typecheck` has not run on this branch, and there is no Codemagic build.
2. No device checks. No surface is verified on a phone or tablet, and no XCUITest run record was inspected.
3. Decided but not yet in code: OD18 and the OD7 and OD22 wording (lanes A to D), OD19 deletion of the dead Week Focus code (wave 2), OD11, OD16 and OD17 tokens and icons (wave 2), and the OD21 default in `model.ts` (wave 2).
4. The superseding note for `APP_STORE_RELEASE_PLAN.md` (OD20) is not on this branch.
5. No owner authorization of a specific commit and build for release.

**Unverified checks:**

- Native build, native-typecheck, all XCUITest runs
- Device checks: layout at 390, 820, 1024 and 1366, light and dark, Reduce Motion, VoiceOver, Dynamic Type, haptics, Undo position above the home indicator
- Contrast (no contrast tool was run)
- Landing: reduced-motion frames for the story and the week preview; the live privacy page; phone touch on the hero tray
- App Store Connect state, pricing, screenshots, age rating, support URL
- `docs/evidence/` (not readable in this session) and `docs/IOS_RELEASE.md`
- Gray Matter guides marked `inspected: false` in [REFERENCES.md](REFERENCES.md)

**Rollback:**

- Landing: revert the landing commit. The landing renders illustrative data only and never touches the planner.
- Native: revert the lane's commit or the corrective commit. Keep the last TestFlight build and the golden commit available, as the release plan requires. Do not change a `golden/*` branch.
- Corrections: each record names its rollback in its own file.

**Reviewer:** owner (pending)

**Post-launch observation:** not applicable until a release is authorized.

---

**Build green is not app complete, data secure, payments collected, or App Store approved.** A release needs the owner's written authorization of a specific commit and build, separate from CI passing.
