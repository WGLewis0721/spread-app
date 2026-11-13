import XCTest
@testable import SpreadNativeV2

/// Today's planned blocks: how hours become focus rounds, which block is offered, and when one counts as done.
/// Foundation only, so these run on the Linux test slice as well.
final class SpreadDayPlanTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 1_800_000_000)
    private var today: String { SpreadWidgetDates.dayISO(now) }

    private func isolated() -> UserDefaults {
        let name = "spread.dayplan.test.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: name)!
        defaults.removePersistentDomain(forName: name)
        return defaults
    }

    private func block(_ role: String, hours: Double, rounds: Int = 1) -> SpreadDayBlockEntry {
        SpreadDayBlockEntry(roleId: role, label: role.capitalized, hours: hours,
                            plan: SpreadFocusPlan(focusMinutes: 45, breakMinutes: 10, rounds: rounds))
    }

    private func record(profile: String = "profile-a", day: String? = nil, blocks: [SpreadDayBlockEntry]) -> SpreadDayPlanRecord {
        SpreadDayPlanRecord(profileId: profile, day: day ?? today, writtenAt: now, blocks: blocks)
    }

    // MARK: Hours into rounds

    func testCommonBlocksFitExactlyAndPreferNearFortyFiveMinuteStretches() {
        let cases: [(hours: Double, focus: Int, rounds: Int, rest: Int)] = [
            (1.0, 60, 1, 10),     // one hour: a single stretch, no break
            (1.25, 25, 3, 5),     // a classic pomodoro-length stretch fits
            (1.5, 45, 2, 10),
            (2.0, 40, 3, 10),
            (2.5, 50, 3, 10),
            (3.0, 45, 4, 10),     // three hours: four stretches of 45 with breaks between
            (4.0, 40, 6, 10),
            (8.0, 60, 8, 10),
        ]
        for c in cases {
            let plan = SpreadBlockFit.plan(hours: c.hours)
            XCTAssertEqual(plan?.focusMinutes, c.focus, "\(c.hours) h focus length")
            XCTAssertEqual(plan?.rounds, c.rounds, "\(c.hours) h rounds")
            XCTAssertEqual(plan?.breakMinutes, c.rest, "\(c.hours) h break")
            XCTAssertEqual(plan.map(SpreadBlockFit.focusMinutes(of:)), Int(c.hours * 60), "\(c.hours) h total")
        }
    }

    func testAnAwkwardTimeGetsTheNearestFitAndTheRealTotalIsReported() {
        // 3 h 10 min has no exact fit within 90-minute stretches. 3 x 65 minutes is 5 minutes over, which is
        // closer than 4 x 45 (10 minutes under). The start confirmation shows the real total, 3 h 15 min.
        let plan = SpreadBlockFit.plan(hours: 3 + 10.0 / 60)
        XCTAssertEqual(plan?.focusMinutes, 65)
        XCTAssertEqual(plan?.rounds, 3)
        XCTAssertEqual(plan.map(SpreadBlockFit.focusMinutes(of:)), 195)
    }

    func testEveryPlanStaysInsideTheValidBounds() {
        for quarter in 1...48 {
            let hours = Double(quarter) * 0.25
            if let plan = SpreadBlockFit.plan(hours: hours) {
                XCTAssertTrue(plan.isValid, "\(hours) h")
                XCTAssertLessThanOrEqual(plan.focusMinutes, 90)
            }
        }
    }

    func testTooLittleOrNonsenseHoursGiveNoBlock() {
        XCTAssertNil(SpreadBlockFit.plan(hours: 0))
        XCTAssertNil(SpreadBlockFit.plan(hours: -1))
        XCTAssertNil(SpreadBlockFit.plan(hours: .nan))
        XCTAssertNil(SpreadBlockFit.plan(hours: 0.2))
        XCTAssertEqual(SpreadBlockFit.plan(hours: 0.25)?.focusMinutes, 15)
    }

    // MARK: The planner's day, read only

    func testTheBuilderTotalsEachAreasHoursForTheDayAndLeavesOtherDaysOut() {
        let snapshot = PlannerSnapshot(
            weekKey: "2026-11-09",
            roles: [
                Responsibility(id: "gym", name: "Gym", category: "fitness", color: "#485B4E", hours: 3),
                Responsibility(id: "study", name: "Study", category: "school", color: "#665178", hours: 2),
                Responsibility(id: "idle", name: "Idle", category: "home", color: "#FF9500", hours: 0)
            ],
            allocations: [
                DayAllocation(id: "g1", roleId: "gym", day: "2026-11-18", hours: 1.5),
                DayAllocation(id: "g2", roleId: "gym", day: "2026-11-18", hours: 1.5),
                DayAllocation(id: "g-other", roleId: "gym", day: "2026-11-19", hours: 4),
                DayAllocation(id: "s1", roleId: "study", day: "2026-11-18", hours: 2),
                DayAllocation(id: "zero", roleId: "idle", day: "2026-11-18", hours: 0)
            ],
            tasks: [])
        let built = SpreadDayPlanBuilder.make(snapshot: snapshot, day: "2026-11-18", profileId: "p",
                                              showNames: true, writtenAt: now)
        XCTAssertEqual(built.blocks.map(\.roleId), ["gym", "study"])
        XCTAssertEqual(built.blocks.first?.hours, 3)
        XCTAssertEqual(built.blocks.first?.label, "Gym")
    }

    func testEqualBlocksKeepThePlannersOrderAndNamesCanBeKeptOff() {
        let snapshot = PlannerSnapshot(
            weekKey: "2026-11-09",
            roles: [
                Responsibility(id: "a", name: "Alpha", category: "work", color: "#111111", hours: 1),
                Responsibility(id: "b", name: "Beta", category: "work", color: "#222222", hours: 1)
            ],
            allocations: [
                DayAllocation(id: "a", roleId: "a", day: "2026-11-18", hours: 1),
                DayAllocation(id: "b", roleId: "b", day: "2026-11-18", hours: 1)
            ],
            tasks: [])
        let built = SpreadDayPlanBuilder.make(snapshot: snapshot, day: "2026-11-18", profileId: "p",
                                              showNames: false, writtenAt: now)
        XCTAssertEqual(built.blocks.map(\.roleId), ["a", "b"])
        XCTAssertEqual(built.blocks.map(\.label), ["Planned block", "Planned block"])
    }

    // MARK: Which block is offered

    func testTheLargestUnfinishedBlockIsOfferedAndFinishedOnesStepAside() {
        let defaults = isolated()
        SpreadFocusStore.setActiveProfile("profile-a", defaults)
        SpreadDayPlanStore.save(record(blocks: [block("gym", hours: 3), block("study", hours: 1)]), defaults)
        XCTAssertEqual(SpreadDayPlanStore.nextBlock(now: now, defaults)?.entry.roleId, "gym")

        SpreadDayPlanStore.markDone(roleId: "gym", day: today, defaults)
        XCTAssertEqual(SpreadDayPlanStore.nextBlock(now: now, defaults)?.entry.roleId, "study")
        XCTAssertFalse(SpreadDayPlanStore.allDoneToday(now: now, defaults))

        SpreadDayPlanStore.markDone(roleId: "study", day: today, defaults)
        XCTAssertNil(SpreadDayPlanStore.nextBlock(now: now, defaults))
        XCTAssertTrue(SpreadDayPlanStore.allDoneToday(now: now, defaults))
    }

    func testABlockIsOfferedOnlyForTodayAndOnlyToItsProfile() {
        let defaults = isolated()
        SpreadDayPlanStore.save(record(profile: "profile-a", blocks: [block("gym", hours: 2)]), defaults)
        SpreadFocusStore.setActiveProfile("profile-b", defaults)
        XCTAssertNil(SpreadDayPlanStore.nextBlock(now: now, defaults), "another profile's plan")
        SpreadFocusStore.setActiveProfile("profile-a", defaults)
        XCTAssertNotNil(SpreadDayPlanStore.nextBlock(now: now, defaults))
        XCTAssertNil(SpreadDayPlanStore.nextBlock(now: now.addingTimeInterval(86_400), defaults), "tomorrow")
    }

    func testDoneRecordsExpireWithTheDayTheyWereMadeOn() {
        let defaults = isolated()
        SpreadDayPlanStore.markDone(roleId: "gym", day: "2026-11-17", defaults)
        XCTAssertEqual(SpreadDayPlanStore.doneRoles(day: "2026-11-17", defaults), ["gym"])
        XCTAssertTrue(SpreadDayPlanStore.doneRoles(day: today, defaults).isEmpty)
    }

    // MARK: Sessions that belong to a block

    private func blockSession(rounds: Int) -> SpreadFocusSession {
        let plan = SpreadFocusPlan(focusMinutes: 45, breakMinutes: 10, rounds: rounds)
        return SpreadFocusMachine.stretch(id: "s", profileId: "profile-a", roleId: "gym", roleName: "Gym",
                                          plan: plan, kind: .focus, round: 1, now: now, blockDay: today)!
    }

    func testEveryRoundOfABlockKeepsTheBlockDay() {
        var session = blockSession(rounds: 2)
        var days = [session.blockDay]
        for _ in 0..<3 {
            guard let next = SpreadFocusMachine.followUp(after: SpreadFocusMachine.finished(session),
                                                         id: UUID().uuidString, now: now) else { break }
            days.append(next.blockDay)
            session = next
        }
        XCTAssertEqual(days, [today, today, today])
    }

    func testABlockIsDoneOnlyWhenItsFinalFocusRoundIsOver() {
        let defaults = isolated()
        let firstRound = blockSession(rounds: 2)
        SpreadDayPlanStore.recordCompletion(of: SpreadFocusMachine.finished(firstRound), defaults)
        XCTAssertTrue(SpreadDayPlanStore.doneRoles(day: today, defaults).isEmpty, "round 1 of 2 is not the end")

        let breakAfterRoundOne = SpreadFocusMachine.followUp(after: SpreadFocusMachine.finished(firstRound),
                                                             id: "r", now: now)!
        SpreadDayPlanStore.recordCompletion(of: SpreadFocusMachine.finished(breakAfterRoundOne), defaults)
        XCTAssertTrue(SpreadDayPlanStore.doneRoles(day: today, defaults).isEmpty, "a break is not a focus round")

        let finalRound = SpreadFocusMachine.followUp(after: SpreadFocusMachine.finished(breakAfterRoundOne),
                                                     id: "f", now: now)!
        SpreadDayPlanStore.recordCompletion(of: SpreadFocusMachine.finished(finalRound), defaults)
        XCTAssertEqual(SpreadDayPlanStore.doneRoles(day: today, defaults), ["gym"])
    }

    func testAHandStartedSessionNeverMarksABlockDone() {
        let defaults = isolated()
        let plain = SpreadFocusMachine.stretch(id: "p", profileId: "profile-a", roleId: "gym", roleName: "Gym",
                                               plan: SpreadFocusPlan.standard, kind: .focus, round: 1, now: now)!
        SpreadDayPlanStore.recordCompletion(of: SpreadFocusMachine.finished(plain), defaults)
        XCTAssertTrue(SpreadDayPlanStore.doneRoles(day: today, defaults).isEmpty)
    }

    func testAWidgetCanStartFromTodaysBlockWithNoLastPlanChosen() {
        let defaults = isolated()
        SpreadFocusStore.setActiveProfile("profile-a", defaults)
        XCTAssertFalse(SpreadFocusStore.canStartFromWidget(now: now, defaults))
        SpreadDayPlanStore.save(record(blocks: [block("gym", hours: 2)]), defaults)
        XCTAssertTrue(SpreadFocusStore.canStartFromWidget(now: now, defaults))
    }

    func testBlocksReadPlainlyOnEveryPlacement() {
        XCTAssertEqual(SpreadBlockText.hours(3), "3 h")
        XCTAssertEqual(SpreadBlockText.hours(1.5), "1.5 h")
        XCTAssertEqual(SpreadBlockText.summary(SpreadFocusPlan(focusMinutes: 45, breakMinutes: 10, rounds: 4)),
                       "4 rounds of 45 min, 10 min breaks, 3 h focus")
        XCTAssertEqual(SpreadBlockText.summary(SpreadFocusPlan(focusMinutes: 65, breakMinutes: 10, rounds: 3)),
                       "3 rounds of 65 min, 10 min breaks, 3 h 15 min focus")
        XCTAssertEqual(SpreadBlockText.summary(SpreadFocusPlan(focusMinutes: 60, breakMinutes: 5, rounds: 1)),
                       "One stretch of 60 min, no break")
    }
}
