# Spread 1.0 | Release-candidate evidence record (W6)

> Part of the release folder. Index: [README.md](README.md). Design-level release record (wave 2, base `6f53a60`): [../design/finalize/RELEASE_CHECKLIST.md](../design/finalize/RELEASE_CHECKLIST.md). Owner device script: [../qa/IPHONE_OWNER_DEVICE_TEST_SCRIPT.md](../qa/IPHONE_OWNER_DEVICE_TEST_SCRIPT.md).

> Summary: the Gray Matter release template, filled for Spread 1.0 as far as this session can prove. Verdict **NO-GO**. Source checks and the manifest correction are done. No candidate build exists, no Swift was compiled, no device was used, and no store field was entered. Every unrun check is written as **not tested**.

**Version:** 1.0. `MARKETING_VERSION = 1.0` in the app, widget and UI-test targets. Build number: set by Codemagic at build time (`scripts/ios_build_number.py`); the project file holds `CURRENT_PROJECT_VERSION = 1`.
**Source commit:** base is `main` at `46404e2` (2026-11-14). The head of this branch is recorded in the pull request, not here, because a committed file cannot contain its own commit.
**Branch/PR:** `claude/w6-release-readiness-docs`, draft pull request into `main` (link in the PR).
**Candidate URL or TestFlight build:** none. No Codemagic run, no IPA, no App Store Connect record was touched.
**Date:** 2026-11-14.
**Owner/reviewer:** owner (pending).

## 0. Checks run in this session

| Check | Command or method | Result |
| --- | --- | --- |
| App Store preflight unit tests | `python3 -m unittest discover -s scripts -p test_app_store_preflight.py -v` | 20 tests, OK, before and after the manifest change |
| App Store preflight, source checks | `python3 scripts/app-store-preflight.py` | 17 passed, 0 failed, after the manifest change (includes iPhone-only build targets, no `~ipad` keys, privacy manifest present, camera string present, export key present) |
| Manifest parse | `plistlib` load of `ios/App/App/PrivacyInfo.xcprivacy` | Parses. Categories: FileTimestamp `C617.1`; UserDefaults `CA92.1`, `1C8F.1`; SystemBootTime `35F9.1` |
| Required-reason API search | Search of `ios/` Swift for each category (boot time, timestamps, disk space, keyboard, UserDefaults) | Recorded in [PRIVACY_MANIFEST_AUDIT.md](PRIVACY_MANIFEST_AUDIT.md) |
| SDK manifests | Read `node_modules/@capacitor/ios` manifests; grep plugin iOS sources (after `npm ci --ignore-scripts`, 325 packages) | Core declares no API types; Filesystem uses timestamps (covered); Haptics, Share, StatusBar: none found |
| Live privacy page | Fetch of https://thespreadapp.com/privacy.html | Loads. Still says "iPhone and iPad app" and describes a camera action |
| Store text lengths | Measured subtitle, promotional text, keywords and What's New | Within limits (see [APP_STORE_PACKAGE.md](APP_STORE_PACKAGE.md) section 6) |
| Docs check | `npm run docs:check` | First run failed (spec missing from the specs index). Row added. Re-run: `design-docs: ok`, exit 0 |

## 1. Not run, so **not tested**

- Swift compile, `xcodebuild`, `swift test` for `ios/SpreadNativeV2` and `ios/App/SpreadCloudCore`. No Xcode or Swift toolchain in this session.
- The IPA preflight (`--ipa`) and the bundle preflight (`--bundle dist-ios`). No IPA or bundle was produced.
- Codemagic signed build, Xcode upload validation, App Store Connect processing, TestFlight install. None was run, and none was authorized.
- Any physical iPhone or simulator test: layout, safe areas, Dark Mode, Reduce Motion, Dynamic Type, VoiceOver, haptic feel, widgets, Live Activity and Dynamic Island, backup and restore, offline, force-quit persistence.
- `npm run typecheck`, `npm run lint` and `npm run test:spread`. This PR changes no TypeScript (only docs and one plist), so they were not run.
- `docs/evidence/`. Access was denied in this session. Release history recorded there is unreviewed.
- `docs/APP_REVIEW_NOTES.md` device-model fields: no physical device tests exist to fill them.

## 2. Product and design

- [ ] First core journey with real data: **not tested** on a device. Script steps S1 to S4.
- [ ] Empty, loading, error, offline and permission states: **source only**. The Life empty heading "No Life areas yet" and the Plan Ahead copy are in source. Device: not tested (S1.2, S12).
- [ ] Brand, art, type and app icon: the 1024 px icon source exists (`ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/Icons.xcassets/app-icon-spread-cards.imageset`). **Not inspected by a person.** The preflight says to inspect it.
- [ ] Layouts (iPhone only, OD20): the build declares iPhone only and portrait plus both landscape orientations. **Not tested** on a device. Script S17.
- [ ] Scroll, swipes, interruption and haptics: completion haptic is the only success buzz in source (OD2). Haptic feel and the switch: **not tested** (S3.6, S9.4).
- [ ] Dynamic Type, VoiceOver, Reduce Motion: **not tested** (S13, S14, S16). The "Life text ... follow your text size setting" release note is a claim until S13 passes.
- [ ] Screenshots: **0 of 8 captured** ([SCREENSHOT_SHOT_LIST.md](SCREENSHOT_SHOT_LIST.md)). No mockups exist and none may be shown as screenshots.

## 3. Engineering

- [ ] Build succeeded (Codemagic, Xcode): **not tested**.
- [x] App Store preflight unit tests: 20 of 20 pass (run in this session).
- [x] App Store preflight, source checks: 17 pass, 0 fail (run in this session).
- [ ] Lint, typecheck and planner unit tests: **not run** (no TypeScript changed).
- [ ] Integration, E2E and device tests: **not tested**. XCUITest sources exist under `ios/App/SpreadNativeUITests/`, and none was run.
- [ ] Local persistence, migrations and undo: **not tested** on a device. Owned by the planner store, which this PR does not change. Script S11 and S12.
- [N/A] Auth, account deletion and cross-user access: the native app has no account and no sign-in path in source (the preflight "Native review access" and "Native entry" checks pass). Re-check if any account or cloud feature is enabled.
- [ ] Secrets, dependencies and licensing: no dependency added; no secret found in the changed files. Licences for the Inter font and other assets were **not reviewed**.
- [ ] Crash monitoring, backup and rollback: no crash-reporting SDK in the native build (no match in `package.json` or the Swift sources). Rollback for this PR: revert the manifest and docs commits. No TestFlight build exists to roll back to.

## 4. Privacy and security

- [x] Privacy manifest audit: done, see [PRIVACY_MANIFEST_AUDIT.md](PRIVACY_MANIFEST_AUDIT.md). One gap fixed (system boot time); one gap (widget manifest) and three owner decisions open.
- [ ] Privacy policy matches the build: **not met.** The live page says the policy covers iPad, and it describes a camera action. See blocker 3.
- [ ] Data handling as described: the native build sends no network request (the bridge test in `docs/IOS_RELEASE.md` recorded none). **Not re-tested in this session.**
- [ ] Entitlements and Info.plist match the features: **not met** for the iCloud keys and background mode while iCloud is off (decision D2).
- [x] Export-compliance key is set (`ITSAppUsesNonExemptEncryption` = `false`).

## 5. Business and launch

- [ ] Price ($2.99, one-time), territories and availability: **not checked** in App Store Connect.
- [N/A] In-app purchase, restore and refund: no IAP or StoreKit in the source. Not applicable for 1.0.
- [ ] Privacy, support and metadata: privacy URL resolves (https://thespreadapp.com/privacy.html) but its text must change. No support URL exists. Metadata is a draft ([APP_STORE_PACKAGE.md](APP_STORE_PACKAGE.md)), not entered.
- [ ] Store screenshots: 0 of 8. See section 2.
- [N/A] Reviewer demo account: the app has no sign-in. Confirm after device step S1.
- [ ] Controlled publish and post-publish smoke test: **not planned**. Owner authorization of a specific build is required before any upload or submission.

## 6. Ranked release blockers

These keep the verdict at NO-GO. The order is by how early each one stops an upload.

| Rank | Blocker | Who clears it | Evidence needed |
| --- | --- | --- | --- |
| 1 | No candidate build. No signed IPA of a named commit, no Codemagic run, no upload validation | Release engineer, then owner | Codemagic run link, IPA preflight output, Xcode validation result |
| 2 | Device script not run on a TestFlight build | Owner, with a physical iPhone | Completed [IPHONE_OWNER_DEVICE_TEST_SCRIPT.md](../qa/IPHONE_OWNER_DEVICE_TEST_SCRIPT.md) record with build number |
| 3 | Privacy policy text contradicts the build (iPad; camera action) | Website owner (`public/privacy.html`, outside this PR) | Corrected page, live URL, matching App Store Connect answer |
| 4 | Camera purpose string describes a feature that does not exist; the preflight requires the string | Owner (decision D1) | Decision recorded; string, preflight and policy changed together |
| 5 | Widget extension has no `PrivacyInfo.xcprivacy` and reads App Group defaults (`1C8F.1`) | Engineer with a Mac | Manifest added to the widget target and passing Xcode upload validation |
| 6 | Codemagic pins `xcode: 27.1`; not confirmed as a released Xcode | Release owner | Confirmation that the Xcode is released, recorded in the release record |
| 7 | iCloud entitlements, iCloud container and background mode present while iCloud is off | Owner (decision D2) | Decision, then a separate change (entitlements are off-limits in this workstream) |
| 8 | Accessibility and claims not yet proven: Dynamic Type, VoiceOver, haptic feel, widgets, Live Activity | Owner, device script S7, S8, S13, S14 | Pass marks for each step; otherwise the claim is removed from the store copy |
| 9 | What's New copy in the app (`ReleaseNotes.json`) makes claims that are not device-tested: the text-size behaviour, the completion-only haptic, the widget behaviour | Owner: keep, or pass the matching steps first | Pass marks for S3.6, S8, S13 |
| 10 | No support URL | Owner (decision D5) | A support page or a named URL the owner controls |
| 11 | App Store Connect fields not checked: name availability, category, price, territories, copyright, age rating, export answer | Owner | Entered values recorded in the release record |

## 7. Owner decisions

| ID | Decision | Recommendation |
| --- | --- | --- |
| D1 | Camera purpose string and the policy sentence about a camera action | Remove the key, its preflight check and the policy sentence. Add a camera feature only as a separate, approved change |
| D2 | iCloud entitlements, `NSUbiquitousContainers` and `remote-notification` background mode while iCloud is off | Remove them for 1.0 in a separate change that the owner approves, unless CloudKit push is intended. Live Activity and widget updates are local |
| D3 | Haptics switch. "Touch feedback" exists, but only inside Life's Gesture help sheet (`Life/LifeRoot.swift:1083`) and gates every haptic | Keep it. Decide whether it also belongs in More so people can find it |
| D4 | Dynamic Type. Decided (OD10): the app honours the system text size | Keep the decision. Claim it in the store only after S13 passes |
| D5 | Support URL | Create a support page on the public site |
| D6 | Store details: name availability, category, price, territories, copyright line, age-rating and export confirmations | Confirm in App Store Connect; the drafts are in APP_STORE_PACKAGE.md |
| D7 | Xcode version for the upload | Use a released Xcode that App Store Connect accepts |
| D8 | Verify widths. `CLAUDE.md` lists 390, 820 and 1024; OD20 makes the build iPhone only | Test iPhone widths and orientations only for 1.0. Record the change in CLAUDE.md through the owner |
| D9 | Reason codes `35F9.1`, `1C8F.1` and `CA92.1` were checked from secondary sources | Accept, provided upload validation accepts them |

## 8. Stale documents found (not edited in this PR)

| Document | What is stale | Owner |
| --- | --- | --- |
| [../design/finalize/RELEASE_CHECKLIST.md](../design/finalize/RELEASE_CHECKLIST.md) | Blocker 3 (iPad targets) is resolved on `main` by #223 (8f9a7fe). It cites "16 of 16" and "14 pass" preflight counts; the current counts are 20 and 17. Its device-script expected fails (X3, X8, X10, X4) may already be resolved by #225 (46404e2) and need re-checking | Wave-2 docs owner |
| [../design/finalize/DEVICE_TEST_SCRIPT.md](../design/finalize/DEVICE_TEST_SCRIPT.md) | Some expected-fail steps may now pass. The design-level script does not cover backup and restore, widget sizes or Plan Ahead copy-forward; the owner script does | Wave-2 docs owner |
| [../APP_REVIEW_NOTES.md](../APP_REVIEW_NOTES.md) | Contains a sentence about the web planner's beta allowlist, and device placeholders | Release owner |
| [../IOS_RELEASE.md](../IOS_RELEASE.md) | Physical checklist item 6 still describes "Take Photo"; the build has only the photo picker | Release owner |

## 9. Verdict

**Verdict: NO-GO** for any upload, TestFlight distribution or submission.

**Reason:** blockers 1 to 3 are open and no device step has run. Blockers 4 to 7 need owner decisions. The source checks pass, but passing source checks does not make the app complete, verified or approved.

**Build green is not app complete, not data-secure, not App Store approved.** A release needs the owner's written authorization of a specific commit and build, separate from CI.

**Rollback:** revert this PR. It changes one manifest file and documentation only. No runtime behaviour changes.

**Reviewer:** owner (pending).

**Post-launch observation:** not applicable until a release is authorized.
