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
| RULES_CARD Boundaries: no second store, no data migration, task changes through `store.ts` | Every new record is a projection the app writes into the App Group, except block completion, which is state. See exception 4. The planner store is untouched. Widgets only show and open. |
| RULES_CARD Boundaries: do not touch cloud, sync, backup, schema, `ios/App/App/Cloud/**`, `ios/App/SpreadCloudCore/**`, `server/` | None touched. |
| RULES_CARD Look: targets at least 44 pt; status never color alone | The previous and next buttons are 44 by 44 pt. Timer states carry a label and a glyph, not only a color. |
| RULES_CARD Behavior: nothing automatic changes the plan | The widgets and the island change only presentation state (which card shows). They never move hours or complete tasks. |
| `today-widget.md`, Outside-app security: counts and hours only, no responsibility names | Life cards show Life area names, colors and weekly hours. See exception 1. |
| `focus-live-activity.md`: title is "Focus session" unless the person allows the name | The timer mirror follows the same rule and the same switch. |
| `docs/IOS_RELEASE.md`: no GitHub iOS build or simulator workflows; Codemagic is the only signed lane | See exception 2. |

**Exceptions needed (decided on 2026-11-13, see section 15):**
1. **Life area names on the Home Screen.** The Today widget spec says widgets show no responsibility names. A Life card is its name, so the Life cards widget breaks that line. It is off by default behind its own switch, "Show Life cards on widgets", with a footnote that anyone who can see the Home Screen can see them. The owner should confirm this.
2. **A type-check job on GitHub.** `.github/workflows/native-typecheck.yml` asks the Swift compiler whether the native sources are valid against the iOS Simulator SDK. It does not build, archive, sign, upload or run a simulator, and it follows the existing `swift-cloudkit-typecheck` job. It does sit close to the line the owner drew on 2026-11-11 when retiring GitHub "SwiftUI native compile". It is a separate commit; delete the file to remove it.
3. **No card artwork on widgets.** The widget draws the app's no-art gradient. Artwork would add images to the extension and entries to its Resources phase. Decide whether to add it.
4. **Block completion outside the planner store.** Which planned blocks are done today is kept in the App Group (`spread.dayplan.done.v1`), not in `store.ts`. It records no task change and resets each day, but it is state rather than a projection. Keep it here, or move it into the planner store. The owner decides.

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
- **Concepts 4, 5 and 6 stay wireframes.** Today progress (3) was built later as a read-only line (section 15). The card spotlight (4) is not built. A scheduled prompt (5) would have the app pick a time, which the principle rules out. A deadline countdown (6) needs a due time that tasks do not have.
- **Limited-width layout.** The compact view is not yet fitted to the 28 pt limited-width circle. The environment value that reports it may need a newer iOS than the app's iOS 17 floor, and this container cannot check the SDK. It is owed to the type-check job and a device.
- **An expired last round stays on the island until the person ends it.** Without a server nothing removes it at its deadline. The system removes it after eight hours.
- **Break alerts from the island** use the notification setting that is stored in the app's defaults. This is read in the app's process, which is where the intents run. Device check owed.

Owed on a device: pause and resume from the island with the app open, closed and killed; a round ending while the phone is locked; the waiting state at a deadline with the app not running; the Start from a widget with a plan chosen; a profile switch mid-round; the compact view in landscape.

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-11-13 | Island scope: concepts 1, 2 and 7. Rounds with breaks that start only on a tap; pause and resume from the island, the Lock Screen and the Timer widget; the shared record in the App Group; concepts 3, 4, 5 and 6 left as wireframes. | Owner | This section; `DECISIONS.md`; `specs/README.md`; the wireframe board |

## 13. Today's planned block (option 2)

**Owner decision, 2026-11-13.** Build option 2: a planned block can start from the island, the Timer widget or the sheet, sized to the hours planned for that Life area today. The planner stays read only. Nothing automatic changes the plan.

**What the person sees.** On the Timer widget, and at the top of the focus sheet, today's block: the Life area (or "Planned block" when names are off), its planned hours, and how it splits into rounds, such as "4 rounds of 45 min, 10 min breaks, 3 h focus". One button starts round 1. Each later round and each break still starts on a tap.

**How hours become rounds.** The rule is that total focus time matches the planned time as closely as possible. Among equal fits it prefers a stretch nearest 45 minutes, then fewer rounds. Stretches are 15 to 90 minutes, so no single stretch runs longer than a deep-work session. Break is 5 minutes after a stretch of 30 minutes or less, and 10 minutes after anything longer. Examples: 1 hour is one 60-minute stretch; 2 hours is 3 x 40; 3 hours is 4 x 45; 2 hours 30 minutes is 3 x 50; 3 hours 10 minutes is 3 x 65 (5 minutes over, which is closer than 4 x 45). The confirmation shows the real total.

**Which block is offered.** Today only, for the profile on screen. Largest first, ties keep the planner's Life area order. Only one block is offered at a time, so the island is never crowded with several.

**Finishing.** A block counts as done when its final focus round is over, however that ended. Stopping during an earlier round does not count, so the block stays on offer. Finishing writes nothing to hours, budgets, tasks or the week. When a block is done, the next unfinished block for the day is offered. When every block is done, the widget says so and offers nothing more. This is the guard against spreading thin: nothing is suggested beyond what the person planned, and nothing starts without a tap.

**Continuity.** The island and the Timer widget tie a session to its planned day. A tap on the island opens Today, the Week view on today's date. A session started by hand still opens the timer.

**Privacy.** The Life area name appears on widgets only with the existing "Show Life area name outside Spread" switch. Without it the label is "Planned block".

**Not built here.** Choosing a block for another day (only today is offered). Logging focus time against hours. The limited-width compact layout.

**Owed on a device:** starting a block from the island with the app closed; the first and last round of a block; a block that is stopped early and then offered again; two blocks in one day finishing in order; the Today opening from a block's tap; names on and off.

| Date | Decision | By | Documents updated |
| --- | --- | --- | --- |
| 2026-11-13 | Option 2: today's planned block starts from the island, the Timer widget and the sheet, sized to the planned hours. Read only. Largest first, one at a time, done when the final round ends, nothing starts without a tap. | Owner (direction), tool (rules) | This section; `DECISIONS.md`; `specs/README.md` |

## 14. Design review against the docs and the app-design library (2026-11-13)

Checked against `RULES_CARD.md`, the native brand board (sections 3 to 5), the motion contract (sections 5 to 7), the iOS 27 audit, and the app-design library in `WGLewis0721/graymattertechllc-` (`IOS_PLAYBOOK`, `DESIGN_SYSTEM`, `OBJECT_FIRST_NATIVE_PATTERNS`, `TACTILE_MOTION_AND_DEVICE_QA`, `UI_AUTOMATION_AND_EVIDENCE`, `EDITORIAL_CARD_AND_ARTWORK`, `UX_REVIEW_AND_SPEC_PROTOCOL`).

| Rule | Result | Evidence |
| --- | --- | --- |
| Solid navy and cream; no doodles, Liquid Glass or metal Crown | Pass | No material, glass or Crown in the new code. |
| Touch targets at least 44 pt | Pass, with gaps | Widget previous and next are 44 by 44 pt. Focus sheet buttons use a 44 pt minimum height. The island's Pause and Resume are system-sized. Owed on a device. |
| Status is never color alone | Pass | Timer states use text and a glyph: Paused, Done, Next. |
| Dynamic Type supported (board section 3) | Fixed here; open in the widget | The focus sheet's clock digits now scale with `@ScaledMetric`, at the same 56 and 52 pt default. The Life cards widget keeps fixed 9 to 14 pt labels. Open; owed on a device. |
| Widgets match the system light and dark appearance | Fixed here | The widget palette now uses the app's `SpreadTheme` values for ink, secondary text and cream canvas. It was close but not exact. |
| Serif on Life cards | Pass | The app's own Life card draws its name in a serif (`LifeEditorialFace`), so the widget matches it. The board's no-serif rule covers functional screens. |
| Reduce Motion removes movement; no decorative motion | Pass | No animation, transition or repeating effect in the new code. Countdowns are drawn by the system. The Life cards widget changes cards without animation. |
| One light haptic, on completing a task (iPhone only) | Pass; not triggered | Focus rounds and blocks are not task completions, so nothing fires. No haptic was added. |
| Editorial artwork on Life cards (`CLAUDE.md`, `EDITORIAL_CARD_AND_ARTWORK`) | Open: exception 3 | Widgets draw the no-art gradient, not the artwork in `Resources/Editorial/`. |
| One authoritative record; no second store (`RULES_CARD`, `OBJECT_FIRST_NATIVE_PATTERNS`) | Open: exception 4 | Widgets and the island read projections. Block completion is state kept in the App Group. |
| Plan Ahead is opened, previewed and confirmed; never auto-rolled | Pass | Not touched. |
| Every drag has a tap path and Undo; destructive actions have Undo | Pass | No drag, delete or swipe was added. |
| VoiceOver labels | Partial; owed | The clock has a label and value. The Life card buttons have labels. Island and widget VoiceOver is owed on a device. |
| Evidence: compile-only is not a pass (`UI_AUTOMATION_AND_EVIDENCE`, `TACTILE_MOTION_AND_DEVICE_QA`) | Owed | Checked by reading, the contract tests and the GitHub Swift type-check. No simulator or device run. The checks in sections 9 and 13 are not done. |
| Limited-width compact layout (board: no collisions at 390 pt and large text) | Open | Known gap; see "Not built here" in section 13. |
| Do not claim shipped behavior (`UX_REVIEW_AND_SPEC_PROTOCOL`) | Pass | Concepts 3 to 6 and the option 2 wireframes are described as not built. |

**Verified here:** the contract tests and docs check, and the GitHub Swift type-check for the widget and the package. **Not verified here:** any simulator or device run, screenshots at 390, 820 and 1024 pt, Dynamic Type at accessibility sizes, VoiceOver, the island with the app closed, and the widget in tinted mode.

## 15. Decisions taken for the owner (2026-11-13)

The owner asked for the open items to be decided, with the aim of a planning tool that helps people spend their time well without being spread thin. Each decision below says what it commits to and how to reverse it.

| Item | Decision | Why | To reverse |
| --- | --- | --- | --- |
| Life area names on widgets (exception 1) | Keep the switch, off by default. Names show only when the person turns it on in More. Progress counts never name an area. | A Life card's name is its content. Anyone who can see the Home Screen can read it, so the default is private. | Change the default in More. The widgets read the switch. |
| Type-check job on GitHub (exception 2) | Keep `native-typecheck.yml`. It compiles the Swift sources against the iOS Simulator SDK and does not build, sign, upload or run a simulator. This amends the 2026-11-11 build-ownership note for compile checks only. | It caught two compile errors on this branch before a Codemagic build would have. | Delete the workflow file. |
| Card artwork on widgets (exception 3) | Not in this release. The widget keeps the no-art face, the same face the app uses for a category without artwork. | Artwork needs the editorial images added to the widget target's resources, which no device has run yet. Adding them blind risks a broken extension. Revisit after the device checks pass. | Add the Editorial folder to the widget target and reuse `LifeEditorialArtworkRegistry`. |
| Block completion kept in the App Group (exception 4) | Keep it as app UI state. It is not planner data: no task, hour or week is written, and it resets each day. The planner store remains the only source of plans. The owner should confirm that "no second store" in `RULES_CARD.md` means planner data. | Moving it into `store.ts` would make the planner aware of focus sessions. That is outside its job and needs schema work. | Move `spread.dayplan.done.v1` into the planner store under its own spec. |
| Dynamic Type in the Life cards widget | Not changed. Labels stay at 9 to 14 pt until a device check shows the widget at accessibility sizes. | Changing widget type sizes without seeing the layout risks clipping. | After the device check, switch the labels to text styles. |
| Compact layout at limited width | Not fitted. The island's compact view stays as it is. | The environment value that reports a limited width may need a newer iOS than the iOS 17 floor. It cannot be checked here. | Fit it once the type-check job or a device shows the value is available. |
| Today progress (concept 3) | Built as a read-only line. While a block is on offer, the timer widget shows "1 of 3 blocks done today." When every block is done it shows "All 3 blocks done today." With no plan it shows nothing. Counts only: no streaks, no time pressure, no names. | It shows where the day stands and asks nothing of the person. | Remove the progress line in `SpreadTimerWidget.idle`. |
| Spread-thin principle | The day's blocks are offered one at a time, largest first. The island, the widgets and the sheet never start a second block or round on their own. Each round and each break needs a tap. | Several things at once is how people get spread thin. One clear next step keeps attention in one place. | Already how the code behaves. |

**Continuity contract.** Each fact has one record in the App Group, written only by the app: the focus session (`spread.widget.focus.v1`, mirrored from the timer), the day plan (`spread.dayplan.v1`) and the day's finished blocks (`spread.dayplan.done.v1`). The island, the widgets and the sheet read these. Widgets never write planner data and never start anything without a tap.

**Not built.** Logging focus time against hours (it would write planner data, so it needs its own owner decision). The card spotlight (concept 4). A deadline countdown (concept 6), because tasks have no due time.

**Verified here.** The Linux test slice runs 64 tests with no failures, including three new progress tests in `SpreadDayPlanTests`. The docs check and the script tests run in CI. The Swift compile runs on GitHub. Nothing has run on a simulator or a device, so the device checks in sections 9 and 13 are still owed.

## 16. Switches checked (2026-11-13)

Every switch that goes with the widgets, the island and the focus timer was traced from its control, through the key it writes, to the surface it controls. Two gaps were found and fixed. The contract tests in `scripts/native-today-widget.test.mjs` cover each row. The two fixed rows fail on the previous code.

| Switch (where) | Stored key | On | Off | Status |
| --- | --- | --- | --- | --- |
| Show Today on widgets (More, Widgets) | `native.widget.enabled` | Publishes the Today counters, the focus mirror and today's planned block. Fixed: the block used to wait for the next planner change. | Revokes the counters and the focus mirror, and clears today's planned block. Fixed: the timer widget kept offering the block. The Today widget shows "Open Spread to enable Today widget." | Fixed and tested |
| Show Life cards on widgets (More, Widgets) | `native.widget.lifeCardsEnabled` | Publishes the Life cards for this week. | Deletes the cards. The widget shows "Turn on Life cards on widgets in More, then open Spread." | Tested |
| Show Life area name outside Spread (Focus timer, Outside Spread) | `native.focus.showNameOutsideApp` | Block labels and the island and widget titles show the Life area name. Fixed: the change now rewrites them at once. | Shows "Planned block" and "Focus session". Locked while a session runs, and the footer says so. | Fixed and tested |
| Show active timer on Lock Screen and Dynamic Island (Focus timer, Outside Spread) | `native.focus.liveActivityEnabled` | Starts and refreshes the island. | Ends the island. Nothing starts while it is off. | Tested |
| Notify when a stretch ends (Focus timer, Outside Spread) | `native.focus.notifyWhenDone` | Asks for permission the first time, then schedules each stretch's alert. | Cancels the scheduled alert. | Tested |

**Not verified.** Nothing above has run on a device or a simulator. The visual state of each switch in the running app, the Life cards widget when it is off, and the island and notifications with the app closed are all still owed.

**Not part of this change.** "Remind me to plan each day" and "Touch feedback" were not touched.

## 17. Button audit (2026-11-13)

Every button in the native app was read from source: the labels, the accessibility labels, the action each one runs, and the text around it. Three checks were run:
- Every planner message a native button sends has a handler in the dispatcher, so no button is dead at the protocol level.
- Every icon-only button has a visible label or an accessibility label.
- The actions behind the non-obvious labels were traced to the store (carry-over, rollover, priority, export, photo and file import, allocate).

**Wording changed so the label says what the button does.** Behaviour is unchanged. Accessibility identifiers are unchanged.

| Where | Was | Now | Why |
| --- | --- | --- | --- |
| More, Data | Backup and restore | Open web planner | It only reveals the parked web planner. Nothing sends that view a backup command. |
| Planner notice, save-failure notice, error alert | Backup and restore, Back up | Open web planner | Same as above. |
| Life, planner notice | Backup and restore | Open More | It opens More, not a backup screen. |
| Dock gear | Accessibility label "Settings" | "More" | The sheet it opens is titled More. |
| Spread card | Rollover | Copy to next week and open it | It copies the whole current week to next week and moves to it. The confirmation now says "Copying this week replaces them." |
| Spread card | Review open tasks | Move open tasks to next week | The sheet moves the picked open tasks to next week. |

**Open for the owner.** Backup and restore cannot be reached from the native app, because the rules keep backup and restore out of this work. A native entry point would need a backup command sent to the web planner's backup screen, which is a backup change. Decide whether to build that.

**Checked and left as written.**
- "Return ½h": the help line says it returns half an hour to the weekly pool, which is what it does.
- "Save weekly goal": it stores the goal only. "Apply" is the step that reserves time.
- "Open existing planner": it opens the web planner with the saved plan.
- The parked web planner has the same "Rollover" and "Review open tasks" wording. It was not changed.

**Superseded in part by section 18.** The "Open web planner" labels above are back to "Backup and restore" and "Back up", and they now open the native backup sheet, not the web planner.

**Not verified.** None of this has run on a device or a simulator.

## 18. Modern backup and restore (2026-11-13)

**Owner direction.** Backup and restore work from modern Spread without opening classic Spread or the web planner's screens. Classic Spread and the web planner are to be decommissioned later. That migration is a separate decision, with its own spec, and is not part of this section.

**What it does.**
- **Back up.** The existing "Backup and restore" entry (More, Data; the save notice; the error alert) opens one sheet. "Back up Spread" asks the planner for the same file the web planner's "Back Up Spread" makes, with the same function (`buildBackupText`). It is saved as `Spread-<week>.spread` and shared with the iPhone share sheet.
- **Restore.** "Choose a backup file" reads a `.spread` file and lists its profiles. A damaged profile is listed and cannot be chosen. The chosen profiles are added as new profiles, through the same restore as the web planner (`applyRestore`), which takes a safety copy first. Current profiles are not changed.
- **Older one-week files** are refused in modern Spread with a plain message. Modern restores full backups only.

**How it reaches the planner.** Three requests (`backupFile`, `restorePreview`, `restoreApply`) are answered by the planner's host before the planner's dispatcher. Planner commands are unchanged. The requests do not depend on the open week or revision.

**Existing code changed.** The rule that kept backup and restore out of this work is the owner's to lift, and this is that direction. Two moves, with no change in behaviour:
- `store.ts`: `saveBackup` now calls `buildBackupText`, which holds the same steps.
- `applyRestore` moved from the web restore screen to `restore-apply.ts`, so both use one copy.

**Not in this change.**
- Restore from a safety copy (classic only) is not in modern Spread.
- iCloud backup stays off. Nothing says iCloud works.
- Restoring a one-week file.

**Verified here.** Web typecheck. `test:spread`: 525 passed. `test:scripts`: 242 passed, including the wiring tests in `scripts/native-backup.test.mjs`. Lint: 0 errors. The Swift compile runs on GitHub.

**Owed on a device.** The share sheet from an iPhone. Choosing a file from Files or iCloud Drive. Restoring onto a fresh install and comparing the profiles. A damaged profile listed and left out. A file that is not a backup.

## 19. Plan file: the editable schedule (2026-11-13)

Security comes first. The `.spread` backup stays as it is: checksummed, and not editable. The plan file is a separate, locked-down file for one profile's schedule.

**What the plan file holds.** The areas (name, weekly hours, colour, category), the weeks (a Monday start, each area's hour budget, an optional week capacity, tasks with an optional day, and hour allocations by day), and the current week. It holds at most 100 areas and the 104 most recent weeks. Areas, tasks and day hours carry identifiers so a merge can match them, and the file names its profile and the version it was made from (section 21).

**What it leaves out.** Settings and accents, recovery copies, the licence, sync and cloud keys, attachments and photos, rich notes, recurring plans, the recycle bin, and the day-order presentation. Those stay in the `.spread` backup.

**How "Back up Spread" makes it.** One action makes both files and shares both. The backup action is one button. The sheet's other actions are restore and merge (section 21). The sheet says plainly that the backup cannot be edited, that the plan file is plain text and can be edited or given to an AI tool, and that whatever is shared goes to whoever receives it.

**How a file comes back.** "Choose a backup file" accepts either file. A `.spread` backup is read as before. A plan file is checked by `parsePlanDocument`. Every problem is listed (up to 20), and nothing changes unless the whole file is clean. A plan with `action` set to `create` is restored as a new profile, through the same restore as a backup: a safety copy first, all or nothing, and current profiles unchanged. A plan with `action` set to `merge` is previewed and merged into the open profile (section 21).

**Security controls.**
- A file over 5 MB is refused before it is read.
- Only the listed fields are accepted. Any other field, at any level, is refused. Prototype keys are refused.
- The importer builds every object and identifier itself. Nothing from the file is used as an identifier.
- Dates must be real days. A week must start on a Monday. A day must be inside its week.
- Hours are half-hour steps: 0 to 168 for areas and weeks, 0.5 to 24 for an allocation. Capacity is 0 to 168.
- An area's placed hours must fit its budget, and the areas in a week must fit its capacity.
- A task with a day needs hours for its area on that day.
- Text must be non-empty, on one line, free of control characters, and at most 2000 characters. Categories, estimates and colours must be ones the planner uses.
- Area names are unique, ignoring capitals. Week keys are unique.
- `action` is required and must be `merge` or `create`. A merge needs the id of the open profile, so a file cannot change another profile, or add one by accident.

**Limits of the protection.** Anyone can write a valid plan file. It is not a verified record of who wrote it. A checksum or signature would break every edit, so the file has neither. The importer checks structure and the planner's hour rules, not authorship. The app never acts on the guide, or on any instruction written in the file.

**Owed on a device.** Sharing both files from an iPhone. Choosing a plan file from Files or iCloud Drive. A plan with problems showing every problem. A clean plan restored onto a fresh install. A merge, with its switches and its stale-version warning (section 21).

## 20. iCloud backup and restore: saved for later (2026-11-13)

**Status.** The code is merged and dormant. Both cloud switches (`VITE_SPREAD_CLOUD_BACKUP`, `VITE_SPREAD_CLOUD_SYNC`) default to off. The reinstall restore has not been proven on hardware, so Gate 3 in `docs/ICLOUD_PLAN.md` is not met.

**What already exists.** `src/lib/spread/cloud-backup.ts`, `cloud-sync.ts`, `cloud-flags.ts` and the sync modules. The Swift files under `ios/App/App/Cloud/` and the `ios/App/SpreadCloudCore` package. The App entitlements already request an iCloud container and the CloudKit and CloudDocuments services.

**Scaffold decision.** No further iCloud code was added. What is left is hardware gates, not code. More code would need changes to `ios/App/App/Cloud/**`, which the project rules keep out of this work, and signing changes that could break a deployment.

**Deployment risk to check before the next signed build.** The App entitlements request iCloud and CloudKit. A signed build needs the App ID to carry those capabilities. This could not be checked from the repository.

**What iOS does on reinstall.** Deleting an app removes its own data. A reinstall starts empty. Data comes back only through a whole-device restore from an iCloud or computer backup, or through the app's own cloud copy. CloudKit records in the user's iCloud can take a relaunch to appear. Keychain persistence is not a guarantee.

**Turning it on later.** QA and TestFlight builds can set the flag at build time. The defaults change only after Gate 3 passes on hardware. The checklist is in `docs/ICLOUD_PLAN.md`.

**Tests.** `scripts/native-backup.test.mjs` asserts that both flags default to off, and that the backup sheet has no iCloud action.

## 21. Merging a plan into the open profile (2026-11-13)

**What it does.** A plan file with `action` set to `merge`, and the id of the open profile, is merged into that profile on this device. The file is the desired state for the areas and weeks it lists, in the way a Terraform plan describes a desired state. The person previews the change, and nothing changes until they choose Merge.

**The flow.** Back up Spread, or export the plan file. Edit it by hand or with an AI tool. Choose the file. The sheet reads it and shows a preview: a summary in count cards (only the counts that are not zero), a list of areas (added, changed, removed or kept, each with its label in words), the two removal switches, a warning if the profile changed after the plan was made, and a card of problems. Merge stays disabled while there are problems. Merge recomputes the change against the profile as it is at that moment, refuses if the profile changed since the preview, saves a `pre-merge` safety copy, and then replaces the profile once, through the planner's normal replace path.

**Removals are a choice, and they are off by default.** "Remove areas the file leaves out" removes an area, with its tasks and hours in every week. "Remove tasks and day hours the file leaves out" removes tasks and day hours that a listed week does not mention. With either switch off, what the file leaves out stays.

**What is kept.** Anything the file does not mention: weeks the file does not list; recurring plans, which stop only when their area is removed, and are counted; rich notes; the recycle bin; and the priority settings of a week, while the area they point at still exists. A plan never sets or clears settings, the licence, sync or cloud keys.

**Matching.** An area matches by its id, and then by its name, ignoring capitals. A task or day hour matches by its id inside its week. A task moved to another area keeps its id and its rich notes, and appears once. An id Spread does not know is new.

**What stops a merge.** Any problem the file check finds (section 19). A kept day hour that no longer fits its area's budget, with the choice to remove it. A plan for another profile. A profile that syncs. A profile that changed since the preview. A missing or unknown `action`.

**Known behaviour.** The planner normalises a week as it loads a profile, and one rule there raises an area's hours to its weekly hours when those hours equal the day hours placed. The preview is taken from the normalised result, so it shows what will be saved. In that case the saved hours can differ from the file's figure.

**Undo.** A merge saves a `pre-merge` safety copy first. The sheet does not yet offer a button to restore that copy, so an undo needs the owner's decision on that control.

**Tests.** `src/lib/spread/plan-merge.test.ts` covers the merge rules, counts, removals, moves, budgets and the target check. `plan-file.test.ts` covers format version 2, the required action and the id a merge needs. `native-backup-bridge.test.ts` covers previews, refusals, the removal options and the revision. `scripts/native-backup.test.mjs` checks the wiring: the safety copy, the revision check, the Merge button's state, and that both switches default to off.

**Owed on a device.** Previewing a merge on iPhone at 390 and 820 points, in light and dark, with reduced motion. The switches. The problem card. A stale profile. A merge followed by an undo from the safety copy, once that control exists.

## 22. Timer widgets by size, and copying a week forward (2026-11-13)

**Why.** On a device the Dynamic Island showed a running timer while the Timer widget said "No timer running". The widget only sees the mirror the app writes, and the app writes that mirror only while "Show Today on widgets" is on. That switch is off by default, so the mirror was removed. The widget now says so, instead of a plain "no timer", and the switch's value is written beside the mirror for it to read. The gate itself stays. The timer mirror follows that switch, as section 19 and the 2026-11-13 decision log already say. Changing that default is an owner decision, not part of this change.

**Timer controls by size.** Each control is an intent that changes the same record as the island. Small shows one control, medium two, and large every control that applies right now. The controls, most important first, are: Pause while running, Resume while paused, the next step once a stretch waits for a tap, Finish (new: it ends the flow, starts nothing, and clears the widget), and when idle, Start today's block or Start the last plan. Every size ends with an "Open Spread" link on the large widget only. The rules live in `SpreadFocusControlRules` in the shared file, and the Linux slice tests them.

**Plan Ahead: copy the week forward.** The week on screen is copied into the eight weeks after it, in batches of eight. Batch 1 is weeks 1 to 8 ahead, batch 2 is weeks 9 to 16, and up to batch 13 covers 104 weeks. A copy carries each area's hours, the day hours, the capacity, and the tasks, with the tasks not done and their notes kept. Every copy has new ids, and each day moves with its week. A week that already holds any hours, tasks or day hours is never overwritten: it is listed as kept. The person previews the copy, sees each week as "Will be filled" or "Already planned, kept", and confirms. The write is one Life-undoable change.

**Why this replaces the repeat rule for copies.** A repeating schedule writes a week only when that week is opened, so a future week can list a plan in Plan Ahead while its own calendar is still empty. A copy writes real weeks at once, so the calendar and the plan are the same data. The repeat form is still there for existing schedules. Whether to retire repeating schedules is an owner decision.

**Tests.** `src/lib/spread/week-copy.test.ts` covers the batches, the day shift, the task links, skipped weeks, refusals, fresh ids, and that no repeat bookkeeping is copied. `SpreadFocusControlRulesTests` covers the controls each size shows in each state. `scripts/native-today-widget.test.mjs` covers the families, the five focus intents and the empty-state message.

**Owed on a device.** The timer widgets at small, medium and large, running, paused, waiting for a tap, and idle, in light and dark, with reduced motion. Finish clearing the widget. Turning the Today switch on and off. The Plan Ahead copy at 390 and 820 points, the preview rows, a batch with some weeks kept, and the Life undo after a copy.
