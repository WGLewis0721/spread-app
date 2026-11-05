# Week/Month redesign: 61-decision verification status

> Part of the [Spread design brain](../README.md). See [spec index](README.md), the [owner decisions](2026-11-04-week-month-owner-decisions.md) and the [component specification](2026-11-04-week-month-components-implementation.md). This is a status record for PR #139 (merged) and its follow-up PR, not a release approval.

| Field | Value |
| --- | --- |
| Base | `main` 51f9a7c (#136 and #140), plus #138's compile fix |
| Merged | PR #139 as 74356d5 on Nov 4, at the owner's request, **before** the macOS build and simulator runs finished |
| Follow-up | `fix/redesign-verify-followup` |
| Release status | **NO-GO.** The native build and Simulator launch pass on main (run 41931343425); UI journeys and device checks are still owed |

## Where evidence comes from

- **Store/bridge test:** runs in `npm run test:spread` on Linux and in CI. It drives the real dispatcher and store, then re-reads saved storage.
- **UI test written:** an XCUITest exists and is wired into a workflow, but has **not run yet**. It counts only once the xcresult is attached.
- **Code only:** implemented, with no automated check. Needs a device or simulator look.
- **Partial / Not done:** a known difference from the owner's decision.

Code being present does not count as passing. Every row below still owes simulator evidence.

## Defects found and fixed in this PR

| Severity | Defect | Fix | Evidence |
| --- | --- | --- | --- |
| Critical | `ensureWeek` dropped `dayTaskOrder` on load, so Week day order was silently lost, including across iCloud item assembly. This also failed `test:spread` on main, so the iOS workflow never reached `xcodebuild` | Keep every week field (the same fix also landed on main as #140, merged in) | `sync-model` roundtrip test; new load test |
| Critical | #136's own deletion, restore, expiry, overdue and day-order tests were in no test list | Listed; `--min` 459 | `test:spread` |
| High | WeekFocusSurface compile error (`Bool?` vs `String?`) | #138's commit, included | CI build pending |
| High | Undo after Delete left a Recently Deleted entry that could never be restored | Undo drops entries for revived tasks | Bridge test |
| High | Overdue confirm sent the whole selection, not the reviewed eligible rows | Send only the reviewed eligible IDs | Code; engine also re-validates (bridge test) |
| High | Month long press was attached to Classic Month too, could block scrolling, and its release also opened Week | Opt-in only, simultaneous gesture, release suppressed | UI test written |
| High | Day reorder was drag-only, with no Undo (rules card) | Move up/down in the task menu and as VoiceOver actions; reorder is undoable | Bridge test; UI code only |
| Medium | Recently Deleted showed "Nothing recently deleted" when the read failed | Error state with Try again | Code only |
| Medium | A duplicate ID in saved day order would trap the app | `uniquingKeysWith` | Code only |
| Medium | Expanding the Week rail shifted the schedule sideways | Compact slot kept under the overlay | UI test written |
| Medium | Last selected Week day forgotten on relaunch (#10); empty day never said "Nothing planned" (#13) | Remembered per profile; shown whenever the day has no hours | Code only |
| CI | Week/Month UI tests ran in no workflow | `week-month` groups at 390 and 820 pt, Reduce Motion, Duo | Pending |

## Decision status

| # | Decision | Status | Evidence |
|---:|---|---|---|
| 1 | Combined Week, selected role prominent | Implemented | Code only |
| 2 | Seven-day overview, one selected day | Implemented | UI test written |
| 3 | Other roles as expandable compact rows | Implemented | Code only |
| 4 | Several rows may stay open | Implemented | Code only |
| 5 | Role-color dots per day | Implemented | Code only |
| 6 | Schedule by drag or tap-to-choose-day | Implemented | Code only |
| 7 | To Place icon/count expands to tray | Implemented | UI test written (#139 lifecycle) |
| 8 | To Place filtered to selected role | Implemented | Code only |
| 9 | Expanded rows remembered by date | Implemented | Code only |
| 10 | Returns to last selected day; first visit Today | Implemented in #139 | Code only |
| 11 | Task tap: Complete, Reschedule, Edit, Delete | Implemented | UI test written |
| 12 | Crown and strip swipe navigate weeks | Implemented | UI test written |
| 13 | Empty day: Nothing planned and Add | Implemented in #139 | Code only |
| 14 | Selecting a role expands its row | Implemented | Code only |
| 15 | Completed tasks fold under Completed (N) | Implemented | UI test written |
| 16 | Selected role with no tasks: compact Add | Implemented | UI test written |
| 17 | Selection does not close other rows | Implemented | Code only |
| 18 | Narrow persistent rail by default | Implemented | UI test written |
| 19 | Move by drag or Reschedule | Implemented | Code only |
| 20 | Invalid scheduling explained with Adjust hours action | **Partial:** explained, with no Adjust hours button | |
| 21 | Daily total and per-role hours | Implemented | Code only |
| 22 | Half-hour inline hour controls | Implemented (adjusts the role's first allocation that day) | Code only |
| 23 | Inline Quick Add, optional full editor | Implemented | UI test written |
| 24 | Hidden sidebar reopens from header | Implemented | UI test written |
| 25 | Tap day; swipe schedule for day; strip/Crown for week | Implemented | UI test written |
| 26 | Changing weeks selects Monday | Implemented | UI test written |
| 27 | Selected role's day dots emphasized | Implemented | Code only |
| 28 | Overview pinned while list scrolls | Implemented (outside the scroll view) | Code only |
| 29 | Over-cap allocation rejected with shortage and fix | **Partial:** refused with a reason; no shortage amount or one-tap fix | Store refuses (existing tests) |
| 30 | Day check when selected role's tasks are complete | Implemented | Code only |
| 31 | Weekly completion rings | Implemented | Code only |
| 32 | Add on a day without hours: save, then offer hours | Implemented | UI test written |
| 33 | Selection scrolls to row without reordering | Implemented | Code only |
| 34 | A task is on at most one day | Implemented (model invariant) | Existing tests |
| 35 | Whole day complete: brief check and one haptic | Implemented in #139, per owner choice: the completion that finishes the day plays one success haptic **instead of** the task haptic (still one per tap); brief check and VoiceOver announcement | Code only |
| 36 | Crown date returns to Today, with haptic | Implemented | Code only |
| 37 | Delete goes to Recently Deleted | Implemented | Bridge test |
| 38 | Expires after 30 days | Implemented | Unit test |
| 39 | Restore to original role's To Place | Implemented | Bridge and UI test |
| 40 | Past-due stays on its date; overdue tray | Implemented | Bridge test |
| 41 | To Place and Overdue as separate counts | Implemented | Code only |
| 42 | Overdue for all roles, grouped | Implemented | Bridge test |
| 43 | Multi-select bulk reschedule | Implemented | Code only |
| 44 | Preview; confirm eligible only | Implemented | Bridge test |
| 45 | Hold and drag to reorder within a day | Implemented, plus tap/VoiceOver path | Bridge test |
| 46 | Day order independent of Spread order | Implemented | Unit and bridge test |
| 47 | Natural vertical scroll | Implemented | Code only |
| 48 | Create role from sidebar + in Week | Implemented | Code only |
| 49 | To Place is week-specific | Implemented | Bridge test |
| 50 | Expanded sidebar overlays; selection collapses it | Implemented | UI test written |
| 51 | Day change slides by direction | **Partial:** animated, not directional | |
| 52 | Completion never reduces hours | Implemented | Bridge test |
| 53 | Overview morphs into Month | Implemented in #139: each strip day shares geometry with its Month cell; no movement under Reduce Motion; Classic unchanged | Code only |
| 54 | Month replaces schedule, keeps rail and Crown | Implemented | UI test written |
| 55 | Month dots | Implemented | Existing month-marks test |
| 56 | Crown and swipe navigate months | Implemented | UI test written |
| 57 | Selected role's Month dot emphasized | Implemented | Code only |
| 58 | Tap date opens Week; hold opens Add | Implemented | UI test written |
| 59 | Up to 3 dots then +N, selected first | Implemented | Code only |
| 60 | Toggle in the overview header | Implemented | UI test written |
| 61 | Closing Month restores the prior day | Implemented | UI test written |

**Summary:** 58 implemented and 3 partial (#20, #29, #51). The owner deferred those three to a follow-up on Nov 4. Verified so far: store and bridge behavior only. Native build, UI journeys, screenshots, VoiceOver, Dynamic Type, rotation, Duo poses and light/dark are all still owed.

## Not touched (rules card boundaries)

Cloud, sync, backup, restore and schema files were not edited. The sync roundtrip was fixed in `model.ts` and verified by the existing sync-model test. iCloud compatibility of the new fields is covered only by that test, not by a device sync.

## Remaining work (follow-up PR)

Each item closes only with evidence attached to the follow-up PR: an xcresult, screenshots, or a test name.

1. **Native build: DONE.** Main 74356d5, `iOS shell` run 41931343425 (Nov 5): typecheck, `test:spread`, SpreadCloudCore `swift test`, the iPhone simulator `xcodebuild` (01:43–01:46 UTC) and Simulator install and launch all succeeded. #139's Swift compiles with no errors. The native journey and Release archive steps were still running when this was recorded.
2. **Week/Month journeys:** `native-journeys` groups `week-month` (390 pt), `week-month-ipad` (820 pt) and `reduce-motion`, plus the two journeys in `native-duo-acceptance`. Fix real failures; never skip a test.
3. **Regression suites still green:** Classic Week, Wallet Stack, Crown, layout acceptance (390, 820, 1024, 1366), visual tour, Duo hinge and rotation.
4. **Manual or simulator checks:** VoiceOver order and actions (Move up/down, Add task to this day, Day complete), the largest Dynamic Type size, light and dark, rotation and resizing, and Duo open and closed.
5. **Data:** profile separation, backup and restore, and iCloud sync of `deletedTasks` and `dayTaskOrder` between two devices. Only the store-level sync test covers these today.
6. **Deferred partial decisions:** #20 and #29 (an Adjust hours action that names the shortage) and #51 (directional day slide).
7. **Screenshots** compared with the approved review images, with differences recorded here.

