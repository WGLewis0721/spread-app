import XCTest
@testable import SpreadNativeV2

final class LifeCalendarRulesTests: XCTestCase {
    func testFixedMondayFirstLeapMonthIncludesNeighbouringDates() {
        let cells = LifeCalendarRules.month("2024-02-29")
        XCTAssertEqual(cells.count, 42)
        XCTAssertEqual(cells.first, "2024-01-29")
        XCTAssertEqual(cells.last, "2024-03-10")
        XCTAssertTrue(cells.contains("2024-02-29"))
        XCTAssertEqual(Set(cells).count, 42)
        XCTAssertEqual(LifeCalendarRules.week("2024-02-29"),
            ["2024-02-26", "2024-02-27", "2024-02-28", "2024-02-29", "2024-03-01", "2024-03-02", "2024-03-03"])
    }

    func testMonthClampingAndYearBoundaries() {
        XCTAssertEqual(LifeCalendarRules.shiftMonth("2024-01-31", by: 1), "2024-02-29")
        XCTAssertEqual(LifeCalendarRules.shiftMonth("2023-01-31", by: 1), "2023-02-28")
        XCTAssertEqual(LifeCalendarRules.shiftMonth("2026-12-31", by: 1), "2027-01-31")
        XCTAssertEqual(LifeCalendarRules.shiftMonth("2027-01-31", by: -1), "2026-12-31")
        XCTAssertEqual(LifeCalendarRules.shiftDay("2024-02-28", by: 1), "2024-02-29")
        XCTAssertEqual(LifeCalendarRules.shiftDay("2024-02-29", by: 1), "2024-03-01")
        XCTAssertEqual(LifeCalendarRules.shiftDay("2026-12-31", by: 1), "2027-01-01")
    }

    func testCrownOpensMondayButExplicitSelectedDayAndFirstVisitStayStable() {
        XCTAssertEqual(LifeCalendarRules.selection("2024-02-29", in: "2024-03-04", today: "2026-11-06"), "2024-03-04")
        XCTAssertEqual(LifeCalendarRules.selection("2024-02-29", in: "2024-02-26", today: "2026-11-06"), "2024-02-29")
        XCTAssertEqual(LifeCalendarRules.selection(nil, in: "2026-11-02", today: "2026-11-06"), "2026-11-06")
        XCTAssertEqual(LifeCalendarRules.selection(nil, in: "2024-02-26", today: "2026-11-06"), "2024-02-26")
        XCTAssertEqual(LifeCalendarRules.selection("2026-12-31", in: "2027-01-04", today: "2026-11-06"), "2027-01-04")
    }

    func testDailyCardsAndDetailsUseOnlyPositiveOwnDayAllocations() {
        let work = Responsibility(id: "work", name: "Work", category: "work", color: "#000000", hours: 8)
        let home = Responsibility(id: "home", name: "Home", category: "home", color: "#FFFFFF", hours: 2)
        let snapshot = PlannerSnapshot(weekKey: "2024-02-26", roles: [work, home], allocations: [
            DayAllocation(id: "a", roleId: "work", day: "2024-02-29", hours: 1),
            DayAllocation(id: "b", roleId: "home", day: "2024-02-29", hours: 0),
            DayAllocation(id: "c", roleId: "work", day: "2024-03-01", hours: 2)
        ], tasks: [
            PlannerTask(id: "placed", roleId: "work", text: "Placed", done: false, allocationId: "a"),
            PlannerTask(id: "other-day", roleId: "work", text: "Other", done: false, allocationId: "c"),
            PlannerTask(id: "unplaced", roleId: "work", text: "Unplaced", done: false, allocationId: nil),
            PlannerTask(id: "wrong-role", roleId: "home", text: "Wrong", done: false, allocationId: "a")
        ])
        XCTAssertEqual(LifeCalendarRules.dailyRoles(snapshot, day: "2024-02-29").map(\.id), ["work"])
        XCTAssertEqual(LifeCalendarRules.dailyTasks(snapshot, day: "2024-02-29", roleId: "work").map(\.id), ["placed"])
        XCTAssertTrue(LifeCalendarRules.dailyRoles(snapshot, day: "2024-03-02").isEmpty)
        XCTAssertTrue(LifeCalendarRules.dailyTasks(snapshot, day: "2024-03-02", roleId: "work").isEmpty)
        XCTAssertEqual(snapshot.unplacedTasks.map(\.id), ["unplaced"])
        XCTAssertEqual(snapshot.eligibleAllocations(for: snapshot.tasks[2]).map(\.id), ["a", "c"])
    }
    func testDailyTaskOrderKeepsPersistedOrderAndStableUnlistedTail() {
        var snapshot = SpreadV2Fixture.week
        snapshot.dayTaskOrder = ["2026-11-02|work": ["second", "t-1"]]
        snapshot.tasks += [
            PlannerTask(id: "second", roleId: "work", text: "Second", done: true, allocationId: "a-work"),
            PlannerTask(id: "tail", roleId: "work", text: "Tail", done: false, allocationId: "a-work")
        ]
        XCTAssertEqual(LifeCalendarRules.dailyTasks(snapshot, day: "2026-11-02", roleId: "work").map(\.id), ["second", "t-1", "tail"])
    }

}
