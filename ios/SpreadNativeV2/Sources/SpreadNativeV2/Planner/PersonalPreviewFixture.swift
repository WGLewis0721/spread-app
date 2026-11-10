#if DEBUG
import Foundation

/// DEBUG-only fixture that puts one Personal responsibility on the Life page, so the
/// editorial card can be captured on a simulator. It is selected only by the launch
/// argument `-SpreadPersonalPreviewFixture`. It replaces what the Life screen reads:
/// no store, bridge or planner write is involved, and release builds do not compile it.
enum PersonalPreviewFixture {
    static let launchArgument = "-SpreadPersonalPreviewFixture"

    static var snapshot: PlannerSnapshot? {
        ProcessInfo.processInfo.arguments.contains(launchArgument) ? week : nil
    }

    static let week = PlannerSnapshot(
        weekKey: "2026-11-02",
        roles: [
            Responsibility(id: "personal", name: "Personal", category: "personal", color: "#5D3042", hours: 6),
            Responsibility(id: "work", name: "Work", category: "work", color: "#A86975", hours: 8)
        ],
        allocations: [
            DayAllocation(id: "p-mon", roleId: "personal", day: "2026-11-02", hours: 1),
            DayAllocation(id: "p-wed", roleId: "personal", day: "2026-11-04", hours: 2),
            DayAllocation(id: "p-sat", roleId: "personal", day: "2026-11-07", hours: 1),
            DayAllocation(id: "w-tue", roleId: "work", day: "2026-11-03", hours: 3)
        ],
        tasks: [
            PlannerTask(id: "p-task", roleId: "personal", text: "Read for twenty minutes", done: false, allocationId: "p-wed")
        ]
    )
}
#endif
