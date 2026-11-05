# Week/Month complete experience — component specification

> Part of the [Spread design brain](../README.md). See [spec index](README.md).

> **Owner-authorized build scope:** All 61 decisions in [owner ledger](2026-11-04-week-month-owner-decisions.md). This file is the component-level source of truth for the new opt-in SwiftUI interface. Based on the **actual review ZIP** (Spread_Week_Month_Review.zip, Nov 4) and the [native brand board](../planner/SPREAD_NATIVE_BRAND_BOARD.md). New work must preserve Classic as the fallback.

| Field | Value |
| --- | --- |
| Size | L, native iPhone / iPad / foldable iPhone layouts |
| Version | 2026-11-04 |
| Review target | 03_WEEK_VIEW.png, 04_MONTH_VIEW.png, 05_SIDEBAR_OVERLAY.png, 06_SETTINGS_SWITCH.png in review ZIP |
| Status | Approved direction; implementation and QA tracked independently |
| Primary invariant | All planner changes through the existing TypeScript store; no Swift-only copy of task data |
| Flag | `native.weekMonth.previewEnabled` (device-local), Classic default |
| Release | Draft PR; do not merge or deploy before green native/device gates |

## 1. Design reference research

Refero research was performed before design decisions were translated to code:

| Reference | Link | Adaptation to Spread | Do not copy |
| --- | --- | --- | --- |
| **Structured for iOS**, focused week-date selector / scheduling sheet | https://refero.design/screens/f2476132-47dc-45d1-9cf9-d9d12c62cb0f | Small selected date and directly associated actions; month overview drills to exact day | Structured's palette / full calendar task model |
| **Amie for iOS**, seven-day date row + one daily content area | https://refero.design/screens/0d5c41b6-a2f1-426d-bb5c-8da4a347d0fa | Week strip as a constant anchor while one day changes below it | Hourly timeline: Spread schedules hour budgets, not appointments |
| **CocoonWeaver for iOS**, select-all and batch action state | https://refero.design/screens/bb8c243d-0f69-463e-ab45-e1cfa66e94fe | Explicit Select/Cancel, clear selected count, batch preview before commit | Unrelated share/copy actions |
| **1Password for iOS**, Recently Deleted confirmation | https://refero.design/screens/0fe4f5b0-376d-44d0-9756-3a11a99c46ef | Dedicated recovery location with obvious Recover / permanent Delete choices | Account-sync assumptions |
| **Dropbox restore flow**, five-step recovery journey | https://refero.design/flows/2437 | Deleted list → inspect → restore → progress → saved confirmation, with refresh | Required network/auth, which Spread does not have |
| **Micro / Linear / desktop.fm**, typography and UI discipline | https://www.micro.so ; https://linear.app ; https://desktop.fm | Selective elevation, compact system-type hierarchy, tightly controlled navigation affordances | Their colors, typefaces, glow and branding |

**Reference lock:** Spread's *existing* native brand board is the primary visual authority, not any third-party site. Preserve cream/navy dynamic canvas, system font, action blue, actual role colors, original Chalkboard category art, 44pt touch areas, machined Crown, bounded edge light, Wallet Stack and glass only on chrome. Borrow from Refero **only** the seven-day to single-day hierarchy, clear bulk-select mode, and lightweight recovery feedback. No extra nav bar, no new icons library, no invented analytics, no placeholder content presented as real tasks.

### Options considered

- **Chosen — one daily workspace + persistent responsibility rail:** coherent with 61 owner choices, enough horizontal room on iPhone, stable Crown, minimal duplicate controls.
- **Rejected — seven full vertical day cards:** too much scrolling and doesn't communicate selected-day focus.
- **Rejected — freeform calendar grid as sole navigation:** compact but makes task actions and selected responsibility difficult to reach.

### November 5 Refero and review ZIP refinement (PR #144)

Fresh Refero inspection corroborated the existing component architecture without changing Spread's palette or native brand authority:

| Newly inspected reference | Specific component lesson | Constraint retained |
| --- | --- | --- |
| [Structured iOS day planner](https://refero.design/screens/5a371bb8-48c7-4528-a248-d4d5e2857b6a) | Pinned seven-day strip and one selected task list, completion and Add actions remain visible | Spread is **hours-budgeted**, not an hourly appointment timeline |
| [Foodvisor calendar grid](https://refero.design/screens/7ca38fcb-fb29-451d-9422-5deb0c85b834) | Seven-column month with tiny event dots and an unambiguous selected date | Use actual responsibility colors, max three dots +N |
| [Freeform Recently Deleted](https://refero.design/screens/e4030ccf-2cdc-4b15-99a8-f5dcc83ba756) | Recoverable list is scannable by task/title, origin and deletion time | No account requirement or cloud-only restore |
| [Dropbox recovery](https://refero.design/flows/2437) and [Pool trash management](https://refero.design/flows/11993) | Separate restore from permanent deletion, explicit selected count, clear success/failure | Keep existing native local-first recovery engine and confirmation |
| [Linear](https://linear.app), [Shortcut](https://www.shortcut.com) and [Paste](https://pasteapp.io) styles | Controlled selected-state contrast, compact nested surfaces and focused light appearance | **Do not copy** lime/amber/violet accents, external typefaces or site radii |

**Reference lock:** the owner's `Spread_Week_Month_Review.zip` remains the visual hierarchy target. The existing native design board owns dark navy/cream, system typography, action blue, role colors, Crown, Chalkboard and materials. Use Refero as pattern research, **not a second design system**.

**Components tightened on PR #144:** `InlineHoursRefusal` computes exact half-hour shortage without silently placing fewer hours and exposes a real RoleSheet adjustment action; `DayDirectionalMotion` slides selected daily content in navigation direction and dissolves under Reduce Motion; `SidebarRestore` lives beside the Spread brand when fully hidden; `ResponsiveHeader` retains Crown/navigation at accessibility text sizes. Their UI, portable tests and QA gates remain mandatory before release.

## 2. Component inventory and implementation contracts

| Component | Visual source | State and interactions | Code home | Acceptance |
| --- | --- | --- | --- | --- |
| `ResponsibilityRail` | 03/05 | icon rail, progress ring, selected role, full labeled overlay, collapse/reopen, Add (+) | SwiftUI WeekFocusSurface + shared Shell / Spread | same role across destinations; overlay never squeezes tasks |
| `WeekDayStrip` | 03 | Mon–Sun, stored role dots, active date, completion mark, calendar morph button | WeekFocusSurface | tap changes day; strip swipe changes week only |
| `DaySchedule` | 03 | selected-day scroll, daily hours, role rows, empty state | WeekFocusSurface | scroll reaches last task; sticky strip above |
| `RoleDayRow` | 03 | selected role expanded automatically, other rows independently toggled; compact Add state; allocated hours | WeekFocusSurface | per-date expanded state retained; selecting role scrolls into view |
| `TaskQuickActions` | task content target | Complete, Reschedule, Edit, Delete; no direct deletion | New native task-actions sheet | 4 working actions, no duplicate completion changes |
| `QuickAdd` | 03 | single-line input, Return saves, More details opens existing rich editor, insufficient allocation offers hours | WeekFocusSurface | saved once and scheduled only via valid allocation |
| `CompactToPlace` | 03 | inbox icon count for selected role of open week; taps open task tray | WeekFocusSurface | filter and count react immediately to sidebar |
| `OverdueInbox` | approved question 40–44 | all prior unfinished scheduled tasks grouped by role, checkbox multi-select, preview per-target eligibility, commit eligible only | native + engine read and bulk command | invalid unchanged, explicit confirmation |
| `DayHours` | 03 | compact total and color breakdown; tap per-role amount to reveal half-hour stepper | WeekFocusSurface | checks bank, never derives hours from task completion |
| `MonthGrid` | 04 | full calendar replacing DaySchedule, max 3 role dots + N, selected role dot emphasized, date tap/long press, month swipe | MonthSurface + root | month marks across weeks, retained Week day on close |
| `CrownBridge` | actual native UI | click date Today, spin/arrows navigate Week/Month, haptic | WeekCrownView/SpreadLiveRoot | same source of truth with strip swipes |
| `RecentlyDeleted` | 1Password/Dropbox | Settings → Recently Deleted, 30-day retention, inspect, restore to original role To Place, permanently delete with confirmation | store, native dispatcher, native Settings sheet | survives relaunch/backup, profile isolation, purges expired records |
| `WeekOrder` | approved Q45–46 | drag reorder tasks within selected day, independent from Spread list | planner model/store with per-date task sequence | persists and does not reorder Spread |
| `CalendarDesignPreference` | 06 | Classic/New device-local selector, current default Classic | MoreSheet | switching back never mutates planner data |

## 3. Interaction rules: shared state

1. `selectedRoleId` is a *single* navigation selection for Spread, Week and Month. It does not hide other responsibilities.
2. `selectedDayISO` remembers the last day when changing Spread ↔ Week. Initially Today; changing weeks selects Monday. Closing Month without date pick preserves the prior ISO.
3. `expandedRoleIDsByDay` maps ISO date → expanded role IDs and persists per profile as **device-local presentation state**, without mutating planning records.
4. Tapping a task opens a lightweight action sheet. Completion is a single store command; finished tasks fold into Completed(N); expanding Completed is local UI state.
5. Separate gesture capture: weekday-strip horizontal pan changes week, schedule horizontal pan changes day, task long press begins drag, vertical scroll always wins in the scroll axis, Crown owns its own horizontal drag, sidebar overlay traps taps and dismisses appropriately.
6. Feedback is one haptic for accepted actions, none on every animation frame. Directional day slide only under non-reduced-motion. One brief all-tasks-done checkmark, not confetti.
7. Every drag has tap/move sheet and VoiceOver alternative; no gesture is mandatory to complete a task or move it.

## 4. Persistence and safety contract

**Tombstones:** `deletedTasks[]` per full planner profile, each `{task, roleId, weekKey, deletedAt}` with task content preserved. Pure normalize/migration filters malformed tombstones; expiration is a **30-day** policy (not 30 local midnights). A restore drops scheduling (`allocationId`) and re-adds the original task ID to its original responsibility's To Place in its original week; if the responsibility no longer exists, show an explicit recoverability/refusal state, never invent a role. Permanent deletion requires confirmation; purging expired entries must be covered by backup, profile clone, sync and crash-recovery tests.

**Overdue:** read across earlier weeks (not simply the current snapshot); unfinished tasks tied to allocated days before local Today, grouped by their stored responsibility and week. Bulk move must operate in target week's context, not silently change the user's viewed week; preflight every candidate using the *current* store to reject insufficient hours/role/day. Preview exact valid/invalid counts, then mutate eligible only in an atomic transaction with save failure handling.

**Ordering:** preserve responsibility-level `box.tasks` as Spread order. Add separate date-specific display order only where a task has a valid allocation for that date. Deleting, rescheduling, reordering, duplicating and restoring a task must never create duplicate task IDs or orphan order entries.

**Compatibility:** old backups remain readable; new backups include tombstone and order data, and a compatible reader must not silently throw them away. Document migration/schema impact and test restore into a new profile. No extra cloud accounts, telemetry, networking or server deletion.

## 5. Design states

- **Empty week/day:** selected responsibility compact Add row; no-task day displays Nothing planned with Add.
- **Zero-hour role:** Quick Add saves to To Place and offers Adjust hours. Refuse direct assignment without an eligible allocation.
- **Overloaded:** clear missing hours, no partial mutation unless preview confirms eligible subset.
- **Expired trash:** purge when accessed/booted, display retention countdown for remaining records.
- **Long role names / accessibility text:** wrap, provide accessible names and independent scrolling for rail.
- **Offline / save-failed:** store error surfaced with Retry/Backup; don't optimistically claim success before authoritative reply.
- **Undo:** preserve existing six-second store undo for eligible changes; trash restore is separate from instant Undo.
- **No Role selected:** choose the first existing responsibility without saving a fictitious role.

## 6. Responsive and QA gates

| Width/mode | Expected |
| --- | --- |
| 390/393 pt iPhone | rail narrow, seven distinct dates tappable, task text wraps, no floating overlap |
| iPhone landscape / Duo outer | rail visible, dense mode without forced split screen |
| Duo open / 820+ | layout resizes based on available geometry and safe areas, never assumes device name |
| iPad / 1024+ | width may grow; never sprawl unreadable single lines; rail retains own scroll |
| Dark/light/system | token-driven, readable metadata and modal contrast |
| VoiceOver & Dynamic Type | identifiers, labels, 44pt actions, no clipping at accessibility sizes |
| Reduce Motion | instant date updates, no unnecessary travel; haptics optional where appropriate |

**Automated acceptance:** legacy Classic UI tests unchanged; new owner-decision integration test suite on flag-on Week/Month; new store tests for trash, restore, expiry, serial bulk eligibility, ordering, rollover, backup/sync; source/golden screenshot comparison; no test skips. Run JS lint/typecheck/tests, macOS xcodebuild and UI tests via CI, Duo unfolded/closed and rotation. Failing gates keep PR unmerged and flag-off.

## 7. Delivery ledger

Track each decision number and component against actual code and test evidence in the PR. Mark **verified** only after test on the latest PR head, not when code is merely written. Preserve `main` unchanged until explicit approval.
