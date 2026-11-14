# Spec: Life overdue reschedule and quick add

> Part of the Spread design brain. Start at [../README.md](../README.md). Follow [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md). Parity records: [../finalize/corrections/README.md](../finalize/corrections/README.md).

| | |
| --- | --- |
| Request | Wave 3, lane W3-4 (owner decision OD26): bring the two capabilities Life lacks, bulk overdue reschedule and one-gesture add from a date, into Life, or record each as covered. |
| Restated | A Life user can review and move overdue tasks in one confirmed step, and the existing way to add a task to a day is confirmed as the quick add, with no second add path. |
| Surface | iPhone, Life week page (`LifeWeekView`). |
| Size | M |
| Author | Claude Code, wave 3 lane W3-4, 2026-11-14 |
| Status | Draft. Option A (overdue) and Option 1 (quick add) are built on the lane branch, pending coordinator review, CI and device checks. |
| Governing docs read | `docs/design/RULES_CARD.md`; `PLAN_SPEC_PROTOCOL.md` sections 2 to 5; `specs/TEMPLATE.md`; `planner/SPREAD_NATIVE_BRAND_BOARD.md` (header and the 11 Nov owner consolidation); `specs/2026-11-04-week-month-owner-decisions.md` decisions 40 to 44 and 58; `specs/2026-11-11-life-wallet-parity.md` section 2; `finalize/corrections/README.md` (both parity sections); publish plan section 8 (OD2, OD6, OD11, OD18, OD20, OD22, OD26, OD31). Process (Gray Matter `app-design`): `UX_REVIEW_AND_SPEC_PROTOCOL.md`, `templates/DESIGN_CHANGE_SPEC.md`, `OBJECT_FIRST_NATIVE_PATTERNS.md` sections 2 and 5, `TACTILE_MOTION_AND_DEVICE_QA.md`. |

## 1. Problem

A person planning a week sees unfinished tasks from earlier days. On main, the only bulk reschedule (pick overdue tasks, pick a day, preview, confirm) was reachable only from the Week Focus surface, which wave 2 deleted. Life's week page has no overdue entry, so those tasks stay on past days until the person opens each one. Separately, the 4 Nov Month design expected a one-gesture add from a date. Life's calendar grid selects a date on tap, so the question is whether a task can be added to a day in fewer steps, and whether the existing path already does that.

## 2. Evidence and context

- **[Repo] Overdue engine.** `src/lib/spread/week-month-operations.ts:109-123` returns unfinished tasks whose allocation day is before today and whose responsibility matches. Store actions `previewBulkOverdue` and `bulkMoveOverdue` are at `src/lib/spread/store.ts:843-844`, dispatched in `src/lib/spread/native-v2-dispatch.ts:369-377` and `:465`. A successful read always returns an array, so a `nil` from the Swift read means failure.
- **[Repo] Native planner.** `ios/.../Planner/LivePlanner.swift:395-401` has `allOverdueTasks(today:)` and `previewOverdueMove`. They use `readWeekFeature`, which does not change planner state or revision. `send` (line 448) sets `undoId` after any action other than undo or redo, and accepts `expectedRevision`.
- **[Repo] Tray.** `ios/.../Week/OverdueSelectionTray.swift` compiles on main and has had no caller since wave 2. It selects rows, groups them by responsibility, picks a day, previews eligibility, and commits only the reviewed eligible rows.
- **[Repo] Life week.** `ios/.../Life/LifeWeekView.swift` has a six-row month grid that selects a date on tap (`expanded`, `calendarSurface`, lines 130-176), a day panel (lines 51-70), and the To place inbox (lines 225-261). It has no overdue entry.
- **[Repo] Quick add in Life.** `ios/.../Life/LifeWalletStack.swift:432-490` (`LifeQuickAdd`) calls `addTaskForDay` with a day and `addTask` without one. `LifeCalendarRules.dailyRoles` (`LifeCalendarRules.swift:38-40`) lists only Life areas with hours on that day, so the day panel offers quick add only for those areas. `LifeRoot.swift:630` shows the same component in each area's Tasks list, with no day.
- **[Repo] Undo.** `LifeRoot.swift:208-230` and `:758` show the Life history row (Undo and Redo) for about 5 seconds after any change that sets `undoId`.
- **[Repo] Dead code.** `Week/MonthQuickAddSheet.swift` has no caller. `Week/MonthSurface.swift:15, 182, 190-206` keeps an `onLongPressAdd` hook with no caller. `LifeRoot.swift:10, 16, 1025` declares an `.addTask` sheet that is never presented.
- **[Repo] Owner decisions.** 4 Nov decisions 40 to 44: past-due tasks stay on their original date in a compact overdue tray (40); "To Place and Overdue as two separate count icons" (41); overdue groups by responsibility (42); multi-select (43); preview eligible and ineligible, confirm eligible only (44). Decision 58 says "hold opens Add" for Month dates. It belongs to the 4 Nov Month design. The 11 Nov brand board does not carry hold-to-add forward.
- **[Repo] Product model.** The design router states the order "Responsibilities → Hours → Week → Tasks". The rules card says a task goes on its own role's day only.
- **[Assumption]** A count capsule and a sheet are enough for overdue lists. Sizes have not been measured on a device.

## 3. Goals, non-goals and budget

- **Goals:**
  - G1. Overdue is reachable from the Life week in one tap, with the explicit preview and confirm the tray already has.
  - G2. Life's quick add for a day is confirmed as covered, or built, with a stated reason.
  - G3. Every overdue state is designed: loading, failed, empty, loaded, refused, and Undo.
- **Non-goals:** No automatic rollover. No change to the engine, store actions, planner schema or stored data. No second store. No new add gesture unless the owner chooses Option 2. No Classic changes. No Recently Deleted or task ordering. No haptic on this flow. No iCloud claims.
- **Appetite:** One lane and one session, about 250 changed Swift lines. If the work exceeds about 400, stop after the overdue build and report the rest as a follow-up.

## 4. Rules that apply and exceptions needed

| Rule (document and section) | How this request touches it |
| --- | --- |
| `RULES_CARD.md` Behavior: every drag has a tap or keyboard path and Undo | No drag. Select by tap, choose a day by tap, confirm by tap. The move uses the existing Life undo notice. |
| `RULES_CARD.md` Behavior: a task goes on its own role's day only | The engine decides eligibility per row. Blocked rows state the reason and stay where they are. |
| `RULES_CARD.md` Behavior: Plan Ahead is explicit and never auto-rolls over | Overdue opens only when the person taps it. Nothing moves on load or on open. |
| `RULES_CARD.md` Behavior and OD2, OD31: one light haptic, only on completing a task | No haptic on selection or on a move. |
| `RULES_CARD.md` Look: touch targets at least 44 pt | Capsule, rows, day chips, Try again and the confirm button all have a 44 pt minimum. |
| `RULES_CARD.md` Look and the brand board: solid surfaces, tokens | Uses `Spread.elevated`, `Spread.inset`, `Spread.line`, `Spread.accent`. No new colour, font or decoration. |
| Brand board 11 Nov: Dynamic Type, VoiceOver, Reduce Motion | System text styles, labelled controls, no added movement. |
| `RULES_CARD.md` Look: status is never colour alone | Eligible and blocked rows show an icon and text. Selected days use weight and an outline. |
| OD6 (publish plan section 8) | The sheet closes with Done (trailing). Cancel (leading) appears only on the review sheet, which discards a draft. |
| OD22 | Empty states: a short heading, one plain sentence, then the action. |
| OD11 | The entry uses the existing `lucide-calendar-clock` asset. The failure state uses SF `exclamationmark.circle` (an alert). |
| `RULES_CARD.md` Boundaries | Changes go through the existing `previewBulkOverdue` and `bulkMoveOverdue` actions. Nothing on the no-touch list changes. |

**Exceptions needed (owner decides):** None.

## 5. Options and the chosen concept

### Overdue entry and review

| Option | Idea | Pros | Cons |
| --- | --- | --- | --- |
| A (chosen) | An "Overdue" count capsule beside the To place capsule. Tap opens a sheet that hosts the existing `OverdueSelectionTray`. | Matches decision 41 (two count icons). Gives multi-select, preview and confirm room. A sheet is the familiar container for a bulk action. The Life stack stays primary. | One more presentation. |
| B | The same capsule expands in place under the To place inbox, with the tray inline. | No sheet. Stays on the week page. | Puts past-due and unplaced tasks in one expandable area, which decision 41 keeps apart. A long overdue list pushes the day content down. The review has no room to focus. |

**Chosen: A.** It follows decision 41 and keeps selection, review and confirm on one focused surface. **Rejected: B,** because it puts two different jobs in one expandable area.

### Quick add in Life

| Option | Idea | Pros | Cons |
| --- | --- | --- | --- |
| 1 (chosen) | No new add path. The existing day panel (`LifeQuickAdd` with `addTaskForDay`) covers a planned day: tap the date, tap the Life area, Add a task. The Tasks list covers tasks with no day. Delete the unused `MonthQuickAddSheet.swift`, under OD26 ("delete each one only if Life already offers the same capability"). | Uses the same action the sheet would use. No duplicate path. No hidden gesture. Matches Responsibilities → Hours → Week → Tasks. | Three steps, not one. An area with no hours that day cannot take a day-specific task; that task goes to To place. |
| 2 | A long press on a day in the Life grid, plus a VoiceOver action "Add task to this day", opens `MonthQuickAddSheet` with an area picker and calls `addTaskForDay`. | One gesture. Honours the spirit of 4 Nov decision 58 for the grid. | A hidden gesture. Duplicates the day panel for planned areas. For areas with no hours, the task lands in To place, so it is not on its own day. About 150 Swift lines plus a picker. |

**Chosen: 1.** The day panel already offers the capability, and Life adds tasks only after hours are placed. **Rejected for now: 2.** It adds a second path with a hidden gesture, and on unplanned days it puts tasks in To place. The owner can choose it later, reusing the same sheet.

### Breadboard of the chosen concept

- **Life week page, inbox row:** an Overdue capsule (icon and count) beside the To place capsule, which is unchanged. The Overdue capsule is always visible, like To place.
- **Overdue tasks sheet** (medium and large detents): one of the states below. When loaded, a tray groups rows by Life area, with Select all, row selection, a day row for the current week, "N selected · choose a day", and Review reschedule.
- **Review sheet** (from Review reschedule): "N can move · M need attention", one line per row (Can move, or the engine's reason), Move N eligible tasks, and Cancel.
- **Result:** A successful move closes the sheet, and the Life notice shows Undo for about 5 seconds. A refused move closes the review, and the tray shows "Nothing was moved…" with accessibility focus on that message.
- **Connections:** capsule → sheet → review → confirm → week page (undo notice). A failed read keeps the sheet in its failed state with Try again.

### States

| State | Where | What the person sees |
| --- | --- | --- |
| Entry loading | Capsule | Icon and "–", value "Checking" |
| Entry loaded | Capsule | Icon and count; value "N overdue" or "Nothing overdue" |
| Entry failed | Capsule | `exclamationmark.circle`; value "Could not check" |
| Sheet loading | Sheet | "Checking overdue tasks…" (text only, no spinner) |
| Sheet failed | Sheet | "Couldn't check overdue tasks", "Your plan hasn't changed. Try again.", Try again |
| Sheet empty (after a successful read only) | Sheet | "Nothing overdue", "Unfinished tasks from earlier days appear here." |
| Loaded | Sheet | The tray |
| Review read failed | Tray | "Couldn't review these tasks. Nothing was moved." |
| No eligible rows | Review | Move is disabled; "None of these tasks can move to that day." |
| Move refused (plan changed or save failed) | Tray | "Nothing was moved. Your plan may have changed. Review the tasks again." |
| Busy | Sheet | Buttons disabled while a read or move is in flight |
| Undo | Life notice | The existing Undo and Redo row, for about 5 seconds |
| Offline | n/a | The engine is local, so this does not apply |
| Overflow | Rows | Task names wrap; nothing is truncated |

## 6. Platform behavior

- **Widths and orientation:** iPhone only (OD20). Check 390 points (primary) and one larger phone width. 820 and 1024 are iPad widths, out of scope under OD20, and are not run.
- **Safe areas:** Sheets use system detents. Nothing sits under the home indicator.
- **Appearance:** Light and dark, through tokens only. Checked on a device only (owed).
- **Accessibility:** The capsule reads "Overdue tasks" with its value. Rows read the task name, the date, and "Selected" or "Not selected". Day chips read the full date with the selected trait. Failure messages take accessibility focus. Headings use `.isHeader`. Every control is at least 44 pt.
- **Dynamic Type:** System text styles only. Rows and chips grow with the setting. Day chips keep single-letter day names.
- **Reduce Motion:** No animation is added. System sheet presentation is unchanged.
- **Input:** Tap, and VoiceOver activation. No drags, swipes or hover-only actions.
- **Haptics:** None (OD2, OD31).

## 7. Technical approach

- **Where it lives:**
  - `Life/LifeWeekView.swift`: the load state, the capsule in the inbox row, and the sheet presentation.
  - `Life/LifeOverdueSheet.swift` (new): `LifeOverdueLoad` and `LifeOverdueSheet`.
  - `Week/OverdueSelectionTray.swift`: reused. Adds an `onMoved` callback, pins the revision at review, and shows inline messages instead of the global alert.
  - `Week/MonthQuickAddSheet.swift`: deleted under Option 1.
- **Data and state:** Reads use `allOverdueTasks(today:)` and `previewOverdueMove`. The commit uses `send(["type": "bulkMoveOverdue", ...], expectedRevision:)`, where `expectedRevision` is the revision at review, so a changed plan refuses the move. State is view-only (`@State`). Nothing is persisted. No schema change, no migration, no new key.
- **Flags and rollout:** No flag. Life is the default root (OD18).
- **Do not touch:** cloud, sync, backup, restore, schema files, `ios/App/App/Cloud/**`, `ios/App/SpreadCloudCore/**`, `server/`, `golden/*`. The diff is checked against this list.
- **Dependencies:** None.
- **Performance and privacy:** One overdue read per planner revision, the same cadence as the existing month-marks read. The engine is local, so nothing leaves the device.

## 8. Risks, rabbit holes and open questions

| Item | Why it matters | Proposed default | Who decides |
| --- | --- | --- | --- |
| No Swift toolchain on the authoring host | Compile errors appear only in CI `native-typecheck` | Grep every symbol used; keep changes small; fix from CI output | Lane |
| The Life notice shows Undo for about 5 seconds | A person may miss Undo after a bulk move | Use the existing notice; device check | Owner (device) |
| Overdue read on each planner revision | Extra work on each change | Same cadence as month marks; measure on device | Lane |
| Review goes stale | The plan changes between review and confirm | `expectedRevision` refuses the move; the message asks for a re-review | Lane |
| `corrections.json` sits outside the lane's paths | Parallel edits could conflict | Edit only the two parity entries, as the brief asks; say so in the PR | Coordinator |
| Dead hook in `Week/MonthSurface.swift` | Lane W3-2 owns this file | Remove `onLongPressAdd` and `MonthDayAddGesture` in W3-2 | Coordinator |
| Dead `.addTask` sheet in `LifeRoot.swift` | Lane W3-3 owns this file | Remove the case in W3-3 | Coordinator |
| Hold-to-add (Option 2) | Decision 58 expectation for the grid | Not built; the owner can choose it later | Owner |
| Overdue capsule shown at zero | Visual weight | Always visible, like To place (decision 41) | Owner |

## 9. Verification and full-implementation plan

### Acceptance criteria

1. Given overdue tasks exist, when the Life week loads, then the Overdue capsule shows the count and reads "Overdue tasks, N overdue".
2. Given the read fails, when the sheet opens, then it shows "Couldn't check overdue tasks" with Try again, and never "Nothing overdue".
3. Given a successful read with no tasks, when the sheet opens, then it shows "Nothing overdue" and no action.
4. Given rows, when the person selects tasks and a day and taps Review reschedule, then the review lists each row as Can move or with the engine's reason, and nothing has moved.
5. Given a review, when the person taps Move N eligible tasks, then only the reviewed eligible rows move, in one `bulkMoveOverdue` command, and the Life notice offers Undo.
6. Given the plan changed after the review, when the person confirms, then nothing moves, the review closes, and the tray says so.
7. Given a completed move, when the person taps Undo in the notice, then each moved task returns to its original day.
8. Given a review with no eligible rows, when it opens, then Move is disabled and the reason is stated.
9. Given VoiceOver, when the person uses the capsule, rows, day chips and buttons, then every action is reachable without a drag, and selection is announced.
10. Given Reduce Motion, when the sheet opens or closes, then no decorative movement appears.
11. Given Option 1, when the person adds a task to a Life area with hours that day, then the existing day panel adds it, and nothing new is built.

### Checks

- **Planned, run before the PR is marked ready:** `npm run test:scripts` and `npm run docs:check`. Results go in the PR body.
- **Assumed:** the Swift changes compile, pending CI job `native-typecheck` on macOS.
- **Not run (owed):** CI job `checks` (typecheck, lint, `test:spread`, `test:scripts`).
- **Owed on a physical iPhone:** VoiceOver through the capsule, sheet, rows, day chips and review; Dynamic Type at the largest accessibility size; Reduce Motion; light and dark; 390-point width; Undo notice timing; no haptic on a move.

Three questions for testers: Do you know how to move an overdue task? Is it easy? How could it be better?

### Full-feature implementation plan

- **Build location:** The existing app, on branch `claude/finalize-w3-life-features`.
- **Complete scope:** The capsule, the sheet, the tray changes, the deletion of the unused sheet, the corrections records, and this spec.
- **Verification:** The integrated flow in the real Life week. The engine's own tests (`src/lib/spread/native-v2-recovery.test.ts`) already cover the three overdue commands.
- **Refinement loop:** Device checks, then fixes in place.

## 10. Rollout, rollback and release

Draft pull request into `main`. No flag. Rollback: revert the pull request. The capsule and sheet are removed, and the deleted sheet comes back from history. Release authority stays with the owner. This spec is not approval to merge or ship.

## 11. Decision record

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-11-14 | Overdue entry: Option A (count capsule and sheet). | Lane W3-4, for coordinator review | This spec; `specs/README.md`; corrections records |
| 2026-11-14 | Quick add: Option 1 (covered; delete the unused sheet). | Lane W3-4, for coordinator review | This spec; corrections records |
