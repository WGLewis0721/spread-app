# Spec: Spread 2.0 native SwiftUI completion — one cohesive release candidate

> Part of the [Spread design brain](../README.md). Follow [PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md). This is the combined engineering contract for issues [#110](https://github.com/WGLewis0721/spread-app/issues/110), [#111](https://github.com/WGLewis0721/spread-app/issues/111) and [#112](https://github.com/WGLewis0721/spread-app/issues/112).

| Field | Value |
| --- | --- |
| Request | Finish the entire native 2.0 backlog together, with real flows and quantified Apple-quality UI/UX |
| Surface | Native iPhone first; responsive iPad; React web stays supported |
| Size / owner | L / engineering lead: Codex; design & motion review: Claude Code |
| Status | **Implementation-ready specification; unverified native 2.0 release** |
| Source of truth | Verified `main` baseline `35b6652` and [draft PR #109](https://github.com/WGLewis0721/spread-app/pull/109) at `dcb3483`; read current heads again before implementation |
| Release permission | Current code authorized for merging/deployment *subject to passing release gates*; this spec does not authorize publishing an unfinished 2.0 native UI |

## 1. Problem

A person needs to see responsibilities, decide available hours, distribute those hours across a week, and turn them into doable tasks. Current React/Capacitor behavior contains mature scheduling logic but navigation/interaction polish and native tactility fall short. The SwiftUI migration on PR #109 is currently fixture-only. The user expects each tap to produce the correct next state, with instant, physical and unambiguous feedback.

## 2. Evidence / verified state

- [Repo] `main`: `src/lib/spread/model.ts`, `store.ts`, `task-schedule.ts`, `task-rollover.ts`, `native-mirror.ts`, `profiles.ts`. These are authoritative; rich task content and prior weeks must survive.
- [Repo] Native slice on #109: `ios/SpreadNativeV2` Swift package; 11 original `.webp` category illustrations; fixed Chalkboard styles; Stack, Fan, Dial, Tabs and Day; horizontal metal Crown; debug-only fixture launch via `-SpreadNativeV2Preview`.
- [Repo] `src/lib/spread/native-v2-projection.ts` and `NativeV2Envelope` implement a read-only, versioned view model with active profile ID. Shared fixture `projection-v1.json` validates TypeScript/Swift shape; **no live command transport exists**.
- [CI] SwiftUI package build, unit tests, TS checks and App Store source preflight passed on `dcb3483`. Full iOS shell persistence smoke was not green at spec creation: last completed attempt detected no `spread-mirror-*.json` despite launch. Re-evaluate the newest run before merge.
- [Deploy] A Vercel production build of `main` failed during `npm run db:migrate` with a database tenant/connection error. A Vercel preview for `dcb3483` was READY. Do not call the web preview a SwiftUI build or disable DB migrations merely to pass.
- [User references] Original Spread UI, iOS menu references, editorial typography, day cards and stacked-card motion. These are inspiration, **not authorization to replace existing hierarchy**.

## 3. Goals, explicit exclusions, budget

**Goal:** One complete, usable, native SwiftUI vertical product with the existing responsibilities/hours/week/tasks behavior, proven data parity, five purpose-specific Spread modes, and visually polished Apple-native interaction.

**Fixed decisions:**
- **No Spread Studio**, design editor, custom themes, wallpapers, user background selection or unnecessary settings.
- **One Chalkboard Design Language**, preserving the original 11 hand-drawn category images and restrained animated details; system type, SF Symbols and native controls where appropriate.
- Five presentations of *responsibilities* only: **Stack / Fan / Dial / Tabs / Day**. They read the same plan; switching modes never changes hours/tasks.
- The ridged **horizontal metallic Crown** is the signature way to navigate weeks, with visible rotation, calibrated detents and haptics. Accessible previous/next/week-picker alternatives required.
- Keep **Week/Spread hierarchy**, with Month *inside* Week. No extra Studio tab, custom bottom dock or duplicate floating action menu.
- Local-first; no mandatory account, no new cloud backend, no new planner database and no incompatible schema migration. Existing iCloud backup/sync behavior remains untouched.

**Appetite:** one integrated development assignment, one final reviewed PR/merge gate. Internally use small commits and test milestones so failures are diagnosable. No partial releases posing as finished 2.0.

## 4. Laws and native implementation rules

| Law/principle | UI decision / code | Test |
| --- | --- | --- |
| Hick's law | One primary action per screen; place context actions in native `Menu` or `.sheet` | Max one primary CTA in each state, user-test recognition ≤5s |
| Fitts's law | Native `Button` and accessibility hit regions | Tap targets ≥44×44pt |
| Jakob's law | Familiar SwiftUI `NavigationStack`, `TabView` only where justified, `.presentationDetents`, SF Symbols | 8/10 uncoached users locate next action |
| Tesler's law | Native renders data, **existing Zustand store** retains task eligibility, bank math, rollover, Undo and storage | 50+ cross-language parity vectors, no duplicated writable scheduling engine |
| Peak-end/feedback | Immediate state confirmation, interruptible springs, restrained haptic on accepted action | p95 touch feedback ≤100ms; no false haptic before commit |
| Accessibility | Dynamic Type, VoiceOver, Reduce Motion/Transparency, high contrast | All flows usable without drag, no clipped elements |

## 5. Concrete user flows and screens

| ID | Before → user action → after | Native code responsibility | Success |
| --- | --- | --- | --- |
| F1 Onboarding | Launch → create first responsibility → set hours → see week → add task | `SpreadRoot`, `ResponsibilityView`, `TaskEditorSheet` | First useful plan ≤3 min; no compulsory account |
| F2 Budget | Spread → tap responsibility → change hours → bank updates → choose day | `SpreadLayoutsView`, `HourSheet`; adapter calls `setHours` / `addAllocation` | ≤3 taps from responsibility to allocation; exact 0.5h increments |
| F3 Task | Responsibility → Add task → submit → task appears under same role | `TaskEditorSheet`; adapter calls `addTask` | Open in ≤3 taps; preserve notes/content |
| F4 Place/move | Week → To place → select task → tap eligible day → Week updated, Undo offered | `TaskMoveSheet`; `assignTask` + `undoEdit` | ≤3 taps after task selected; wrong-role days cannot appear or commit |
| F5 Finish | Week → tap task checkbox → confirmed complete; tap Undo if needed | `TaskRow`, `toggleTask` | Single tap, one accepted feedback; no visual state mismatch |
| F6 Crown | Week → horizontal Crown drag 64pt/detent → new week → reverse/Today | `WeekCrownView`, `CrownTravel`; `changeWeek` | 100 drags + 30 reversals, zero phantom weeks |
| F7 View | Spread → View → Stack/Fan/Dial/Tabs/Day → same selected responsibility and data | `SpreadLayoutsView`, `SpreadLayout` | 5/5 modes, zero data writes or selection drift |
| F8 Month | Week → Month → select date → selected week/day shown → return Week | Native month grid, `weekKey` mapping | Correct date near year boundaries; no fabricated timed events |
| F9 Rollover | Change week → Review unfinished work → carry selected tasks → preserve originals/Undo | Existing `carryOpenTasks` and store actions | 0 lost or duplicated tasks, deterministic IDs |
| F10 Restore | Reopen app / restore existing profile → same data, optional backup/sync unchanged | `native-mirror.ts`, profile/restore contract | 0 lost records/photos and 0 silent overwrites |

Show each as **before → tap/gesture → after** screenshots captured from running simulator/device, not AI illustrations. Empty, dense, offline, invalid input, save failure, and permission/error states must be designed, not omitted.

## 6. Quantified visual, motion and interaction contract

| Element | Target | Implementation direction |
| --- | --- | --- |
| Content inset | 20pt iPhone; adaptive on iPad | `.safeAreaInset`, adaptive layout containers |
| Card insets / spacing | 16pt internal, 12pt between; 22–24pt corner radii | `ChalkRoleCard` / native `Shape` |
| Chalk artwork | 11/11 same original source images; no clipping/blur | `ChalkIllustration`, preserve exact asset hashes |
| Week Crown | Horizontal ridged metal, 64pt/detent, ≤3 commits per swipe, reversible mid-gesture | `DragGesture`, `CrownTravel`, `UISelectionFeedbackGenerator`, reduce-motion safe |
| Card gesture | First touch always eligible; no readiness delay | Single source of selection/translation state; interruptible `.spring` |
| Feedback | p95 ≤100ms, target 60fps on test iPhone | Instruments/OSSignpost/hardware, report measured values |
| Layout stability | Header/logo shifts ≤1pt between destinations; 0 clipped controls | Geometry/screenshot diffs for 390/820/1024pt widths |
| Readability | Body semantic `.body` (~17pt); normal text contrast ≥4.5:1 | Dynamic Type, contrast checks |
| Input | ≥44pt touch targets, VoiceOver reading order, Reduce Motion functional parity | XCTest/UIAccessibility |
| Stale state | 0 wrong-profile/week commits, 0 duplicate commands | Version + active profile + week + request ID, serialized ACK/error |

Do not import Arooma's Cover Flow as the planner's Week view. Borrow its successful continuous physics, swipe cancellation, haptic discipline and stable-header rules. Avoid animation-readiness delays, decorative glass on task content and relentless looping motion.

## 7. One implementation architecture

- **Single authority:** `src/lib/spread/store.ts` and supporting pure rules; SwiftUI never writes full snapshots to `UserDefaults`, SwiftData or localStorage.
- **Typed transport:** `NativeV2Envelope(protocolVersion: 1, profileId, snapshot)`; commands include correlation ID, expected profile, expected week, payload and acknowledged result. Reject unknown versions, stale profile/week and malformed/out-of-range commands.
- **WebKit/native boundary:** read-only bootstrap, then serialized dispatch through existing store, including save-failure/Undo. Validate profile IDs and action preconditions on the actual TypeScript side. Native receives committed authoritative state only; do not optimistically claim successful writes.
- **Storage:** existing local mirror, backups, iCloud and restore remain unchanged. Full rich task content and historical weeks are never replaced by the flattened projection.
- **Native views:** real Week list/Month, five responsibilities layouts, add/edit/move task sheets, budget placement and rollover review. Keep native runtime behind explicit internal release gates until data parity/hardware QA pass.
- **Platforms:** iOS 17+ minimum retained; adaptive iPad; web React remains maintained. No new dependency except with a license and documented need.

## 8. Risks / mitigation / owner

| Risk | Mitigation / evidence required | Responsible |
| --- | --- | --- |
| Mirror persistence smoke fails on simulator | Reproduce on `main` and migration branch under identical runtime; preserve assertion, prove new snapshot after relaunch | Codex / CI |
| Stale native commands cross profiles/weeks | Sequence ID, explicit profile/week preconditions, no writes on refusal | Codex / data |
| Missing rich task fields from projection | Projection is render-only, never saved back | Codex |
| Native animation glitch / poor touch | One gesture state owner, interruptible springs, hardware 100+ gesture run | Claude Code / iOS |
| Simulator vs real iPhone difference | Device matrix and real screenshot/performance capture | iOS QA |
| Production deploy database migration failure | Diagnose credential/DNS/tenant against controlled env; no bypass/secret leak | Release engineer |
| Debug-only native prototype mistaken for 2.0 release | Do not market or switch default until native functionality passes all gates | Product/release owner |

## 9. Verification / release gates

**G0 — data protection:** Baseline backed by current `main`; all historical profile data unchanged. Prove no native write path can run in normal app before activation.

**G1 — unit/model:** `npm run typecheck`, `npm run lint`, `npm run test:spread`, `npm run test:scripts`, `swift test --package-path ios/SpreadNativeV2`; ≥50 deterministic parity cases for hour, task, eligibility, rollover and profile rules. Zero failures.

**G2 — iOS launch:** `xcodebuild` simulator app archive/build, smoke app startup + native snapshot generation & relaunch, positive mirror bytes, negative storage-writer check. Must pass twice; no weakened check.

**G3 — full flows:** F1–F10 accessible and usable (not mock or placeholder), run on same data set in both React and SwiftUI, 0 incorrect records, 0 crashes on 100 gestures + 30 Crown reversals.

**G4 — measured usability:** ≥8/10 uncoached users complete each frequent journey. At least 20% lower median completion time for 4 of 5 core journeys compared to approved 1.0, or product owner accepts a measured alternative. Publish touch, fps, tap-count, VoiceOver and layout metrics.

**G5 — deployment:** No production web update until Vercel build is READY and smoke verified; do not suppress `db:migrate` failure. Do not release native TestFlight/App Store binary until a native Release build exposes the fully functional UI and owner explicitly accepts that app candidate. Web Vercel deployment cannot distribute SwiftUI.

## 10. Delivery, review and rollback

**One integrated implementation PR** addressing #110, #111, #112. Commits may be grouped by data parity, native flow, design refinement and release QA, but do **not** leave placeholder flows in the final PR. Include README, measurable screen-by-screen GIF/screenshot evidence, test logs, regression matrix, crash/error report, final diff, and a rollback path.

Rollback: keep React/Capacitor as default, disable the opt-in native entry or revert its single integration PR; existing user data must not be migrated or deleted. Web rollback must restore the last verified deployment (not simply a preview URL). TestFlight rollback requires distributing a corrected build; no automatic App Store downgrade is assumed.

## 11. Definition of complete

A person can download the native candidate, create responsibilities, budget hours, select a week using the Crown, place/move/complete tasks, change all five layouts, review Month and rollover, quit/reopen without losing records, and recover data without migrating to another source of truth. All tests and device measurements are attached to the PR, no hidden editor is introduced, and the release owner can approve or reject a real build.

**Not complete:** a screen-only demo, unverified CI green on a different commit, a preview URL showing only React, or code with a TODO for the planner bridge.
