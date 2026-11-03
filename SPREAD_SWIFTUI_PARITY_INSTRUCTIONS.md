# Spread — Native SwiftUI Parity Migration: Execution Instructions

**Read first:** [SPREAD_SWIFTUI_PARITY_SPEC.md](SPREAD_SWIFTUI_PARITY_SPEC.md) at the repository root. That spec governs **appearance and interaction parity** for this migration; older 2.0 completion specs still provide testing and data-integration history but do not authorize an unrelated new look.

## Mandate

**Translate the *working app's interface and motion* into true SwiftUI, outermost screen identity first, innermost behavior last.** Preserve the old functional React/Capacitor app as a protected oracle and rollback path, not the eventual visible renderer. Do not start by moving TSX/CSS into a WebView as a visual shortcut. Do not start from the current simplified SwiftUI screen and invent features the old reference never had. Bring over every real feature and affordance observed in the pinned working build; also preserve the owner's explicitly retained Chalkboard art and five modes.

**No merge or production/Apple deployment without explicit owner authorization.**

## Engineering ownership and branch hygiene

1. Assign a lead **SwiftUI/iOS implementation engineer** responsible for visual shell, native motion and navigation; a **React/store specialist** responsible for state/commands and data preservation; and a **QA/release reviewer** responsible for actual reference captures, parity gates, accessibility, TestFlight and App Store. Multiple agents may collaborate, but **one integrated migration PR** owns the resulting release candidate.
2. Inspect the current repository and existing native SwiftUI work at the actual branch head. Avoid reverting functioning store/bridge code, copying JSX/HTML into the UI, or changing the locked goldens. Before editing, read `AGENTS.project.md`, `README.md`, `docs/design/RULES_CARD.md`, `docs/design/planner/SPREAD_DESIGN_SYSTEM.md`, `APP_STORE_RELEASE_PLAN.md`, `docs/ICLOUD_PLAN.md` and the two root parity files.
3. Create a fresh implementation branch from current verified `main`; keep the old app functional during the rebuild. Use small reviewable commits **within one cohesive PR**, one layer at a time, with reference screenshots on every substantive UI commit. No rewriting old docs into contradictory specs.

## Exact ordered implementation — do not invert it

### Phase 0: establish the source of truth before drawing UI

- Identify the **actual owner-approved pre-migration installed build** and its source SHA, not just any old golden commit or build number. If Codemagic artifacts/old device screenshots are missing, record that fact as `BLOCKED: reference build not captured`; obtain/capture them before claiming visual parity.
- Protect the original working app (source tag, IPA/build checksum where available, deterministic privacy-safe fixture plan, asset hash manifest, comparison video). Preserve light/dark reference states and the raw recordings.
- Run a **reverse-demo**: document each visible screen and interaction from launch to backup/restore. Build a spreadsheet/CSV ledger of what exists and what currently went missing in SwiftUI. Capture before/tap/after and drag start/mid/release including failed drop, interruption, scrolling, onboarding and other edge states.
- Mark whether a feature originates in the verified pre-native React release or the separate `spread-studio` art/modes branch. Do not silently conflate the two; both matter where the owner explicitly approved them.
- Deliver proof of baseline by referencing `35b66522f30836d1eb74ca9758c6d3f24c0de2e3`, frozen `golden/*` branches and exact running build. Build 12 being Apple's previously uploaded number is **not** enough to identify the visual baseline.

**Exit 0:** pinned reference manifest + 100% initial feature inventory, reviewed reference gallery. No design parity claim before this.

### Phase 1: rebuild outer app identity and chrome

Native `SpreadAppShell`: app launch/state recovery, canvas and both appearances, original heading/brand, correct system-safe areas, navigation geometry, floating dock and gear details, segmented Spread/Week switch, horizontal ridged Crown with center readout and accessible end caps. Use the real app's measurements, not a generic template. Keep existing WebKit/state host hidden from the user's view. The shell's content is temporarily a state-driven placeholder *only while building this phase*; final completion forbids placeholders.

**Exit 1:** matched screenshot pairs for first screen, Spread, Week, More and Month chrome, 390/820/1024pt, both appearances. Parent/safe-area geometry stable when switching.

### Phase 2: reconstruct the main visual bodies

Implement native `SpreadSurface`, `WeekSurface`, `MonthSurface` matching captured card proportions, collapsed/expanded rhythm, role/hour bank segments, solid days, dashed To place and tinted Free time, month morph and day order. Add native Stack/Fan/Dial/Tabs/Day layouts preserving selection and geometry.

Do not prematurely hide missing functions in a generic menu. Every old control gets a visible place in the screen inventory. Roles, sheets and tasks must show deterministic **real planner snapshots**, not a fabricated static mock.

**Exit 2:** before/action/after screenshots of all surfaces on identical fixtures, no missing header/dock elements or functional discoverability regressions.

### Phase 3: recreate component identity and motion, piece by piece

Map each old asset and motion to a native implementation:

| Original | SwiftUI implementation guidance |
| --- | --- |
| `week-crown.tsx` ridges/sheens, 64px detents | `Canvas` + `DragGesture` with continuous tracked translation, a separate threshold accumulator and committed week changes |
| `styles.css` cascade and week-seq | Native staggered transforms, interruption-safe animation and `matchedGeometryEffect` as appropriate |
| `styles.css` Week→Month morph | Stable geometry IDs shared by week and month, animate structure only when data remains coherent |
| Studio `layouts.tsx` / `render.css` physics | Native Stack/Fan/Dial/Tabs/Day with controlled selection and direct drag; no duplicate gesture state |
| Studio `doodle-motion.ts` cutouts/effects | Keep original static/motion WebP images and measured pivot/box/duration specs; implement native transforms/timeline/effects; no flat glyph substitutions |
| Radix sheet/dock/easing | SwiftUI sheets with appropriate detents, exact content hierarchy, deliberate haptic and reduced-motion alternatives |
| Original pointer/drag/Undo | Long-press + drag, tap-to-place alternative, keyboard/VoiceOver actions, committed ACK before success feedback |

Capture old and new motion side by side on the **same device class**. Calibrate progress across the whole animation, not just final appearance. Resolve first-touch glitches, hit testing, scroll conflicts and interruptions before increasing decorative polish.

**Exit 3:** 11 exact artwork assets, 5 polished modes, quantitative gesture tests and real recorded motion comparisons.

### Phase 4: wire the complete real behavior under those surfaces

Only now exhaustively verify every control against authoritative store actions: responsibility create/edit/remove/color; hour bank, add/move/reorder allocation; grouped To place and task move; complete/uncomplete, "Not today", six-second Undo; rollover/review; rich task editor Notes/Outline/Table/Photo; profiles, export/print, backup/restore; save failure, offline and background recovery.

Use the existing `ios/App/App/SpreadBridgeViewController.swift`, `LivePlanner` and guarded native command dispatcher as a bridge **while preserving the existing one true planner store**. Eliminate any visible WebView fallback gaps before release; a clearly labeled recovery route remains permissible for genuine error recovery only. Every accepted native action must await source-of-truth persistence ACK. Never flatten rich task blocks or write a native snapshot over the original record.

**Exit 4:** native F1–F10 journeys complete, 50+ TypeScript/Swift parity cases, 0 wrong-profile/week/role operations, true offline/restart/restore tests. Old data works without destructive migration.

### Phase 5: finish iOS-native details and public-launch readiness

- Native feedback, accessibility tree, VoiceOver custom actions, Dynamic Type, Increase Contrast, Reduce Motion, haptic calibration, iPad adaptive layout and pointer/keyboard support. Use iOS-supported APIs, not watchOS-only digital Crown rotation.
- Distinct public App Store build audit: privacy manifest and permission language, local-first/no mandatory account, payment model, export compliance, offline, screenshots, crash diagnostics and platform-guideline checks. Preserve the `com.graymatter.spread` bundle ID and existing versioning pipeline; increment `CFBundleVersion` based on App Store Connect, never only Codemagic's counter.
- Existing web product must remain functional. Do not alter Vercel/cloud/backup infrastructure just to change SwiftUI appearance.
- Automated Xcode simulator builds **and real iPhone** tests. Run 390/820/1024pt and landscape/pointer where supported, 100 Crown actions + 30 reversals, 100 Stack/100 Fan rapid swipes, all critical touch/tap/drag paths, app kill/relaunch, offline and restore.
- Measure frame times and haptic/touch latency on hardware. A passing Swift package test is not proof of UI fidelity or App Store readiness.

**Exit 5:** attached reference/native screenshot matrix, actual motion video, complete functional/integration results, measured quality and accessibility scorecard, privacy/release checklist, owner-reviewable signed candidate **without uploading it**.

## Implementation assignment format (repeat for every layer)

Each task/commit must contain:
- **Baseline**: exact installed working-build screen and source SHA; actual pre-migration screenshot/clip link.
- **Observed behavior**: what the old app does on each tap, drag and cancellation.
- **Native mapping**: specific `SwiftUI View`/state/gesture/animation replacing that behavior (never a WebView surface).
- **Acceptance**: dimensions, hit targets, timing and data result, with screenshot/video proof.
- **Regression surface**: every view/feature it could disturb, plus tests.
- **Rollback**: switch to the functioning legacy renderer or revert focused SwiftUI commits, without changing user data.

Don't accept vague claims like “more Apple-like,” “works on simulator,” “UI complete,” or “mostly the same.” The old and native frames must be available side-by-side.

## Non-negotiable quality and stop rules

- Preserve **functionality before new features**. A missing old action is P0 even if the new native UI looks beautiful.
- Identity before animation, animation before incidental decoration, data correctness throughout.
- If a reference feature is unrecorded, mark `unknown`, do not invent a replacement and call it parity.
- If one phase is blocked by missing old IPA or Xcode access, complete only independent source inventory, tests and engineering stubs. **Do not advance a fake parity PASS**.
- If a gesture conflicts with iOS navigation, retain the original intent using a native accessible alternative, record the exact native deviation and seek review if the visible result changes.
- All quality gates are **per actual candidate commit**. Old baseline CI, older signed IPAs and web screenshot smoke cannot sign off newer native results.
- No feature deletion in the name of simplification without approval. No hidden Studio customization, no speculative icons or new color palettes.
- One integrated PR with no abandoned sub-PRs, final gap register, before/after visuals, tests, rollback and `GO`/`NO-GO` release verdict. **Do not merge, deploy or submit to TestFlight/App Store** before the owner explicitly authorizes the candidate.

## Owner-ready implementation prompt

> You are responsible for rebuilding Spread's **previously working app experience** as authentic native SwiftUI. Read `SPREAD_SWIFTUI_PARITY_SPEC.md` and this file before making changes. The working installed pre-migration build is the primary reference; identify and capture its exact binary, version and source SHA. Preserve original shell, dock, Crown, Spread/Week/Month, card layout, Chalkboard identity, five approved modes, animations, task flows, hour banks, profiles, rich editors, backup and local-first behavior. Translate components from the **outside in**, measuring each screenshot and gesture against the actual app. Do not restore the old binary as the product, paste React UI into WebKit, invent a new design, create a second planner store, or remove difficult features. Keep the existing WebKit bridge headless until native parity passes. Deliver one integrated PR with reference-native screen recordings, complete F1–F10 flows, accessibility and hardware measurements, regression tests, release checklist, rollback and a factual GO/NO-GO. No merge or Apple upload without approval.

**Result required:** The user opens native Spread and recognizes the **same product**, with all capabilities intact and the original interactions reproduced more fluently through genuine iOS-native implementation.
