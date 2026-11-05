# Component specification — complete Week/Month experience

> Spread design brain · [61 owner decisions](2026-11-04-week-month-owner-decisions.md) · [verified status](2026-11-04-week-month-verification.md) · [native brand board](../planner/SPREAD_NATIVE_BRAND_BOARD.md).
> Owner requested no new design questions. Product direction is approved. **Code status and release approval are separate.**

| | |
| --- | --- |
| Scope | Native SwiftUI (iPhone, iPad, iPhone Duo); local-first |
| Reference | `Spread_Week_Month_Review.zip` (the owner-supplied review bundle), particularly `03_WEEK_VIEW.png`, `04_MONTH_VIEW.png`, `05_SIDEBAR_OVERLAY.png`, `06_SETTINGS_SWITCH.png` |
| Branch | `feat/week-month-61-completion` from main at `ac3c1b592afa` |
| Status | Approved component design; implementation and native acceptance gated |
| Data authority | `src/lib/spread/store.ts` through versioned native bridge; never a second local Swift scheduler |
| Design authority | Native board wins over external references and generated image colors |

## 1. Reference research and lock

Research first, using @Refero on November 5, 2026:

- **[Linear style](https://linear.app):** disciplined layered dark surfaces, reserved accent and compact command-center information hierarchy. **Borrow only** functional density and calm selected states; **reject** Linear's lime accent, font, and tight 6px card radii because Spread's native board owns those roles.
- **[Shortcut style](https://www.shortcut.com):** compact information cards, quiet secondary content, strong functional hierarchy; borrow the relative contrast of selected vs. supporting items.
- **[Paste style](https://pasteapp.io):** deliberately spare, native-feeling light appearance and softly elevated content; borrow whitespace discipline only, not the amber branding.
- **[Structured iOS day planner](https://refero.design/screens/5a371bb8-48c7-4528-a248-d4d5e2857b6a):** seven-day horizontal calendar **above** a single selected day's tasks, with visible completion and Add affordance.
- **[Foodvisor calendar](https://refero.design/screens/7ca38fcb-fb29-451d-9422-5deb0c85b834):** seven-column dates, selection highlight, tiny activity indicators, direct day selection.
- **[Freeform Recently Deleted](https://refero.design/screens/e4030ccf-2cdc-4b15-99a8-f5dcc83ba756):** scannable recoverable list, timestamps and compact rows.
- **[Dropbox recovery flow](https://refero.design/flows/2437):** find deleted item → choose restore → show outcome and remove from deleted list.
- **[Pool Trash management flow](https://refero.design/flows/11993):** selection and permanently destructive action visually distinguished.

**Primary visual lock:** existing Spread native **deep navy / luminous blue**, Apple system typography and materials, metallic Crown and colorful Chalkboard responsibility symbols, with cream system light mode from the native design board. Refero is interaction evidence, **not a new brand system**. Preserve stored responsibility colors as data, not UI chrome. Never let a visual reference add an account requirement, cloud dependency, hidden action, duplicated storage, or new navigation tab.

**The ZIP is concept artwork.** Implement semantics and hierarchy, not pixel-match invented calendar/task data. Don't ship an image as a control.

## 2. Component contracts

| Component | Structure / states | Interaction and outcome | Acceptance / test IDs |
| --- | --- | --- | --- |
| `WeekCalendarHeader` | Crown below brand; pinned card: calendar toggle, 7 equally accessible day targets, 3 role dots max, selected day and small completion check | Tap date changes selected day; horizontal strip swipe changes week, selects Monday; Crown same state path; dot for selected role first/larger | `focus-week-overview`, `focus-day-<ISO>`, 44pt each; Week strip and task drag gesture owners distinct |
| `FocusedDailySchedule` | Selected date/total hours, compact To Place/Overdue tray pair, vertically scrollable role cards; empty-day Add | Day swipe moves only one day within week; directional slide, not changing week; scrolling remains native vertically | `focus-nothing-planned`; focus stable across role changes; no clipping at 390pt |
| `ResponsibilitySidebar` | 56pt compact icon rail; selected tint and weekly completion ring; expand over schedule to ~148pt, never resize schedule | Select role expands it without collapsing others; sidebar + creates role; collapse/restore reachable in header | `focus-show-sidebar`, role IDs, tap >=44pt; VoiceOver single control in overlay |
| `FocusedRoleCard` | Role symbol/name, count, hours, accordion, open task rows, Completed group and inline Add; one role remains expanded by selection | Tap hours shows +/-0.5h; rejected allocation names shortage and provides **Adjust weekly hours** action to Role editor, no silent partial changes | `focus-role-toggle-<ID>`, `focus-hour-<ID>`; row memory scoped to profile/day |
| `FocusedTaskRow` | One 44pt checkbox, one task label, drag grip, plain action sheet | Tap task: Complete, Reschedule, Edit, Delete; reorder by drag or menu Move up/down, Undo via store; completed tasks folded | `focus-task-<ID>`; same task identity across views |
| `FocusedQuickAdd` | Collapsed Add line; inline title + Save, More details, Cancel; no allocated hours state | Save first; if no hours offer 30m or To Place, with Adjust weekly hours path; task never disappears | `focus-quick-add-<ID>`; rich content only in native editor |
| `ToPlaceTray` | Small icon/count, selected responsibility only, week-specific | Tap expands; drop unassigns; tap scheduling equivalent; no automatic carryover | `focus-to-place` |
| `OverdueSelectionTray` | Small icon/count beside To Place; grouped all responsibilities, multi-select | Choose destination, preview eligible/refused, confirm eligible only, preserve rejected and their original dates | `focus-overdue`; no silent ineligible partial move |
| `MonthGrid` | Replaces daily details, same rail/Crown, 7-column dates and 3 dots +N, selected role priority | Crown + horizontal swipe navigate months; tap date returns focused Week; hold opens date-specific Add; close returns previous day | `month-day-<ISO>`, `focus-week-month-toggle`; Reduce Motion dissolves instead of translating |
| `RecentlyDeleted` | Settings action; deleted list, deletion dates / expiry, Restore and permanently Delete | Deletes produce recoverable tombstone for 30 days, then expire; restore to original role's **To Place** preserving content/done status | Accessible empty/error/retry, profile isolation, persisted relaunch/backup/sync round-trip |
| `CalendarDesignPicker` | Settings → Appearance, Classic or Week+Month | Device-local opt-in, Classic default and safe rollback; never changes task data | `calendar-design-picker`; switch persists restart |
| `InlineHoursRefusal` | Small contextual explanation under affected role or attempted day drop | Exact shortage in half-hour units; **Adjust weekly hours** opens existing RoleSheet; never allocate fewer hours than requested | Test no mutation on failure; no fake success haptic |
| `DayDirectionalMotion` | Selected-day card is the only moving layer, strip/rail/Crown stay fixed | Next day enters from right; previous enters from left; Reduce Motion uses no travel; haptic only on successful navigation | Test direction with day IDs and reduced-motion preference; no scroll regression |

## 3. States and content treatment

- **No roles:** existing `emptyPlan` remains reachable, Add responsibility leads to existing native form.
- **No allocated time:** show "Nothing planned". Add saves to To Place then asks whether to allocate valid time.
- **Many roles:** separate scrolling rail, no arbitrary cap, no reordering when selection changes.
- **Long task:** wraps at natural height, never ellipsize destructive actions.
- **Too many month dots:** 3 plus `+N`, selected responsibility takes one of those 3 if present.
- **Saving failure:** current native store error with Retry saving / Backup. No optimistic success announcement.
- **Invalid drop:** keep task in place; show plain text explanation with correct role and difference; offer actual adjustment form.
- **Overdue stale/review changed:** revision guard rejects or refreshes the preview; never silently move rejected tasks.
- **Deleted role after task deletion:** define recovery behavior in engine; no dangling ghost task, no invented role.
- **Dark/Light/System:** `Spread.canvas`, `Spread.elevated`, `Spread.ink`, `Spread.accent`; not hardcoded white text in light mode.
- **No motion:** opacity or zero transition, no swipe-only affordances.

## 4. Architecture / data safety

- Single writer: TypeScript Zustand store, `native-v2-dispatch.ts`; native receives immutable snapshot and sends validated intents.
- Existing `deletedTasks` schema and `dayTaskOrder` survive normalize/backup/sync. Do **not** create another deletion store.
- `dayTaskOrder` is separate from canonical Spread order; a single scheduled day per task.
- UI memory is device-local and profile-scoped (non-`spread.` preference prefix), not a second planner database.
- Native build compatibility: prefer existing `SpreadMotion`, `SpreadHaptics`, `SpreadSheetStack`, SF Symbols and accessibility IDs; guard APIs by supported deployment/Xcode version.
- Keep Classic fully functional; revert feature branch or select Classic for rollback.

## 5. Verification matrix

1. `npm run test:spread` including tombstone expiration, undo, return-to-To-Place, backup/restore and iCloud round trips; `npm run lint`, `npm run typecheck`; portable Swift tests.
2. Native iPhone 390/393/430, iPad 820/1024/1366 and Duo compact/unfolded/rotated windows: build and launch, scroll to last responsibility, pinch/hinge resizing, no actionable control clipped or smaller than 44pt.
3. New design: create → hours → select day → quick add → edit rich content → complete → reschedule → delete → restore → relaunch.
4. Overdue group select and preview 3 eligible/2 blocked; confirm, only valid move, failures explained. Undo and repeated calls remain safe.
5. Crown/Week swipe/day swipe/Month swipe/vertical scroll/drag gestures simultaneously tested for direction and isolation, including Reduce Motion.
6. Classic test suite, Settings reachability, light/dark, VoiceOver focus order and repeated day/role selections unchanged.
7. Compare native screenshots against owner ZIP; record quantified drift per component, not only qualitative impressions.
8. Final PR head's CI/native/simulator/visual/hinge jobs **must pass**. Absent or queued is not passing; physical device pass is a release gate.

## 6. Delivery gates

One new PR; focused commits and tests; no merge/deployment without explicit user authorization. Product behavior may be partially coded without being verified; never reclassify "code only" as "completed". Maintain existing PR #141/#142 and their traceability, and record duplicate/conflicting fixes rather than overwriting their branch history.
