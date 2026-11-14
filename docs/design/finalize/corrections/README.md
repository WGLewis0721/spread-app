# Corrections register: index and wave-3 parity gaps

> Part of the Spread design brain. Start at [../../README.md](../../README.md). Register: [../corrections.json](../corrections.json).
> Summary: index of the publish-finalize corrections, plus two wave-3 parity gaps left by the OD19 Week Focus removal. Both gaps are recorded here, not in their own files, because the design map is at its byte budget and names every record file.

## Index

| Record | Status | What it covers |
| --- | --- | --- |
| [life-routing.md](life-routing.md) | open | Life as the default root and the dead Week path (OD18 and OD19 applied); removal verb and unused code (OD30, OD33, wave 3) |
| [color-drift.md](color-drift.md) | open | Health colour (closed, #218); hardcoded native values and widget colours (OD33, wave 3) |
| [copy-voice.md](copy-voice.md) | open | Copy: over-budget word (OD32), removal verb (OD30), Cancel labels and empty-list sentences (OD33), all wave 3 |
| [release-scope.md](release-scope.md) | open | iPhone-only scope (OD28, wave 3) and the TestFlight invitation |
| [wave2-tokens-icons.md](wave2-tokens-icons.md) | open | Icon assets in code (#217); haptic policy (OD31) and icon items (OD33), wave 3 |

## Parity gaps from the Week Focus removal (wave 3)

Status: **open** (both decided by the coordinator on 2026-11-14; neither is closed). Owner: **wave 3**, lane W3-4. Decision: OD19, refined by OD26 on 2026-11-14. The owner's rule was to delete a dead composition only when Life already covers its capabilities. Life does not cover the two below, so their files are kept and not wired. The Week Focus surface that reached them (`WeekFocusSurface.swift`) cannot run on main, because `content()` in `Shell/SpreadLiveRoot.swift` runs only when the Life flag is off. That surface and its component file are deleted in the same change.

Neither gap is a regression. Neither capability was reachable on main, so no shipped user loses one.

### Overdue bulk reschedule

- **Severity:** low.
- **Before this change:** `Week/OverdueSelectionTray.swift` was kept, with no caller.
- **Life:** no overdue path. A case-insensitive search of `Life/`, `Spread/`, `Shell/` and `Sheets/` finds none. Classic's More sheet has Rollover, which sends a separate `rollover` command and is not a per-task reschedule.
- **Planner:** `Planner/LivePlanner.swift` `allOverdueTasks` lost its only caller. `previewOverdueMove` and the `bulkMoveOverdue` command still serve the kept tray.
- **Decided:** build Option A, approved by the coordinator on 2026-11-14. An **Overdue** count capsule sits beside the To place capsule in `Life/LifeWeekView.swift` (line 249). It opens `Life/LifeOverdueSheet.swift`, which hosts the existing tray. Review pins the plan revision, and confirm sends `bulkMoveOverdue` with that revision. The planner's Life undo notice is the only Undo. Spec: [../specs/2026-11-14-life-overdue-and-quick-add.md](../../specs/2026-11-14-life-overdue-and-quick-add.md).
- **Status:** built on the lane branch (PR #227). CI `native-typecheck` and `checks` passed on `e221bdb`. Open until device checks are done (owed) and the coordinator approves as reviewer.

### One-gesture add from Month

- **Severity:** low.
- **Before this change:** `Week/MonthQuickAddSheet.swift` was kept. In `Week/MonthSurface.swift`, the `onLongPressAdd` parameter and `MonthDayAddGesture` had no caller. They were the wiring for the sheet.
- **Classic:** Month has no gesture. **Life:** Month selects a date on a tap. Adding then takes further steps: select a Life area, then use its quick add in the day panel.
- **Tests:** the UI test for the gesture was deleted with its surface. No UI test covers the add path now.
- **Decided:** covered, not built, approved by the coordinator on 2026-11-14. Life already has one quick add for a day: `Life/LifeWeekView.swift:68` (`LifeQuickAdd` with `day`) calls `addTaskForDay` (`Life/LifeWalletStack.swift:479`), the action the sheet used. Life adds tasks only after hours are placed (Responsibilities → Hours → Week → Tasks), so a grid long press would duplicate the day panel or put tasks in To place. The hold-to-add alternative stays open for the owner. Spec: [../specs/2026-11-14-life-overdue-and-quick-add.md](../../specs/2026-11-14-life-overdue-and-quick-add.md).
- **Changed:** `Week/MonthQuickAddSheet.swift` is deleted. A repo-wide grep of Swift, UI tests, scripts and `src` finds no caller. Docs and audit records still name it.
- **Removed on main:** the dead `onLongPressAdd` parameter and `MonthDayAddGesture` in `Week/MonthSurface.swift` were removed by #225.

Reviewer approval: empty. Not closed. A gap closes only with changed files, regression evidence and a named reviewer.
