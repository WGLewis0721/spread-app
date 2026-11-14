# Spec: W3 Week, Month and Spread surface audit

> Part of the Spread design brain. Start at [../README.md](../README.md). Follow [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md).
> Summary: Audit of the Classic Week, Month, Spread and shared week-navigator code, with the owner's phone-screenshot defects traced to code. Four small fixes in W3's files. The Life week defects (the empty band under the month card and the header under the dock) live in the Life lane and are handed over as exceptions, not edited here.

| | |
| --- | --- |
| Request | Finalize the Week, Month and Spread surfaces and the shell navigator. Fix the owner's screenshot defects after checking them in code. |
| Surface | Native SwiftUI, iPhone and iPad. Classic Week, Month and Spread, plus the calendar-week navigator in `Shell/`. |
| Size | M: an audit table and four small fixes. Changes stay under 50 lines of Swift in total. |
| Author | Claude Code, 2026-11-14 |
| Status | Draft pull request. Swift compile is run by `native-typecheck`. Simulator, VoiceOver and device checks are owed. |

## 1. Problem

The owner's phone screenshots show three defects on the Week screen:

1. The month card has a large empty band between its date grid and its footer, and the day header ("November 14 / Saturday" with arrows) sits under the bottom dock.
2. Role dots, the selected and today treatments, the week navigator (arrows, hold-to-accelerate, Today) need a 44 pt and VoiceOver check.
3. Week day cards, the To place tray, Free time chips, task rows, the completion haptic, drag with its tap path and Undo, empty and dense weeks, Dynamic Type and widths need an audit.

**Where the defects are.** Life is the default root (OD18, PR #211). `SpreadLiveRoot.body` shows `LifeRoot` while `native.weekMonth.previewEnabled` is on, which is the default. The Classic `WeekSurface` and `MonthSurface` show only when a person chooses Classic in More. So the screenshot Week is the Life week:

- The empty band is `Life/LifeWeekView.swift:157-158`. In expanded mode every one of the six rows stays on (`shown = expanded || row == selectedRow`) at 56 pt, so a five-week month leaves an empty sixth row above the footer at line 169.
- The header under the dock is probably `Life/LifeRoot.swift:110`, `.scrollClipDisabled()`. Its comment says cards pass through the scroll area and are clipped only at the window edge, so they are drawn beneath the dock. I did not confirm this by running the app, so it is a device check. The Classic dock is a layout sibling below the scroll view (`Shell/SpreadLiveRoot.swift:164-170`), so Classic content cannot pass under it.

Both are Life-lane files, outside W3's ownership, so they are exceptions (section 4).

## 2. Evidence

- Routing: `Shell/SpreadLiveRoot.swift:63-83` (Life or Classic), `:16` (the flag and its default).
- Classic Week and Month: `Week/WeekSurface.swift`, `Week/MonthSurface.swift`, `Week/ToPlaceTray.swift`.
- Shared navigator: `Shell/WeekCrownView.swift` and `Shell/SpreadArrowControl.swift`. Both are also used by Life (`Life/LifeRoot.swift:462, 549, 819`), so fixes there reach the owner's screen.
- Dead code: `Week/OverdueSelectionTray.swift` and `Week/MonthQuickAddSheet.swift` have no caller. The finalize plan (OD26) keeps them and records a parity gap in [../finalize/corrections/README.md](../finalize/corrections/README.md).
- Haptics: `Planner/LivePlanner.swift:448` defaults `completionHaptic` to false. Only a task that becomes done passes true, in Classic Spread's `toggleTask` (`Spread/SpreadSurface.swift:768`). Owner decision OD2 is met.

## 3. Goals, non-goals and budget

- **Goals:** a verified audit of W3 surfaces and states; the four fixes below; a clear handoff of Life defects to the Life lane.
- **Non-goals:** editing `Life/`, `Theme/` or `Sheets/`; deleting the two dead files (OD26); new colours, fonts or tokens; any change to store actions, data or schema; iCloud claims; merge, release or TestFlight.

## 4. Rules that apply and exceptions needed

Rules: [../RULES_CARD.md](../RULES_CARD.md) (44 pt touch targets, status never by colour alone, every drag has a tap path and Undo, one light haptic on completing a task on iPhone, Reduce Motion removes movement, no second store) and [../planner/SPREAD_NATIVE_BRAND_BOARD.md](../planner/SPREAD_NATIVE_BRAND_BOARD.md).

**Exceptions needed (for the owner or the Life lane to decide):**

- **E1. Life week defects (screenshot items 1a and 1b).** Owner: Life lane (B). Proposed fix: in `LifeWeekView` expanded mode, draw only as many rows as the month needs (`ceil((lead + days) / 7)`), and give the Life scroll area a bottom inset or an edge fade so the header clears the dock. Not changed here.
- **E2. Shared navigator.** `SpreadArrowValueControl` and `WeekCrownView` are used by Life. This PR changes the value text at accessibility sizes, so Life's navigator changes too (intended; section 6).
- **E3. Dead Week code kept.** `OverdueSelectionTray` and `MonthQuickAddSheet` stay, per OD26. Owner decides whether Life gets an equivalent or they are deleted.
- **E4. Task completion has no control on Week rows.** Completion happens in `TaskSheet` (`Sheets/`, not W3). `TaskLine` shows strikethrough only. The haptic policy is correct; the missing row control is a product decision for the owner.

## 5. Options and the chosen concept

- **A. Fix in place (chosen).** Four small changes inside W3's files and the shared navigator. Preserves Classic and Life behavior; no new component.
- **B. Rebuild Week and Month on Life's components.** Rejected: a second design system, and it crosses the Life lane's files.

### States audited

Each row was checked by reading the code, not by running the app.

| Element | Default | Pressed, focus, disabled | Empty, dense, error | VoiceOver and Dynamic Type | Result |
| --- | --- | --- | --- | --- | --- |
| Month grid cells (`MonthSurface`) | Day number, role dots (up to 3, then "+N") | Button press style | Each cell is at least 49 pt wide at 390 pt (8 pt margins, 6 pt gaps) | Label gives the date, "Today", "Open week", and the count | **Fixed.** Today was announced as "selected". "Selected" now means the open week. Today stays a filled disc, not colour alone. |
| Role dots | Colour per responsibility (data) | n/a | Empty day: no dots, count "No responsibilities" | Count in the label | Accepted. Dots are role data, not status, and the count is spoken. |
| Week navigator (`SpreadArrowValueControl`) | Arrows 44 x 52, value and detail centred | Arrows disable at limits (`disabled`) | Long value wraps | Labels "Previous week", "Next week", hint says hold to go faster | **Fixed.** At accessibility sizes the text wrapped and never shrinks. Standard sizes may still shrink to 80%. |
| Hold to accelerate (`SpreadArrowButton`, `SpreadHoldPace`) | 440 ms, then 270, 165 and 105 ms | Releasing after a hold does not add an extra step | n/a | VoiceOver gets a single step; holding is a sighted gesture | Accepted. Device check owed. |
| Today control (value button) | Opens today when not the current week | Disabled on the current week | n/a | Label carries the detail ("Back to this week") | Accepted. Target is 52 pt tall. |
| Spread/Week switch and brand (`SpreadLiveRoot`) | 44 pt segments | Selected segment is filled | n/a | Labels stay after the intro (`headerLabelsCollapsed`) | Accepted. |
| Day card (`DayCard`) | Weekday, date, "Today" text, allocations | Add button 44 pt | "Nothing planned" only when the week has hours (OD13) | Header trait on today | Accepted. |
| Add to day button | "Add {role}" | 44 pt | n/a | **Fixed.** Label now says the day: "Add Work to Monday". | **Fixed.** |
| Allocation row | Drag handle 44 pt, Move to another day, hour stepper, remove | Stepper and remove are 44 pt | Long role name wraps (headline at accessibility sizes) | Move action, and adjustable hours | Accepted. |
| To place tray (`ToPlaceTray`) | Groups by role, open at 5 tasks or fewer | Group header 48 pt, "Show N more" 44 pt | Empty: drop hint | Count reads "N to place" | **Fixed.** The hint wraps at large sizes. Dashed outline is a non-colour cue. |
| Task row (`TaskLine`) | Grip (drag), title (opens sheet), Place or Move to | All 44 pt | Title wraps to four lines | Place button now names the task | **Fixed.** Accepted: the grip is a drag handle, and Place or Move to is the VoiceOver path. |
| Free time chips | Add an hour, role dot, day | 44 pt | Wraps (`FlowLayout`) | Label gives the amount and the day | Accepted. |
| Empty week | One designed card | n/a | Shown when no hours are placed | Combined element | Accepted. |
| Many tasks | Six shown, "Show N more" | n/a | Scrolls | n/a | Accepted. |
| Landscape and iPad | Two day columns at width 744 or more (`PlannerLayout`) | n/a | Week column capped at 1120 pt | n/a | Accepted. Device check owed. |
| Light and dark | Tokens only in the owned files | n/a | n/a | n/a | Accepted. Only role data colours are literals. |
| Reduce Motion | Week follow, swipe and the edit glow are guarded | n/a | n/a | n/a | Accepted. |
| Completion haptic | Only a task becoming done (`toggleTask`) | n/a | n/a | n/a | Accepted (OD2). See E4. |
| Dock overlap (Classic) | Layout sibling below the content | n/a | n/a | n/a | Accepted. Life overlap is E1. |
| Spread colour swatches | 44 pt targets, selected ring | n/a | n/a | Labels read the hex value, for example "Use #34C759" | Polish. Owner copy decision, not changed. |

## 6. Platform behavior

- **Widths.** The month grid stays at or above 44 pt per cell from 390 pt. Two day columns start at 744 pt. Week content caps at 1120 pt.
- **Dynamic Type.** Accessibility sizes wrap in the navigator and the tray hint; standard sizes may still shrink a little.
- **VoiceOver.** The fixes name the day on Add and the task on Place or Move to, and "Selected" marks the open week.
- **Reduce Motion.** Unchanged.
- **Haptics.** Unchanged (OD2).

## 7. Technical approach

Files changed: `Shell/SpreadArrowControl.swift`, `Week/MonthSurface.swift`, `Week/WeekSurface.swift`, `Week/ToPlaceTray.swift`. No store action, planner state, schema, cloud, sync or backup file changes. No data migration. Two properties were added to `TaskLine` (`moveVerb`, `displayName`), and one environment value to `SpreadArrowValueControl`.

## 8. Risks, rabbit holes and open questions

- **Risk: Life navigator changes with the shared control (E2).** Default: keep it, because the change only affects accessibility sizes. Owner to confirm on device.
- **Open: E1 and E4** are decisions for the owner and the Life lane.
- **Open: hold-to-accelerate timing** on a real device. Default: keep the current pace.

## 9. Verification and full-implementation plan

### Acceptance criteria

- Month: today is announced as "Today", and "selected" marks only the open week.
- Navigator: value text wraps and does not shrink at accessibility Dynamic Type sizes.
- Day card: "Add" names the role and the weekday.
- Task row: "Place" or "Move to" names the task.
- To place tray: the drop hint wraps at accessibility sizes.

### Checks

Run in this pull request: `npm run typecheck`, `npm run lint`, `npm run test:spread`, `npm run test:scripts`, `npm run docs:check`. The Swift compile is `native-typecheck` on this pull request.

### Full-feature implementation and refinement plan

Implemented on the feature branch in the real app. Remaining refinement waits for the device checks below.

## 10. Rollout, rollback and release

Draft pull request. Not merged, not released, not uploaded to TestFlight. Rollback: revert the four commits.

## 11. Decision record

- Recorded in this spec: the routing finding (Life is the default root), E1 to E4, and the kept dead code (OD26).
- Not run: Swift compile here (none available), simulator, VoiceOver, Dynamic Type rendering and hold-to-accelerate timing.
- Owed on a physical iPhone and iPad, with light and dark, Reduce Motion, and widths 390, 820, 1024 and 1366: the Life week month band and header overlap (E1), the navigator at accessibility sizes, the hold timing, VoiceOver reading of the day and task labels, and landscape on iPad.
