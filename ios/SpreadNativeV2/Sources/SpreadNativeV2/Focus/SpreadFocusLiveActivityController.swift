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
    static let enabledKey = SpreadFocusPreferences.liveActivityKey
    static let showNameKey = SpreadFocusPreferences.showNameKey

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

    /// Serialize best-effort Live Activity updates without blocking a widget intent.
    /// The saved timer is authoritative; the system displays the activity separately.
    private static var pendingWork: Task<Void, Never>?

    private static func enqueue(_ work: @escaping @MainActor () async -> Void) {
        let prior = pendingWork
        pendingWork = Task {
            await prior?.value
            await work()
        }
    }

    static func start(_ session: SpreadFocusSession) {
        guard SpreadFocusPreferences.liveActivityEnabled() else { return }
        enqueue { await updateOrCreate(session) }
    }

    /// Brings the island in step with the session. Nil, or a finished stretch with nothing after it, ends it.
    static func refresh(_ session: SpreadFocusSession?) {
        #if DEBUG
        let stored = SpreadFocusStore.load()
        let activities = Activity<SpreadFocusActivityAttributes>.activities
        let matches = activities.filter { $0.attributes.sessionId == stored?.id }.count
        SpreadFocusDiagnostics.log("activity_refresh", enabled: SpreadFocusPreferences.widgetsEnabled(),
                                   extra: "requested_matches_saved=\(session?.id == stored?.id) activities=\(activities.count) matches=\(matches)")
        #endif
        guard SpreadFocusPreferences.liveActivityEnabled(), let session else {
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
        guard SpreadFocusPreferences.liveActivityEnabled() else {
            end()
            return
        }
        enqueue { await updateOrCreate(session) }
    }

    private static func updateOrCreate(_ requested: SpreadFocusSession) async {
        // Read the latest shared session after any earlier ActivityKit operation.
        // A delayed update must never resurrect or overwrite a newer focus stretch.
        guard let session = SpreadFocusStore.load(), session.id == requested.id,
              SpreadFocusPreferences.liveActivityEnabled() else { return }

        let all = Activity<SpreadFocusActivityAttributes>.activities
        #if DEBUG
        let matches = all.filter { $0.attributes.sessionId == session.id }.count
        SpreadFocusDiagnostics.log("activity_reconcile", enabled: SpreadFocusPreferences.widgetsEnabled(),
                                   extra: "activities=\(all.count) matches=\(matches)")
        #endif
        for old in all where old.attributes.sessionId != session.id {
            await old.end(nil, dismissalPolicy: .immediate)
        }
        guard let current = SpreadFocusStore.load(), current.id == requested.id,
              SpreadFocusPreferences.liveActivityEnabled() else { return }

        let matching = Activity<SpreadFocusActivityAttributes>.activities
            .filter { $0.attributes.sessionId == current.id }
        if matching.isEmpty {
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
            let title = SpreadFocusPreferences.showName() ? current.roleName : "Focus session"
            let attributes = SpreadFocusActivityAttributes(sessionId: current.id, title: title,
                                                           day: current.blockDay)
            _ = try? Activity.request(attributes: attributes, content: content(for: current), pushType: nil)
        } else {
            for activity in matching {
                await activity.update(content(for: current))
            }
        }
    }

    static func end() {
        enqueue {
            for activity in Activity<SpreadFocusActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
    }
}
#endif
