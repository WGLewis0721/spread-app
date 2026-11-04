# Handoff prompt: Spread SwiftUI working-build parity (historical continuation)

> **Superseded for owner-approved PR #119 visual correction and QA (2026-11-03):** follow [CLAUDE_NATIVE_UI_HANDOFF.md](CLAUDE_NATIVE_UI_HANDOFF.md) and [native brand board](docs/design/planner/SPREAD_NATIVE_BRAND_BOARD.md). The older **code-only/no-test** rule below applied to a previous implementation session; it is **not** the current assignment. Preserve historical task and blocker details.

Paste this file into a new session, or point the next agent at it. It is self-contained.

---

## Role and objective

You are continuing the native SwiftUI parity migration for Spread (`WGLewis0721/spread-app`). The goal is to make the native iPhone and iPad planner reproduce the **previously working pre-migration app** (React source at `35b6652`, Studio art and five layouts at `spread-studio` `5d21005`) as genuine SwiftUI, while the existing WebKit planner remains the only writer.

The first session has implemented the work **code-only**. Nothing has been built, tested, or run. Your job is to finish the remaining work, keep every claim honest, and leave the branch in a state the owner can review.

## Where things are

- **Repository:** `WGLewis0721/spread-app`
- **Branch:** `claude/spread-swiftui-parity-87llx2` (push here only; do not create another branch)
- **Pull request:** [#119](https://github.com/WGLewis0721/spread-app/pull/119), **draft**, base `docs/native-parity-from-working-build` (PR #118, still open)
- **Commits, oldest to newest:**
  - `3d63f76` docs: implementation ledger
  - `0201c4c` feat(ios): native SwiftUI planner rebuild
  - `eeb4e3d` feat(planner): native intents and read-only export
  - Later commits, if any, follow in order. Do not rewrite these.
- **Ledger:** `docs/evidence/swiftui-parity/implementation-ledger.md` (A01–F11 status, file map, exceptions, gaps, blockers)
- **Partial tasks:** `SWIFTUI_PARTIAL_TASKS.md` (P1–P13 and the gap register)
- **Original specs (read first):** `SPREAD_SWIFTUI_PARITY_SPEC.md`, `SPREAD_SWIFTUI_PARITY_INSTRUCTIONS.md`, `CLAUDE_SWIFTUI_HANDOFF.md`
- **Project rules:** `CLAUDE.md`, `AGENTS.project.md`, `docs/design/RULES_CARD.md`

Read the ledger and the partial-task list before touching code.

## What is done (UNVERIFIED)

**Shell and identity (B01–B07):** semantic light and dark tokens from `styles.css` (forced dark removed, system-aware status bar), brand with fold, sticky header, metal Crown with 64 pt detents, Spread/Week rail, glass dock (Done, Week/Month morph, Edit, Settings gears), six-second Undo. Files: `Theme/`, `Shell/`.

**Week, Month, Spread (C01–C12):** role bubbles, Free time (mirrored in Swift), To place tray (grouped, folds), Sunday-first day cards, allocation rows, week swipe rules, Month grid, Spread summary, five layouts (Stack, Fan, Dial, Tabs, Day), role rows with palette and symbol, task rows with Not today. Files: `Week/`, `Spread/`, `Layouts/`, `Planner/PlannerOrder.swift`.

**Artwork and motion (D01, D02, E05):** the 11 base Chalkboard images are byte-identical to Studio. The 40 motion cutouts are copied and their layer table is transcribed. Original SVG icons are in `Resources/Icons.xcassets`. Category glyphs are derived by removing only the badge circle. Files: `Chalk/`, `Resources/`.

**Sheets (D03–D07, F05, F06):** New Spread, responsibility editor, Open tasks, Profiles (switch, create, rename, remove, limit of ten), More, rich task editor (Notes, Outline, Table, Photo, round-trips through `setTaskContent`). Files: `Sheets/`.

**Planner intents (F01–F06):** the native dispatcher adds `moveSpreadToDay`, `moveAllocation`, `setRoleColor`, `setRoleCategory`, `rollover` (returns done, confirm, or empty), `removeProfile`, `renameProfile`, and read-only `exportWeek` (text, HTML, docx). Each calls an existing store action. Files: `src/lib/spread/native-v2-dispatch.ts`, `src/lib/spread/native-v2-export.ts`.

**Export (F07, partial):** print or PDF (system print from HTML), Word (lazy `docx`, shared as a file), and plain text (share sheet). Files: `Sheets/WeekExport.swift`.

**Removed from the release path (F10):** the old dark Chalk palette, `SpreadLayoutsView.swift`, `TaskContentEditor.swift`, `WeekPreviewView.swift`, `NativePreview.swift`, and the root `ChalkboardViews.swift`. Kept: the recovery route, the legacy React engine, `golden/*` branches, and the Debug fixture `SpreadV2Fixture` (tests use it).

## What remains, in priority order

### 1. Compile review (highest priority)

Nothing has been compiled. Before adding features, read the new Swift and TypeScript with compile errors in mind. Check these first, because they are the riskiest spots:

- `Theme/SpreadIcons.swift`: `Path.addRoundedRect(in:cornerSize:style:transform:)` in `GearShape`, and the `CGAffineTransform` chain.
- `Shell/WeekCrownView.swift` and `Shell/SpreadLiveRoot.swift`: `.onKeyPress` closures (must be `{ _ in … }`), `.sensoryFeedback(_:trigger:)` with an optional `String?` trigger, and `.task(id: planner.undoId)`.
- `Week/WeekSurface.swift`: `FlowRow` (`@ViewBuilder let content`), the `GeometryReader` inside `.background`, and `dropDestination(for:) { } isTargeted: { }`.
- `Layouts/SpreadLayouts.swift`: `UnitPoint` anchors outside 0…1, `.background(alignment:content:)` in `DayLayout`, and `Circle().strokeBorder`.
- `Sheets/TaskSheet.swift`: `ForEach(items.indices)` bodies that declare `let`, `ContentUnavailableView(_:systemImage:)`, and `NavigationStack` inside a sheet.
- `Sheets/ManageSheets.swift`: `Section { } header: { }` in `CarryOverSheet`, and `confirmationDialog` with a `Binding` built from an optional `NativeProfile`.
- `Sheets/WeekExport.swift`: `UIPrintInteractionController.present(from:in:animated:completionHandler:)`, `UIMarkupTextPrintFormatter.perPageContentInsets`, and `UIWindowScene.windows`.
- `Planner/LivePlanner.swift`: `exportWeek` decoding `LiveReply.exported`.
- `src/lib/spread/native-v2-dispatch.ts`: the `exportWeek` branch placed before the replay check, the lazy `import("./week-docx.ts")`, `btoa` and `String.fromCharCode(...chunk)`, and the new `NativeReply.exported` type.

Fix what you find. Record each fix as a ledger note, not as a claim of verification.

### 2. Partial tasks (from `SWIFTUI_PARTIAL_TASKS.md`)

Work these in the order listed there. The code-only items are P4, P5, P6 (press style), P8 (missing Tabs pop, Day fill, Dial count-up), P9 (keyframes and FX), P10 (Dynamic Type and text styles), P11 (refusal copy), P13 (privacy manifest review), and G-11 (free-time vectors).

### 3. Owner decisions (ask, do not guess)

- P1 and G-4: theme and accent pickers in native
- P3 and E-5: Stack auto-turn
- P6: system sheets versus the staggered sheet stack
- E-1 and P12: native `.spread` backup and restore (see boundaries below)
- G-6 to G-8, E-4

Put each decision in the PR as a question. Do not implement a choice that the owner has not made.

### 4. Reference-dependent work (blocked until G0 is captured)

P2 measurements, P7 morph matching, P8 spring calibration, P9 pivot and amplitude checks, and G-9 launch parity. Do not claim a match without reference evidence.

### 5. QA pass (only when separately authorised)

Swift package tests, `xcodebuild` build and UI tests, simulator and device runs at 390, 820, and 1024 pt (light and dark, Reduce Motion, Dynamic Type), the Crown gesture count (100 actions and 30 reversals with 0 phantom weeks), Stack and Fan rapid gestures (100 each), TypeScript typecheck, lint, dispatcher unit tests, and TS and Swift parity vectors (at least 50). Motion sampling against film, haptic latency on hardware, and export output checks.

## Verification rule for this session

**Do not run builds, tests, lint, typechecks, simulators, screenshots, or device checks** unless the current request explicitly authorises the QA pass. The owner's standing instruction is code-only. Mark everything `CODED (UNVERIFIED)` or `PARTIAL (UNVERIFIED)`. Never describe untested behaviour as proven.

## Boundaries (do not cross without an explicit owner decision)

- **Do not merge, deploy, upload to Codemagic or TestFlight, or submit to the App Store.** The release verdict stays NO-GO and UNVERIFIED.
- **Do not edit `golden/*` branches**, the React renderer, or the legacy engine.
- **Do not touch** cloud, sync, backup, restore, schema files, `ios/App/App/Cloud/**`, `ios/App/SpreadCloudCore/**`, or `server/`.
- **Only** `applyTheme` and the pre-paint script write `data-theme` (CLAUDE.md).
- Keep the 44 pt minimum target, the existing accessibility identifiers used by `ios/App/SpreadNativeUITests/PlannerUITests.swift`, and the token-only colour rule.
- No model identifiers in commit messages, PR text, or repository files.

## Exceptions the owner must decide (listed, never designed around)

- **E-1:** native `.spread` backup and restore. CLAUDE.md forbids touching the backup and restore engine. The protected recovery surface remains, labelled "Backup and restore".
- **E-2:** the added dispatcher intents. Each calls an existing store action; no storage, backup, or schema file changes. The owner should confirm they are acceptable.
- **E-3:** the Swift free-time mirror duplicates `free-time.ts`. It is read-only. The owner may prefer moving it into the projection, which needs fixture updates.
- **E-4:** SF Symbols stand in for generic lucide glyphs. Original brand art stays original.
- **E-5:** the Stack auto-turn is not built.

## How to report back

1. Update `docs/evidence/swiftui-parity/implementation-ledger.md`: change statuses only when the code change exists, and keep `UNVERIFIED` on every row.
2. Update `SWIFTUI_PARTIAL_TASKS.md` by striking completed items and adding new ones.
3. Commit in small, honest commits. Each message should say what changed and state that it is unverified. Use the attribution format of the repository's other commits, without model names.
4. Keep PR #119 in draft. Add a comment for each owner decision.
5. End with the explicit status: **IMPLEMENTATION COMPLETE/INCOMPLETE · UNVERIFIED · NOT READY FOR RELEASE**, with the count of remaining partial items and blocked items.

## Start checklist

- [ ] Read `SWIFTUI_PARTIAL_TASKS.md` and the ledger.
- [ ] Run the compile review by reading (no build).
- [ ] Ask the owner the decisions in section 3 if the work depends on them.
- [ ] Work the code-only partial tasks in order, committing each one.
- [ ] Update the ledger and partial list.
- [ ] Stop with the status line above.
