#if os(iOS)
import ActivityKit
import Foundation

/// One Spread focus activity at a time. ActivityKit is a projection of the local session, never a second
/// authority. This file is also built into the widget extension, so the island's buttons can keep it current.
///
/// A running stretch goes stale at its deadline. The island reads a stale stretch as "done, waiting for a tap"
/// without the app running, so a break never starts on its own. A finished round with a next step keeps its
/// activity so Continue stays on the island.
@MainActor
enum SpreadFocusLiveActivityController {
    static let enabledKey = "native.focus.liveActivityEnabled"
    static let showNameKey = "native.focus.showNameOutsideApp"

    /// Where the activity sits when several Spread activities exist. A running or paused stretch outranks a
    /// stretch waiting for a tap.
    static func relevance(_ session: SpreadFocusSession) -> Double {
        switch session.phase {
        case .running, .paused: return 1.0
        case .finished: return 0.8
        }
    }

    private static func content(for session: SpreadFocusSession, now: Date = Date())
        -> ActivityContent<SpreadFocusActivityAttributes.ContentState> {
        let state = SpreadFocusActivityAttributes.ContentState(
            phase: session.phase.rawValue,
            deadline: session.endAt,
            remainingSeconds: session.remaining(at: now),
            kind: session.currentKind.rawValue,
            round: session.roundNumber,
            rounds: session.roundCount,
            nextLabel: SpreadFocusMachine.nextLabel(after: session),
            stoppedEarly: session.stoppedEarly)
        return ActivityContent(
            state: state,
            staleDate: session.phase == .running ? session.endAt : nil,
            relevanceScore: relevance(session))
    }

    static func start(_ session: SpreadFocusSession) {
        guard UserDefaults.standard.bool(forKey: enabledKey),
              ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        Task {
            for old in Activity<SpreadFocusActivityAttributes>.activities {
                await old.end(nil, dismissalPolicy: .immediate)
            }
            let title = UserDefaults.standard.bool(forKey: showNameKey) ? session.roleName : "Focus session"
            let attributes = SpreadFocusActivityAttributes(sessionId: session.id, title: title,
                                                           day: session.blockDay)
            _ = try? Activity.request(attributes: attributes, content: content(for: session), pushType: nil)
        }
    }

    /// Brings the island in step with the session. Nil, or a finished stretch with nothing after it, ends it.
    static func refresh(_ session: SpreadFocusSession?) {
        guard UserDefaults.standard.bool(forKey: enabledKey), let session else {
            end()
            return
        }
        if session.phase == .finished && SpreadFocusMachine.nextLabel(after: session) == nil {
            end()
            return
        }
        update(session)
    }

    static func update(_ session: SpreadFocusSession) {
        guard UserDefaults.standard.bool(forKey: enabledKey) else {
            end()
            return
        }
        let matching = Activity<SpreadFocusActivityAttributes>.activities
            .filter { $0.attributes.sessionId == session.id }
        guard !matching.isEmpty else {
            // A new round or break has a new session id. Start replaces whatever was showing before.
            if session.phase != .finished || SpreadFocusMachine.nextLabel(after: session) != nil {
                start(session)
            }
            return
        }
        Task {
            for activity in matching {
                await activity.update(content(for: session))
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
