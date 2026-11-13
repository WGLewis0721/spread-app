#if os(iOS)
import Foundation
import WidgetKit

/// Mirrors the one local focus session into the shared App Group so widgets can show it. The timer
/// stays the only authority: this is rewritten on every change and deleted when the session ends.
/// It needs the same opt-in as the Today widget, and it carries the Life area name only when the
/// person allowed that outside the app. Nothing here changes a budget, allocation or task.
enum SpreadFocusWidgetPublisher {
    // The keys the timer and the Live Activity already use, kept as literals so this file does not
    // depend on their actor isolation.
    private static let sessionKey = "native.focus.session.v1"
    private static let showNameKey = "native.focus.showNameOutsideApp"

    static func publish(_ session: SpreadFocusSession?) {
        guard UserDefaults.standard.bool(forKey: SpreadWidgetPublisher.enabledKey),
              let session, session.phase != .finished,
              let shared = UserDefaults(suiteName: SpreadWidgetShared.appGroup) else {
            revoke()
            return
        }
        let title = UserDefaults.standard.bool(forKey: showNameKey) ? session.roleName : "Focus session"
        let state = SpreadFocusWidgetState(
            sessionId: session.id,
            phase: session.phase == .running ? .running : .paused,
            endAt: session.endAt,
            pausedSeconds: session.pausedSeconds,
            durationSeconds: session.durationSeconds,
            title: title,
            writtenAt: Date())
        guard let data = try? JSONEncoder().encode(state) else { return }
        shared.set(data, forKey: SpreadWidgetShared.focusKey)
        reload()
    }

    /// Re-reads the saved session, for when the opt-in changes while a session is already running.
    static func republishFromStore() {
        guard let data = UserDefaults.standard.data(forKey: sessionKey),
              let session = try? JSONDecoder().decode(SpreadFocusSession.self, from: data) else {
            revoke()
            return
        }
        publish(session)
    }

    static func revoke() {
        guard let shared = UserDefaults(suiteName: SpreadWidgetShared.appGroup),
              shared.object(forKey: SpreadWidgetShared.focusKey) != nil else { return }
        shared.removeObject(forKey: SpreadWidgetShared.focusKey)
        reload()
    }

    private static func reload() {
        WidgetCenter.shared.reloadTimelines(ofKind: SpreadWidgetShared.timerKind)
        WidgetCenter.shared.reloadTimelines(ofKind: SpreadWidgetShared.todayKind)
    }
}
#endif
