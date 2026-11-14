#if os(iOS)
import Foundation
import WidgetKit

/// Notifies WidgetKit when the one authoritative App Group timer changes.
/// The widget reads SpreadFocusStore directly. It does not persist a second timer snapshot.
enum SpreadFocusWidgetPublisher {
    /// The user's opt-in remains private to the app and is mirrored into the shared App Group.
    static func publish() {
        guard let shared = UserDefaults(suiteName: SpreadWidgetShared.appGroup) else { return }
        shared.set(SpreadFocusPreferences.widgetsEnabled(),
                   forKey: SpreadWidgetShared.timerEnabledMirrorKey)
        // Remove the obsolete duplicate snapshot created by earlier versions.
        shared.removeObject(forKey: SpreadWidgetShared.focusKey)
        reload()
    }

    static func republishFromStore() {
        publish()
    }

    static func revoke() {
        publish()
    }

    private static func reload() {
        WidgetCenter.shared.reloadTimelines(ofKind: SpreadWidgetShared.timerKind)
        WidgetCenter.shared.reloadTimelines(ofKind: SpreadWidgetShared.todayKind)
    }
}
#endif
