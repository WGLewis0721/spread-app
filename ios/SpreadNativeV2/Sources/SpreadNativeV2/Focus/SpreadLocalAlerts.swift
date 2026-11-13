#if os(iOS)
import Foundation
import UserNotifications

/// Opt-in local notifications: no push account, invented event time, or network. Shared with the widget
/// extension so the island's buttons can schedule the same reminder the app does.
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
        // Permission may have taken seconds. Recheck the saved session so a pause, finish, profile change or
        // a new round cannot resurrect a stale alert.
        func stillCurrent() -> Bool {
            guard let saved = SpreadFocusStore.load() else { return false }
            return saved.id == session.id && saved.phase == .running && saved.endAt == endAt
        }
        guard stillCurrent() else { return }
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [focusId])
        let content = UNMutableNotificationContent()
        content.title = session.currentKind == .rest ? "Break is over" : "Focus time finished"
        content.body = body(for: session)
        content.sound = .default
        let delay = max(1, endAt.timeIntervalSinceNow)
        let request = UNNotificationRequest(identifier: focusId, content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: delay, repeats: false))
        try? await center.add(request)
        if !stillCurrent() { center.removePendingNotificationRequests(withIdentifiers: [focusId]) }
    }

    /// Plain words about what happens next. No clock time and no task name.
    static func body(for session: SpreadFocusSession) -> String {
        if session.currentKind == .rest {
            return "Start your next focus round when you're ready."
        }
        if SpreadFocusMachine.nextLabel(after: session) != nil {
            return "Round \(session.roundNumber) is done. Start your break when you're ready."
        }
        return "Your focus session has ended. Open Spread to review your plan."
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
