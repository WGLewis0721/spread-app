import XCTest
@testable import SpreadNativeV2

final class LifeFirstWeekGuideTests: XCTestCase {
    private let home = Responsibility(id: "home", name: "Home", category: "home", color: "#FF9500", hours: 2)
    private let work = Responsibility(id: "work", name: "Work", category: "work", color: "#34C759", hours: 0)

    private func emptyWeek() -> PlannerSnapshot {
        PlannerSnapshot(weekKey: "2026-11-16", roles: [], allocations: [], tasks: [])
    }

    func testPlanProgressUsesSavedCapacityHoursDayAndTask() {
        var week = emptyWeek()
        XCTAssertEqual(LifeFirstWeekStep.next(in: week), .area)
        week.roles = [home]
        XCTAssertEqual(LifeFirstWeekStep.next(in: week), .hours(home.id))
        week.life = LifeWeekSnapshot(version: 1, capacityHours: 12, priorityRoleId: nil,
                                     priorityGoalHours: nil, priorityDay: nil)
        XCTAssertEqual(LifeFirstWeekStep.next(in: week), .days(home.id))
        week.allocations = [DayAllocation(id: "slot", roleId: home.id, day: "2026-11-16", hours: 0.5)]
        XCTAssertEqual(LifeFirstWeekStep.next(in: week), .task(home.id))
        week.tasks = [PlannerTask(id: "task", roleId: home.id, text: "Make dinner", done: false, allocationId: nil)]
        XCTAssertEqual(LifeFirstWeekStep.next(in: week), .complete)
    }

    func testReplayHonorsPreferredRoleAndRecoversAfterDeletion() {
        var week = emptyWeek()
        week.roles = [work, home]
        week.life = LifeWeekSnapshot(version: 1, capacityHours: 12, priorityRoleId: nil,
                                     priorityGoalHours: nil, priorityDay: nil)
        week.allocations = [DayAllocation(id: "slot", roleId: home.id, day: "2026-11-16", hours: 0.5)]
        week.tasks = [PlannerTask(id: "other", roleId: work.id, text: "Send email", done: false, allocationId: nil)]
        XCTAssertEqual(LifeFirstWeekStep.next(in: week), .task(home.id))
        XCTAssertEqual(LifeFirstWeekStep.next(in: week, preferredRoleID: work.id), .hours(work.id))
        week.roles.removeFirst()
        XCTAssertEqual(LifeFirstWeekStep.next(in: week, preferredRoleID: work.id), .task(home.id))
    }

    func testNewInstallWithDefaultLifeAreasCountsAsFirstRun() {
        var week = emptyWeek()
        week.roles = [home, work]
        XCTAssertTrue(week.isUntouchedFirstRun)
        week.life = LifeWeekSnapshot(version: 1, capacityHours: 12, priorityRoleId: nil,
                                     priorityGoalHours: nil, priorityDay: nil)
        XCTAssertFalse(week.isUntouchedFirstRun)
    }
}
