import XCTest
@testable import SpreadNativeV2

final class PlanAheadPresetTests: XCTestCase {
    private func makeSnapshot() -> PlannerSnapshot {
        PlannerSnapshot(
            weekKey: "2026-11-09",
            roles: [
                Responsibility(id: "fitness", name: "Fitness", category: "fitness", color: "#485B4E", hours: 6),
                Responsibility(id: "school", name: "School", category: "school", color: "#665178", hours: 3),
                Responsibility(id: "home", name: "Home", category: "home", color: "#FF9500", hours: 0)
            ],
            allocations: [
                DayAllocation(id: "f-tue", roleId: "fitness", day: "2026-11-10", hours: 2),
                DayAllocation(id: "f-thu", roleId: "fitness", day: "2026-11-12", hours: 1.5),
                DayAllocation(id: "f-thu-b", roleId: "fitness", day: "2026-11-12", hours: 0.5),
                DayAllocation(id: "f-sat", roleId: "fitness", day: "2026-11-14", hours: 2),
                // Another week must never leak into this week's suggestion.
                DayAllocation(id: "next-week", roleId: "fitness", day: "2026-11-17", hours: 3)
            ],
            tasks: []
        )
    }

    func testAreaWithPlacedDaysSuggestsThoseDaysAndTheirSum() {
        let all = PlanAheadPreset.suggestions(for: makeSnapshot(), excluding: [])
        let fitness = all.first { $0.roleId == "fitness" }
        XCTAssertEqual(fitness?.days.map(\.weekday), ["tue", "thu", "sat"])
        XCTAssertEqual(fitness?.days.map(\.hours), [2, 2, 2])
        XCTAssertEqual(fitness?.weeklyHours, 6)
        // The week after the one on screen, never the current week.
        XCTAssertEqual(fitness?.startWeek, "2026-11-16")
    }

    func testAreaWithoutPlacedDaysSuggestsItsWeeklyBudget() {
        let all = PlanAheadPreset.suggestions(for: makeSnapshot(), excluding: [])
        let school = all.first { $0.roleId == "school" }
        XCTAssertEqual(school?.days.isEmpty, true)
        XCTAssertEqual(school?.weeklyHours, 3)
    }

    func testAreaWithNoHoursIsNotSuggested() {
        let all = PlanAheadPreset.suggestions(for: makeSnapshot(), excluding: [])
        XCTAssertFalse(all.contains { $0.roleId == "home" })
    }

    func testAreaAlreadyCoveredByAScheduleIsNotSuggested() {
        let all = PlanAheadPreset.suggestions(for: makeSnapshot(), excluding: ["fitness"])
        XCTAssertEqual(all.map(\.roleId), ["school"])
    }

    func testBiggestWeeklyTotalComesFirstAndTheListIsCapped() {
        let all = PlanAheadPreset.suggestions(for: makeSnapshot(), excluding: [])
        XCTAssertEqual(all.map(\.roleId), ["fitness", "school"])
        XCTAssertEqual(PlanAheadPreset.suggestions(for: makeSnapshot(), excluding: [], limit: 1).map(\.roleId),
                       ["fitness"])
    }

    func testSuggestedDaysMatchWhatTheFormStartsFrom() {
        let snapshot = makeSnapshot()
        let days = PlanAheadPreset.days(for: "fitness", in: snapshot)
        let fromSuggestion = PlanAheadPreset.suggestions(for: snapshot, excluding: [])
            .first { $0.roleId == "fitness" }?.days
        XCTAssertEqual(days, fromSuggestion)
    }

    func testTinyAndOversizedAmountsAreSnappedToHalfHoursAndLimits() {
        var snapshot = makeSnapshot()
        snapshot.allocations = [
            DayAllocation(id: "tiny", roleId: "fitness", day: "2026-11-09", hours: 0.2),
            DayAllocation(id: "odd", roleId: "fitness", day: "2026-11-10", hours: 1.3),
            DayAllocation(id: "huge", roleId: "fitness", day: "2026-11-11", hours: 30)
        ]
        let days = PlanAheadPreset.days(for: "fitness", in: snapshot)
        XCTAssertEqual(days.map(\.weekday), ["tue", "wed"])
        XCTAssertEqual(days.map(\.hours), [1.5, 24])
    }
}
