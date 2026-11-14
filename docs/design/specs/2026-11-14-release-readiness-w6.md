# Spec: Release readiness evidence for Spread 1.0 (workstream W6)

> Part of the Spread design brain. Start at [../README.md](../README.md). Follow [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md).

> Summary: an audit-first release-readiness pass. It corrects the one clearly wrong privacy manifest entry, drafts the App Store package, the screenshot shot list, an owner device-test script and a release-candidate evidence record, and ranks the blockers and owner decisions. It does not sign, upload, submit, merge or release.

| | |
| --- | --- |
| Request | Finalize Spread for App Store publication: audit first, then docs and scripts only, with an honest evidence record. |
| Restated | For the owner (who approves release) and the device tester: prove what the shipped 1.0 build does, list what is not proven, and leave every store claim true of that build. |
| Surface | iPhone app (SwiftUI, iPhone only) and its App Store package. No planner, landing or cloud change. |
| Size | M. Audit tables plus draft docs; one manifest correction. |
| Author | Claude Code, 2026-11-14 |
| Status | In review. Draft pull request; not merged, not released. |
| Governing docs read | [../../../CLAUDE.md](../../../CLAUDE.md); [../README.md](../README.md); [../RULES_CARD.md](../RULES_CARD.md); [../DECISIONS.md](../DECISIONS.md); [finalize plan](2026-11-14-publish-finalize-plan.md) sections 8 and 9; [../../APP_STORE_REVIEW_CHECKLIST.md](../../APP_STORE_REVIEW_CHECKLIST.md); [../../APP_REVIEW_NOTES.md](../../APP_REVIEW_NOTES.md); [../../IOS_RELEASE.md](../../IOS_RELEASE.md); [../../IOS_AUTOMATION.md](../../IOS_AUTOMATION.md); [../platforms/SPREAD_IPHONE_BUILD_GUIDE.md](../platforms/SPREAD_IPHONE_BUILD_GUIDE.md) sections 8 and 10; Gray Matter Gray Matter app-design SECURITY_AND_RELEASE.md and Gray Matter app-design templates RELEASE_CHECKLIST.md. Not readable in this session: `docs/evidence/` (access denied). |

## 1. Problem

The owner is about to decide whether to upload Spread 1.0 to App Store Connect. Several documents still describe an older build: one says the app targets iPad, the privacy policy says it covers iPad and a camera action, and the privacy manifest has not been audited. The owner needs one place that says what is proven, what is not, and what must change before any upload.

## 2. Evidence and context

- [Repo] `scripts/test_app_store_preflight.py`: 20 unit tests pass. `scripts/app-store-preflight.py` (source checks): 17 pass, 0 fail (run on `main` at 46404e2 and again after the manifest change).
- [Repo] Manifest audit: see [../../release/PRIVACY_MANIFEST_AUDIT.md](../../release/PRIVACY_MANIFEST_AUDIT.md). One real gap: `ProcessInfo.systemUptime` is used in three Swift files and was not declared (`SystemBootTime`, reason 35F9.1). Fixed in `ios/App/App/PrivacyInfo.xcprivacy`. The widget target has no manifest and uses App Group defaults; left open.
- [Repo] Build targets are iPhone only (`TARGETED_DEVICE_FAMILY = 1`, six configurations), so the iPad blocker in `docs/design/finalize/RELEASE_CHECKLIST.md` is resolved on `main` by #223 (8f9a7fe). That checklist is older than `main` and is not edited here.
- [Repo] `public/privacy.html` (live at https://thespreadapp.com/privacy.html, verified 2026-11-14) says the policy covers "the Spread iPhone and iPad app" and describes a camera action. Neither matches the shipped build.
- [Repo] No camera code exists in the native sources: the only photo path is `PhotosPicker` (`ios/SpreadNativeV2/Sources/SpreadNativeV2/Sheets/TaskSheet.swift`), which needs no camera permission. `NSCameraUsageDescription` remains in `Info.plist`.
- [Apple] Required-reason codes were checked against secondary sources, because Apple's page returned only its title on fetch. Re-check the codes in Xcode's upload validation.
- [Assumption] Apple's rules about app extensions and privacy manifests are read from secondary sources. Validate with an upload to App Store Connect before relying on them.

## 3. Goals, non-goals and budget

- **Goals:** a manifest that matches the code; a store package in which every claim is true of the shipped build; a device script a non-engineer can follow; a candidate record that says "not tested" wherever no evidence exists; a ranked blocker list.
- **Non-goals / no-gos:** no Swift or TypeScript product change; no signing, Codemagic run, TestFlight upload, App Store Connect change or release; no iCloud, sync, backup or entitlement change; no edits to `golden/*`; no new screenshots presented as real; no claim of readiness.
- **Appetite:** one PR, docs and one manifest file.

## 4. Rules that apply and exceptions needed

| Rule (document and section) | How this request touches it |
| --- | --- |
| [../RULES_CARD.md](../RULES_CARD.md) "Boundaries" | Cloud, sync, backup, schema, `Cloud/**`, `SpreadCloudCore/**`, `server/`, `golden/*` are not touched. The entitlements file is not edited. |
| [../RULES_CARD.md](../RULES_CARD.md) "iPhone only" and OD20 / OD28 | Store copy and the device script say iPhone only. |
| [../RULES_CARD.md](../RULES_CARD.md) "Nothing may claim iCloud works" | The store copy and privacy notes make no iCloud claim. |
| OD2, OD31 (haptics) | The device script checks that completion is the only success buzz. |
| OD10 (Dynamic Type honoured) | The device script checks the largest text size; the claim is unverified until it passes. |

**Exceptions needed (owner decides, do not assume):**

1. **Camera purpose string.** The Info.plist string describes a "Take Photo" action that does not exist. Removing it also means changing the preflight check that requires it, and the privacy policy sentence. Not changed here; see the release record, decision D1.
2. **iCloud entitlements, `NSUbiquitousContainers` and the `remote-notification` background mode** remain in the app target while iCloud is off. They sit in the entitlements and Info.plist, which this work does not change. Decision D2.
3. **Width list.** `CLAUDE.md` names 390, 820 and 1024 as the verify widths. OD20 makes the build iPhone only. This spec follows OD20 and tests iPhone widths and orientations only. Decision D9.

## 5. Options and the chosen concept

Size M: two options.

| Option | Idea | Pros | Cons |
| --- | --- | --- | --- |
| A | Fix every mismatch in code and plists now, including the camera string and iCloud keys | Smaller list | Changes product, entitlement and preflight behaviour without owner decision; forbidden paths |
| B | Fix only the manifest (clearly wrong, no product change), document everything else as owner decisions | Matches the boundaries; reviewable | More owner decisions to answer |

**Chosen: B.** The manifest gap is objective (declared reasons must cover used APIs) and is a manifest, not product behaviour. Everything else changes what the app does, what it claims or what it entitles, and needs the owner. **Rejected: A**, because it would design around the owner's rules silently.

### Breadboard of the chosen concept

- `ios/App/App/PrivacyInfo.xcprivacy`: adds `SystemBootTime` (35F9.1) and `1C8F.1` on UserDefaults.
- `docs/release/`: audit, store package, screenshot list, release record (the index is `README.md`).
- `docs/qa/IPHONE_OWNER_DEVICE_TEST_SCRIPT.md`: the physical-device script.
- Edits to the open-decision lines in `DECISIONS.md`, `docs/design/platforms/SPREAD_IPHONE_BUILD_GUIDE.md` section 10, and the stale device and minimum-iOS rows in `IOS_RELEASE.md`.

### States

- Store fields with unknown facts (support URL, legal name, app availability, price) are written as owner decisions, not guesses.
- Screenshot slots without a capture are marked "not captured".

## 6. Platform behavior

- **Widths and orientation:** iPhone only. Portrait and both landscape orientations as declared in `Info.plist`. The device script covers landscape. No iPad check.
- **Safe areas:** checked in the device script on the physical phone.
- **Appearance:** light and dark, system choice, status bar follows the planner's setting.
- **Accessibility:** Dynamic Type at the largest size, a VoiceOver spot check and Reduce Motion are in the device script. None of them is verified.
- **Input:** tap paths exist for every drag (Move to, Move hours once). Drag feel and haptic feel are owed to hardware.
- **Haptics and motion:** no change.

## 7. Technical approach

- **Where it lives:** manifest (one file); docs (new `docs/release/`, new `docs/qa/` script, spec, index row, three open-decision lines).
- **Data and state:** none changed.
- **Flags and rollout:** none. Cloud flags stay at 0 in `codemagic.yaml`.
- **Do not touch:** confirmed (see section 4).
- **Dependencies:** none added. `npm ci --ignore-scripts` was run locally to read the Capacitor plugins' manifests; `node_modules` is ignored by Git.
- **Performance and privacy:** no network call added. The store copy states the app keeps data on the device.

## 8. Risks, rabbit holes and open questions

| Item | Why it matters | Proposed default | Who decides |
| --- | --- | --- | --- |
| Widget extension has no `PrivacyInfo.xcprivacy` | Possible App Store validation failure for an extension that reads App Group defaults | Add a manifest with `1C8F.1` and wire it into the widget target in Xcode | Engineer with a Mac |
| `1C8F.1` and `35F9.1` checked from secondary sources | A wrong code is rejected at upload | Keep; confirm in upload validation | Release owner |
| Privacy policy text (iPad, camera) | The policy URL goes into App Store Connect | Correct the policy before submission | Website owner |
| Xcode 27.1 in Codemagic | Beta or unreleased SDKs are rejected at upload | Confirm it is a released Xcode | Release owner |
| Rabbit hole: rewriting `docs/evidence/` | Access denied in this session | Do not work around the denial; record it | n/a |

## 9. Verification and full-implementation plan

### Acceptance criteria

- Given the manifest, when it is parsed, then each API category used in the Swift sources has a declared reason, and the preflight still reports 0 failures.
- Given the store package, when each claim is checked against the device script, then no claim is about iCloud, sync, iPad, web planner, waitlist or accounts.
- Given the device script, when a non-engineer runs it on a TestFlight build, then each step has a pass or fail box and a stated expected result.
- Given the release record, when read by the owner, then no item is written as passed unless a command or device step in it was run.

### Checks

- Run: `python3 -m unittest discover -s scripts -p test_app_store_preflight.py -v` (20 tests, OK).
- Run: `python3 scripts/app-store-preflight.py` (17 passed, 0 failed).
- Run: `npm run docs:check` (see the release record for the result).
- Owed: IPA preflight, Xcode validation, physical iPhone script, Dynamic Type and VoiceOver on a device, haptic feel, widgets and Live Activity on a device, offline and force-quit on a device.

### Full-feature implementation and refinement plan

Not a feature. The owner runs the device script on a candidate build and returns the record. Any failed step becomes a new finding, not an edit to this PR.

## 10. Rollout, rollback and release

Draft pull request into `main`. Rollback: revert the manifest file and the docs folder. Release authority stays with the owner; this spec is not approval to upload, submit or release.

## 11. Decision record

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-11-14 | Correct the app privacy manifest (add SystemBootTime 35F9.1 and UserDefaults 1C8F.1). Leave widget manifest, camera string, iCloud keys and privacy policy text as owner decisions. | Claude Code (W6) | `ios/App/App/PrivacyInfo.xcprivacy`; this spec; `docs/release/`; `DECISIONS.md` open-decision row; `docs/design/platforms/SPREAD_IPHONE_BUILD_GUIDE.md` section 10; `IOS_RELEASE.md` device and minimum-iOS rows |
