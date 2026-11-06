import Foundation

/// Life presentation dates use the planner's Gregorian UTC date-only rules.
/// No calendar selection or expansion writes a planner record.
enum LifeCalendarRules {
    static func week(_ selected: String) -> [String] {
        let monday = PlannerDates.weekKey(for: PlannerDates.date(selected))
        return (0..<7).map { PlannerDates.dayISO(weekKey: monday, index: $0) }
    }
    static func month(_ selected: String) -> [String] {
        let date = PlannerDates.date(selected)
        let first = PlannerDates.calendar.date(from: PlannerDates.calendar.dateComponents([.year, .month], from: date)) ?? date
        let monday = PlannerDates.weekKey(for: first)
        return (0..<42).map { PlannerDates.dayISO(weekKey: monday, index: $0) }
    }
    static func shiftDay(_ selected: String, by delta: Int) -> String {
        PlannerDates.formatter.string(from: PlannerDates.calendar.date(byAdding: .day, value: delta, to: PlannerDates.date(selected)) ?? PlannerDates.date(selected))
    }
    /// Clamp January 31 to February's last day, rather than overflowing into March.
    static func shiftMonth(_ selected: String, by delta: Int) -> String {
        let source = PlannerDates.date(selected)
        let calendar = PlannerDates.calendar
        let first = calendar.date(from: calendar.dateComponents([.year, .month], from: source)) ?? source
        let target = calendar.date(byAdding: .month, value: delta, to: first) ?? first
        let last = calendar.range(of: .day, in: .month, for: target)?.count ?? 28
        let day = min(calendar.component(.day, from: source), last)
        return PlannerDates.formatter.string(from: calendar.date(byAdding: .day, value: day - 1, to: target) ?? target)
    }
    /// Crown navigation keeps the selected weekday; profile changes never reuse another profile's date.
    static func selection(_ selected: String?, in weekKey: String, today: String) -> String {
        if let selected {
            if PlannerDates.weekKey(for: PlannerDates.date(selected)) == weekKey { return selected }
            let weekday = (PlannerDates.calendar.component(.weekday, from: PlannerDates.date(selected)) + 5) % 7
            return PlannerDates.dayISO(weekKey: weekKey, index: weekday)
        }
        return PlannerDates.weekKey(for: PlannerDates.date(today)) == weekKey ? today : weekKey
    }
    static func dailyRoles(_ snapshot: PlannerSnapshot, day: String) -> [Responsibility] {
        snapshot.roles.filter { role in snapshot.allocations.contains { $0.day == day && $0.roleId == role.id && $0.hours > 0 } }
    }
    static func dailyTasks(_ snapshot: PlannerSnapshot, day: String, roleId: String) -> [PlannerTask] {
        let ids = Set(snapshot.allocations.filter { $0.day == day && $0.roleId == roleId && $0.hours > 0 }.map(\.id))
        return snapshot.tasks.filter { $0.roleId == roleId && $0.allocationId.map(ids.contains) == true }
    }
}
