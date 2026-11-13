#if os(iOS)
import ActivityKit
import Foundation

/// One live timer at a time. ActivityKit is a projection of the local timer,
/// never a second authority for planner allocations or task completion.
@MainActor
enum SpreadFocusLiveActivityController {
    static let enabledKey = "native.focus.liveActivityEnabled"
    static let showNameKey = "native.focus.showNameOutsideApp"

    private static func state(for s: SpreadFocusSession) -> SpreadFocusActivityAttributes.ContentState {
        SpreadFocusActivityAttributes.ContentState(
            phase: s.phase.rawValue, deadline: s.endAt, remainingSeconds: s.remaining())
    }

    static func start(_ session: SpreadFocusSession) {
        guard UserDefaults.standard.bool(forKey: enabledKey),
              ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        Task {
            for old in Activity<SpreadFocusActivityAttributes>.activities {
                await old.end(nil, dismissalPolicy: .immediate)
            }
            let title = UserDefaults.standard.bool(forKey: showNameKey)
                ? session.roleName : "Focus session"
            let attributes = SpreadFocusActivityAttributes(sessionId: session.id, title: title)
            let content = ActivityContent(state: state(for: session), staleDate: session.endAt)
            _ = try? Activity.request(attributes: attributes, content: content, pushType: nil)
        }
    }

    static func update(_ session: SpreadFocusSession) {
        guard UserDefaults.standard.bool(forKey: enabledKey) else {
            end()
            return
        }
        let active = Activity<SpreadFocusActivityAttributes>.activities
        guard !active.isEmpty else {
            if session.phase != .finished { start(session) }
            return
        }
        Task {
            let newState = state(for: session)
            for activity in active {
                guard activity.attributes.sessionId == session.id else {
                    await activity.end(nil, dismissalPolicy: .immediate)
                    continue
                }
                if session.phase == .finished {
                    await activity.end(nil, dismissalPolicy: .immediate)
                } else {
                    await activity.update(ActivityContent(state: newState, staleDate: session.endAt))
                }
            }
        }
    }

    static func end() {
        Task {
            for activity in Activity<SpreadFocusActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
    }
}
#endif
