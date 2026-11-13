# Today widget: local-only read model

> Part of the [Spread design brain](../README.md). Follow the current native design and release rules.

**Status:** Implementation PR (unmerged, dependent on native Focus Timer PR). This extends the [October 28 widget draft](2026-10-28-widget-live-activity.md); all release gates remain.

## UX
- More → **Show Today on widgets** is off by default. It never requests a mandatory account, cloud permission or notification permission.
- Home Screen small/medium and Lock Screen circular/rectangular show the count of today's allocated tasks done, the total tasks assigned to those day allocations, and hours placed **today**. No task text or sensitive responsibility names.
- Empty/off widgets show "Enable widget in More" and do not read user data.
- Tapping opens Spread in Life mode's **Week** page for the current week via `spread://today`.
- The app only writes a snapshot when the current viewed planner week matches today's week. Older snapshots are ignored after the date changes; widgets do not pretend to be live. Updating the planner may refresh WidgetKit within Apple's system budget.

## Architecture
- App Group `group.com.graymatter.spread` for the containing app and new `SpreadWidget` extension target.
- `SpreadWidgetPublisher` writes a minimal optional Codable record to the shared suite, separate from canonical `SpreadData`. Only today's selected week can update this record; opt-out deletes it.
- `SpreadLiveRoot` publishes on authoritative planner revision; `MoreSheet` handles the opt-in and revoke.
- URL scheme `spread://today` uses `SceneDelegate` and navigates to today's Week using the existing validated planner command.
- Native controls use system surfaces and accessibility; no new design tokens or competing planner store.

## Outside-app security
Lock Screen may be visible to others. Counts and hours only; no names, task descriptions, file attachments or profile identifiers. No App Group snapshot is created while disabled.

## Native release gates
- Provision `group.com.graymatter.spread` for both bundle IDs in the Apple Developer team and regenerate their signing profiles. Codemagic must include the **embedded .appex** when building the IPA.
- Swift compilation, Xcode embedding, entitlements/code signing, physical-device install and widget gallery availability.
- Enable/disable, day boundary and timezone, offline, profile switches, widget stale/off state, light/dark/tinted, large text and VoiceOver.
- Widget only shows values from the current profile; do not cache data across a profile switch.

## Rollback
Remove extension target/embedded file and group entitlements; keep the existing app planner unchanged. Clear optional App Group snapshot on opt-out. No planner schema migration.
