# Spread 1.0: draft App Store package

> Part of the release folder. Index: [README.md](README.md). Spec: [../design/specs/2026-11-14-release-readiness-w6.md](../design/specs/2026-11-14-release-readiness-w6.md).

> Summary: draft copy and answers for App Store Connect, written only from what the shipped iPhone build does. Each claim names the device-script step that must pass before it is published. Nothing here is entered in App Store Connect. Items marked **Owner** need a decision.

Status: **draft, not published.** No candidate build exists yet, so no store claim is verified. Re-check each claim against the candidate's device-test record before entering it.

## 1. Listing fields

| Field | Draft | Limit | Check | Status |
| --- | --- | --- | --- | --- |
| App name | Spread | 30 characters | App Store Connect name availability | **Owner**: availability not checked |
| Subtitle | Plan your week in hours | 30 characters | Length is checked in section 6 | Draft |
| Promotional text | See section 2 | 170 characters | Length in section 6 | Draft |
| Keywords | See section 2 | 100 bytes | Length in section 6 | Draft |
| Description | See section 3 | 4,000 characters | Claim table, section 4 | Draft; **do not publish** until every row in section 4 passes |
| What's New | See section 2 | 4,000 characters | For a first release the field is normally not shown | Draft |
| Primary category | Productivity | | | **Owner** (proposal) |
| Secondary category | Lifestyle | | | **Owner** (proposal) |
| Price | $2.99, one-time, no in-app purchase | | Matches [APP_STORE_RELEASE_PLAN.md](../../APP_STORE_RELEASE_PLAN.md) "Commerce" and section 4 of the 2026-10-08 direction | **Owner**: confirm in App Store Connect |
| Territories | Owner decision | | | **Owner** |
| Languages | English (the app's development region is `en`, `ios/App/App/Info.plist`). No other localization was checked | | | Owner to confirm |
| Devices | iPhone only (OD20). `TARGETED_DEVICE_FAMILY = 1` in every target | | `scripts/app-store-preflight.py` | Source checks pass (17/17) |
| Minimum iOS | 17.0 (every target, `IPHONEOS_DEPLOYMENT_TARGET = 17.0`) | | Xcode | Not built here |
| Copyright | Owner to enter the legal name. The privacy page names Gray Matter LLC | | | **Owner** |
| Support URL | **None yet.** See section 5 | | | **Owner** |
| Privacy policy URL | https://thespreadapp.com/privacy.html (live, verified 2026-11-14) | | Content must be corrected first. See section 5 | **Blocked** on policy text |
| Marketing URL | Optional, not set | | | Owner |
| Sign-in required | **No** (no account; `APP_REVIEW_NOTES.md`) | | Source preflight checks "Native review access" and "Native entry" pass (17/17). Device step S1 pending | Pending device check |

## 2. Promotional text, keywords and What's New

**Promotional text** (draft):

> Set your weekly hours, place each task on the day it belongs, and plan ahead. Your planner stays on your iPhone.

**Keywords** (draft, comma-separated, no spaces):

> weekly planner,day planner,time blocking,schedule,hours,tasks,focus timer,calendar,life areas

Keyword rules: 93 bytes measured (limit 100). No competitor or trademarked names, and no word repeated from the title or subtitle.

**What's New** (version 1.0, first release; draft, use only if the field appears):

> Welcome to Spread: plan your week in hours, place each task on its own day, and keep your planner on your iPhone.

## 3. Description (draft)

> Spread is a weekly planner built around the hours you have.
>
> Start with your Life areas, such as Work, Family or Health. Give each one a weekly number of hours. Spread keeps a running total, so you can see how much of your week is planned and how much is still free.
>
> Place tasks on the day they belong. A task goes on a day only for its own Life area. Mark a task high priority to show a red exclamation mark. Priority never moves a task.
>
> The Week view lists every day, with a To place tray for tasks that still need a day. The Month calendar shows which days have planned hours.
>
> Plan Ahead helps when next week looks like this one. Copy this week forward in batches of eight weeks, or move hours to a future week once. Each change is previewed and waits for your confirmation. Nothing rolls over on its own.
>
> The Focus timer starts from today's planned time, in the app, from the Lock Screen, in the Dynamic Island or from a widget. Pause, go to the next step, stop a stretch or cancel the session. Each round and break starts only when you tap.
>
> Widgets show your day on the Home Screen. The Today widget also fits the Lock Screen. You choose whether Life area names appear outside Spread.
>
> Spread keeps your planner on your iPhone. There is no account and no sign-in. Back up Spread to save a backup file and a plan file to Files, or share your week as a Word document. Restore a backup, or add it as a new profile.
>
> Spread is a one-time purchase, with no subscription and no ads.

## 4. Claim table: each claim needs a passing device step

Paths in this table are relative to `ios/SpreadNativeV2/Sources/SpreadNativeV2/` unless they start with `ios/`.

| # | Claim in the description | Device-script step (in [../qa/IPHONE_OWNER_DEVICE_TEST_SCRIPT.md](../qa/IPHONE_OWNER_DEVICE_TEST_SCRIPT.md)) | Source support (not a device proof) |
| --- | --- | --- | --- |
| 1 | Set weekly hours per Life area, with a running total | S2 | `Life/LifeWeeklyTimeBudget.swift`, "Adjust hours" |
| 2 | A task goes on a day only for its own Life area | S3 | `Week/ToPlaceTray.swift`, `Week/WeekSurface.swift` |
| 3 | Red exclamation mark for high priority; it never moves a task | S3.5 | `Theme/SpreadPriorityMark.swift` ("High priority") |
| 4 | Week view with To place tray | S3.1, S3.7 | `Week/WeekSurface.swift`, `Week/ToPlaceTray.swift` |
| 5 | Month calendar shows which days have planned hours | S4.5 | `Week/MonthSurface.swift`; `LifeWeekView.swift` ("Month") |
| 6 | Plan Ahead copies this week forward in eight-week batches | S4.3 | `Life/LifePlanAheadSheet.swift` ("Copy this week forward") |
| 7 | Move hours to a future week once; preview, then confirm; no roll-over | S4.6 | `Life/LifePlanAheadSheet.swift` ("Move hours once", "Preview transfer") |
| 8 | Focus timer starts from today's planned time | S6.1 | `Focus/SpreadFocusTimerSheet.swift` ("Start today's block") |
| 9 | Pause, next step, stop a stretch, cancel the session | S6.2 to S6.5 | `Focus/SpreadFocusTimerSheet.swift` ("Pause", "Next step", "Stop this stretch", "Cancel session") |
| 10 | Lock Screen and Dynamic Island controls | S7 | `ios/App/SpreadWidget/SpreadTodayWidget.swift`, `SpreadTimerWidget.swift` |
| 11 | Today widget also fits the Lock Screen | S8.3 | `SpreadTodayWidget.swift` (`accessoryRectangular`, `accessoryCircular`) |
| 12 | Widgets on the Home Screen | S8.1, S8.2, S8.4, S8.5 | Widget `supportedFamilies` |
| 13 | Life area names appear outside Spread only if you turn them on | S9.5 | `Focus/SpreadFocusTimerSheet.swift` ("Show Life area name outside Spread") |
| 14 | Planner stays on the iPhone; no account or sign-in | S1, S12 | Source: no network or sign-in path in the native build (`docs/IOS_RELEASE.md`, Chromium run) |
| 15 | Back up Spread saves a backup file and a plan file to Files | S10.1 | `Sheets/BackupRestoreSheet.swift` ("Back up Spread") |
| 16 | Share your week as a Word document | S10.4 | `Sheets/ManageSheets.swift` ("Word document") |
| 17 | Restore a backup, or add it as a new profile | S10.2 | `Sheets/BackupRestoreSheet.swift` ("Restore and merge") |
| 18 | One-time purchase, no subscription, no ads | **Owner**: App Store Connect pricing | No StoreKit, ad or analytics SDK in `package.json` or the native sources (checked 2026-11-14) |

Do **not** add a claim about VoiceOver, Dynamic Type, iPad, Mac, Apple Watch, iCloud, sync, backup to iCloud, web access, sharing between people, or any other feature until its own step passes.

## 5. Support and privacy URLs

- **Privacy policy:** https://thespreadapp.com/privacy.html exists and loads (source `public/privacy.html`). Before it is entered in App Store Connect, its text must match the 1.0 build. Two sentences do not:
  - "This policy covers the Spread iPhone and iPad app" (the build is iPhone only, OD20).
  - "If you choose to attach a photo using your camera, Spread uses the camera only for that action" (no camera action exists; see decision D1).
  The policy also names the optional web waitlist, which is not part of the iOS app. That is accurate and may stay, but it should be labelled as the website.
- **Support URL:** none exists. The privacy page carries a contact address, but a support URL must be a page for support. **Owner decision D5**: create a support page on the public site, or name another URL the owner controls.

## 6. Length check (measured 2026-11-14)

| Field | Measured | Limit | Result |
| --- | --- | --- | --- |
| Subtitle | 23 characters | 30 | Pass |
| Promotional text | 112 characters | 170 | Pass |
| Keywords | 93 bytes | 100 | Pass |
| What's New | 113 characters | 4,000 | Pass |

Re-measure after any edit to sections 1 to 3. The description (section 3) measured 1,486 characters (limit 4,000). Re-measure it after any edit.

## 7. Age rating (questionnaire answers, to confirm in App Store Connect)

Expected answer: **4+**. Each answer below follows the feature inventory in section 4. Every answer must be confirmed against the current App Store Connect questionnaire, which Apple updates, because this session cannot see it.

| Question (topic) | Answer | Basis |
| --- | --- | --- |
| Cartoon, realistic or fantasy violence; sexual content; nudity; profanity; horror | None | No such content in the app |
| Medical or treatment information | None | Planner hours and tasks only |
| Gambling, contests, simulated gambling | None | No such feature |
| Unrestricted web access | No | The app loads only its bundled planner. Users may type links in notes; the app does not open a browser |
| User-generated content shared with others | No | No sharing between people |
| Made for kids | No | Adult planner |
| Age assurance and similar newer questions | Confirm | Not visible in this session |

## 8. App Privacy label (nutrition label)

**Answer: Data Not Collected.** Basis: no network call in the native build (the Chromium bridge run in `docs/IOS_RELEASE.md` recorded no network requests), no analytics, no advertising, no tracking, no account. Planner data stays in the app's storage on the device (`PrivacyInfo.xcprivacy` declares `NSPrivacyTracking` false and no collected data types).

Conditions that would change this answer, which must be re-checked before any build that enables them: iCloud backup or sync, any crash-reporting or analytics SDK, any sign-in, any web content that sends data.

## 9. Export compliance

**Answer:** the app uses only encryption that is exempt, namely standard operating-system encryption and SHA-256 hashing (CryptoKit, `TaskSheet.swift` and `LifeAttachmentStore.swift`). `ITSAppUsesNonExemptEncryption` is `false` in `ios/App/App/Info.plist:22`. **Owner or legal to confirm** before submission.

## 10. Review notes

Use [../APP_REVIEW_NOTES.md](../APP_REVIEW_NOTES.md) as the template, with these changes before pasting into App Store Connect:

1. Replace the "Verified device models and iOS versions" placeholder with the actual device test record. Until then, write "Not yet tested on a physical device."
2. Delete the sentence about the web planner's private beta allowlist. It describes a product that is not in the iOS app, and it may confuse a reviewer.
3. Keep "No demo account is required" and "Sign-in required: No" only after step S1 passes.
4. Keep the iCloud sentence only if the flags-off build is the one uploaded. Flags are off in `codemagic.yaml` (`VITE_SPREAD_CLOUD_BACKUP: "0"`, `VITE_SPREAD_CLOUD_SYNC: "0"`). The entitlements still declare iCloud (decision D2): tell the owner before submission.
5. Do not list features that have not passed their device step.

## 11. Open owner decisions for this package

| ID | Decision | Recommendation |
| --- | --- | --- |
| D5 | Support URL | Create a support page; do not use the privacy page as the support URL |
| — | Name availability, category, price, territories, copyright line | Confirm in App Store Connect |
| — | Age-rating questionnaire | Confirm; expect 4+ |
| — | Export compliance | Confirm the "exempt" answer |
