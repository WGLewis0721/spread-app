import XCTest
@testable import SpreadNativeV2

final class LifeCardWeekDistributionTests: XCTestCase {
    private func makeSnapshot() -> PlannerSnapshot {
        PlannerSnapshot(
            weekKey: "2026-11-09",
            roles: [
                Responsibility(id: "fitness", name: "Fitness", category: "fitness",
                               color: "#485B4E", hours: 6),
                Responsibility(id: "school", name: "School", category: "school",
                               color: "#665178", hours: 8)
            ],
            allocations: [
                DayAllocation(id: "f-tue", roleId: "fitness", day: "2026-11-10", hours: 2),
                DayAllocation(id: "f-thu", roleId: "fitness", day: "2026-11-12", hours: 1.5),
                DayAllocation(id: "f-thu-b", roleId: "fitness", day: "2026-11-12", hours: 0.5),
                DayAllocation(id: "f-sat", roleId: "fitness", day: "2026-11-14", hours: 2),
                // Another role and another week must never contaminate the strip.
                DayAllocation(id: "school-thu", roleId: "school", day: "2026-11-12", hours: 5),
                DayAllocation(id: "old-week", roleId: "fitness", day: "2026-11-05", hours: 5),
                DayAllocation(id: "next-week", roleId: "fitness", day: "2026-11-17", hours: 3)
            ],
            tasks: [
                PlannerTask(id: "task", roleId: "fitness", text: "Mobility",
                            done: false, allocationId: "f-tue")
            ]
        )
    }

    func testStripUsesOnlySelectedWeekAndResponsibility() {
        let values = LifeCardWeekDistribution.hours(for: "fitness", snapshot: makeSnapshot())
        XCTAssertEqual(values, [0, 2, 0, 2, 0, 2, 0])
        XCTAssertEqual(LifeCardWeekDistribution.assigned(values), 6)
        XCTAssertEqual(LifeCardWeekDistribution.unassigned(budget: 6, hours: values), 0)
    }

    func testUnassignedHoursRemainVisibleWithoutInventedDayPlacements() {
        var snapshot = makeSnapshot()
        snapshot.allocations.removeAll { $0.id == "f-sat" }
        let values = LifeCardWeekDistribution.hours(for: "fitness", snapshot: snapshot)
        XCTAssertEqual(values, [0, 2, 0, 2, 0, 0, 0])
        XCTAssertEqual(LifeCardWeekDistribution.unassigned(budget: 6, hours: values), 2)
    }

    func testLegacyOverbookedHoursAreNotHidden() {
        let values: [Double] = [7, 0, 0, 0, 0, 0, 0]
        XCTAssertEqual(LifeCardWeekDistribution.unassigned(budget: 6, hours: values), -1)
    }

    func testTasksAndCompletionCannotAffectDisplayedHourDistribution() {
        var snapshot = makeSnapshot()
        let before = LifeCardWeekDistribution.hours(for: "fitness", snapshot: snapshot)
        snapshot.tasks = [
            PlannerTask(id: "task", roleId: "fitness", text: "Mobility",
                        done: true, allocationId: nil)
        ]
        XCTAssertEqual(LifeCardWeekDistribution.hours(for: "fitness", snapshot: snapshot), before)
    }
}
