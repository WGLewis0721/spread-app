# Spread — Working-Build-to-SwiftUI Parity Specification

**Status:** Owner-directed migration specification, implementation NOT started by this document.  
**Location:** Repository root. **Execution:** [SPREAD_SWIFTUI_PARITY_INSTRUCTIONS.md](SPREAD_SWIFTUI_PARITY_INSTRUCTIONS.md).  
**Goal:** Restore every approved, working pre-migration user-facing experience and product identity as **real native SwiftUI** while retaining the local-first planner, then achieve public-launch readiness. **This is not a rollback request or permission to release.**

## 0. Reference contract: the APP is the specification

**Owner decision (November 3, 2026):** The previously working installed Spread app is the visual, motion and interaction reference. Translate its **observable results** into native SwiftUI; do not restore the old binary as the finished product, embed screenshots as screens, or hot-swap legacy React UI into the native presentation. Apple conventions improve accessibility, performance and platform integration **without replacing Spread's identity**.

### Verified repository evidence, not an assertion about the installed build

| Evidence | Exact reference | What it proves / limitation |
| --- | --- | --- |
| Pre-native React planner checkpoint | `35b66522f30836d1eb74ca9758c6d3f24c0de2e3` (main before PR #109), plus immutable `golden/2026-09-28-app-store` | Core Week/Spread/Month/Crown/dock, interactions and store rules. **Not automatically the same commit as the owner's favorite TestFlight build.** |
| Other frozen checkpoints | `golden/2026-09-26-watch-crown-build`, `golden/2026-09-27-icon-interaction-build`, `golden/2026-09-27-friends-test-final` | Historical interaction/identity references only. Never modify a golden branch. |
| Original Chalkboard / five-layout reference | `spread-studio` branch at observed `5d2100548ce3a296134caaea497da5b9e9781ce5`; `docs/spread-studio/ICON_SPEC.md` and the source art/motion files | Eleven original icon/illustration pairs, motion cutouts and Stack/Fan/Dial/Tabs/Day. Separate branch: **do not assume these were in the exact installed pre-migration build without runtime evidence.** Owner has explicitly retained these features for the target native product. |
| Current native implementation, baseline only | `main` observed at `748b3ce0ad62113efed035ad5213eb4be288afbe`, `ios/SpreadNativeV2/**` and `ios/App/App/SpreadBridgeViewController.swift` | SwiftUI uses a headless WebKit store/command bridge and custom dark shell. Existing native code is an implementation candidate, **not** the visual reference or permission to delete working features. |
| Current native simulator screenshots | `docs/evidence/issue-113/screenshots/b5a3eaf/` | Genuine installed **native** shots at 820pt. They show today's migration result, not proof of old visual parity. |
| Historical implementation rules | `docs/design/planner/SPREAD_DESIGN_SYSTEM.md`, `docs/design/planner/SPREAD_UNIFIED_UX_IMPLEMENTATION.md`, `src/styles.css`, `docs/design/platforms/SPREAD_IPHONE_BUILD_GUIDE.md` | Documented functional rules, styling primitives and HIG gates; reconcile against captured working-app behavior. |

### Gate R0 — pin the real working binary first (blocking)

1. Identify **the precise previously accepted TestFlight or installed build**, including app version, `CFBundleVersion`, Codemagic build ID, IPA checksum (if accessible), source commit SHA, bundle identifier and iOS/device. **The fact that Apple had build 12 is only a version fact, not proof that build 12 is the chosen design reference.**
2. Install/run that build on a physical iPhone or repeatable simulator where legally available. Do **not** overwrite the only copy. Save an unaltered copy of all source reference recordings and screenshots in a versioned evidence directory, with source attribution and hashes. Never upload someone's real planner data in fixtures.
3. Capture **screen before → tap/drag → screen after**, in light and dark, compact iPhone, larger iPhone and iPad as applicable. Video capture at the device's native rate; record 3 repetitions for each major motion and 5 for gesture paths. Produce a build-to-SHA mapping and a human-visible reference gallery.
4. Audit the full feature list by actually using the old app; record `present / absent / broken / unreachable`. Do not infer that a feature existed just because a source file or design plan mentions it. When multiple old builds disagree, record each variant and use the **owner-selected build** for appearance and the most recent proven functional behavior for data safety.
5. Capture states for no data, normal plan, busy week, editing, drag, error/denied drop, onboarding, offline, restored data, dark/light and Reduce Motion. Freeze deterministic nonpersonal fixtures.
6. Produce `evidence/swiftui-parity/<reference-build>/manifest.json`, `screen-inventory.md`, `behavior-ledger.csv`, screenshots and motion clips. Mark every entry `observed`, `code-evidenced-only`, or `needs-owner-judgment`. A guessed design **never** receives a parity PASS.

**Authority order:** (1) captured owner-approved working *app* on device; (2) its matched source commit; (3) frozen pre-migration goldens for older intact functionality; (4) explicitly retained Chalkboard/five-mode Studio assets; (5) current repo rules and Apple HIG; (6) current SwiftUI implementation. New native defaults may replace only platform chrome when the old visual hierarchy and workflow remain recognizably the same.

## 1. Outermost → innermost: complete translation map

Implement in the following order, and **sign off each layer against the running reference** before adding the next. The list is a preservation ledger, not an instruction to re-add unrelated Studio personalization.

### L1 — Identity and outer shell (pixel/safe-area geometry first)

| Working-app reference | Native SwiftUI translation | Required parity test |
| --- | --- | --- |
| Spread name, icon, launch/return/resume, personality | Preserve app identity and launch experience. Native `WindowGroup`/scene or current UIKit host may remain only when it respects the same splash/entry and data recovery | Side-by-side installed builds; no generic substitute app icon, generic dashboard or new onboarding gate |
| System-aware light/dark, canvas/surface/ink/accent hierarchy | Semantic SwiftUI `Color` assets mapped from working `src/styles.css` tokens and `ROLE_COLORS`; preserve actual theme behavior. Do not unconditionally force dark | Original vs native fixed-state screenshots in BOTH appearances; no lost contrast |
| Safe areas, status/navigation bars, typography scale and margins | `safeAreaInset`, `GeometryReader` when unavoidable, Dynamic Type, measured spacing; SF typography is permitted if visual weight/line hierarchy preserved | Key anchors within 4pt at matched viewport; no clipped/hidden text at 390/820/1024pt |
| Horizontal metal Crown, header, Spread/Week segmented selector, dock | Rebuild the **same hierarchy, control placement and rhythm** in SwiftUI; keep the original float/glass dock when present. Do not turn Crown into a circle or turn View modes into Week tabs | Same global chrome before/after all destinations, including Month, task sheet and expanded responsibilities |
| Brand-specific micro-details: gear press motion, springy transitions, drop state, accent | Native `Shape`/image/SwiftUI transforms or Core Animation where justified; match original purpose not arbitrary Apple stock animation | Compare paused motion frames and observed affordance states |

**Important current gap:** current `SpreadLiveRoot` uses a new custom shell and `.preferredColorScheme(.dark)`; its Week/Spread controls are not sufficient evidence of parity with the original dock, theme, Crown and header. Treat that as a tracked regression candidate.

### L2 — Navigation frame and information architecture

- Restore the original first useful interaction and last-view restoration **per profile**. No unnecessary account, no Studio editor, no added view/tab bar merely because SwiftUI has a convenient component.
- **Spread ↔ Week** is the primary switch. **Month is a mode inside Week** and returns to the same context. Preserve the owner-approved week/month morph, bubbles pinned on both when present in the pinned build, and the original month-over-week gesture/position.
- The Crown shows/changes the right week. Previous, next, Today/date and keyboard/VoiceOver equivalents are real operations. Maintain focused controls and remembered hint dismissal.
- Original More/Settings, new responsibility, Edit/Done, Profiles, local save status, export/print/back up/restore remain discoverable in the same control hierarchy. Native menus/sheets may replace Radix mechanics but not add taps or hide a primary feature.
- Navigation and sheet stack must survive context switch, interrupted gesture and background/resume without sending commands to a stale profile or week.

### L3 — Main visual surfaces (large masses before details)

**Spread:** Restore its original summary (`totalHours` and individually selectable responsibility-hour color segments), responsibility rows/cards, expandable tasks, color selector, edit/delete affordances, New Spread action, and focus/selection state. Visual rhythm, proportions, rounded surfaces, accent and typography must reflect the pinned app, not a generic SwiftUI list.

**Week:** Restore responsibility-hour bubbles and remaining-bank labels, solid day cards, the **dashed To place tray**, and **tinted Free time chips** as three recognizably different types of content. Preserve day order **as actually observed** (the 2026-11-01 React README describes Sunday at top through Monday at bottom; confirm visually rather than assuming standard Monday-first). Busy days fold task lists rather than growing into endless cards; empty days remain usable and calm.

**Month:** Restore the actual Week→Month relationship and date grid. Today, selected/current week, task/role presence and the morph from four week lines to month boxes are distinct concerns. Tapping a date opens the right week/day without inventing timed calendar events.

**Responsibility presentation modes:** Preserve the five *owner-approved* Studio modes **Stack, Fan, Dial, Tabs, Day**, with the same selected responsibility and planner data. Reproduce each mode's actual geometry, emphasis and touch behavior from the original Studio preview/reference capture; no feature-less lookalikes. Stack uses overlapping focused cards, Fan uses a physical spread and direct gesture selection, Dial is hours-weighted, Tabs includes All, Day uses daily hour allocation glance. Mode change is presentation-only, never a planner write.

### L4 — Components, content and brand assets

- Preserve original category glyphs and all **11 Chalkboard images** (work, home, personal, health, fitness, family, school, project, church, business, custom), with recognizable stroke texture and readable color. Copy original authored assets *unchanged* into native resources; verify asset hashes and at-use crop. The Studio spec reports mean illustration SSIM 0.985 against its art boards; this is historical evidence, not a new native score.
- Original paired tile treatment: 38pt role-header glyph, approximately 40pt Fan, 32pt Day (sizing from Studio `ICON_SPEC.md`; adjust only if the pinned screen measured differently), artwork visually subordinate to the task label. Do not replace drawn icon with a letter initial.
- Preserve task density, task grips, 44pt interactive hit regions, compact text with hairline separators, grouped To place roles, at most five open tasks by default / six visible with Show More where applicable, and task hierarchy under day roles.
- Preserve the rich task editor's **Notes, Outline, Table, Photo**, attachments and saved formatting. A plain-text-only native editor is not parity; do not delete or flatten rich content in any native payload.
- Preserve free-time suggestions, hour bank color markers, role colors, local save/failure text and quiet Undo. Native `.sheet`, `confirmationDialog`, `alert`, `Menu` are implementation tools, not permission to redesign the screen.
- Preserve 10-profile support, names, active indicator, copy/export Word/print PDF, `.spread` backup and restore review with confirmation. If a native replacement is not ready, provide a clearly labeled temporary route to the **working** existing feature, with a measured exit plan; do not silently drop it.

### L5 — Motion and tactile choreography (measured translation, no hot-swapping)

| Original source behavior | Native implementation | Reference/gate |
| --- | --- | --- |
| `src/styles.css`: `cascade`, `week-seq`, `descend-in`, `ascend-out`, dock/sheet settle, month morph | `matchedGeometryEffect`, stable identity/transactions, timed `PhaseAnimator`/keyframes if appropriate, interruptible `.spring`; position-only transforms for interactive phases | Capture reference frame sequence; same direction, overlap, stagger, focal point and end state. Calibrate duration from film, initial ±15% tolerance; don't claim it without measuring |
| `week-crown.tsx`: 64px detents, knurled metal ridges and sheen, continuous finger offset, accessible caps | SwiftUI horizontal `DragGesture(minimumDistance: 0)`, transient `@GestureState`, signed detent accumulator, `Canvas`/gradient knurl; native selection haptic only for accepted week changes | 100 actions + 30 reversals, 0 phantom weeks. Must not use watchOS-only hardware Digital Crown API on an iPhone |
| `src/spread/gestures/swipe.ts`: 64px directional threshold, 1.5x horizontal-vs-vertical, 24px screen edge exclusion, max visible offset 72px | Gesture arbitration using `highPriorityGesture`/`simultaneousGesture` only when justified; never swallow vertical scroll, task drag or system-edge back | 100 directional and conflicting gestures; 0 accidental navigation |
| `src/spread/gestures/activation.ts`: touch hold 180ms, tolerance 8px; mouse 4px | Native long press and dragging built on `LongPressGesture` + `DragGesture`/native drop delegates with one gesture owner and accessible tap/Move path | First contact responds, clear lifted/hover target, invalid targets refuse without losing data |
| `studio/layouts.tsx` + `render.css`: Stack/Fan/Dial/Tabs/Day gestures, spring/easing (several use `cubic-bezier(.32,.72,0,1)`) | Calibrate SwiftUI spring physics to recorded displacement/velocity/settle; avoid starting position animation from stale selected ID or readiness flags | 100 Stack + 100 Fan rapid/reversal gestures, correct selected ID after each |
| `doodle-motion.ts` + `motion/*.webp`: moving chalk cutouts (sway, flutter, beat, bob, drift, spin, rock, grow, nudge), steam/sparkles | Preserve exact authored layer art/boxes/pivots and recreate using native timeline-driven transforms/effects; freeze or simplify for Reduce Motion and low power | Side-by-side sampled frames; no double-drawn layer; correct relative pivot, no continuous unnecessary animation off-screen |
| Old light task-completion haptic, Undo toast and rejected-drop message | `.sensoryFeedback` or UIKit feedback generator; haptic **only after authoritative ACK**, clear native announcement, six-second Undo policy where present | One tap completion; one accepted feedback; Undo eligibility exactly as old store |

**Native quality rules:** animation starts on first valid finger movement; no waiting for shadow/image decode to begin swiping; a single state owner drives translation and selection; a reverse/cancel never commits twice. No idle animations that steal hit testing. 60fps on test iPhone is a **target to measure with Instruments**, not an assertion.

### L6 — Innermost user behaviors and data correctness

The native view is not complete merely because its buttons exist. Keep each original operation and all its side effects.

| Workflow invariant | Actual source / requirement |
| --- | --- |
| Responsibilities → Hours → Week → Tasks | `src/lib/spread/model.ts`, `store.ts` and current planner; create/edit/remove roles, color changes and hour budgets |
| Bank accounting | Setting weekly bank does not silently create a calendar appointment. Day allocation deducts/restores available hours; half-hour rules and over-cap failures must match store |
| Task placement | A task goes only on a day allocated to its **own responsibility**. A wrong-role day refuses with explanation; To place reflects unassigned tasks |
| Undo | Drag/Not today/placement/move Undo offered for **six seconds** where documented; previous-week stale Undo correctly refuses; user sees accurate feedback |
| Rollover/review | Copy week or choose open tasks to carry, protect history and existing next-week tasks, confirmation before replacing; repeat must not duplicate |
| Rich content | Preserve notes/outline/table/photo, legacy attachment payloads and task identities. No flattened native snapshot is ever persisted over the full original planner |
| Profiles | Up to ten; per-profile week/view/selection isolation, no content leaks on asynchronous results |
| Local-first | Offline without login; data saved to existing storage, native mirror / recovery and backup supported; no silent new database or migration |
| Error handling | Failed save/restore, old/newer schema, unsupported capability, interrupted command, denied drop: visible next step, no false success/haptic |
| Cloud and export | Optional cloud features behind existing gates, no false sync claims; local backup, Word and print/PDF remain functional |

For 2.0, retain the current guarded TypeScript↔Swift dispatcher / WebKit host as an **interim headless domain adapter**, not as a rendered UI. SwiftUI must own the complete interface. A later move to SwiftData/native persistence is a separate, reversible, audited data-migration project and **is not required to restore UI parity**. Do not maintain two writable sources of truth.

## 2. Reference capture & parity evidence matrix (no guessing)

For every row L1–L6 record in a traceable manifest:

`build ID · matched Git SHA · reference screen/clip path · reference interaction · actual SwiftUI screen/clip path · fixture profile/week/task IDs · light/dark · viewport · Reduce Motion · measured geometry/timing · behavior proof · result (PASS/FAIL/BLOCKED)`.

**Capture paths**: launch, empty plan, normal Spread, expanded role, editing/color choice, view picker, five modes, weekday planning, bank changes, grouped tray, free time, Month opening and returning, task editor (all four content types), task placement and move, Not today, completion/Undo, rollover review, More/Profiles, backup/restore, export and print, failure and offline recovery.

### Acceptance targets (proposed; compare to the pinned app)

- **Inventory:** 100% of reference-visible controls and P0/P1 workflows accounted for with working native behavior or a formally approved fallback; **zero silent removals**.
- **Visual:** stable anchors within ±4pt at the same logical viewport for the header/Crown/dock/day-card positions; card dimensions within 5% unless Dynamic Type requires expansion; 11/11 art assets exact-by-hash. Annotate intended native differences. For static art/containers use aligned crop SSIM ≥0.95 where the **same rendered imagery** is compared; not a whole-screen metric for text rendering.
- **Motion:** same progression and direction, no dead first touch, reference duration within ±15% initially and matched after test review; no position jump or duplicate trigger on reversal.
- **Interaction:** 0 phantom week changes in 100 Crown turns + 30 reversals; 0 wrong target or card selection in 100 rapid Stack and 100 Fan swipes; real tap/keyboard/VoiceOver alternatives for every drag.
- **Data:** 0 lost/duplicate records, wrong-profile writes, wrong-role placements, snapshot overwrites or unacknowledged success; ≥50 shared TypeScript/Swift parity vectors and end-to-end cases from installed app.
- **Device and access:** minimum 44pt hit targets; no clipped text at 390/820/1024pt in both appearances and at accessibility text sizes; VoiceOver, Reduce Motion, Increased Contrast/Transparency and offline tested on iPhone/iPad. Report measured real-device p95 touch-to-feedback (target ≤100ms) and frame-rate (target 60fps).
- **Usability:** F1–F10 full flows, 8/10 uncoached success for each frequent journey, and a measured no-regression or improvement relative to the **same** working-build reference. Record tap count, not aesthetic opinions alone.
- **App Store:** signed Release build with correct bundle ID and incremented `CFBundleVersion`, privacy manifest/permission disclosures, export compliance, paid-app and account-free behavior, offline functionality, metadata/screenshots, accessibility and crash-free TestFlight approval gate.

## 3. Release gates and rollback

**G0** Reference installed build captured and pinned with evidence.  
**G1** Shell and navigation parity on iPhone (L1–L2), before task implementation changes.  
**G2** All three original main surfaces and five approved layouts (L3), with real fixture state and matching geometry.  
**G3** Identity assets and motion parity (L4–L5), reduced-motion equivalents, no swipe glitches.  
**G4** Functional parity and data preservation (L6), full F1–F10, actual iOS simulator and physical device evidence.  
**G5** Full public-launch review, distribution signing, versioning, privacy and owner-approved TestFlight/App Store release.

Maintain separate screenshots/evidence for the old app and the candidate. Each implementation PR must list the layers touched, state-by-state changes, missing reference captures, tests and rollback. **Do not regress any gate to advance another.**

Rollback is a *safety mechanism*, not the desired deliverable: keep the working React/Capacitor renderer and immutable golden branches available, with a reversible choice of rendering host. Turning off the native presentation must not modify or migrate stored user data. Never deploy, merge the implementation, activate a native Release UI or submit to Apple without the owner's explicit release authorization.

## 4. Explicitly excluded

Do not restore or ship the legacy build as the final product; do not reuse HTML/CSS/React components as visible UI inside SwiftUI; do not make an image-only imitation; do not replace the owner's design with generic iOS cards; do not introduce a customization studio/theme editor; do not delete features to make tests green; do not change cloud/restore schemas without separate approval; do not use TestFlight version numbers as proxies for visual quality.

**If the installed reference is inaccessible, report Gate G0 BLOCKED and finish the source-derived inventory without claiming any visual or motion match.**
