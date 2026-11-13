# Spec: Timer widgets, Life cards widget and continuity across the island, widgets and app

> Part of the Spread design brain. Start at [../README.md](../README.md). Follow [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md). Save as `docs/design/specs/YYYY-MM-DD-<slug>.md`.

| | |
| --- | --- |
| Request | "Add a timer widget in small and large and add a timer to the existing larger widget. Next set continuity updates between the Dynamic Island, the widgets, and the app proper. Add a widget that is a clone of the life cards in app. It should take them directly to that card when tapped. They should be able to navigate through their life cards in widget. Use the design docs in the repo and research how apps use the Dynamic Island for scheduling and reminders and planning, then present about 7 wireframes for how the Dynamic Island can bring functionality and continuity." |
| Restated | For an iPhone user of Spread, add a Focus timer widget (small, large), a timer panel on the Today widget's medium size, and a Life cards widget that flips through cards and opens the tapped one; make the Dynamic Island, widgets and app show one shared timer state; and present seven Dynamic Island wireframes. |
| Surface | Native iPhone: Home Screen widgets, Live Activity (Dynamic Island, Lock Screen) |
| Size | L: several surfaces, a new widget, a new shared data path and a new privacy switch |
| Author | Tool (Sonnet 5.5), 2026-11-13 |
| Status | Draft. Implemented on the session branch. The owner chose Dynamic Island concepts 1, 2 and 7 (section 12). The round and break rules are compiled and tested on Linux. The WidgetKit, AppIntents and SwiftUI code is syntax-parsed only and is not compiled. Device checks are owed |
| Governing docs read | `CLAUDE.md` rules block (Behavior, Boundaries, Verify); `PLAN_SPEC_PROTOCOL.md`; `specs/TEMPLATE.md`; `specs/2026-11-12-today-widget.md`; `specs/2026-11-12-focus-live-activity.md`; `docs/IOS_RELEASE.md` (build ownership); Apple's Live Activities guidance and the ActivityKit article (external) |

## 1. Problem

Someone starts a focus session. The Lock Screen and the Dynamic Island show it, but nothing on the Home Screen does, because the timer keeps its state in the app's own private storage, where a widget cannot read it. The Today widget shows counters but no timer. There is no widget for Life cards, which are the app's main view. So a person cannot glance at their time, or flip through their Life areas, without opening the app, and each surface that gets added risks showing a different answer.

## 2. Evidence and context

- [Repo] The timer session is saved under `native.focus.session.v1` in the app's standard defaults (`SpreadFocusTimer.swift`). The widget extension reads only the shared App Group.
- [Repo] The Today widget (small, medium, Lock Screen) reads a counters snapshot from the App Group. The Live Activity controller projects the timer to ActivityKit. `SceneDelegate` handles `spread://today` and `spread://focus` only.
- [Repo] The Life card face is drawn by `LifeEditorialFace`: the area's color fading to deep green-black, a serif italic name, the weekly budget and a seven-day strip. With no artwork the app draws exactly that gradient.
- [Repo] A planner `Task` has `text`, `done`, `allocationId`, `content`, `estimateMinutes` and an optional red `!`. It has no deadline field.
- [Repo] The planner's store runs inside the app's web bridge, so an extension cannot edit planner data.
- [3P] Apple: a Live Activity is for a task with a clear start and end, up to eight hours; compact reads as one unit; minimal carries the one essential value; keep interactivity to one element; prefer one rotating activity to several; tapping opens the right place; avoid sensitive content; end at once and keep a short summary. Tiimo shows a focus timer and task progress; Korq counts down to a deadline and offers snooze. Sources are on the wireframe overview.
- [Assumption] "The existing larger widget" is the Today widget's medium size, its largest Home Screen size.
- Not checked: how any of this looks on a device, and the native brand board's rules for widgets.

## 3. Goals, non-goals and budget

- **Goals:** a Focus timer widget in small and large; a timer panel on the Today widget's medium size; one write path so the app, the Live Activity and every widget show the same session; a Life cards widget in the app's card look that flips with previous and next and opens the tapped card; links that land in the right place; a separate off-by-default switch for Life cards on widgets; seven Dynamic Island wireframes grounded in the research.
- **Non-goals / no-gos:** no change to planner data, schema, sync or backup; no card artwork on widgets; no server or push; no Lock Screen Life cards; no countdown to a deadline, because tasks have none; no scheduled start of any round or break. Island concepts 3, 4, 5 and 6 stay wireframes (section 12).
- **Appetite:** one pull request. If the type-check keeps failing on the same code, split the Life cards widget out.

## 4. Rules that apply and exceptions needed

| Rule (document and section) | How this request touches it |
| --- | --- |
| RULES_CARD Boundaries: no second store, no data migration, task changes through `store.ts` | Every new record is a disposable projection written by the app into the App Group. The planner store is untouched. Widgets only show and open. |
| RULES_CARD Boundaries: do not touch cloud, sync, backup, schema, `ios/App/App/Cloud/**`, `ios/App/SpreadCloudCore/**`, `server/` | None touched. |
| RULES_CARD Look: targets at least 44 pt; status never color alone | The previous and next buttons are 44 by 44 pt. Timer states carry a label and a glyph, not only a color. |
| RULES_CARD Behavior: nothing automatic changes the plan | The widgets and the island change only presentation state (which card shows). They never move hours or complete tasks. |
| `today-widget.md`, Outside-app security: counts and hours only, no responsibility names | Life cards show Life area names, colors and weekly hours. See exception 1. |
| `focus-live-activity.md`: title is "Focus session" unless the person allows the name | The timer mirror follows the same rule and the same switch. |
| `docs/IOS_RELEASE.md`: no GitHub iOS build or simulator workflows; Codemagic is the only signed lane | See exception 2. |

**Exceptions needed (owner decides, do not assume):**
1. **Life area names on the Home Screen.** The Today widget spec says widgets show no responsibility names. A Life card is its name, so the Life cards widget breaks that line. It is off by default behind its own switch, "Show Life cards on widgets", with a footnote that anyone who can see the Home Screen can see them. The owner should confirm this.
2. **A type-check job on GitHub.** `.github/workflows/native-typecheck.yml` asks the Swift compiler whether the native sources are valid against the iOS Simulator SDK. It does not build, archive, sign, upload or run a simulator, and it follows the existing `swift-cloudkit-typecheck` job. It does sit close to the line the owner drew on 2026-11-11 when retiring GitHub "SwiftUI native compile". It is a separate commit; delete the file to remove it.
3. **No card artwork on widgets.** The widget draws the app's no-art gradient. Artwork would add images to the extension and entries to its Resources phase. Decide whether to add it.

## 5. Options and the chosen concept

### Options considered

| Option | Idea in 2 to 3 lines | Pros | Cons |
| --- | --- | --- | --- |
| A | The app's timer writes one mirror record into the App Group on every change. The Live Activity and all widgets read it. A running session carries an absolute deadline, so widgets count down by themselves. | Small and safe. The timer stays the only authority. No refresh budget is used. | Widgets and the island can show state but not change it. |
| B | Move the timer's authoritative state into the App Group, so a widget or island App Intent can pause it directly. | Pause and resume work from outside the app. | Migrates a saved key and changes the timer's core. Higher risk, and needs on-device testing first. |
| C | Update the Live Activity and widgets with push from a server. | Works while the app is suspended. | Spread has no server and the product rules forbid adding one. |

**Chosen:** A now, with B noted as the next step for wireframe 1. **Rejected:** C (no server). Refreshing a timeline every second was also rejected: it would exhaust the widget refresh budget, and a deadline makes it unnecessary.

For the Life cards widget the options were a card picker in the widget's settings, one widget per card, and a carousel. **Chosen:** the carousel. It is what "navigate through their life cards in the widget" asks for, and it needs one widget on the Home Screen.

### Breadboard of the chosen concept

- **Focus timer widget, small.** A status line (Focus, Paused or Finished), the digits, a progress bar, and the title ("Focus session" unless allowed). Idle: "No timer running. Tap to start a focus session in Spread." Tap opens the Focus Timer.
- **Focus timer widget, large.** The same panel, then "Ends at 3:42 PM" while running, then a Today block (tasks done, hours placed). The Today block opens Today. Everything else opens the Focus Timer.
- **Today widget, medium.** The counters stay on the left. While a session exists a timer panel sits on the right. The panel opens the Focus Timer; the rest opens Today. Small and the Lock Screen sizes are unchanged.
- **Life cards widget, medium.** One card: the area's color gradient, the serif italic name, "N h THIS WEEK", and the seven-day strip. A header row holds the previous and next buttons and "2 of 5". Tap the card to open it.
- **Life cards widget, large.** The same card, larger: a wordmark row with the buttons, the name, the budget, "x h assigned, y h unassigned", a progress bar, the strip with weekday names, and page dots.
- **Continuity.** The timer writes once per change. The Live Activity, Timer widget and Today panel all read it and all open `spread://focus`. A Life card opens `spread://life?card=<id>`, which switches to today's week first and then focuses that card.
- **Seven Dynamic Island wireframes** are on the published board (see section 9). They are proposals, not built.

### States

- **Widgets off:** the Today and Timer widgets show their existing "enable in More" hint. Life cards show "Turn on Life cards on widgets in More, then open Spread."
- **No timer:** the Timer widget shows the idle text; the Today panel is hidden.
- **Paused:** the frozen time and the word Paused. Never a deadline that has passed.
- **Deadline reached with the app closed:** a timeline entry at the deadline flips the face to Finished. The mirror is cleared the next time the app runs.
- **A new week with the app closed:** the Life cards snapshot is for the old week, so the widget shows the off hint, not stale hours. It refreshes at midnight.
- **A deleted card or another profile:** the link opens Life. A profile switch deletes the Life cards snapshot and the stored card choice.
- **Over budget:** the card says "x h over budget", as the app does.

## 6. Platform behavior

- **Widths and orientation:** small, medium and large Home Screen sizes. Digits and names use minimum scale factors so long names and an hour-long timer fit.
- **Appearance:** all three widgets follow the system's light or dark appearance. The timer and Today widgets use the system background and semantic text colors. The Life card keeps the app's look in dark (the area's color fading to deep green-black, white text) and uses the brand cream with a soft wash of the area's color and navy text in light. Tinted and accented Home Screen modes are not tested.
- **Accessibility:** the card is one element with a full spoken summary (name, budget, assigned, unassigned, each day). The previous and next buttons are separate elements with labels. Paused, idle and finished timer states have text. A running countdown relies on the system's own timer text.
- **Input:** tap and the two buttons. No drag is involved.
- **Haptics and motion:** none added. WidgetKit supplies the transitions.

## 7. Technical approach

- **Where it lives:**
  - `Widget/SpreadWidgetShared.swift`: one Foundation-only file compiled into both the app module and the extension. It holds the timer mirror, week math, Life card records, card stepping, links and color parsing.
  - `Widget/SpreadFocusWidgetPublisher.swift`, `Widget/SpreadLifeCardsPublisher.swift`, `Widget/SpreadLifeCardsWidgetBuilder.swift`: the app-side writers and the builder.
  - `Focus/SpreadFocusTimer.swift`: one line in `persist()`, plus one at launch.
  - `SpreadWidget/SpreadTimerWidget.swift`, `SpreadLifeCardsWidget.swift`, `SpreadTodayWidget.swift`: the extension.
  - `Shell/SpreadLiveRoot.swift`, `Sheets/ManageSheets.swift`, `Life/LifeRoot.swift`, `App/SceneDelegate.swift`: publishing, the new switch and the Life card link.
  - `App.xcodeproj/project.pbxproj`: three new files registered in the widget target.
- **Data and state:** App Group keys `spread.widget.focus.v1`, `spread.widget.lifecards.v1` and `spread.widget.lifecards.selected.v1`. Switch `native.widget.lifeCardsEnabled`. Pending-card keys in the app's standard defaults. No store action, schema or sync change.
- **Flags and rollout:** the existing "Show Today on widgets" switch now also governs the timer mirror. "Show Life cards on widgets" is new and off.
- **Do not touch:** none of the Boundaries paths are modified.
- **Dependencies:** none. AppIntents, WidgetKit and ActivityKit are system frameworks.
- **Performance and privacy:** no polling. The timer mirror is rewritten only when the session changes. The mirror carries "Focus session" unless the name is allowed. Life cards carry names, colors and hours only after the switch. Nothing leaves the device.

## 8. Risks, rabbit holes and open questions

| Item | Why it matters | Proposed default | Who decides |
| --- | --- | --- | --- |
| WidgetKit, AppIntents and SwiftUI code is not compiled | A compile error stops the next Codemagic archive. | Run the type-check job (exception 2) and read its result before merging. | Owner |
| Interactive widget buttons | Apple's forums report buttons whose intent does not run while the app is open, and repeated taps on early iOS 17. | Device test with the app open, closed and killed. | Owner, on device |
| Pausing from the island or a widget | The timer's saved state is in the app's private storage, so an intent cannot change it. | Option B, after on-device testing. | Owner |
| Life cards show names on the Home Screen | Anyone who sees the screen sees them. | Separate switch, off by default (exception 1). | Owner |
| Card artwork | A widget without art looks plainer than the app. | Leave out; decide separately (exception 3). | Owner |
| A deadline countdown | Spread's tasks have no deadline. | Not drawn. Adding a due field is a data-model change. | Owner |
| A link to Plan Ahead | Wireframe 5 needs one, and none exists. | Add it with that wireframe. | Tool, when built |

## 9. Verification and full-implementation plan

### Acceptance criteria

- Given a running focus session and "Show Today on widgets" on, then the Timer widget (small and large) counts down, the Today medium widget shows a timer panel, and the Lock Screen and island show the same remaining time.
- Given the session is paused, then the widgets show Paused and the frozen time, and the time does not run.
- Given the deadline passes with the app closed, then the widgets show Finished without the app running.
- Given "Show Life cards on widgets" is on and today's week is open in the app, then the widget shows a card in the app's look with the area's color, name, budget and seven-day strip.
- Given more than one Life card, when previous or next is tapped, then the widget shows the adjacent card, wrapping at the ends, and no budget or allocation changes.
- Given a card on the widget, when it is tapped, then the app opens that card in today's week.
- Given the person switches profile or turns the switch off, then the Life cards data and the stored card choice are deleted.
- Given the switch is off, then the Life cards widget shows no area name.

### Checks

- Run and passing: the shared logic and its tests (31 tests in the Linux slice, 20 of them new), the repo's widget contract test (12 tests, 8 new), the docs checker, and all existing TypeScript and script tests. Every touched Swift file parses. The project file parses, and every widget ID in it is defined.
- **Not run:** a compile of the WidgetKit, AppIntents and SwiftUI code. The type-check job is the first place it will be compiled.
- Owed on a physical iPhone: the timer counting down, pausing and finishing on every surface; the buttons with the app open, closed and killed; a deep link from cold start; Dynamic Type and VoiceOver on the card; light, dark and tinted Home Screens; a profile switch; a week turning over; the widget gallery names.
- Dynamic Island wireframes: seven boards on the published canvas. They were not rendered or reviewed here.

### Full-feature implementation and refinement plan

- **Build location:** the existing app and its widget extension, on the session branch. No second store.
- **Complete scope:** the three widgets, the shared mirror, the switch, the link, the contract tests and this spec.
- **Verification:** compile where a toolchain exists, run the type-check job, then device checks.
- **Questions for the tester:** Do you know how to do this? Is it easy? How can we make it better?

## 10. Rollout, rollback and release

A draft pull request. The widget work, the type-check job and the wireframes are separate commits so each can be dropped. No flag beyond the two switches. To roll back, revert the commit; nothing in the planner changes. Release authority stays with the owner. This spec is not approval to merge or ship.

## 11. Decision record

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-11-13 | Owner chose Dynamic Island concepts 1 (pause and resume), 2 (focus and break rounds) and 7 (sharing the island). The principle: the person decides when work happens, so the app never starts a round or a break on its own. Section 12 records the scope. | Owner | This spec; `DECISIONS.md`; `specs/README.md` |
| 2026-11-13 | Add a Focus timer widget (small, large), a timer panel on the Today widget's medium size, and a Life cards widget with previous and next and a tap-to-open link. One timer mirror in the App Group feeds the widgets and the island. Life area names on the Home Screen sit behind a new off-by-default switch. Seven Dynamic Island wireframes are proposed, not built. | Owner (request), tool (design) | This spec; `DECISIONS.md`; `specs/README.md` |

## 12. Island scope: concepts 1, 2 and 7

**Owner decision, 2026-11-13.** "The app implicitly puts the user in the driver seat of WHEN they do something during the day. The app just lets them see how much time they have to spend throughout the week. Therefore it's no way for the app to know or decide when a task would start. A pomodoro-like timer started from the app or widget works well enough."

What this builds:
- **Rounds (concept 2).** A plan is focus minutes, break minutes and a round count (1 to 8). One round is a single focus session with no break, the same as before. Several rounds run focus, then a break, then focus, and so on. The last round has no break after it.
- **Nothing starts on its own.** When a stretch reaches its deadline, the island, the widgets and the app show it as waiting, and a local notification says so. The break or the next round starts only when the person taps Start break or Start focus round N. The record shows a waiting stretch from its deadline even when the app is not running, because the Live Activity goes stale at that moment.
- **Pause and resume from the island (concept 1).** Pause or Resume is the one control on the island's expanded view, the Lock Screen banner and the Timer widget. It changes the same record the app's timer reads, so the app catches up when it next runs.
- **Start from a widget.** The Timer widget can start round 1 of the last plan when the profile on screen has one and nothing is running. Otherwise it opens Spread.
- **Sharing the island (concept 7).** The running stretch outranks a stretch waiting for a tap (relevance 1.0 and 0.8). The compact view shows a glyph and a short countdown, and the minimal view keeps the glyph and the countdown. Compact has no control.
- **The record moves to the shared App Group.** The timer's record used to live in the app's private defaults, where no widget or intent could read it. An earlier build's record is moved across once, on launch.
- **Only the profile on screen acts.** The widgets, the island and the intents do nothing for another profile's session, and the mirror is removed on a profile switch.

What this does not build:
- **Concepts 3, 4, 5 and 6 stay wireframes.** Today progress (3) and the card spotlight (4) are not built here. A scheduled prompt (5) would have the app pick a time, which the principle rules out. A deadline countdown (6) needs a due time that tasks do not have.
- **Limited-width layout.** The compact view is not yet fitted to the 28 pt limited-width circle. The environment value that reports it may need a newer iOS than the app's iOS 17 floor, and this container cannot check the SDK. It is owed to the type-check job and a device.
- **An expired last round stays on the island until the person ends it.** Without a server nothing removes it at its deadline. The system removes it after eight hours.
- **Break alerts from the island** use the notification setting that is stored in the app's defaults. This is read in the app's process, which is where the intents run. Device check owed.

Owed on a device: pause and resume from the island with the app open, closed and killed; a round ending while the phone is locked; the waiting state at a deadline with the app not running; the Start from a widget with a plan chosen; a profile switch mid-round; the compact view in landscape.

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-11-13 | Island scope: concepts 1, 2 and 7. Rounds with breaks that start only on a tap; pause and resume from the island, the Lock Screen and the Timer widget; the shared record in the App Group; concepts 3, 4, 5 and 6 left as wireframes. | Owner | This section; `DECISIONS.md`; `specs/README.md`; the wireframe board |

