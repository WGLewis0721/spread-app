#if os(iOS)
import Foundation
import WidgetKit

/// A deliberately small, non-sensitive read model for extensions. Planner data stays
/// in the existing authoritative store; this is a disposable, local-only projection.
struct SpreadTodayWidgetSnapshot: Codable {
    let day: String
    let doneTasks: Int
    let totalTasks: Int
    let hoursPlaced: Double
    let writtenAt: Date
}

enum SpreadWidgetPublisher {
    // The App Group, key and kind live once, in SpreadWidgetShared, which the widget extension also compiles.
    static let appGroup = SpreadWidgetShared.appGroup
    static let key = SpreadWidgetShared.todayKey
    static let enabledKey = SpreadWidgetShared.todayEnabledKey
    static let widgetKind = SpreadWidgetShared.todayKind

    static func publish(snapshot: PlannerSnapshot) {
        guard UserDefaults.standard.bool(forKey: enabledKey) else {
            revoke()
            return
        }
        // Never overwrite today's widget with a selected future/past week.
        guard snapshot.weekKey == PlannerDates.currentWeekKey() else { return }
        guard let shared = UserDefaults(suiteName: appGroup) else { return }
        let today = PlannerDates.localISO()
        let allocations = snapshot.allocations.filter { $0.day == today }
        let ids = Set(allocations.map(\.id))
        let todayTasks = snapshot.tasks.filter { task in
            guard let id = task.allocationId else { return false }
            return ids.contains(id)
        }
        let record = SpreadTodayWidgetSnapshot(
            day: today, doneTasks: todayTasks.filter(\.done).count,
            totalTasks: todayTasks.count,
            hoursPlaced: allocations.reduce(0) { $0 + $1.hours },
            writtenAt: Date()
        )
        guard let data = try? JSONEncoder().encode(record) else { return }
        shared.set(data, forKey: key)
        WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
    }

    static func revoke() {
        guard let shared = UserDefaults(suiteName: appGroup),
              shared.object(forKey: key) != nil else { return }
        shared.removeObject(forKey: key)
        WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
    }
}
#endif
