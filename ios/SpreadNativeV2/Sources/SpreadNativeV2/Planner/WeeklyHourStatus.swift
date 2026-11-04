import Foundation

/// Read-only week totals for the compact Spread status strip.
/// Calculate unplaced and overbooked hours per responsibility; a simple
/// total-minus-placed subtraction hides unplaced hours when another role
/// is overbooked. The planner store remains the only source of truth.
struct WeeklyHourStatus {
    let total: Double
    let scheduled: Double
    let remaining: Double
    let overbooked: Double
    let spreadCount: Int

    init(snapshot: PlannerSnapshot) {
        spreadCount = snapshot.roles.count
        total = snapshot.roles.reduce(0) { $0 + $1.hours }
        var scheduled = 0.0
        var remaining = 0.0
        var overbooked = 0.0

        for role in snapshot.roles {
            let placed = snapshot.placedHours(for: role.id)
            scheduled += placed
            remaining += max(0, role.hours - placed)
            overbooked += max(0, placed - role.hours)
        }

        self.scheduled = scheduled
        self.remaining = remaining
        self.overbooked = overbooked
    }

    var headlineHours: Double { remaining > 0 ? remaining : total }
    var headlineLabel: String { remaining > 0 ? "to plan" : "planned" }
}
