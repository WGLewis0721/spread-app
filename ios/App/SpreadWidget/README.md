# Spread widget (not yet in the Xcode project)

Source for the Today widget from `docs/design/specs/2026-10-28-widget-live-activity.md`. Nothing here builds until the target exists. Steps on a Mac with Xcode:

1. File, New, Target, Widget Extension. Name `SpreadWidget`, bundle id `com.graymatter.spread.SpreadWidget`, uncheck Live Activity and Configuration Intent. Delete the generated Swift files and add `SpreadWidget.swift`, `Info.plist` and `SpreadWidget.entitlements` from this folder.
2. Signing & Capabilities on both the App and SpreadWidget targets: App Groups, `group.com.graymatter.spread` (the App entitlements file already lists it). Regenerate the provisioning profiles in the developer portal.
3. Add `SpreadWidgetPlugin.swift` (in `ios/App/App/`) to the App target. It is already registered in `SpreadBridgeViewController.swift`.
4. Set the extension deployment target to iOS 17.0.
5. Not wired yet: the More sheet switches ("Show Today on widgets", "Show task names", both off by default) and the call to `syncWidget` after saves. Tapping the widget opens Spread; opening straight to Today needs a URL scheme the app does not have.
6. Device checks owed: install, refresh after a save, switch off removes data, Lock Screen shows no task text by default, Dark and tinted modes, Dynamic Type, VoiceOver.
