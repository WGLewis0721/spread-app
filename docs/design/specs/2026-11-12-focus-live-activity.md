# Focus Live Activity and Dynamic Island

> Part of the [Spread design brain](../README.md). Follow the current native design and release rules.

**Status:** Implemented on unmerged stacked PR; depends on the Focus Timer and Today widget extension.

## Purpose and user journey

Focus a Life card → Focus Timer → enable **Show active timer on Lock Screen and Dynamic Island** (off by default) → Start Focus. Spread shows an accurate countdown in the timer sheet, Lock Screen Live Activity, and on Dynamic Island capable iPhones. Tapping returns to Spread's Focus Timer via `spread://focus`. Pause and resume update the display. Finish or timer expiry ends the Live Activity.

The Live Activity represents one bounded **focus session**, not the entire day or a weekly plan. No second planner, calendar appointment, automatic hour adjustment, task completion, server or push backend.

## Privacy

Live Activity is opt-in. By default its title is **Focus session**, not a Life area or task. A separate explicit toggle allows displaying the Life area name outside the app. Never include task notes, personal details, or account/profile IDs. Widget and Dynamic Island follow system appearance, accessibility and contrast.

## Implementation

- Shared `SpreadFocusActivityAttributes.swift` compiled by the SpreadNativeV2 package and the WidgetKit extension.
- `SpreadFocusLiveActivityController.swift`: one ActivityKit projection, start/update/end and stale session cleanup.
- `SpreadFocusTimer.swift`: ActivityKit callbacks from persisted session changes; countdown uses absolute deadline, not background polling.
- `SpreadTodayWidget.swift`: added `ActivityConfiguration` with Lock Screen, expanded, compact and minimal island surfaces.
- `Info.plist`: `NSSupportsLiveActivities`.
- `SceneDelegate` / `SpreadLiveRoot` / `LifeRoot`: safe `spread://focus` deep link to the existing timer.

## Release gates

- Xcode and Codemagic compile with the embedded widget extension and a signed App Group provisioning profile.
- On-device Dynamic Island and non-Dynamic Island Lock Screen tests: start/pause/resume/finish, background, re-launch, time expiration, permission disabled, and an unrelated Live Activity already running.
- Verify the eight-hour Live Activity cap (timer is limited to four hours), reduced motion and VoiceOver. Do not fake timer progress or show private Life-area titles without consent.
- Simulate app being killed and restarted; ActivityKit should display the system countdown and reconcile on reopen. No background tasks or server required.

## Rollback

Remove ActivityConfiguration and ActivityKit controller, shared attributes source reference and `NSSupportsLiveActivities`. Keep the Today widget and Focus Timer independently functional. No planner data migration.
