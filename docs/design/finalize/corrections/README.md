# Corrections register: index and wave-3 parity gaps

> Part of the Spread design brain. Start at [../../README.md](../../README.md). Register: [../corrections.json](../corrections.json).
> Summary: index of the publish-finalize corrections, plus two wave-3 parity gaps left by the OD19 Week Focus removal. Both gaps are recorded here, not in their own files, because the design map is at its byte budget and names every record file.

## Index

| Record | Status | What it covers |
| --- | --- | --- |
| [life-routing.md](life-routing.md) | open | Life as the default root, and the dead Week path (OD18, OD19) |
| [color-drift.md](color-drift.md) | open | Health colour, and hardcoded native values |
| [copy-voice.md](copy-voice.md) | open | Copy still to apply across Life, Classic and sheets |
| [release-scope.md](release-scope.md) | open | iPhone-only scope and the TestFlight invitation |
| [wave2-tokens-icons.md](wave2-tokens-icons.md) | open | Wave-2 tokens and Lucide assets still to add |

## Parity gaps from the Week Focus removal (wave 3)

Status: **open**. Owner: **wave 3**. Decision: OD19, refined on 2026-11-14. The owner's rule was to delete a dead composition only when Life already covers its capabilities. Life does not cover the two below, so their files are kept and not wired. The Week Focus surface that reached them (`WeekFocusSurface.swift`) cannot run on main, because `content()` in `Shell/SpreadLiveRoot.swift` runs only when the Life flag is off. That surface and its component file are deleted in the same change.

Neither gap is a regression. Neither capability was reachable on main, so no shipped user loses one.

### Overdue bulk reschedule

- **Severity:** low.
- **Kept:** `Week/OverdueSelectionTray.swift`, which has no caller now.
- **Life:** no overdue path. A case-insensitive search of `Life/`, `Spread/`, `Shell/` and `Sheets/` finds none. Classic's More sheet has Rollover, which sends a separate `rollover` command and is not a per-task reschedule.
- **Planner:** `Planner/LivePlanner.swift` `allOverdueTasks` lost its only caller. `previewOverdueMove` and the `bulkMoveOverdue` command still serve the kept tray.
- **Expected:** wave 3 decides. Either wire the tray into Life as one entry point and a Life sheet, with a tap path and Undo for every move, or delete the file together with `allOverdueTasks`.

### One-gesture add from Month

- **Severity:** low.
- **Kept:** `Week/MonthQuickAddSheet.swift`. In `Week/MonthSurface.swift`, the `onLongPressAdd` parameter and `MonthDayAddGesture` have no caller now. They are the wiring for the sheet.
- **Classic:** Month has no gesture. **Life:** Month selects a date on a tap. Adding then takes further steps: select a Life area, then use its quick add in the day panel.
- **Tests:** the UI test for the gesture was deleted with its surface. No UI test covers the add path now.
- **Expected:** wave 3 decides. Either a one-gesture add in Life, Classic or both, with a VoiceOver action and a 44 pt target, or none. If none, delete the sheet, the gesture and the parameter together.

Reviewer approval: empty. Not closed. A gap closes only with changed files, regression evidence and a named reviewer.
