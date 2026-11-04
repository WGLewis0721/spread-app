import XCTest
@testable import SpreadNativeV2

final class NativeContractsTests: XCTestCase {
    func testCrownSubDetentNeverChangesWeek() {
        var crown = CrownTravel()
        XCTAssertEqual(crown.update(translation: 63.9), 0)
        XCTAssertEqual(crown.update(translation: -63.9), 0)
        XCTAssertEqual(crown.crossed, 0)
    }

    func testCrownCrossingsAndReversalsAreExact() {
        var crown = CrownTravel()
        XCTAssertEqual(crown.update(translation: 64), 1)
        XCTAssertEqual(crown.update(translation: 128), 1)
        XCTAssertEqual(crown.update(translation: 68), -1)
        XCTAssertEqual(crown.update(translation: -65), -2)
        XCTAssertEqual(crown.update(translation: 0), 1)
        XCTAssertEqual(crown.crossed, 0)
    }

    func testCrownCapsLargeGesturesAndResetsOnRelease() {
        var crown = CrownTravel()
        XCTAssertEqual(crown.update(translation: 9999), 3)
        XCTAssertEqual(crown.update(translation: 9998), 0)
        XCTAssertEqual(crown.update(translation: -.infinity), 0)
        XCTAssertEqual(crown.update(translation: -9999), -6)
        crown.release()
        XCTAssertEqual(crown.update(translation: 64), 1)
    }

    func testDialSegmentsUseHoursWithoutChangingData() {
        let source = SpreadV2Fixture.week
        let arcs = DialGeometry.arcs(for: source.roles)
        XCTAssertEqual(arcs.count, source.roles.count)
        XCTAssertEqual(arcs.map(\.id), source.roles.map(\.id))
        XCTAssertEqual(arcs.reduce(0) { $0 + $1.span }, 360 - Double(source.roles.count) * 3, accuracy: 0.0001)
        XCTAssertEqual(source.roles.first?.hours, 8)
    }

    func testDialKeepsZeroHourRoleReachable() {
        let roles = [
            Responsibility(id: "a", name: "A", category: "work", color: "#FFFFFF", hours: 10),
            Responsibility(id: "b", name: "B", category: "home", color: "#FFFFFF", hours: 0)
        ]
        let arcs = DialGeometry.arcs(for: roles)
        XCTAssertGreaterThan(arcs[1].span, 0)
        XCTAssertEqual(DialGeometry.roleId(at: (arcs[1].from + arcs[1].to) / 2, arcs: arcs), "b")
    }

    func testEmptyDialIsSafe() {
        XCTAssertEqual(DialGeometry.arcs(for: []), [])
        XCTAssertNil(DialGeometry.roleId(at: 42, arcs: []))
    }

    func testFiveModesAreOnePresentationEnum() {
        XCTAssertEqual(Set(SpreadLayout.allCases.map(\.rawValue)),
                       Set(["stack", "fan", "dial", "tabs", "day"]))
    }

    func testOriginalElevenChalkMappingsAndFallback() {
        XCTAssertEqual(ChalkArtwork.categories.count, 11)
        XCTAssertEqual(Set(ChalkArtwork.categories).count, 11)
        XCTAssertEqual(ChalkArtwork.category(for: "work"), "work")
        XCTAssertEqual(ChalkArtwork.category(for: "unknown"), "custom")
    }

    func testAllOriginalChalkAssetsAreBundledOffline() {
        for category in ChalkArtwork.categories {
            guard let url = ChalkArtwork.resourceURL(for: category) else {
                XCTFail("Missing Chalk resource for \(category)")
                continue
            }
            XCTAssertEqual(url.pathExtension.lowercased(), "webp")
        }
    }

    func testTaskCanOnlyTargetItsOwnResponsibilityAllocation() {
        let source = SpreadV2Fixture.week
        let task = source.tasks.first(where: { $0.id == "t-2" })!
        XCTAssertEqual(source.eligibleAllocations(for: task).map(\.id), ["a-work"])
        XCTAssertEqual(source.unplacedTasks.map(\.id), ["t-2"])
    }

    func testHourMathIsProjectedNotPersisted() {
        let source = SpreadV2Fixture.week
        XCTAssertEqual(source.placedHours(for: "work"), 2)
        XCTAssertEqual(source.remainingHours(for: "work"), 6)
        XCTAssertEqual(source.remainingHours(for: "health"), 2)
        XCTAssertEqual(source.remainingHours(for: "unknown"), 0)
    }

    func testReadOnlyProjectionJSONHasExactTypeScriptWireShape() throws {
        let url = try XCTUnwrap(Bundle.module.url(forResource: "projection-v1",
                                                    withExtension: "json", subdirectory: "Fixtures"))
        let envelope = try JSONDecoder().decode(NativeV2Envelope.self, from: Data(contentsOf: url))
        XCTAssertTrue(envelope.isSupported)
        XCTAssertEqual(envelope.profileId, "profile-1")
        XCTAssertEqual(envelope.snapshot.weekKey, "2026-11-02")
        XCTAssertEqual(envelope.snapshot.roles.first?.hours, 7.5)
        XCTAssertEqual(envelope.snapshot.allocations.first?.order, 1)
        XCTAssertEqual(envelope.snapshot.unplacedTasks.map(\.id), ["task-stale"])
        XCTAssertEqual(envelope.snapshot.eligibleAllocations(for: envelope.snapshot.tasks[0]).map(\.id), ["alloc-work"])
        XCTAssertEqual(envelope.snapshot.remainingHours(for: "work"), 5)
        XCTAssertEqual(try JSONDecoder().decode(NativeV2Envelope.self,
                    from: JSONEncoder().encode(envelope)), envelope)
    }

    func testLegacyOverbookedWeekMatchesJavaScriptHourArithmetic() {
        let snapshot = PlannerSnapshot(weekKey: "2026-11-02",
            roles: [Responsibility(id: "x", name: "X", category: "work", color: "#FFFFFF", hours: 2)],
            allocations: [DayAllocation(id: "a", roleId: "x", day: "2026-11-02", hours: 2.5)], tasks: [])
        XCTAssertEqual(snapshot.remainingHours(for: "x"), -0.5)
    }

    func testSnapshotJSONRoundTripDoesNotMutateRecords() throws {
        let fixture = SpreadV2Fixture.week
        let encoded = try JSONEncoder().encode(fixture)
        XCTAssertEqual(try JSONDecoder().decode(PlannerSnapshot.self, from: encoded), fixture)
    }
}

private struct ParityVector: Decodable {
    let envelope: NativeV2Envelope
    let remaining: Double
    let eligible: [String]
}

extension NativeContractsTests {
    func testSixtySharedPlannerVectors() throws {
        let url = try XCTUnwrap(Bundle.module.url(forResource: "parity-v1", withExtension: "json", subdirectory: "Fixtures"))
        let vectors = try JSONDecoder().decode([ParityVector].self, from: Data(contentsOf: url))
        XCTAssertEqual(vectors.count, 60)
        for vector in vectors {
            let snapshot = vector.envelope.snapshot
            XCTAssertTrue(vector.envelope.isSupported)
            XCTAssertEqual(snapshot.remainingHours(for: "r"), vector.remaining)
            XCTAssertEqual(snapshot.eligibleAllocations(for: try XCTUnwrap(snapshot.tasks.first)).map(\.id), vector.eligible)
        }
    }
}

extension NativeContractsTests {
    func testHundredCrownGesturesAndThirtyReversals() {
        var crown = CrownTravel()
        var week = 0
        for index in 0..<100 {
            week += crown.update(translation: 63)
            XCTAssertEqual(week, index)
            week += crown.update(translation: 64)
            XCTAssertEqual(week, index + 1)
            if index < 30 {
                week += crown.update(translation: 0)
                XCTAssertEqual(week, index)
                week += crown.update(translation: 64)
                XCTAssertEqual(week, index + 1)
            }
            crown.release()
        }
        XCTAssertEqual(week, 100)
    }
}

extension NativeContractsTests {
    func testMonthGridUsesUniqueCellsAndKeepsTheFirstSixDates() {
        let cells = PlannerDates.monthCells(weekKey: "2026-11-02")
        XCTAssertEqual(Set(cells.map(\.id)).count, cells.count)
        XCTAssertEqual(cells.compactMap(\.day), Array(1...30))
        XCTAssertEqual(cells[6].day, 1)
    }
    func testCalendarWeekMappingAtYearBoundaryAndLeapMonth() {
        XCTAssertEqual(PlannerDates.weekKey(for: PlannerDates.date("2027-01-01")), "2026-12-28")
        XCTAssertEqual(PlannerDates.weekKey(for: PlannerDates.date("2027-01-04")), "2027-01-04")
        XCTAssertEqual(PlannerDates.monthCells(weekKey: "2028-02-07").compactMap(\.day).count, 29)
    }
}

extension NativeContractsTests {
    // MARK: Hour strip (Spread summary)

    func testHourStripIsProportionalWhenEverySegmentIsWideEnough() throws {
        let widths = HourStrip.widths(hours: [10, 20, 10], available: 358, spacing: 4, minimum: 44)
        XCTAssertEqual(widths.reduce(0, +), 350, accuracy: 0.001)
        XCTAssertEqual(widths[1], widths[0] * 2, accuracy: 0.001)
        XCTAssertEqual(widths[0], widths[2], accuracy: 0.001)
    }

    func testHourStripKeepsEverySegmentAtTheTouchMinimumAndFillsTheRow() throws {
        let widths = HourStrip.widths(hours: [30, 0.5, 1, 0.5], available: 358, spacing: 4, minimum: 44)
        XCTAssertEqual(widths.count, 4)
        XCTAssertEqual(widths.reduce(0, +), 358 - 12, accuracy: 0.001)
        for width in widths { XCTAssertGreaterThanOrEqual(width, 44 - 0.001) }
        XCTAssertGreaterThan(widths[0], widths[2])
    }

    func testHourStripFallsBackToEqualWidthsWhenNoSplitCanReachTheMinimum() throws {
        let widths = HourStrip.widths(hours: Array(repeating: 2, count: 10), available: 358, spacing: 4, minimum: 44)
        XCTAssertEqual(widths.count, 10)
        XCTAssertEqual(widths.reduce(0, +), 358 - 36, accuracy: 0.001)
        XCTAssertEqual(Set(widths.map { ($0 * 1000).rounded() }).count, 1)
    }

    func testHourStripHandlesEmptyZeroAndBrokenInput() throws {
        XCTAssertEqual(HourStrip.widths(hours: [], available: 300, spacing: 4, minimum: 44), [])
        let zeros = HourStrip.widths(hours: [0, 0, 0], available: 300, spacing: 0, minimum: 44)
        XCTAssertEqual(zeros.reduce(0, +), 300, accuracy: 0.001)
        let bad = HourStrip.widths(hours: [.nan, 4, .infinity], available: 300, spacing: 0, minimum: 44)
        XCTAssertEqual(bad.reduce(0, +), 300, accuracy: 0.001)
        XCTAssertTrue(bad.allSatisfy { $0.isFinite && $0 >= 0 })
        XCTAssertEqual(HourStrip.widths(hours: [3], available: 0, spacing: 0, minimum: 44), [0])
    }

    // MARK: Crown lifecycle

    /// Why the on-screen Crown must call `release()` when a drag is cancelled, not only when it ends: a reducer
    /// that still holds detents answers the next drag's first update (translation 0) with the opposite week.
    func testCrownThatIsNotReleasedAfterACancelEmitsAPhantomOppositeWeek() throws {
        var crown = CrownTravel()
        XCTAssertEqual(crown.update(translation: 130), 2)
        XCTAssertEqual(crown.update(translation: 0), -2, "an unreleased reducer undoes weeks on the next drag")
        var released = CrownTravel()
        XCTAssertEqual(released.update(translation: 130), 2)
        released.release()
        XCTAssertEqual(released.update(translation: 0), 0, "after release the next drag starts clean")
    }
}

extension NativeContractsTests {
    func testNativeDayMarkDecodesThePlannersMonthAnswerAndCountsFoldedRoles() throws {
        let json = ##"{"2026-11-02":{"colors":["#FF9500","#007AFF","#34C759"],"extra":2},"2026-11-03":{"colors":[],"extra":0}}"##
        let marks = try JSONDecoder().decode([String: NativeDayMark].self, from: Data(json.utf8))
        XCTAssertEqual(marks["2026-11-02"]?.colors.count, 3)
        XCTAssertEqual(marks["2026-11-02"]?.count, 5, "three dots plus two folded into +2")
        XCTAssertEqual(marks["2026-11-03"]?.count, 0)
        XCTAssertEqual(marks["2026-11-02"], NativeDayMark(colors: ["#FF9500", "#007AFF", "#34C759"], extra: 2))
    }
}
