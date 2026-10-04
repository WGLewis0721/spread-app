# Spread App Store Release Plan

**Decision date:** October 1, 2026

This document is the canonical iPhone/App Store delivery plan for Spread 1.0.
The current web planner on `main` is the shipped functional baseline;
frozen `golden/*` branches are immutable rollback checkpoints. The
Capacitor iOS shell is under development; physical-device, TestFlight, and
store acceptance remain open. [ROADMAP.md](ROADMAP.md) owns milestone status.

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

**iCloud / CloudKit sync is post-1.0 unless it is explicitly promised in the App Store listing.**

When sync is added later, it must preserve offline-first behavior and define conflict resolution before multi-device editing ships.

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
- [ ] Verify supported iPhones and an iPad if included at launch; safe areas,
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
- [ ] Screenshots for required device classes.
- [ ] Advertise only the device families with accepted physical-device QA
      and an approved store build; do not imply iPad/macOS/Watch availability
      from the web layout alone.
- [ ] Pricing, territories, and availability.
- [ ] Paid Apps Agreement, banking, and tax setup.
- [ ] App Review notes describing the local-first/no-account behavior.

### 5. Release

- [ ] Submit Spread 1.0 to App Review.
- [ ] Resolve review findings without weakening the local-first product contract.
- [ ] Release the approved build.
- [ ] Update the landing page App Store CTA only after the public listing is live.

## 1.0 exit condition

Spread is App Store ready when a customer can buy it from the App Store, install it, complete the full Responsibilities → Hours → Week → Tasks loop offline, close/reopen/update the app without losing data, back up and restore their planner, and get support without the planner depending on Vercel or an account service.
