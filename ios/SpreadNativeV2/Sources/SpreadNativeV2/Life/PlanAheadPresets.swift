import Foundation

/// A suggested repeating schedule for one Life area, built only from what the person already has
/// this week. It is a starting point: nothing is saved until they review and confirm it in the form.
/// Foundation only, so it is compiled and tested on macOS as well as iOS.
struct PlanAheadPreset: Identifiable, Equatable {
    let roleId: String
    let roleName: String
    /// Set days in week order. Empty means weekly hours only.
    let days: [NativeDayHours]
    /// Weekly total. With set days it is their sum, as the planner requires.
    let weeklyHours: Double
    /// The Monday a schedule can start on: the week after the one on screen, as a `YYYY-MM-DD` key.
    let startWeek: String
    var id: String { roleId }

    /// Planner weekday codes, Monday first. Matches PLAN_WEEKDAYS in the planner.
    static let weekdayCodes: [String] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

    /// The days a Life area already has this week, the same hours its Life card shows, in half-hour
    /// steps. The repeat form and the suggestions both start from this, so they always agree.
    static func days(for roleId: String, in snapshot: PlannerSnapshot) -> [NativeDayHours] {
        let perDay = LifeCardWeekDistribution.hours(for: roleId, snapshot: snapshot)
        var result: [NativeDayHours] = []
        for (index, amount) in perDay.enumerated() where index < weekdayCodes.count && amount >= 0.5 {
            result.append(NativeDayHours(weekday: weekdayCodes[index],
                                         hours: min(24, (amount * 2).rounded() / 2)))
        }
        return result
    }

    /// One suggestion per Life area that has hours this week and is not already covered by a schedule
    /// (`covered` holds the Life areas that are). Biggest weekly total first, then by name.
    static func suggestions(for snapshot: PlannerSnapshot, excluding covered: Set<String>,
                            limit: Int = 4) -> [PlanAheadPreset] {
        let startWeek = PlannerDates.weekISO(base: snapshot.weekKey, offset: 1)
        let all = snapshot.roles.compactMap { (role: Responsibility) -> PlanAheadPreset? in
            guard !covered.contains(role.id) else { return nil }
            let placed = PlanAheadPreset.days(for: role.id, in: snapshot)
            if !placed.isEmpty {
                let total = placed.reduce(0) { (sum: Double, day: NativeDayHours) -> Double in sum + day.hours }
                return PlanAheadPreset(roleId: role.id, roleName: role.name, days: placed,
                                       weeklyHours: total, startWeek: startWeek)
            }
            let weekly = min(168, (role.hours * 2).rounded() / 2)
            guard weekly >= 0.5 else { return nil }
            return PlanAheadPreset(roleId: role.id, roleName: role.name, days: [],
                                   weeklyHours: weekly, startWeek: startWeek)
        }
        let ordered = all.sorted { (a: PlanAheadPreset, b: PlanAheadPreset) -> Bool in
            a.weeklyHours == b.weeklyHours ? a.roleName < b.roleName : a.weeklyHours > b.weeklyHours
        }
        return Array(ordered.prefix(limit))
    }
}
