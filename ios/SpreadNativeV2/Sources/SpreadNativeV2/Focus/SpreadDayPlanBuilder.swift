import Foundation

/// Reads one day of the planner and says what each Life area's planned hours look like as focus rounds.
/// Read-only: it never changes the snapshot. Foundation only, so the Linux test slice builds it too.
enum SpreadDayPlanBuilder {
    static func make(snapshot: PlannerSnapshot, day: String, profileId: String,
                     showNames: Bool, writtenAt: Date) -> SpreadDayPlanRecord {
        var hoursByRole: [String: Double] = [:]
        for allocation in snapshot.allocations where allocation.day == day && allocation.hours > 0 {
            hoursByRole[allocation.roleId, default: 0] += allocation.hours
        }
        var ranked: [(order: Int, entry: SpreadDayBlockEntry)] = []
        for (order, role) in snapshot.roles.enumerated() {
            guard let hours = hoursByRole[role.id], let plan = SpreadBlockFit.plan(hours: hours) else { continue }
            let label = showNames ? role.name : "Planned block"
            ranked.append((order, SpreadDayBlockEntry(roleId: role.id, label: label, hours: hours, plan: plan)))
        }
        let blocks = ranked
            .sorted { lhs, rhs in
                lhs.entry.hours == rhs.entry.hours ? lhs.order < rhs.order : lhs.entry.hours > rhs.entry.hours
            }
            .map(\.entry)
        return SpreadDayPlanRecord(profileId: profileId, day: day, writtenAt: writtenAt, blocks: blocks)
    }
}
