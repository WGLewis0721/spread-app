#if os(iOS)
import Foundation
import WidgetKit

/// Mirrors the one local focus session into the shared App Group so the Timer and Today widgets can show it.
/// Only the profile on screen is mirrored. The mirror is removed when a session ends with nothing after it.
/// Life area names appear only when the person allowed them outside the app. Nothing here changes a budget,
/// an allocation or a task.
enum SpreadFocusWidgetPublisher {
    private static let showNameKey = "native.focus.showNameOutsideApp"

    static func publish(_ session: SpreadFocusSession?) {
        guard UserDefaults.standard.bool(forKey: SpreadWidgetShared.todayEnabledKey),
              let session, SpreadFocusMachine.isOnScreen(session),
              SpreadFocusStore.activeProfile() == session.profileId,
              let shared = UserDefaults(suiteName: SpreadWidgetShared.appGroup) else {
            revoke()
            return
        }
        let title = UserDefaults.standard.bool(forKey: showNameKey) ? session.roleName : "Focus session"
        let state = SpreadFocusWidgetState(
            sessionId: session.id,
            // A finished stretch with a next step is shown as running with no deadline, which the widget reads
            // as "done, waiting for a tap".
            phase: session.phase == .paused ? .paused : .running,
            endAt: session.endAt,
            pausedSeconds: session.pausedSeconds,
            durationSeconds: session.durationSeconds,
            title: title,
            writtenAt: Date(),
            kind: session.currentKind.rawValue,
            round: session.roundNumber,
            rounds: session.roundCount,
            nextLabel: SpreadFocusMachine.nextLabel(after: session))
        guard let data = try? JSONEncoder().encode(state) else { return }
        shared.set(data, forKey: SpreadWidgetShared.focusKey)
        reload()
    }

    /// Re-reads the saved session, for when the widget switch changes during a session.
    static func republishFromStore() {
        publish(SpreadFocusStore.load())
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
