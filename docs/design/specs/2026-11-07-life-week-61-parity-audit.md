# Active Life Week/Month: 61-decision source parity audit

> Part of [Spread design brain](../README.md). Compare against the [owner's complete 61-decision ledger](2026-11-04-week-month-owner-decisions.md), not the old #144 implementation branch. **Source inspection and commits are not device acceptance.**

| Field | Result |
| --- | --- |
| Baseline | `main` at `c031324` (Nov 7, 2026) |
| Active route | `SpreadLiveRoot.swift` → `LifeRoot.swift` → `LifeWeekView.swift` |
| Implementation | Draft PR #160, branch `feat/life-week-61-parity-20261107` |
| Existing Life UI | 12 decisions |
| Existing planner/More functionality | 7 decisions |
| Focused Life parity patches | 32 decisions, **code only until checks pass** |
| Superseded by newer owner-approved Life/Wallet interaction | 10 decisions |
| Remaining confirmed source gaps | 0 after #28 pinned-overview patch; device QA still pending |
| Native QA | Pending head-specific simulator, screenshots and physical-device evidence |
| Release | NO-GO; Classic preserved; no merge/deploy authorized |

## Full decision mapping

Status denotes **which code path owns the behavior**, not a claim that UI/device testing has passed. "Adapted" is not a silent deviation: latest Life card-stack navigation deliberately replaced the older persistent responsibility rail and multirow expansion model.

| # | Owner decision | Source parity | Evidence / difference |
|---:|---|---|---|
| 1 | Combined Week, selected responsibility prominent, others compact | Existing Life UI | Selected Life card reveals its day tasks |
| 2 | Seven-day overview with one selected day below | Existing Life UI | Calendar + daily workspace |
| 3 | Other responsibilities as expandable compact rows | Adapted in newer Life design | Wallet cards replace old compact role rows |
| 4 | Multiple responsibility rows may remain open | Adapted in newer Life design | One focused Wallet card replaces multiple open roles |
| 5 | Role-color dots for each calendar day | Existing Life UI | Planner-backed role-color marks |
| 6 | Schedule by drag or tap-to-choose-day | Implemented on #160 | Day drop target + Place/Move sheet |
| 7 | To Place collapsed to icon/count, expands to tray | Implemented on #160 | Separate compact To Place button |
| 8 | To Place filtered to selected responsibility | Implemented on #160 | Filter uses selected Life area |
| 9 | Expanded row IDs remembered by date | Adapted in newer Life design | Wallet focus replaces expanded-row-by-date memory |
| 10 | Week returns to last selected day; first visit Today | Existing Life UI | Date persists per profile |
| 11 | Task tap opens Complete, Reschedule, Edit, Delete | Implemented on #160 | Complete toggle, task editor, contextual reschedule; delete in task sheet |
| 12 | Crown and seven-day horizontal swipe navigate weeks | Implemented on #160 | Week-strip swipe + Crown |
| 13 | Empty day: Nothing planned and Add | Implemented on #160 | Empty-day instruction and 1h action |
| 14 | Selecting responsibility auto-expands its daily row | Existing Life UI | Tap Wallet card selects focused role |
| 15 | Completed tasks collapse under Completed (N) | Implemented on #160 | Completed group collapsed by default for scheduled day |
| 16 | Selected role with no tasks: compact Add row | Existing Life UI | Existing LifeQuickAdd below focused card |
| 17 | Sidebar selection does not close other open rows | Adapted in newer Life design | Wallet focus governs siblings |
| 18 | Week sidebar defaults to narrow persistent icon rail | Adapted in newer Life design | Compact navigation tray, not old role rail |
| 19 | Move scheduled tasks by drag or Reschedule | Implemented on #160 | Reorder drag, reschedule from context |
| 20 | Invalid scheduling explained with Adjust hours action | Implemented on #160 | Invalid drop explains reserve/adjust action |
| 21 | Daily total hours plus per-role allocated hours | Implemented on #160 | Real allocation total plus focused-role hours |
| 22 | Tap hours for inline half-hour allocation controls | Implemented on #160 | Existing half-hour LifeReserveSheet linked from focus |
| 23 | Inline Quick Add with optional full editor | Existing Life UI | LifeQuickAdd uses authoritative store |
| 24 | Fully hidden sidebar reopens from header button | Adapted in newer Life design | Life navigation tray replaces old sidebar restore |
| 25 | Tap day, swipe schedule for day; strip/Crown for week | Implemented on #160 | Day header swipe distinct from week strip |
| 26 | Changing weeks selects Monday | Implemented on #160 | Week shifts select Monday; exact date taps preserved |
| 27 | Selected responsibility day dots emphasized | Implemented on #160 | Selected color/dot emphasized |
| 28 | Day overview stays pinned while task list scrolls | Implemented on #160 | LifeRoot routes Week to LifeWeekView's pinned calendar and separate day ScrollView; simulator proof pending |
| 29 | Over-cap allocation rejected with shortage and fix | Existing Life UI | Main already rejects shortage without silent partial placement |
| 30 | Day indicator check when selected role tasks complete | Implemented on #160 | Selected role day-complete check |
| 31 | Sidebar responsibility icons have subtle weekly completion rings | Adapted in newer Life design | Life Wallet, not a role-icon sidebar, owns progress presentation |
| 32 | Add on day without hours: save task then offer allocation | Implemented on #160 | No-day-hours quick add offers reserve time after saving |
| 33 | Sidebar selection scrolls to its row without reordering | Adapted in newer Life design | Wallet focus moves selected area, not an expandable list |
| 34 | Each task schedules on at most one day | Existing planner/More | Planner store maintains single allocation day per task |
| 35 | Entire day completed: brief check and one haptic | Implemented on #160 | Day-complete check and existing single acknowledged haptic |
| 36 | Tap Crown date to return Today with haptic | Implemented on #160 | Life Crown Today signal selects actual date |
| 37 | Delete moves task to Recently Deleted | Existing planner/More | More → Recently Deleted uses existing store |
| 38 | Deleted tasks expire after 30 days | Existing planner/More | Existing 30-day tombstone retention |
| 39 | Restore returns to original responsibility's To Place | Existing planner/More | Existing restore returns to original week/role To Place |
| 40 | Past-due tasks stay on original date; compact overdue tray | Implemented on #160 | All-role overdue read and compact tray |
| 41 | To Place and Overdue as two separate count icons | Implemented on #160 | Two compact count entries |
| 42 | Overdue shows all responsibilities, grouped | Implemented on #160 | Existing OverdueSelectionTray groups by role |
| 43 | Overdue supports multi-select for bulk rescheduling | Implemented on #160 | Bulk selection reused without new store |
| 44 | Bulk action previews eligible/ineligible; confirm eligible only | Implemented on #160 | Preview + eligible-only commit reused |
| 45 | Hold and drag to reorder tasks within day | Existing Life UI | LifeTaskRows drag-grip reordering |
| 46 | Week/day task order and Spread task order independent | Existing planner/More | Store dayTaskOrder separate from Spread order |
| 47 | Unbounded natural vertical scroll through responsibility rows | Existing Life UI | LifeRoot natural vertical scroll |
| 48 | Create responsibility with sidebar + without leaving Week | Implemented on #160 | New Life area from Week To Place sheet |
| 49 | To Place tasks remain week-specific | Existing planner/More | Week-specific planner snapshot |
| 50 | Expanded sidebar overlays schedule; selection collapses it | Adapted in newer Life design | Life navigation drawer overlays screen |
| 51 | Day changes transition by directional horizontal slide | Implemented on #160 | Directional 28-point travel and Reduce Motion opacity |
| 52 | Completion never reduces allocated hours | Existing planner/More | Completion does not modify allocated hours |
| 53 | Week seven-day overview morphs into Month | Adapted in newer Life design | Life expands calendar rows in place under new tactile design (not old matched-geometry requirement) |
| 54 | Month replaces daily schedule but keeps sidebar/Crown | Implemented on #160 | Month hides day workspace, Crown persists |
| 55 | Month dates show responsibility-color dots | Existing Life UI | Planner monthMarks with colored dots |
| 56 | Crown and calendar horizontal swipe navigate months | Implemented on #160 | Month Crown, horizontal swipe and arrows use read-only presentation month |
| 57 | Month selected responsibility dot emphasized; others visible | Implemented on #160 | Role-first mark ordering |
| 58 | Tap Month date opens Week; hold opens Add | Implemented on #160 | Date opens Week; long-press offers Month Quick Add |
| 59 | Month cell: up to 3 dots then +N; selected role first | Implemented on #160 | 3 role dots plus numeric overflow |
| 60 | Week/Month calendar toggle inside seven-day overview header | Existing Life UI | Calendar toggle within overview |
| 61 | Closing Month without picking date restores prior Week day | Implemented on #160 | Closing Month leaves Week-selected date intact |

## Changed code (PR #160)

- `LifeWeekView.swift`: pinned seven-day calendar above separately scrolling tasks, real daily hour summary, role-focused To Place sheet, role-grouped overdue entry and eligibility flow, Month-only calendar surface, one-line date controls, independent strip/day gestures, selected-role marks, numeric +N overflow, long-press Add, same-week and cross-week date selection, exact hours remediation, transient day-complete feedback.
- `LifeWalletStack.swift`: day-only completed folding and contextual Reschedule while preserving Life's approved card motion; zero-hours Quick Add saved to To Place then offers reserve time.
- `LifeCalendarRules.swift`: pure helpers for filtered To Place tasks, planned hours, completion, marker ordering and Monday week selection. No new storage or network.
- `LifeRoot.swift`: shared Life area selection, real Month Crown navigation via display-only month anchor, Today intent to focused Week, existing Life reserve/manage sheets.
- Existing `OverdueSelectionTray.swift`, `MoveToSheet`, `RecentlyDeletedSheet.swift`, `LivePlanner.swift` and the TypeScript store remain authoritative; no duplicate persistence models.

## Open and conditional

1. **Decision #28 source patch is implemented:** Life Week now bypasses the parent page scroll, pins the week calendar, and scrolls only daily content. The new nesting still requires iPhone, Duo, landscape and Dynamic Type simulator/physical verification before acceptance.
2. **Adapted decisions #3, #4, #9, #17, #18, #24, #31, #33, #50, #53:** the owner's later Life/Wallet direction superseded the old responsibility-rail/multi-expanded-row UI. Reintroducing the old rail would create overlapping controls and break current Life simplicity. Confirm only if owner explicitly reverses that direction.
3. `OverdueSelectionTray` and Recently Deleted are implemented against the existing engine, **not reimplemented** in Life. Verify profile isolation, recoverability, stale revision rejection, bulk eligibility and offline persistence through actual bridge/device tests.
4. PR #144's code targets the older `WeekFocusSurface`, is hundreds of commits behind and conflicts with current main. Do not merge it to force parity. Preserve its old tip in Git history.
5. Manual acceptance remains required: current iPhone, iPad, Duo poses/rotation, horizontal/vertical gesture ownership, Month/Week/Today navigation, Dynamic Type, Reduce Motion, VoiceOver, 44-point hit targets, screenshots and haptic perception; test source alone does not satisfy any of these.

## Test and rollback plan

- Native: compile Swift package and app; run `LifeUITests` Week/Month/To Place/Overdue, `NativeContractsTests` pure helper vectors, Classic unaffected; candidate simulator screenshots.
- Planner: verify one-day task invariant, explicit shortage without mutation, bulk overdue preflight and eligible-only commit, Recently Deleted restoration/30-day expiry, independent ordering, profile and backup/sync roundtrips.
- Verify existing `CI`, `iOS shell`, `Spread 2.0 SwiftUI slice verification` and App Store preflight on the **latest commit**; run the five manual native visual/layout/gesture suites for the candidate before approval.
- Rollback: discard/revert #160. No schema, migration, mandatory account, production deploy or irreversible update was added.

**Acceptance:** No release and no full 61/61 parity claim until the pinned calendar is device-verified, adapted Wallet decisions are acknowledged, and recorded native evidence supports the final head.
