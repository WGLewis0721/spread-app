# Spec: Lock Screen and Home Screen widget, Live Activity later

> Part of the Spread design brain. Start at [../README.md](../README.md). Follow [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md). Saved as `docs/design/specs/2026-10-28-widget-live-activity.md`.

| | |
| --- | --- |
| Request | "Do what a top AI engineer would do": turn the widget and Live Activity idea from the Dynamic Island video into a spec in the repo's own format |
| Restated | An iPhone owner who plans in Spread glances at the Lock Screen or Home Screen to see today's progress without opening the app |
| Surface | iPhone (Capacitor app, iOS 17.0 deployment target) |
| Size | L (new surface, new native target, and it needs exceptions to do-not-touch rules) |
| Author | Claude, 2026-10-28, for the owner |
| Status | Draft |
| Governing docs read | `docs/design/README.md` sections 3, 4, 8; `PLAN_SPEC_PROTOCOL.md`; `specs/TEMPLATE.md`; `AGENTS.project.md`; `CLAUDE.md` |

## 1. Problem

On a normal weekday the owner opens Spread in the morning, sets the day, and then puts the phone down. By mid-afternoon they want one answer: how much of today's plan is done and what is next. Today the only way to learn that is to unlock the phone, open Spread and wait for the Today view. That is five or six seconds and a context switch, so they often skip it and drift from the plan.

## 2. Evidence and context

- `[Repo]` Spread is a local-first planner. Capacitor wraps a React app. iOS deployment target is 17.0 (three occurrences in the Xcode project).
- `[Repo]` `ios/App/App/App.entitlements` holds only push, iCloud container and ubiquity entries. There is no App Group.
- `[Repo]` `src/lib/spread/native-mirror.ts` writes a snapshot of `spread.*` keys into the app's Library folder, for WebView storage recovery. A widget extension runs in a separate process and cannot read that folder. No Swift code reads the mirror today.
- `[Repo]` `native-mirror.ts` and the cloud, sync, backup, merge, restore, consent and safety files are on the do-not-touch list (README section 3).
- `[Repo]` `AGENTS.project.md` forbids glassmorphism and new colors, fonts or decorative styles.
- `[Apple]` Interactive widget controls use App Intents and need iOS 17. The widget extension is a separate process from the app.
- `[Apple]` A Live Activity is for a task with a defined start and end that lasts under eight hours. It can stay active for up to 8 hours and on the Lock Screen up to 12 hours, with a payload limit of 4 KB, and it cannot fetch from the network. It must support compact, minimal, expanded and Lock Screen presentations, and the Info.plist needs `NSSupportsLiveActivities`.
- `[Apple]` Apple's guidance is to avoid sensitive information on the Lock Screen.
- `[Apple]` A shared App Group entitlement is required in both the app and the extension, and in the provisioning profile.
- `[3P]` The video this came from builds the Live Activity with Expo and a community plugin. Spread is Capacitor, so that route does not transfer. A Capacitor route would be hand-written Swift or a community plugin such as `@capgo/capacitor-widget-kit`.
- `[Assumption]` The Apple limits above were read on Apple pages during research this session and should be rechecked on the day native work starts.
- Not checked: nothing here has been built or run on a device. No Xcode project change has been tried.

## 3. Goals, non-goals and budget

- **Goals:** a glanceable widget showing today's progress (done count, total, hours placed) that opens Spread to Today when tapped. Off by default. Shows no task text unless the owner opts in.
- **Non-goals / no-gos:**
  - No Live Activity in the first release. Spread's day does not have a defined start and end under eight hours.
  - No push backend and no server work.
  - No new colors, fonts or decorative styles.
  - No iCloud claims.
  - No interactive controls (complete a task from the widget) in the first release.
  - No Apple Watch or StandBy specific design.
- **Appetite:** one focused week of owner-approved work, plus device time. If the App Group data path grows past that, stop and report.

## 4. Rules that apply and exceptions needed

| Rule (document and section) | How this request touches it |
| --- | --- |
| README section 3, do-not-touch list | The widget needs data from outside the app process. `native-mirror.ts` is on the list and cannot be reused as is |
| README section 3, release authority | Spec is not approval. Owner merges and ships |
| `AGENTS.project.md`, no glassmorphism and no new colors | Widget uses the system container background and existing accent. No blur added by Spread |
| Responsibilities model (a task goes on its own role's day only) | Widget counts tasks as the app does and never re-assigns |
| Local-first | Snapshot stays on the device in the App Group container. Nothing leaves the device |
| Health color inconsistency noted in `UNIFIED_UX_RESULT` | Widget must not pick a Health color until the owner decides which value is correct |

**Exceptions needed (owner decides, do not assume):**
1. Add an App Group entitlement to the app and a new widget extension target (changes `App.entitlements` and the Xcode project).
2. Add a small, separate native writer that copies a minimal snapshot (counts and hours only) into the App Group container. This is a new file, not an edit of `native-mirror.ts`. If the owner wants the existing mirror changed instead, that is a do-not-touch exception.
3. Whether to add the dependency `@capgo/capacitor-widget-kit` or write a small custom Capacitor plugin in Swift. Default: custom, no new dependency.
4. Frosted look on the widget: not requested. Default is the system background.

## 5. Options and the chosen concept

### Options considered

| Option | Idea in 2 to 3 lines | Pros | Cons |
| --- | --- | --- | --- |
| A. Widget only | Home and Lock Screen widget showing today's progress, tap opens Today | Fits Apple's model for glanceable status. No time limit. Smallest native surface | Static, updates on a timeline, not live |
| B. Live Activity only | A started-day activity on the Lock Screen and Dynamic Island | Feels live, matches the video | Apple's guidance is for tasks under 8 hours with a start and end. A planner day does not fit. Needs foreground start, more states to design |
| C. Both | Widget plus Live Activity for a focus block | Most complete | Largest scope, two sets of states, two privacy surfaces |
| D. Nothing | Keep the app only | No risk | The glance problem stays |

**Chosen:** A, widget only. It fits the glance story and Apple's own fit test for Live Activities rules B out as a first step. **Rejected:** B and C for now, because the day is not a bounded task. Revisit a Live Activity only for a timed focus block, and only after the widget is used for a few weeks. D is the fallback if exception 1 is declined.

### Breadboard of the chosen concept

- **Places:** Home Screen small widget, Lock Screen rectangular and circular widget, More sheet (one switch).
- **Affordances:** the widget shows the done count over the total and the hours placed. Tapping opens Spread on Today. The More sheet has "Show Today on widgets", off by default, with a second switch "Show task names", off by default.
- **Connections:** the app writes the snapshot after each save when the switch is on. The widget reads it and refreshes on a timeline. Tap deep links to Today.

### States

- **Empty (no tasks today):** shows "Nothing planned" and opens Spread.
- **First run / switch off:** widget shows "Turn on in Spread, More" and does not read data.
- **Loading:** system placeholder.
- **Error (snapshot unreadable):** shows the last good snapshot with no time claim, or the first-run text if none.
- **Overflow:** counts only, no task list.
- **Offline:** no difference, everything is local.
- **Undo:** the app undoes in its own store, and the next snapshot corrects the widget.
- **Refused action:** none, the widget has no actions.

## 6. Platform behavior

- **Widths and orientation:** widget sizes are set by the system. The app widths 390, 820, 1024 and 1366 are unchanged. iPad widgets are out of scope for the first release.
- **Safe areas and fold (Duo):** not applicable to the widget. The More sheet is unchanged in layout.
- **Appearance:** light, dark and tinted modes follow system tokens. No hard-coded hex. `[Assumption]` the system accent matches the existing `--accent`, to be confirmed on a device.
- **Accessibility:** VoiceOver reads "3 of 7 done, 5 hours planned". Status never relies on color alone. Dynamic Type is respected by using system text styles. Increase Contrast and Reduce Transparency follow the system.
- **Input:** touch only for the widget. The More switches are reachable by keyboard and VoiceOver.
- **Haptics and motion:** none added.

## 7. Technical approach

- **Where it lives:** a new `ios/App/SpreadWidget/` extension target in Swift and SwiftUI. A small new TypeScript module (for example `src/lib/spread/widget-snapshot.ts`) builds the snapshot from the store, and a small Capacitor plugin writes it to the App Group container.
- **Data and state:** the snapshot holds the date, done count, total, hours placed and, only if opted in, up to a few task titles. Convenience state for the two switches uses keys that do not start with `spread.`. No data migration.
- **Flags and rollout:** both switches default off. A build flag keeps the extension out of the first TestFlight build until device checks pass.
- **Do not touch:** confirm none of the README section 3 paths are modified. The new writer is a new file. Only `App.entitlements` and the Xcode project change, which is exception 1.
- **Dependencies:** none by default. If `@capgo/capacitor-widget-kit` is chosen, record its license and maintenance state first.
- **Performance and privacy:** nothing leaves the device. Default snapshot has no task text, because Lock Screen content is visible to anyone holding the phone. Writing happens after saves, throttled, and must not block the UI.

## 8. Risks, rabbit holes and open questions

| Item | Why it matters | Proposed default | Who decides |
| --- | --- | --- | --- |
| App Group and provisioning profile | Needs the Apple developer account and a profile regeneration | Owner adds the group in the developer portal | Owner |
| Do-not-touch exception for a native writer | Touches the sync-adjacent area | New file only, no edit to `native-mirror.ts` | Owner |
| Health color mismatch (`#30B0C7`, `#0A84FF`, `#5856D6`, `#007AFF`) | A widget would copy a wrong value | No role colors in the first widget | Owner |
| Widget refresh budget | The system limits timeline updates, so progress can lag | Accept lag, reload on app background | Owner |
| Live Activity later | Apple fit test says defined start and end under 8 hours | Only a timed focus block, separate spec | Owner |
| Capacitor plugin vs custom Swift | Dependency and upkeep | Custom Swift, no dependency | Owner |
| Frosted glass request | Conflicts with the no glassmorphism rule | System background only | Owner |

## 9. Verification and prototype plan

### Acceptance criteria

- Given the switch is off, when the owner adds a widget, then it shows the first-run text and no task data was written to the App Group container.
- Given the switch is on and 3 of 7 tasks are done, when the widget refreshes, then it shows 3 of 7 and the hours placed.
- Given "Show task names" is off, when the Lock Screen widget is shown, then no task title appears.
- Given the owner taps the widget, when Spread opens, then Today is shown.
- Given the owner turns the switch off, when the next save happens, then the snapshot is deleted.
- Given VoiceOver is on, when the widget is focused, then it reads the counts as a sentence.

### Checks

- Typecheck, lint, tests, build (README section 3), plus the extended docs check in `npm run test:scripts`.
- Browser: More sheet switches at 390, 820, 1024, both modes, Reduce Motion, mouse and touch, no horizontal scroll.
- Owed on a physical device: widget install and refresh, App Group read and write, Lock Screen privacy, Dark and tinted modes, Dynamic Type, VoiceOver, Increase Contrast, tap deep link, behavior after force quit.

### Prototype plan

- **What must be real:** the App Group read path and the refresh behavior on a device.
- **What can be faked:** the numbers (a fixed snapshot file) for the layout pass.
- **Where it will be used:** the owner's own iPhone for several days.
- **Questions for the tester:** Do you know how to turn it on? Is the glance easy to read? How can we make it better?
- The prototype is disposable. The real version is written afterward.

## 10. Rollout, rollback and release

Branch `feature/widget-snapshot`, pull request into `main`. Switches default off, extension excluded from the first TestFlight build. To revert, remove the extension target and the entitlement in one commit; the snapshot file can be deleted by the app on launch if the switch is off. Release authority stays with the owner; this spec is not approval to merge or ship.

## 11. Decision record

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-10-28 | Draft: widget first, Live Activity deferred | Claude (proposal) | This spec only. Awaiting owner |
