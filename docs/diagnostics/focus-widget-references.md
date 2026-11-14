# External references for Spread focus controls

Research date: 2026-11-14. These sources establish comparison points; no external demo was run on a device here. No timer behavior was changed from this research.

## Closest full Pomodoro source

[Pomly, inspected commit 76be404bbd967006a154643ff950ff16f7f94d35](https://github.com/tapariapurv/pomly/tree/76be404bbd967006a154643ff950ff16f7f94d35).

- `PomlyWidgets/Widgets.swift`: `StatusView.large` includes `pauseOrResume`, which binds PauseIntent/ResumeIntent. Running text uses a deadline; paused text uses saved remaining time. Its provider reads TimerSnapshot.
- `Shared/Intents.swift`: iOS aliases PomlyIntent to LiveActivityIntent. Pause calls the engine, then returns.
- `Shared/TimerEngine.swift`: pause captures remaining time, clears endDate and sets paused in a single assigned value. The snapshot observer saves; resume calculates a new deadline. This is a concrete control-to-save-to-render comparison, not independent runtime proof. It also uses AlarmKit, sync and minute timeline entries that Spread should not copy.

## Report closely matching delayed Home Screen interactions

[Developer's first-person report, August 2025](https://www.reddit.com/r/iOSProgramming/comments/1mmmfih/til_do_not_share_appintents_between_widgets_and/): reports 3+ second Home Screen updates with LiveActivityIntent and improvement from separate widget AppIntents. Apple documents the process-routing distinction, but does not establish this latency or a prohibition on using LiveActivityIntent for a widget. Pomly does use it. Treat the report as a testable execution-context hypothesis, not a proven Spread defect or justification to split intents immediately.

[Stack Overflow cross-surface update report](https://stackoverflow.com/questions/79219703/why-is-updating-widget-from-app-intent-when-called-by-live-activity-inconsistent): live-activity-originated actions sometimes fail to refresh the Home Screen while widget-originated actions behave differently; the reporter says attached debugger behavior differs. Answers conflict about intent conformance. The empty-dialog workaround in one answer lacks a supported contract and is not recommended for Spread. This report concerns cross-surface refresh, distinct from the Home Screen Pause failure.

## Detailed guides and runnable component examples

[Navinkumar's April 2025 step-by-step timer guide](https://medium.com/@navinkumar7582/live-timer-updates-with-dynamic-island-lock-screen-a-step-by-step-guide-22fa0a293df9), with [source](https://github.com/Navinneon/LiveTimerActivity): covers timer attributes, persistence, Dynamic Island/Lock Screen layout and pause/resume/stop intents. Useful for the ActivityKit side, not a complete Home Screen control reference. Author explicitly did not use App Groups in that example; its storage approach is not a recommendation for Spread.

[Custom-Widgets TimerWidget.swift](https://github.com/SachinSAgrawal/Custom-Widgets/blob/56fe9be4c764dc40fdbadafc932245c55abca712/Widgets/Home%20Screen/TimerWidget.swift): complete Home Screen countdown with App Group storage, ordinary AppIntent actions, save before reload, and deadline-driven text. It supports start/reset, not Pause/Resume.

[WidgetExamples interactive demo](https://github.com/pawello2222/WidgetExamples/tree/3597d226dced7cf11d2ae0304725b359f0770b91/Widgets/InteractiveWidget): simple shared-defaults mutations inside AppIntent followed by return; README includes a recording. Useful to compare dispatch and automatic reload independently of timer complexity.

## Apple contract used to assess them

[Adding interactivity](https://developer.apple.com/documentation/widgetkit/adding-interactivity-to-widgets-and-live-activities): ordinary AppIntent normally executes in the extension; LiveActivityIntent executes in the app process. Finish data updates before returning. A widget interaction triggers a timeline reload; an optimistic toggle appearance alone does not prove the data operation succeeded.

[Dynamic dates](https://developer.apple.com/documentation/widgetkit/displaying-dynamic-dates): date-based Text/ProgressView advances without continual extension execution.

[Keeping widgets up to date](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date): scheduled and app-requested refresh delivery is system-controlled. The interacted widget's automatic reload must not be conflated with a guaranteed immediate refresh of every other widget or Live Activity.

## Implication for Spread

Inspect the captured chain: Home Screen toggle entry/value → matching stored session and eligible profile → paused save → provider resolving paused → frozen display. The intent process choice is now an explicit hypothesis alongside eligibility and refresh delivery. If a tap reaches perform but no save follows, inspect guards. If save succeeds but the provider sees running/missing state, inspect shared reads and startup writes. If the provider sees paused but the screen keeps counting, inspect archived rendering. The references do not establish which happened on the affected phone.
