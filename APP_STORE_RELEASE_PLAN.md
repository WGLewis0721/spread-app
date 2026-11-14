# Spread App Store Release Plan

**Decision date:** October 1, 2026

This is the **approved architectural and acceptance plan**, first adopted October 1, 2026. It is not a current release-status report. The Capacitor/SwiftUI iOS implementation has advanced since the plan was written; compare the candidate against `main` and the [release runbook](docs/IOS_RELEASE.md), [App Review gate](docs/APP_STORE_REVIEW_CHECKLIST.md), and [native evidence](docs/evidence/life-ios-implementation/acceptance.md). Evidence tied to an older SHA cannot certify the latest signed build. Preserve frozen `golden/*` rollback branches. [ROADMAP.md](ROADMAP.md) owns milestone intent.

## Chosen architecture

Spread will package the existing proven **Vite / React** planner as an iOS app using **Capacitor**.

```text
Existing Spread React app
        |
     Capacitor
        |
      iOS app
        |
local-first Spread data
```

This is packaging, not a product rewrite.

### Non-negotiables

- Preserve the existing Responsibilities → Hours → Week → Tasks workflow.
- Keep Spread local-first.
- No account is required for 1.0.
- Do not add Supabase or another SaaS backend just to publish the app.
- Do not redesign the planner while packaging it.
- Do not modify any frozen `golden/*` branch.
- The installed core planner must not depend on the Vercel site to work.

## Data strategy

Spread 1.0 remains device-local.

Required before release:

- persistence survives normal app termination/relaunch;
- data survives application upgrades;
- versioned migrations protect older planner data;
- backup/export/restore works from the installed iOS app;
- native storage behavior is tested under low-storage/interruption conditions.

> **Superseded in part on 2026-11-14 (owner decision OD20, [finalize plan](docs/design/specs/2026-11-14-publish-finalize-plan.md) section 8):** Spread 1.0 is **iPhone only**, matching the rules card. The iCloud lines below stay suspended, as the rules card says ("Nothing may claim iCloud works"). The paid, local-first and App Review rules still apply.

**Direction revised 2026-10-08; device scope superseded 2026-11-14 (OD20).** Spread 1.0 is a **$2.99 one-time paid iPhone app**
planned with **automatic iCloud Backup** and **optional iCloud Sync**. Both iCloud features stay suspended for 1.0 and are not advertised. Full design, risks, PR boundaries and
gates: [docs/ICLOUD_PLAN.md](docs/ICLOUD_PLAN.md). The rules below are binding:

- Local-first and fully offline. iCloud is the operating system's account; Spread adds no account.
- **Backup** is automatic when iCloud is available, one-way, versioned, and isolated per device.
  It ships behind the `cloud.backup` flag, which stays off until Gate 3 (hardware proof) passes.
- **Sync** is off by default and enabled only by an explicit, per-profile user action. Independent
  device data is never silently combined, overwritten or deleted; every link, merge and restore
  takes a safety snapshot first. It ships behind `cloud.sync` and may slip to 1.1 without blocking 1.0.
- Minimum iOS is 17 (`CKSyncEngine`). Spread 1.0 is iPhone only (OD20): portrait and both landscape orientations, as `Info.plist` declares. The 2026-10-08 iPad orientation and resizable-window rules no longer apply.
- Advertise iCloud only after it has accepted physical-device QA. Do not advertise iPad for 1.0.

## Commerce

For the initial complete paid app:

```text
Customer
   |
App Store paid download
   |
Spread unlocked
```

Use normal **App Store paid-app pricing** for 1.0.

Do not add RevenueCat, subscriptions, credits, APEX, or a web checkout flow for the initial complete-app release.

If Spread later becomes free + premium digital features, evaluate StoreKit IAP/subscriptions and Restore Purchases then.

## App Review acceptance gate

Before authorizing a release, complete [the App Store review checklist](docs/APP_STORE_REVIEW_CHECKLIST.md), review the [App Store Connect reviewer notes](docs/APP_REVIEW_NOTES.md), and verify the automated source, offline-bundle and signed-IPA preflight on the exact candidate. These checks do not replace actual hardware testing or owner approval. See the checklist for GitHub branch protection setup.

## Release sequence

Status is tracked in [docs/IOS_RELEASE.md](docs/IOS_RELEASE.md), which also holds the exact build and upload steps and the list of checks that still need an Apple account or a physical iPhone. A checked box below means the work is done and verified at the level the note says.

### 0. Release-candidate quality

- [ ] Complete the Friends Test Round.
- [ ] Turn repeated/release-blocking failures into regression tests.
- [ ] Verify backup/export/import and local persistence. (Unit-tested, and persistence is simulator-verified; device pending.)
- [ ] Prove storage survives browser/app restart, device storage pressure,
      upgrade, and older-data migration; add/verify versioned data migrations.
      (Restart and storage loss are verified in the iOS Simulator. Older data shapes and the backup
      envelope are unit-tested. There is no schema version number yet, and low storage and upgrade
      over a prior build still need a device.)
- [ ] Complete Dynamic Type/text scaling where applicable, VoiceOver
      labels/order, contrast, Reduce Motion, touch targets, external keyboard,
      and non-color-only meaning.
- [ ] Finish privacy, support, and terms pages plus in-app support/contact.
      Match App Store privacy answers to the shipped binary.
- [ ] Define the user-controlled diagnostic/support path if no crash SDK is added.
- [ ] Define support, refund response, release rollback/hotfix, and App Review
      ownership. Use privacy-preserving activation/crash/conversion measurement
      only if it fits the stated local-first data policy.

### 1. Add the Capacitor iOS shell

- [x] Add Capacitor to the current Vite/React project.
- [x] Create the iOS project from the existing production UI.
- [x] Configure permanent bundle ID, display name, version/build numbers, app icon, launch screen, privacy manifest, and orientations.
- [ ] Choose the signing team and verify safe areas on a physical iPhone.
- [ ] Define the repeatable release CI/archive process and verify signing,
      version/build numbering, and artifact ownership. (Manual archive steps are in
      docs/IOS_RELEASE.md. CI builds and smoke-tests the simulator app only.)
- [x] Make the core app assets/self-contained experience work without a development server. (Verified in the iOS Simulator and by a bundle completeness check in `export:ios`.)
- [x] Use native plugins only where the web implementation cannot provide a production-quality iOS experience. (Filesystem and Share for export, StatusBar for contrast.)

### 2. Native integration pass

- [x] Verify local persistence in the installed app. (iOS Simulator: relaunch, and restore after the WebView's storage is deleted. Physical device is in step 3.)
- [ ] Make backup/export/restore work with the native file/share surfaces. (Implemented with the share sheet and an unfiltered file picker; needs a device check.)
- [x] Verify print/PDF/Word export behavior and choose the supported 1.0 set. (1.0 set: Copy week, Word document, and Back Up Spread through the share sheet. Print / Save PDF is hidden because WKWebView cannot print. The share sheet's Print action covers the Word file.)
- [ ] Handle app background/resume and interruption safely. (Saves flush when the app hides; a device check is pending.)
- [ ] Verify date/time-zone/week-boundary behavior.
- [ ] Verify phone keyboard, touch, drag, crown/week navigation, month view, light/dark mode, and Reduce Motion.

### 3. Physical iPhone and TestFlight QA

- [ ] Build and run on a physical iPhone.
- [ ] Verify supported iPhones (iPhone only for 1.0, OD20); safe areas,
      orientation, light/dark modes, keyboard, interruption/resume, low storage,
      offline use, and date/time-zone/week-boundary behavior.
- [ ] Internal TestFlight build.
- [ ] External friends beta.
- [ ] Verify install, upgrade, relaunch, low storage, offline use, backup/restore, and data migration from an older build.
- [ ] Cut a release-candidate golden checkpoint after the TestFlight fixes.

### 4. App Store package

- [ ] Name, subtitle, description, keywords, category, and age rating.
- [ ] Privacy answers that match the binary.
- [ ] Support, privacy, and terms URLs.
- [ ] Screenshots for the iPhone sizes App Store Connect requires (iPhone only, OD20).
- [ ] Advertise iPhone only (OD20), with accepted physical-device QA
      and an approved store build; do not imply iPad/macOS/Watch availability
      from the web layout alone.
- [ ] Price $2.99 (one-time, no IAP), territories, and availability. One app record and one bundle ID for the iPhone-only binary. Leave Family
      Sharing off unless App Store Connect shows it for paid apps and it is verified.
- [ ] No iPad screenshots and no 13-inch iPad assets: 1.0 is iPhone only (OD20).
- [ ] CloudKit schema deployed from Development to Production **before** the first TestFlight build
      that enables sync (production schema is additive-only).
- [ ] Paid Apps Agreement, banking, and tax setup.
- [ ] App Review notes describing the local-first/no-account behavior.

### 5. Release

- [ ] Submit Spread 1.0 to App Review.
- [ ] Resolve review findings without weakening the local-first product contract.
- [ ] Release the approved build.
- [ ] Update the landing page App Store CTA only after the public listing is live.

## iCloud release gates (added 2026-10-08)

A build goes to external TestFlight or App Review only when all of these hold. Details in
[docs/ICLOUD_PLAN.md](docs/ICLOUD_PLAN.md) section 11.

1. `typecheck`, `lint`, `test:spread`, `test:cloud` and the Swift tests are green.
2. Golden comparison is clean on iPhone widths in light and dark, with Reduce Motion (iPhone only, OD20).
3. The migration suite passes on every legacy and golden fixture, including interruption and newer-version cases.
4. Backup: kill-during-write, corrupt-latest, retention and per-device isolation proven; reinstall and new-device restore proven on hardware.
5. Sync (if shipping): no-loss property tests green; two-device offline matrix passed on two real iPhones; account switch and deleted zone handled; CloudKit Production schema deployed and verified from a TestFlight build.
6. The full planner loop works offline with iCloud signed out, disabled, and full.
7. No network requests when iCloud features are off.
8. Privacy manifest, App Privacy answers, policy, support page and review notes match the binary.
9. Paid Apps Agreement, banking and tax complete; $2.99 set; iPhone-only listing verified.
10. Rollback rehearsed on a TestFlight build.

## Planner UX pass checks (added 2026-10-08)

Before the next TestFlight build, on a real iPhone: touch-hold drag of a task onto a day, Undo toast clears above the home indicator, the completion haptic fires once, Reduce Motion removes movement, and Airplane Mode planning loses nothing. `@capacitor/haptics` is the only new native plugin; it is a no-op on the web.

## 1.0 exit condition

Spread is App Store ready when a customer can buy it once from the App Store, install it on an iPhone, complete the full Responsibilities → Hours → Week → Tasks loop offline, close/reopen/update the app without losing data, restore their planner from an iCloud backup or a file, and get support without the planner depending on Vercel or an account service. Sync, if shipped, adds nothing to this bar and removes nothing from it.
