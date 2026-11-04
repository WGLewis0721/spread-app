# SwiftUI parity: implementation ledger

**Nothing in this ledger is verified.** No test, build, lint, typecheck, simulator run, screenshot comparison or device check was run for this work, by instruction. `CODED (UNVERIFIED)` means the code was written and read by its author; it has never been compiled. Treat every row as a claim to be proven by a later, separately authorised QA pass. **Release status: UNVERIFIED / NO-GO.**

- Assignment: [`CLAUDE_SWIFTUI_HANDOFF.md`](../../../CLAUDE_SWIFTUI_HANDOFF.md), [`SPREAD_SWIFTUI_PARITY_SPEC.md`](../../../SPREAD_SWIFTUI_PARITY_SPEC.md), [`SPREAD_SWIFTUI_PARITY_INSTRUCTIONS.md`](../../../SPREAD_SWIFTUI_PARITY_INSTRUCTIONS.md).
- Branch `feature/spread-swiftui-working-build-parity`, from the head of PR #118 (`docs/native-parity-from-working-build` at `67f18fa`, base `main@748b3ce`).

## A. Reference and boundaries

### A01. Reference record

| Item | Value | Provenance |
| --- | --- | --- |
| Old React planner (primary source reference) | `35b66522f30836d1eb74ca9758c6d3f24c0de2e3` (`main` before PR #109). Read directly with `git show`: `src/spread/screens/spread-app.tsx`, `components/{weekly-view,month-view,week-crown,task-sheet,category-badge}.tsx`, `gestures/{swipe,activation}.ts`, `src/styles.css`, `public/icons/*.svg` | **observed in source** |
| Frozen goldens | `golden/2026-09-28-app-store` and the three other `golden/*` tags are referenced by the spec; they were not opened or modified | referenced only |
| Studio art and five layouts | `spread-studio` at `5d2100548ce3a296134caaea497da5b9e9781ce5`: `components/studio/{layouts.tsx,doodles.tsx,doodle-motion.ts,render.css}`, `lib/spread/studio/layouts.ts`, `illustrations/motion/*.webp` (41 files, 139,402 bytes), `screens/spread-app.tsx` (stack rotation) | **observed in source**, kept separate from the pre-native app as instructed |
| Owner-approved installed build (binary) | **BLOCKED: reference binary not pinned.** No Codemagic/TestFlight build metadata, IPA checksum or source-SHA mapping was available to this session, and no app was launched. Apple's build number 12 is not evidence of which build is the visual reference | missing external dependency |
| Consequence | Everything below is **source-derived and provisional**. Dimensions, curves and layout come from the old CSS/TSX, not from a measured running build. No row claims visual or motion parity | - |

### A02. Old-app feature inventory

Tag: **R** = old React planner at `35b6652`; **S** = Studio branch (explicitly retained by the owner); **N** = native code today. "Absent in native" means absent from the Swift source at the baseline; it is not a runtime observation.

| Feature | Tag | Native at baseline | Target |
| --- | --- | --- | --- |
| Header: app mark + "Spread" wordmark that folds away, profile pill when more than one profile, tap mark goes Home | R | absent (plain serif title) | `SpreadAppShell` |
| Horizontal metal Crown: knurl, sheen, centre readout, 44 pt end caps, hint, drag right = previous | R | present, dark-only, direction reversed, no hint | `WeekCrownView` |
| Segmented View switch Spread / Week with icons | R | present, text only | `SpreadAppShell` |
| Floating glass dock: Done (picked day), Week/Month morph icon, Edit/Done, gear that turns | R | absent | `SpreadDock` |
| System-aware light and dark, accent choice | R | forced dark | `SpreadTheme` |
| Spread summary: "N hours across M spreads", proportional colour strip that jumps to a role, "x of y done", over-45h caution, Rollover, Review open tasks | R | absent | `SpreadSurface` |
| Role block: category badge, inline rename, day marks, hours chip with stepper, tasks fold, add-task row, colour palette, symbol picker, edit-mode Remove | R | partial (card + sheet) | `RoleBlockView` |
| New Spread sheet (several rows: name, hours, symbol) and the "New Spread" row | R | single-role sheet | `NewSpreadSheet` |
| Week: instruction line, spread bubbles (tap or drag), Free time chips, To place tray (dashed, grouped by role, fold at 5, preview 6 + Show more), day cards Sunday to Monday, allocation rows with hours stepper, Remove, task fold, Move to / Take off this day | R | partial (flat list, Monday first) | `WeekSurface` |
| Week drag and drop with Undo toast (6 s) and refused-drop message | R | absent | `WeekDragCoordinator`, `UndoToast` |
| Month grid (Sunday first), today marker, role colour dots and "+N", Week to Month morph | R | partial (plain numbers) | `MonthSurface` |
| Week swipe (64 pt threshold, 1.5x dominance, 24 pt edge guard, 72 pt follow), content follows the Crown | R | absent | `WeekSwipe` |
| Task sheet: title, done, Notes, Outline, Table, Photo | R | partial editor | `TaskSheetView` |
| More sheet: Copy last week, Copy week, Word, Print/PDF, Back Up, Restore, iCloud (flagged), Appearance (theme, accent), Profiles (up to 10, add/rename/remove/switch), local save status | R | partial (menu to React) | `MoreSheet`, `ProfilesSection` |
| Rollover dialog, Review open tasks (carry), Remove confirmation | R | partial | dialogs and `CarryOverSheet` |
| Per-profile remembered view and plane | R | absent | `SpreadViewContext` |
| Chalkboard artwork (11 illustrations) | S | present (static) | `ChalkIllustration` |
| Chalk motion cutouts (nine kinds) and effects | S | absent | `ChalkMotion` |
| Stack (auto-turning, pause), Fan, Dial, Tabs (with All), Day | S | partial, different geometry | `SpreadLayoutsView` |

### A03. File ownership (new native components)

| Concern | File (`ios/SpreadNativeV2/Sources/SpreadNativeV2/` unless stated) |
| --- | --- |
| Tokens, motion curves, haptics, glass | `SpreadTheme.swift` |
| Vector icons, SVG path port, brand mark, gears, view-morph icon | `SpreadIcons.swift`, `SVGPath.swift` |
| Shell, routing, sheet host, per-profile context | `SpreadAppShell.swift`, `SpreadViewContext.swift` |
| Dock | `SpreadDock.swift` |
| Crown | `WeekCrownView.swift`, `CrownTravel.swift` |
| Spread surface and role blocks | `SpreadSurface.swift`, `RoleBlockView.swift` |
| Five layouts | `SpreadLayoutsView.swift`, `DialGeometry.swift` |
| Week, drag, tray, free time | `WeekSurface.swift`, `WeekDragCoordinator.swift`, `WeekSwipe.swift` |
| Month | `MonthSurface.swift` |
| Artwork and motion | `ChalkboardViews.swift`, `ChalkMotionSpec.swift`, `ChalkMotionView.swift` |
| Sheets and dialogs | `MoreSheet.swift`, `NewSpreadSheet.swift`, `TaskSheetView.swift`, `TaskContentEditor.swift`, `CarryOverSheet.swift`, `SpreadDialogs.swift`, `UndoToast.swift` |
| Planner model and bridge client | `LivePlanner.swift`, `PlannerSnapshot.swift`, `PlannerDates.swift` |
| Host (unchanged ownership) | `ios/App/App/SpreadBridgeViewController.swift` |
| Headless TypeScript adapter | `src/lib/spread/native-v2-dispatch.ts`, `native-v2-extras.ts` (new), `native-v2-host.ts` |

### A04. Boundaries kept

The WebKit-hosted TypeScript planner and `store.ts` remain the only authoritative, writable planner store. No SwiftData, no `UserDefaults` planner data, no storage-format change, no change to backup, restore, cloud, sync, schema, `ios/App/App/Cloud/**`, `ios/App/SpreadCloudCore/**` or `server/` code. Swift keeps only view state (selected tab, expanded blocks, scroll) and two UI preferences in `UserDefaults` (last view per profile, Crown hint seen), neither of which is planner data.

## Checklist status

Updated at the end of the work; see the bottom of this file.
