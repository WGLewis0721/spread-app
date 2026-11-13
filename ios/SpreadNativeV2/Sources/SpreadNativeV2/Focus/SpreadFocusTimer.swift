#if os(iOS)
import Combine
import Foundation
import UserNotifications

/// Timer state is local presentation/session data. It never changes budgets,
/// allocations, tasks, or completion flags in the authoritative planner.
struct SpreadFocusSession: Codable, Equatable {
    enum Phase: String, Codable { case running, paused, finished }
    let id: String
    let profileId: String
    let roleId: String
    let roleName: String
    let durationSeconds: Int
    var pausedSeconds: Int
    var endAt: Date?
    var phase: Phase

    func remaining(at now: Date = Date()) -> Int {
        switch phase {
        case .running:
            return max(0, Int(ceil((endAt ?? now).timeIntervalSince(now))))
        case .paused:
            return max(0, pausedSeconds)
        case .finished:
            return 0
        }
    }
}

enum SpreadFocusClock {
    static func display(_ seconds: Int) -> String {
        let clamped = max(0, seconds)
        return String(format: "%02d:%02d", clamped / 60, clamped % 60)
    }
}

@MainActor
final class SpreadFocusTimer: ObservableObject {
    private let key = "native.focus.session.v1"
    @Published private(set) var session: SpreadFocusSession?

    init() {
        if let data = UserDefaults.standard.data(forKey: key) {
            session = try? JSONDecoder().decode(SpreadFocusSession.self, from: data)
        }
        reconcile()
        if let current = session, current.phase != .finished {
            SpreadFocusLiveActivityController.update(current)
        }
    }

    func visibleSession(for profileId: String) -> SpreadFocusSession? {
        guard session?.profileId == profileId else { return nil }
        return session
    }

    func start(profileId: String, roleId: String, roleName: String,
               minutes: Int, notify: Bool) -> Bool {
        guard (5...240).contains(minutes), !profileId.isEmpty, !roleId.isEmpty else { return false }
        if let current = session, current.phase == .running && current.remaining() > 0 { return false }
        let duration = minutes * 60
        let next = SpreadFocusSession(
            id: UUID().uuidString, profileId: profileId, roleId: roleId, roleName: roleName,
            durationSeconds: duration, pausedSeconds: duration,
            endAt: Date().addingTimeInterval(TimeInterval(duration)), phase: .running)
        session = next
        persist()
        SpreadFocusLiveActivityController.start(next)
        if notify { Task { await SpreadLocalAlerts.scheduleFocus(next) } }
        return true
    }

    func pause(profileId: String) {
        guard var current = visibleSession(for: profileId), current.phase == .running else { return }
        current.pausedSeconds = current.remaining()
        current.endAt = nil
        current.phase = current.pausedSeconds > 0 ? .paused : .finished
        session = current
        persist()
        SpreadFocusLiveActivityController.update(current)
        SpreadLocalAlerts.cancelFocus()
    }

    func resume(profileId: String, notify: Bool) {
        guard var current = visibleSession(for: profileId), current.phase == .paused,
              current.pausedSeconds > 0 else { return }
        current.endAt = Date().addingTimeInterval(TimeInterval(current.pausedSeconds))
        current.phase = .running
        session = current
        persist()
        SpreadFocusLiveActivityController.update(current)
        if notify { Task { await SpreadLocalAlerts.scheduleFocus(current) } }
    }

    func finish(profileId: String) {
        guard var current = visibleSession(for: profileId) else { return }
        current.phase = .finished
        current.endAt = nil
        current.pausedSeconds = 0
        session = current
        persist()
        SpreadFocusLiveActivityController.end()
        SpreadLocalAlerts.cancelFocus()
    }

    func pauseForProfileSwitch(to newProfileId: String) {
        guard let current = session, current.profileId != newProfileId,
              current.phase == .running else { return }
        pause(profileId: current.profileId)
        SpreadFocusLiveActivityController.end()
    }

    func reconcile() {
        guard var current = session, current.phase == .running,
              current.remaining() == 0 else { return }
        current.phase = .finished
        current.endAt = nil
        current.pausedSeconds = 0
        session = current
        persist()
        SpreadFocusLiveActivityController.end()
    }

    private func persist() {
        if let current = session, let data = try? JSONEncoder().encode(current) {
            UserDefaults.standard.set(data, forKey: key)
        } else {
            UserDefaults.standard.removeObject(forKey: key)
        }
    }
}

/// Opt-in local notifications: no push account, invented event time, or network.
enum SpreadLocalAlerts {
    static let focusId = "spread.focus.finished"
    static let dailyId = "spread.daily.planning"

    static func authorized() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let status = await center.notificationSettings().authorizationStatus
        switch status {
        case .authorized, .provisional, .ephemeral: return true
        case .notDetermined:
            return (try? await center.requestAuthorization(options: [.alert, .sound])) ?? false
        default: return false
        }
    }

    static func scheduleFocus(_ session: SpreadFocusSession) async {
        guard session.phase == .running, let endAt = session.endAt,
              endAt > Date(), await authorized() else { return }
        // Permission may have taken seconds. Recheck persistent state so a pause,
        // finish, profile change or immediate restart cannot resurrect a stale alert.
        func stillCurrent() -> Bool {
            guard let data = UserDefaults.standard.data(forKey: "native.focus.session.v1"),
                  let saved = try? JSONDecoder().decode(SpreadFocusSession.self, from: data)
            else { return false }
            return saved.id == session.id && saved.phase == .running && saved.endAt == endAt
        }
        guard stillCurrent() else { return }
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [focusId])
        let content = UNMutableNotificationContent()
        content.title = "Focus time finished"
        content.body = "Your focus session has ended. Open Spread to review your plan."
        content.sound = .default
        let delay = max(1, endAt.timeIntervalSinceNow)
        let request = UNNotificationRequest(identifier: focusId, content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: delay, repeats: false))
        try? await center.add(request)
        if !stillCurrent() { center.removePendingNotificationRequests(withIdentifiers: [focusId]) }
    }

    static func cancelFocus() {
        UNUserNotificationCenter.current()
            .removePendingNotificationRequests(withIdentifiers: [focusId])
    }

    static func scheduleDailyReminder(hour: Int, minute: Int) async -> Bool {
        guard (0...23).contains(hour), (0...59).contains(minute),
              await authorized() else { return false }
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [dailyId])
        let content = UNMutableNotificationContent()
        content.title = "Plan your day"
        content.body = "Open Spread to review how you'll use today's hours."
        content.sound = .default
        var components = DateComponents()
        components.hour = hour
        components.minute = minute
        let request = UNNotificationRequest(identifier: dailyId, content: content,
            trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: true))
        do {
            try await center.add(request)
            return true
        } catch { return false }
    }

    static func cancelDailyReminder() {
        UNUserNotificationCenter.current()
            .removePendingNotificationRequests(withIdentifiers: [dailyId])
    }
}
#endif
