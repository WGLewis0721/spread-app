# Week/Month redesign: 61 owner decisions

> Part of the [Spread design brain](../README.md). See [spec index](README.md) and [native brand board](../planner/SPREAD_NATIVE_BRAND_BOARD.md). This is owner-approved product direction, not a claim of completed code or device QA.

| | |
| --- | --- |
| Request | Persistent responsibility sidebar with coordinated Spread, Week and Month |
| Surface | Native iPhone, iPad and Duo SwiftUI |
| Size | L, staged |
| Status | Owner decisions approved; opt-in UI preview under implementation, native acceptance pending |
| Date | 2026-11-04 |
| Current baseline | GitHub main SHA c41ef3ea (after PR #129 merge) |
| New design | Opt-in device-local Week/Month preview; Classic default |
| Code | `WeekFocusSurface.swift`, `SpreadLiveRoot.swift`, `ManageSheets.swift` |

## Problem

The current native Week view is a vertical seven-day list; its responsibility selection and Month plane do not implement the persistent sidebar and daily focus chosen by the owner. Adding an immediate universal redesign would risk current planner flows, so ship a reversible opt-in UI preview first.

## Decision ledger

| # | Owner choice |
|---:|---|
| 1 | Combined Week, selected responsibility prominent, others compact |
| 2 | Seven-day overview with one selected day below |
| 3 | Other responsibilities as expandable compact rows |
| 4 | Multiple responsibility rows may remain open |
| 5 | Role-color dots for each calendar day |
| 6 | Schedule by drag or tap-to-choose-day |
| 7 | To Place collapsed to icon/count, expands to tray |
| 8 | To Place filtered to selected responsibility |
| 9 | Expanded row IDs remembered by date |
| 10 | Week returns to last selected day; first visit Today |
| 11 | Task tap opens Complete, Reschedule, Edit, Delete |
| 12 | Crown and seven-day horizontal swipe navigate weeks |
| 13 | Empty day: Nothing planned and Add |
| 14 | Selecting responsibility auto-expands its daily row |
| 15 | Completed tasks collapse under Completed (N) |
| 16 | Selected role with no tasks: compact Add row |
| 17 | Sidebar selection does not close other open rows |
| 18 | Week sidebar defaults to narrow persistent icon rail |
| 19 | Move scheduled tasks by drag or Reschedule |
| 20 | Invalid scheduling explained with Adjust hours action |
| 21 | Daily total hours plus per-role allocated hours |
| 22 | Tap hours for inline half-hour allocation controls |
| 23 | Inline Quick Add with optional full editor |
| 24 | Fully hidden sidebar reopens from header button |
| 25 | Tap day, swipe schedule for day; strip/Crown for week |
| 26 | Changing weeks selects Monday |
| 27 | Selected responsibility day dots emphasized |
| 28 | Day overview stays pinned while task list scrolls |
| 29 | Over-cap allocation rejected with shortage and fix |
| 30 | Day indicator check when selected role tasks complete |
| 31 | Sidebar responsibility icons have subtle weekly completion rings |
| 32 | Add on day without hours: save task then offer allocation |
| 33 | Sidebar selection scrolls to its row without reordering |
| 34 | Each task schedules on at most one day |
| 35 | Entire day completed: brief check and one haptic |
| 36 | Tap Crown date to return Today with haptic |
| 37 | Delete moves task to Recently Deleted |
| 38 | Deleted tasks expire after 30 days |
| 39 | Restore returns to original responsibility's To Place |
| 40 | Past-due tasks stay on original date; compact overdue tray |
| 41 | To Place and Overdue as two separate count icons |
| 42 | Overdue shows all responsibilities, grouped |
| 43 | Overdue supports multi-select for bulk rescheduling |
| 44 | Bulk action previews eligible/ineligible; confirm eligible only |
| 45 | Hold and drag to reorder tasks within day |
| 46 | Week/day task order and Spread task order independent |
| 47 | Unbounded natural vertical scroll through responsibility rows |
| 48 | Create responsibility with sidebar + without leaving Week |
| 49 | To Place tasks remain week-specific |
| 50 | Expanded sidebar overlays schedule; selection collapses it |
| 51 | Day changes transition by directional horizontal slide |
| 52 | Completion never reduces allocated hours |
| 53 | Week seven-day overview morphs into Month |
| 54 | Month replaces daily schedule but keeps sidebar/Crown |
| 55 | Month dates show responsibility-color dots |
| 56 | Crown and calendar horizontal swipe navigate months |
| 57 | Month selected responsibility dot emphasized; others visible |
| 58 | Tap Month date opens Week; hold opens Add |
| 59 | Month cell: up to 3 dots then +N; selected role first |
| 60 | Week/Month calendar toggle inside seven-day overview header |
| 61 | Closing Month without picking date restores prior Week day |

## Interaction contract

- **Spread:** expanded persistent responsibility sidebar with saved selected role; Wallet Stack and planner data remain authoritative.
- **Week:** compact persistent responsibility rail; selected day beneath pinned seven-day overview; selected role expanded, other rows optional and independently remembered per date. Time summaries come from actual allocations, not task completions. Schedule, hours and task actions go to the existing planner store.
- **Month:** calendar control morphs day strip to a seven-column month grid, replacing the daily schedule but keeping Crown/rail. Date tap drills back to Week; closing without selecting restores prior day. Role indicators preserve stored colors; up to three and an overflow count.
- **Navigation:** selected role shared across Spread/Week/Month; day swipe area separate from week swipe and task drags; Crown navigates week/month and date returns Today; changing weeks opens Monday.
- **Recovery and overdue:** Recently Deleted retention/restore, independent task ordering, overdue/bulk operations are **separate schema and engine work**, not complete in the initial UI-only preview.

## Repository verification

- [Repo] `Week/WeekSurface.swift`: old seven-day list, UIKit horizontal week gesture; actual task allocations and time steppers.
- [Repo] `Week/MonthSurface.swift`: role dots, +N overflow, month marks and day tap already present.
- [Repo] `PlannerSnapshot.swift`: snapshot includes roles, allocations and week-specific tasks; no tombstones or view-specific order field.
- [Repo] `Sheets/ManageSheets.swift`: More is a condensed action tray; add calendar design option **inside the existing appearance row** so it does not introduce a new scrolling section.
- [Repo] `Shell/SpreadLiveRoot.swift`: root owns Crown, destination, Month and sheets.

## Opt-in preview vs. full 61-decision implementation

**Included in first code slice:** device-local Settings calendar selector with Classic default, one selected day and seven-day overview, compact responsibility rail, selectable responsibility, selected-day task/allocation rows via the existing store, week-specific To Place count/tray, existing Month grid and navigation.

**Still to implement and test separately:** persistent rail across Spread, fully adaptive overlay collapse, day/Month gesture parity, true sticky overview on large type/short scenes, completion rings, task Quick Add, task quick actions, completion folding, overdue tray/bulk, 30-day Recently Deleted migration, independent saved task ordering, a11y/performance/device evidence. A preview is not a claim that all 61 decisions are complete.

## Release gates

1. Classic selected by default; switching never modifies task/role/allocation data.
2. Settings Calendar design control (>=44pt) visible without a scrolling step on standard iPhones; toggle persists device-local across relaunch.
3. Alternate Week allows selected day/role navigation and uses existing authoritative store actions, no independent scheduler.
4. 390/393pt, iPad and Duo layout checks; meaningful Dynamic Type, light/dark, Reduce Motion, VoiceOver.
5. Week vertical scroll and horizontal day/week gestures do not interfere; real iPhone/Duo simulator UI test evidence.
6. Month marks, overflow, day selection, Crown and restoration correct; screenshots attached to PR.
7. 30-day deletion / overdue / task-order data changes are blocked from release until backed by migrations, restore/backup and regression tests.
8. Never merge/deploy without owner's explicit authorization.

**Rollback:** switch Settings back to Classic; if preview itself regresses, revert the focused branch. Preserve golden baseline and existing local planner data.
