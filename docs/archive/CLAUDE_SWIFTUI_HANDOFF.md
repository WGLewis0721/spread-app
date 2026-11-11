> **Historical implementation-only instructions.** For the later owner-approved PR #119 native visual correction and real QA, follow [CLAUDE_NATIVE_UI_HANDOFF.md](CLAUDE_NATIVE_UI_HANDOFF.md) and the [native brand board](../design/planner/SPREAD_NATIVE_BRAND_BOARD.md). Previous code-only/no-testing instructions below are superseded for this task.

# CLAUDE — Spread SwiftUI working-build parity: implementation-only handoff

> **Implementation-only assignment.** Start from [PR #118](https://github.com/WGLewis0721/spread-app/pull/118) and finish **every implementation checkbox below in order**, outermost identity → innermost behavior. No smoke testing, test execution or validation is part of this assignment. The completed code will be **UNVERIFIED / NOT RELEASE-READY** until a separate authorized QA pass.

## Mission and authority

**Product:** Spread, local-first weekly planning. **Loop:** Responsibilities → Hours → Week → Tasks. **Repository:** `WGLewis0721/spread-app`.

The user is dissatisfied because the SwiftUI migration lost much of the original Spread visual identity, motion, and functionality. **Do not restore an old React binary as the final iOS product and do not paste visible JSX/CSS into WKWebView.** Instead, recreate the original **user-visible result**, visual structure, animation and interaction using real SwiftUI/UIKit APIs appropriate to iPhone and iPad. Keep the proven React/Zustand planner engine headless while native SwiftUI owns presentation; do not create a second writable planner store.

**Visual reference priority:** the owner-approved *installed pre-migration app*, once pinned to its exact build; its matching source; the frozen golden refs; original Studio art and five modes explicitly approved by the user; Apple-native affordances; finally the existing SwiftUI code (candidate only). **Never claim the working reference was matched if you could not access it.** Treat a source-derived approximation as provisional, not proven parity.

**Do not change the product into an unrelated generic iOS dashboard.** Preserve the original Spread/Week/Month structure, original Crown and floating dock, original brand graphics and responsibility colors, original hand-drawn illustrations and five approved modes. Preserve both light and dark presentation; no Studio editing, wallpapers or personalization system.

**Release authority:** none. Do not merge, deploy, upload to Codemagic/TestFlight, submit App Store metadata or modify production. The original React app and `golden/*` branches are protected.

## Start here — exact sequence

1. Open `https://github.com/WGLewis0721/spread-app/pull/118`. Check whether it is still open. If open, check out its head `docs/native-parity-from-working-build` (last observed `0d2847a`); if merged, start from the new verified `main`. **Never reset/revert the existing live store or working bridge.**
2. Create **one** implementation branch, `feature/spread-swiftui-working-build-parity`, from that latest doc-inclusive base. All following commits go to this branch.
3. Read these authoritative docs *in this order*: `AGENTS.project.md`, `docs/archive/SPREAD_SWIFTUI_PARITY_SPEC.md`, `docs/archive/SPREAD_SWIFTUI_PARITY_INSTRUCTIONS.md`, `docs/design/planner/SPREAD_DESIGN_SYSTEM.md`, `docs/design/planner/SPREAD_UNIFIED_UX_IMPLEMENTATION.md`, `docs/design/platforms/SPREAD_IPHONE_BUILD_GUIDE.md`, `APP_STORE_RELEASE_PLAN.md`, `docs/ICLOUD_PLAN.md`.
4. Read the real old planner source at immutable commit **`35b66522f30836d1eb74ca9758c6d3f24c0de2e3`** and frozen `golden/2026-09-28-app-store` (do not edit them). Read the independent animated Chalkboard / 5-mode implementation on `spread-studio`, especially `src/spread/components/studio/layouts.tsx`, `render.css`, `doodles.tsx`, `doodle-motion.ts`, `docs/spread-studio/ICON_SPEC.md`. Keep provenance separate.
5. Inspect current Swift files listed in the source map below. Create `docs/evidence/swiftui-parity/implementation-ledger.md` listing all checkboxes, their source references, target Swift files and **implementation** status. This ledger is not a test log. As you finish code, change status from `TODO` to `CODED (UNVERIFIED)`.
6. Try to identify the exact old Codemagic/TestFlight reference build from **build metadata and existing evidence** only. Do not launch apps, compare screenshots, run simulators or do validation. If metadata are unavailable, note `Reference binary not pinned; using old source commit provisionally` and proceed with every independent code task. The earlier Apple build number 12 does **not** establish that build 12 is the chosen visual reference.

### Source map — do not guess

| Original authority | Current native target / desired work |
| --- | --- |
| `src/spread/screens/spread-app.tsx` (pre-migration): header, Spread/Week, Month chrome, floating dock, new/edit/More, role summary | `ios/SpreadNativeV2/Sources/SpreadNativeV2/LivePlanner.swift` (`SpreadLiveRoot`); split into focused native Shell, Spread and Week views as needed |
| `src/styles.css`: light/dark tokens, `.crown-*`, `.app-dock`, `.glass`, `.cascade`, `.week-seq`, sheet open/close and Month transitions | `ChalkboardViews.swift`, new native semantic color/typography assets, SwiftUI shell/motion |
| `src/spread/components/week-crown.tsx`: 64px detents, metallic knurl/sheens, caps, readout, motion/hint | `WeekCrownView.swift`, `CrownTravel.swift` |
| `src/spread/components/weekly-view.tsx`: solid days, dashed To place tray, Free time chips, task row/drag/drop/Undo | `LivePlanner.swift` Week surface and focused native day/tray/task components |
| Original Week→Month and `src/spread/components/month-view.tsx` | Native Week and Month views, shared geometry/selection |
| `src/spread/gestures/swipe.ts`: 64px directional threshold, 1.5× horizontal dominance, edge guard 24px, max shift 72px | Native Week swipe gesture coordinator and animation |
| `src/spread/gestures/activation.ts`: 180ms touch hold, 8px tolerance, mouse 4px | SwiftUI long-press/drag and pointer interactions with tap and VoiceOver equivalents |
| `src/spread/components/task-sheet.tsx`: Notes, Outline, Table, Photo | `TaskContentEditor.swift` and actual native task sheets |
| `src/spread/components/studio/layouts.tsx`, `render.css`: Stack, Fan, Dial, Tabs, Day | `SpreadLayoutsView.swift`, `DialGeometry.swift`; mode switch never commits planner data |
| `src/spread/components/studio/doodles.tsx`, `doodle-motion.ts` and original images | `ChalkboardViews.swift` and native composed motion layers, with the **same original artwork** |
| `src/lib/spread/model.ts`, `store.ts`, `task-schedule.ts`, `task-rollover.ts`, `native-v2-dispatch.ts` | Existing headless planner engine, `ios/App/App/SpreadBridgeViewController.swift`, `LivePlanner.swift`; never duplicate it in Swift |
| `docs/design/planner/SPREAD_DESIGN_SYSTEM.md`, old More/backup/profile/print UI | Native More, Profiles, settings, export, backup and restore surfaces with identical actions |

## Strict outside-in implementation checklist

**Operating rule:** Work down this list sequentially. Complete the *code changes* for an item before starting the next. Commit logically complete groups of changes; do not stop to request approval between normal implementation steps. Do not mark an item done merely because a similarly named component already exists; check that its code contains the required behavior. You may read/trace source code, but **do not execute the app, run test commands or validate behavior**.

### A. Preserve the reference, repository and data boundaries

- [ ] **A01.** Record the exact old-reference commit/branch and available build metadata. Note missing reference data explicitly; continue with code-grounded translation.
- [ ] **A02.** Record every existing old-app feature in the implementation ledger, including hidden sheet actions and error/empty states. Tag source: old React, frozen golden, or explicitly approved separate Studio branch. Distinguish absence in native code from unverified runtime behavior.
- [ ] **A03.** Record current SwiftUI file ownership and map each old screen/sheet/control to an actual new native component. Avoid giant monolithic SwiftUI screens when clean subviews improve state ownership.
- [ ] **A04.** Preserve the existing local-first WebKit engine, guarded dispatcher, user storage, backups and Swift/cloud plugin wiring. Never perform a destructive storage-format change just to repaint the UI.

### B. App identity, global shell and platform appearance

- [ ] **B01.** Recreate Spread's original app-wide layout hierarchy, brand/header, top and bottom safe areas, status bar and launch/return handling with native SwiftUI presentation.
- [ ] **B02.** Implement the old system-aware **light AND dark** tokens from `src/styles.css` as semantic iOS colors. Remove the current forced dark appearance (`.preferredColorScheme(.dark)`) from the normal native shell and editors; maintain role-color data semantics.
- [ ] **B03.** Restore typography scale, spacing, rounded/elevated surfaces, dividers, quiet ink hierarchy, glass/translucency and interactive accent from the working planner instead of a generic dark dashboard.
- [ ] **B04.** Restore the original Spread logo treatment, hand-crafted icons, branded status/Today actions and animated gear button where observed. Do not replace unique art with letter-initial badges or generic SF Symbols unless the original uses them.
- [ ] **B05.** Restore the original **floating glass dock**, its layout, edit/done state, Month switch, selected state, More/settings behavior and keyboard focus structure. The dock must not become an extra unrelated tab bar.
- [ ] **B06.** Rebuild the **horizontal metallic Week Crown**, including knurled teeth, metallic sheen, centered date/week readout, previous/next caps, usable hint and intrinsic finger tracking. Match signed 64-point detents; include VoiceOver adjustable action and native haptics for accepted changes. Never use a circular Dial as the Crown.
- [ ] **B07.** Keep the original Spread/Week segmented destination switch **in its actual position** and make its selected/unselected states, widths, focus and hit regions consistent when a sheet opens or the content changes.

### C. Navigation and major content geometry

- [ ] **C01.** Restore the last opened Spread/Week/Month state per profile without modifying planner records. Preserve selected responsibility/week on return where the original does.
- [ ] **C02.** Recreate Week navigation by Crown, previous/next, Today, week swipe, date pick and Month-to-Week selection. Keep the current profile/week authoritative during asynchronous changes.
- [ ] **C03.** Rebuild **Spread** surface: total-hour summary, selectable responsibility-colored capacity strip, responsibility grouping/expansion and original scannable card density.
- [ ] **C04.** Rebuild **Week** surface: role hour bubbles, solid day cards, labels and order, busy-day task folding, empty-day actions, floating controls, distinguished dashed **To place** tray and tinted **Free time** suggestions.
- [ ] **C05.** Rebuild **Month** nested inside Week with correct month/week states, Today marker, selected day and the original week-to-month hierarchy/transform. Do not replace it with an unrelated calendar app.
- [ ] **C06.** Implement the existing **Stack** layout with overlapping cards and focused responsibility, retaining task accessibility.
- [ ] **C07.** Implement the existing **Fan** layout with the same physical fan, selected-front card, direct gesture interaction and correct card depth ordering.
- [ ] **C08.** Implement **Dial** as hours-weighted radial responsibility segments with correct role selection, not as the Week Crown.
- [ ] **C09.** Implement **Tabs**, including All and individual responsibility views, with one unambiguous active state.
- [ ] **C10.** Implement **Day** as a day-by-day glimpse of already allocated responsibility hours, not fictional calendar appointments.
- [ ] **C11.** Keep the five layout modes in the **Spread** experience, not five permanent Week tabs. Switching modes must preserve source state and selected role without dispatching planner writes.
- [ ] **C12.** Recreate original **More/Settings, profile, New Spread and edit/delete** surface hierarchy so existing actions remain discoverable. Preserve the three-tap principle where possible.

### D. Cards, artwork, detail and full task surfaces

- [ ] **D01.** Reuse all 11 authored Chalkboard base images *as-is* with the original stroke texture and crop; create native artwork views instead of generic placeholders.
- [ ] **D02.** Translate the original category tile/glyph relationship, role dots/colors, icon sizing, title labels, data hierarchy and chosen-state highlighting to native cards.
- [ ] **D03.** Rebuild role creation, edit, color/category selection, expansion, task nesting, hours adjustment and explicit destructive affordances as native sheets/menus.
- [ ] **D04.** Recreate To place **grouped by responsibility**, with fold thresholds, compact task rows, grip, Place/Move alternatives and Show more. Preserve the old visual difference between unplaced items and calendar days.
- [ ] **D05.** Recreate task cards/rows and native task editor with **Notes, Outline, Table and Photo**; retain rich formatting, attachments and original task IDs. Finish outstanding editor operations; don't silently downgrade content to text only.
- [ ] **D06.** Rebuild native sheet detents, grabbers, focus, keyboard avoidance, alert/confirm semantics and the original quiet Undo notice and errors. No inert action icons.
- [ ] **D07.** Rebuild New Spread, selected-day adding, hour stepper/bank, Week Free time suggestion chips, rollover and review-open-tasks sheets with the real controls in sensible positions.

### E. Motion, interaction physics, direct manipulation

- [ ] **E01.** Translate `cascade`, `week-seq`, `descend-in` and `ascend-out` to interruption-safe native animations with the original direction, sequence and perceived weight.
- [ ] **E02.** Recreate the old sheet stack/deal and floating dock feedback, including gear turns, pressed state and fade/settle behavior without delaying control readiness.
- [ ] **E03.** Build an actual **Week→Month morph**, preserving shared dates and visual context through the transition instead of snapping between unrelated cards.
- [ ] **E04.** Implement native Stack/Fan/Dial/Tabs/Day transition physics with one gesture owner per surface, selected-card continuity, drag/reversal cancellation and stable stacking order. No first-swipe readiness delay.
- [ ] **E05.** Port the nine authored Chalkboard cutout motion kinds **sway, flutter, beat, bob, drift, spin, rock, grow, nudge** using the original layer boxes, anchors, amplitudes, durations, delays and art. Use native transforms or Core Animation for targeted effects; hide work when offscreen/Reduce Motion.
- [ ] **E06.** Preserve touch drag activation intent (180ms hold, 8px tolerance), role/day target highlighting, refused-drop feedback, and non-drag Place/Move-to equivalents.
- [ ] **E07.** Implement Week swipe arbitration: signed 64px threshold, 1.5× horizontal dominance, 24px edge guard and 72px visual offset; don't intercept vertical scroll, day buttons, native back gestures or active task drags.
- [ ] **E08.** Emit a light completion haptic **after** an authoritative successful command, not on speculative taps. Preserve quiet six-second Undo availability and failed-command explanations.
- [ ] **E09.** Maintain behavior under Reduce Motion, Dynamic Type, dark/light and interruption; haptics must not be required to understand a state. Add accessibility labels/actions in the native views as part of implementation.

### F. Innermost planner behavior and App Store code preparedness

- [ ] **F01.** Route create/edit/remove responsibility, color/category and hour changes to the **existing** Zustand/TypeScript commands, not a new Swift scheduler.
- [ ] **F02.** Preserve budget semantics: per-week bank, 0.5-hour changes, add/move/reorder/remove allocations, remaining hours, zero bank and over-cap error results.
- [ ] **F03.** Route task create/edit/delete/complete through the existing dispatcher; update native state only after a committed authoritative reply.
- [ ] **F04.** Preserve role-specific eligible-day placement, move/unplace, Not today, denied drop and six-second latest-edit Undo. No wrong-role or wrong-profile update.
- [ ] **F05.** Restore deterministic week rollover and Review open tasks; preserve old week history and next-week collision confirmation/duplicate safety.
- [ ] **F06.** Restore the full native profile selection/create/rename/delete flows up to the existing 10-profile limit, with last-view/selection isolation and no data leakage.
- [ ] **F07.** Restore local export, printable Week/PDF route, Word document, `.spread` backup and restore preview/confirmation **as functioning user actions**; preserve the existing storage/backup engine. A temporary visible WebKit content fallback is acceptable only if the user explicitly approves an exception. A dedicated recovery path for exceptional failure is separate.
- [ ] **F08.** Complete native save-failure, retry, newer-data, offline, resume, restore-blocked and permission states; do not announce success until a real store ACK. Preserve optional existing iCloud feature flags without claiming sync works.
- [ ] **F09.** Prepare native-only iOS affordances (accessibility action descriptions, haptics, safe-area keyboards, privacy manifest/permissions text, account-free paid-app presentation and app metadata files) **as code/content changes only**, without publishing.
- [ ] **F10.** Remove stale placeholder/fixture-only UI from the Release-visible path, while retaining explicitly Debug-only fixtures and the original React renderer as a protected rollback path. Do **not** delete the legacy engine, golden versions, user data or recovery access.
- [ ] **F11.** Update only the governing design docs affected by implementation. Produce one final code-status ledger linking each item to modified files and describing any **unverified or blocked** work. Do not claim release readiness.

## Do NOT perform validation in this assignment

The owner explicitly requests **no smoke testing or validation** in this handoff. Therefore:

- **Do not run** `npm test`, `npm run test:spread`, `npm run typecheck`, `npm run lint`, `npm run build`, `swift test`, `xcodebuild`, XCTest, Maestro, GitHub Actions dispatches, simulator runs, device runs, screenshot-diff tools, performance profiling, accessibility auditing or manual end-to-end clicking.
- **Do not create fake screenshot/motion evidence, invent pass/fail numbers, weaken existing QA/CI gates or change required checks to green.** Reading source, reference metadata and existing documentation is permitted and necessary to build the UI.
- You may **write code-level accessibility, unit-testable pure logic and existing test fixtures** as needed for implementation, but do not run tests or interpret unexecuted tests as proof. Prefer to leave focused validation work for the later authorized QA pass.
- Do not automatically change TestFlight submission, signing, paid-app commerce, production domains, backup/schema or cloud behavior.
- All existing release validation rules in `docs/archive/SPREAD_SWIFTUI_PARITY_SPEC.md` remain **future release gates**, not tasks to perform under this instruction. The release verdict is necessarily **NO-GO / UNVERIFIED** until those are separately executed.

## Stop condition — all tasks, not a midway handoff

Continue sequentially **A01 → F11**. When blocked on a reference image, artifact or credential, write an explicit `BLOCKED` entry and finish every independent implementation task; **do not stop early**, ask for a new roadmap, or spend the assignment on research that substitutes for code. Do not reopen past PR work as a new foundation. Do not stop when the first screen looks good. Do not omit outer identity/motion to rush inner functionality. Do not submit a partial result as “finished.”

**Only stop when:**
1. Every checklist row A01–F11 is either **CODED (UNVERIFIED)** with actual file references, or **BLOCKED** with an exact external dependency and the independent code work completed.
2. All code and doc changes are committed to **one** coherent implementation branch and described in **one** implementation PR. Target PR #118's documentation branch while it is open; if #118 has merged, target `main`. **Do not merge it.**
3. The final report has: base/head SHAs, PR URL, per-phase completed/blocked counts, file map, known original-vs-native gaps, list of deferred tests and device checks, data/sync risks, rollback, and the explicit statement **“IMPLEMENTATION COMPLETE/INCOMPLETE; UNVERIFIED; NOT READY FOR RELEASE.”**

Do not run smoke tests or validation before stopping. Do not declare any untested behavior proven or a public launch ready.

## Copy/paste start prompt for Claude Code

> Take full implementation ownership of **Spread working-build → native SwiftUI parity** in `WGLewis0721/spread-app`. Start at PR #118 (`docs/native-parity-from-working-build`) unless it was merged; branch once from the latest doc-inclusive base. Your first files are the root `docs/archive/SPREAD_SWIFTUI_PARITY_SPEC.md`, `docs/archive/SPREAD_SWIFTUI_PARITY_INSTRUCTIONS.md` and `docs/archive/CLAUDE_SWIFTUI_HANDOFF.md`, followed by the original React source at `35b6652`. **Reproduce the pre-migration app's visible identity and behavior in real SwiftUI, not a redesign, rollback binary, or WKWebView copy.** Keep the proven planner engine headless and existing storage untouched. Implement checklist **A01 through F11 strictly in order**, from shell, light/dark, dock, Crown and navigation through surfaces, five modes, authored artwork, motion, real task interactions, profiles, backup and public-launch code preparation. **Do not run smoke tests, builds, typechecks, lint, XCTest, simulator/device checks, UI audits, screenshots or any validation.** Treat every completed code task as `CODED (UNVERIFIED)`. Continue through all code tasks, recording exact blockers only when unavoidable, and stop only with one implementation PR and a final ledger covering every checklist item. Do not merge, deploy or submit to Apple. Your verdict must remain `UNVERIFIED / NO-GO` until the separate release validation pass.
