#if DEBUG
import Foundation

/// Isolated, read-only screenshot dataset for the *actual native Life view*.
/// Selected ONLY with -SpreadPersonalPreviewFixture; no store/bridge writes.
/// Use -SpreadEditorialPreviewCategory <category> to capture one category
/// without the other Wallet cards covering it. Without that second argument,
/// capture the full six-category stack. Release builds never compile this.
enum PersonalPreviewFixture {
    static let launchArgument = "-SpreadPersonalPreviewFixture"
    static let categoryArgument = "-SpreadEditorialPreviewCategory"

    static var snapshot: PlannerSnapshot? {
        let args = ProcessInfo.processInfo.arguments
        guard args.contains(launchArgument) else { return nil }
        guard let index = args.firstIndex(of: categoryArgument),
              index + 1 < args.count else { return week }
        let category = args[index + 1]
        guard let role = week.roles.first(where: { $0.category == category }) else { return week }
        return PlannerSnapshot(
            weekKey: week.weekKey,
            roles: [role],
            allocations: week.allocations.filter { $0.roleId == role.id },
            tasks: week.tasks.filter { $0.roleId == role.id }
        )
    }

    static let week = PlannerSnapshot(
        weekKey: "2026-11-02",
        roles: [
            Responsibility(id: "personal", name: "Personal", category: "personal", color: "#5D3042", hours: 6),
            Responsibility(id: "work", name: "Work", category: "work", color: "#284456", hours: 8),
            Responsibility(id: "family", name: "Family", category: "family", color: "#9A554F", hours: 7),
            Responsibility(id: "fitness", name: "Fitness", category: "fitness", color: "#365C4B", hours: 5),
            Responsibility(id: "school", name: "School", category: "school", color: "#354E5B", hours: 10),
            Responsibility(id: "home", name: "Home", category: "home", color: "#65704A", hours: 6),
        ],
        allocations: [
            DayAllocation(id: "p-mon", roleId: "personal", day: "2026-11-02", hours: 1),
            DayAllocation(id: "p-wed", roleId: "personal", day: "2026-11-04", hours: 2),
            DayAllocation(id: "p-sat", roleId: "personal", day: "2026-11-07", hours: 1),
            DayAllocation(id: "w-tue", roleId: "work", day: "2026-11-03", hours: 3),
            DayAllocation(id: "w-thu", roleId: "work", day: "2026-11-05", hours: 2),
            DayAllocation(id: "f-fri", roleId: "family", day: "2026-11-06", hours: 2),
            DayAllocation(id: "f-sun", roleId: "family", day: "2026-11-08", hours: 2),
            DayAllocation(id: "fit-mon", roleId: "fitness", day: "2026-11-02", hours: 1),
            DayAllocation(id: "fit-thu", roleId: "fitness", day: "2026-11-05", hours: 2),
            DayAllocation(id: "s-tue", roleId: "school", day: "2026-11-03", hours: 3),
            DayAllocation(id: "s-wed", roleId: "school", day: "2026-11-04", hours: 2),
            DayAllocation(id: "h-sat", roleId: "home", day: "2026-11-07", hours: 1),
            DayAllocation(id: "h-sun", roleId: "home", day: "2026-11-08", hours: 2),
        ],
        tasks: [
            PlannerTask(id: "p-task", roleId: "personal", text: "Read for twenty minutes", done: false, allocationId: "p-wed")
        ]
    )
}
#endif
