# Spread App Store Release Plan

**Decision date:** October 1, 2026

This document is the canonical iPhone/App Store delivery plan for Spread 1.0.
The current web planner on `main` is the golden functional baseline. The
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

### 0. Release-candidate quality

- [ ] Complete the Friends Test Round.
- [ ] Turn repeated/release-blocking failures into regression tests.
- [ ] Verify backup/export/import and local persistence.
- [ ] Prove storage survives browser/app restart, device storage pressure,
      upgrade, and older-data migration; add/verify versioned data migrations.
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

- [ ] Add Capacitor to the current Vite/React project.
- [ ] Create the iOS project from the existing production UI.
- [ ] Configure permanent bundle ID, display name, version/build numbers, signing, app icon, launch screen, orientations, and safe areas.
- [ ] Make the core app assets/self-contained experience work without a development server.
- [ ] Use native plugins only where the web implementation cannot provide a production-quality iOS experience.

### 2. Native integration pass

- [ ] Verify local persistence in the installed app.
- [ ] Make backup/export/restore work with the native file/share surfaces.
- [ ] Verify print/PDF/Word export behavior and choose the supported 1.0 set.
- [ ] Handle app background/resume and interruption safely.
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
