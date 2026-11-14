# Spread | Screen Map (publish finalize)

> Part of the Spread design brain. Start at [../README.md](../README.md). Folder index: [README.md](README.md).

> Summary: 48 inventoried surfaces: 40 native (planner, Life, sheets, Focus, widgets) and 8 landing entries. Every entry is `implemented` in source and none is `verified`, because no device or run evidence was available in this pass. The machine-readable list is [screens.json](screens.json), which is authoritative.

Gray Matter's `templates/SCREEN_MAP.md` is mapped onto this file, as the publish plan requires (one home per fact: no parallel `design/` folder).

## Approved inventory and user journeys

- **Requested screen list.** The repo holds no owner-written list of requested screens. This inventory is derived from source, and the owner should confirm it. Nothing is removed without owner approval (Gray Matter's rule, and the publish plan's acceptance criterion).
- **Navigation entry.** `SpreadLiveRoot.body` (Shell) chooses one of two roots. Classic is the default. Life is shown when `@AppStorage("native.weekMonth.previewEnabled")` is true (default false). Life is switched on from More → Calendar design, and by widget deep links (`SpreadOpenToday`, `SpreadOpenFocus`, `SpreadOpenLifeCard`), which also turn the flag on.
- **Classic.** Navigation rail: Spread, Hours, Week. Week has a Month plane. The header holds the calendar-week navigator. Sheets come from the header, the rail's More action and task rows.
- **Life.** One root with Life, Hours and Week destinations. A focused card reveals Details, Tasks and its week. Plan Ahead and Focus open as sheets.
- **First successful journey (both roots).** Responsibilities → Hours → Week → Tasks. The landing page teaches this order in its hero principle line.
- **Optional paths.** Backup and restore, Recently Deleted, Profiles, What's New and Reminders all live in More. The Focus timer is reachable from the Life root and from More.
- **Redirects.** None. Widgets route through notifications that switch the flag on.

## Shared patterns and states

- **Components reused.** The sheet anatomy (grabber, detents, dismiss), the undo notice, the arrow/value/arrow control (`SpreadArrowValueControl`), role rows and task rows, the To place tray, and `SpreadIcons` for Lucide symbols. Duplicates are logged in [corrections/life-routing.md](corrections/life-routing.md).
- **Data sources.** All native state goes through `LivePlanner` and the planner intents in `Planner/`. Views send awaited intents and hold only transient presentation state. Backup is excluded from polish and not reviewed here.
- **Words for a role (OD7).** Life uses "Life area"; Classic uses "responsibility". "Spread" never names a role. The Life Details sheet is titled "Details" (OD8). Code on main still uses the older words; see [corrections/copy-voice.md](corrections/copy-voice.md).
- **Empty states.** Classic: "Make room for what matters" with an action. Life: "Nothing to do here yet." Week: an overbooked and empty-week message follow OD12 and OD13, so day cards do not repeat "Nothing planned". The copy still differs on main.
- **Error states.** Classic recovery (Try again, Open existing planner). Recently Deleted: "could not be read. Nothing was removed." Photo decode and file-unavailable alerts in TaskSheet. Save failure offers Retry saving.
- **Undo.** Every drag or destructive change offers Undo through the undo notice. Life Details delete uses Undo without a prompt. Classic role removal uses a confirmation. The two behaviors differ ([corrections/life-routing.md](corrections/life-routing.md) lists it).
- **Responsive and accessibility.** Accessibility text sizes hide the sticky header and the rail labels. Reduce Motion is read in 16 native files. Accessibility labels number 121 across the native source. Touch targets use `tapTarget()` in 23 places. VoiceOver order and Dynamic Type on device are not verified.

## Implementation coverage

| Surface | Entries | Status (source) | Verified |
| --- | --- | --- | --- |
| Shell and recovery | 5 entries (N01, N06, N29, N30, N34) | implemented | 0 |
| Classic screens | N02-N05, N32, N33 | implemented | 0 |
| Life screens and sheets | N07-N18 | implemented | 0 |
| Shared sheets | N19-N28, N31 | implemented | 0 |
| Focus and Live Activity | N35, N36 | implemented | 0 |
| Unreachable | N37 (`reachable: false`) | implemented, not reachable | 0 |
| Widgets | W01-W03 | implemented | 0 |
| Landing | P01-P08 | implemented | 0 |

For each entry, `screens.json` records purpose, entry, exit, states, implementation files, design proofs, test sources, owner lane and notes. `test_sources` lists XCUITest files that exist, not runs. No run record was inspected. A `test_sources` entry therefore does not make a surface verified.

## Stages

- **Planned.** Not used. Nothing is only named.
- **Designed.** Not used as a status. The brand board and Life specs in `docs/design/` describe most surfaces, and they count as design proofs, not as screens.
- **Implemented.** All 48 entries. Compiled by native-typecheck on the PR, not verified here.
- **Verified.** None. Verification needs a candidate SHA, a physical iPhone run and screenshots, as [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) requires.

## Not inventoried

- The React web planner is suspended (CLAUDE.md). Its snapshot is branch `parked/web-cloud-2026-11-11`.
- iCloud backup, sync and cloud flags are excluded by the boundaries. `src/lib/spread/cloud-flags.ts` ships them off.
- Studio is not established on main in this pass. `docs/design/README.md` section 5 says to inspect source first, and this lane did not.
- `docs/evidence/` was not readable in this session (a Bash permission denial), so any evidence held there is unknown here.
