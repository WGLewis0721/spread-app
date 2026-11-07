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
    /// A Crown week change opens Monday; explicit date taps retain their chosen date.
    /// Profile changes never reuse another profile's date.
    static func selection(_ selected: String?, in weekKey: String, today: String) -> String {
        if let selected {
            if PlannerDates.weekKey(for: PlannerDates.date(selected)) == weekKey { return selected }
            return weekKey // owner decision 26: new weeks start on Monday
        }
        return PlannerDates.weekKey(for: PlannerDates.date(today)) == weekKey ? today : weekKey
    }
    /// The selected Life area owns the Week To Place tray; nil means no filter yet.
    static func toPlaceTasks(_ snapshot: PlannerSnapshot, selectedRoleId: String?) -> [PlannerTask] {
        snapshot.unplacedTasks.filter { selectedRoleId == nil || $0.roleId == selectedRoleId }
    }
    /// Sum actual allocations; task completion does not change planned hours.
    static func dailyHours(_ snapshot: PlannerSnapshot, day: String) -> Double {
        snapshot.allocations.filter { $0.day == day && $0.hours > 0 }.reduce(0) { $0 + $1.hours }
    }
    static func dayCompleted(_ snapshot: PlannerSnapshot, day: String, roleId: String? = nil) -> Bool {
        let ids = Set(snapshot.allocations.filter {
            $0.day == day && $0.hours > 0 && (roleId == nil || $0.roleId == roleId)
        }.map(\.id))
        let scheduled = snapshot.tasks.filter { ids.contains($0.allocationId ?? "") }
        return !scheduled.isEmpty && scheduled.allSatisfy(\.done)
    }
    /// Put the selected role's dot first; never invent colors beyond snapshot allocations.
    static func orderedDayColors(_ snapshot: PlannerSnapshot, day: String, selectedRoleId: String?) -> [String] {
        var roles = dailyRoles(snapshot, day: day)
        if let selectedRoleId, let index = roles.firstIndex(where: { $0.id == selectedRoleId }) {
            let selected = roles.remove(at: index)
            roles.insert(selected, at: 0)
        }
        return roles.map(\.color)
    }
    static func overflow(_ count: Int, showing: Int = 3) -> Int { max(0, count - showing) }

    static func dailyRoles(_ snapshot: PlannerSnapshot, day: String) -> [Responsibility] {
        snapshot.roles.filter { role in snapshot.allocations.contains { $0.day == day && $0.roleId == role.id && $0.hours > 0 } }
    }
    static func dailyTasks(_ snapshot: PlannerSnapshot, day: String, roleId: String) -> [PlannerTask] {
        let ids = Set(snapshot.allocations.filter { $0.day == day && $0.roleId == roleId && $0.hours > 0 }.map(\.id))
        let tasks = snapshot.tasks.filter { $0.roleId == roleId && $0.allocationId.map(ids.contains) == true }
        let order = snapshot.dayTaskOrder?[day + "|" + roleId] ?? []
        return tasks.enumerated().sorted { left, right in
            let a = order.firstIndex(of: left.element.id) ?? (order.count + left.offset)
            let b = order.firstIndex(of: right.element.id) ?? (order.count + right.offset)
            return a < b
        }.map(\.element)
    }
}
