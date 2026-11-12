# Focus Timer and local notifications

> Implements the approved local-first time utility on a stacked, unmerged branch. This is not a time-tracker or a task-completion system.

## User flow

Life → Focus a responsibility → Focus timer → Choose 5–240 min → Start. Pause, resume and finish are available in the same sheet. A small running-session control sits above the persistent bottom dock and returns to the timer. Sessions are restored after app restart and their countdown uses the absolute deadline, not a repeatedly decremented counter.

The timer does not write to `SpreadData`, alter responsibility budgets, create day allocations, create recurring rules, mark tasks complete, or invent calendar appointment times.

## Notifications

Timer completion alerts are **off by default** and requested in context. In More → Daily planning reminder, the user can independently opt into a time-of-day reminder (off by default). No account or server is required. Cancel pending timer alerts on pause/finish. Generic notification copy avoids disclosing private responsibility/task names on the Lock Screen.

## Architecture

- `Focus/SpreadFocusTimer.swift`: timestamp-based, profile-scoped local native session; persisted in the existing device's UserDefaults; no planner/sync schema changes.
- `Focus/SpreadFocusTimerSheet.swift`: native system controls, existing Spread tokens and 44 pt tap targets.
- `Life/LifeRoot.swift`: timer presented from a focused Life card; compact status available while navigating.
- `Sheets/ManageSheets.swift`: daily reminder preferences.
- Swift tests verify countdown, pause and Codable persistence.

## Gates

- Native Xcode/Codemagic build and signed IPA
- Physical-device timer start/pause/resume/finish; background, phone lock, force-quit, restart and profile switch
- Permission denial/grant; scheduled notification accuracy; switching time zones
- Light and dark, VoiceOver, large type and Reduce Motion
- No launch-time notification prompt; no unauthorized merge or release

## Rollback

Remove the native Focus sources and the two SwiftUI entry points. Local session preferences are optional and ignored by older binaries. Planner data requires no migration.
