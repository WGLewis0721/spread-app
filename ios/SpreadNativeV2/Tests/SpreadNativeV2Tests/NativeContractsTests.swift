import XCTest
@testable import SpreadNativeV2

final class NativeContractsTests: XCTestCase {
#if os(iOS)
    func testLifeEditPulseIsSeventyFivePercentStrongerThanPreviousTuning() {
        XCTAssertEqual(Double(LifeEditPulseTokens.emphasis), 1.75, accuracy: 0.00001)
        XCTAssertEqual(Double(LifeEditPulseTokens.peakStroke), 3.125 * 1.75, accuracy: 0.00001)
        XCTAssertEqual(Double(LifeEditPulseTokens.peakHaloRadius), 22.5 * 1.75, accuracy: 0.00001)
        XCTAssertEqual(LifeEditPulseTokens.peakHaloOpacity, 1.0, accuracy: 0.00001)
        XCTAssertEqual(LifeEditPulseTokens.restingHaloOpacity, 0.30 * 1.75, accuracy: 0.00001)
        XCTAssertGreaterThan(LifeEditPulseTokens.peakHaloRadius, 35)
        XCTAssertGreaterThan(LifeEditPulseTokens.peakStroke, 5)
    }

    func testLifeOrbitAngleWrapAndDetents() {
        XCTAssertEqual(LifeOrbitMath.orbitDegreesPerSecond, 22.5, accuracy: 0.001)
        XCTAssertEqual(LifeOrbitMath.orbitDegreesPerSecond * 16, 360, accuracy: 0.001)
        XCTAssertEqual(LifeOrbitMath.delta(from: 179, to: -179), 2, accuracy: 0.00001)
        XCTAssertEqual(LifeOrbitMath.delta(from: -179, to: 179), -2, accuracy: 0.00001)
        XCTAssertEqual(LifeOrbitMath.delta(from: 40, to: 40), 0, accuracy: 0.00001)
        XCTAssertEqual(LifeOrbitMath.capacityDelta(distance: 40, elapsed: 0.1), 1)
        XCTAssertEqual(LifeOrbitMath.capacityDelta(distance: -40, elapsed: 0.1), -1)
        XCTAssertEqual(LifeOrbitMath.capacityDelta(distance: 1, elapsed: 1), 0)
        XCTAssertEqual(LifeOrbitMath.limit(50, minimum: 55, maximum: 168), 55)
    }
#endif
    func testUnsubmittedTaskDraftPersistsAndIsIsolatedByProfileWeekAndRole() {
        let suite = "TaskDraftTests." + UUID().uuidString
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let key = TaskDraftMemory.key(profileId: "p", weekKey: "2026-11-02", roleId: "work")
        defaults.set("Unsubmitted work", forKey: key)
        XCTAssertEqual(UserDefaults(suiteName: suite)?.string(forKey: key), "Unsubmitted work")
        for other in [TaskDraftMemory.key(profileId: "other", weekKey: "2026-11-02", roleId: "work"),
                      TaskDraftMemory.key(profileId: "p", weekKey: "2026-11-09", roleId: "work"),
                      TaskDraftMemory.key(profileId: "p", weekKey: "2026-11-02", roleId: "home")] {
            XCTAssertNil(defaults.string(forKey: other))
        }
        XCTAssertNotEqual(TaskDraftMemory.key(profileId: "a.b", weekKey: "c", roleId: "d"),
                          TaskDraftMemory.key(profileId: "a", weekKey: "b.c", roleId: "d"))
        defaults.removeObject(forKey: key)
        XCTAssertNil(UserDefaults(suiteName: suite)?.string(forKey: key))
    }

    func testStudioMotionNegativeDelayAndAlternateCycles() {
        XCTAssertEqual(ChalkTiming.phase(0, duration: 4, delay: -1), 0.25)
        XCTAssertEqual(ChalkTiming.phase(4, duration: 4, alternate: true), 1)
        XCTAssertEqual(ChalkTiming.phase(6, duration: 4, alternate: true), 0.5)
        XCTAssertEqual(ChalkTiming.phase(8, duration: 4, alternate: true), 0)
        XCTAssertEqual(ChalkTiming.phase(2, duration: 4, delay: 3), 0)
    }

    func testStudioEasingAndHeartbeatRestInterval() {
        XCTAssertEqual(ChalkTiming.ease(0.5), 0.5, accuracy: 0.000001)
        XCTAssertEqual(ChalkTiming.ease(0.25), 0.1291619, accuracy: 0.000001)
        XCTAssertGreaterThan(ChalkTiming.ease(0.25, out: true), 0.25)
        let beat: [(Double, Double)] = [(0, 1), (0.12, 1.12), (0.22, 1.06), (0.32, 1), (1, 1)]
        XCTAssertEqual(ChalkTiming.sample(0.12, beat, out: true), 1.12, accuracy: 0.000001)
        XCTAssertEqual(ChalkTiming.sample(0.7, beat, out: true), 1)
        XCTAssertEqual(ChalkTiming.sample(1, beat, out: true), 1)
    }

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

    #if os(iOS)
    func testAllElevenChalkIllustrationsHaveDecodableAnimationResources() {
        let categories = ChalkArtwork.categories
        let layers = categories.flatMap { ChalkMotionTable.layers(for: $0) }
        XCTAssertEqual(categories.count, 11)
        XCTAssertEqual(layers.count, 40, "Keep all 40 original Studio motion cutouts")
        XCTAssertEqual(Set(layers.map(\.src)).count, 40)
        for category in categories {
            let motions = ChalkMotionTable.layers(for: category)
            XCTAssertFalse(motions.isEmpty, "\(category) must never fall back to a static drawing")
            for layer in motions {
                XCTAssertGreaterThan(layer.dur, 0)
                XCTAssertNotNil(ChalkMotionImage.load(layer.src), "Missing or undecodable \(layer.src).webp")
            }
        }
    }
    #endif

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

    func testCompactWeeklySummaryStartsWithEightHoursToPlan() {
        let roles = [
            Responsibility(id: "a", name: "Home", category: "home", color: "#FF9500", hours: 2),
            Responsibility(id: "b", name: "Work", category: "work", color: "#FF9500", hours: 2),
            Responsibility(id: "c", name: "Health", category: "health", color: "#BB50D8", hours: 2),
            Responsibility(id: "d", name: "Family", category: "family", color: "#34C759", hours: 2)
        ]
        let snapshot = PlannerSnapshot(weekKey: "2026-11-09", roles: roles, allocations: [], tasks: [])
        let status = WeeklyHourStatus(snapshot: snapshot)
        XCTAssertEqual(status.spreadCount, 4)
        XCTAssertEqual(status.total, 8)
        XCTAssertEqual(status.scheduled, 0)
        XCTAssertEqual(status.remaining, 8)
        XCTAssertEqual(status.overbooked, 0)
        XCTAssertEqual(status.headlineHours, 8)
        XCTAssertEqual(status.headlineLabel, "to plan")
    }

    func testCompactSummaryUsesTheLivePlacedHoursAndAllScheduledState() {
        let role = Responsibility(id: "home", name: "Home", category: "home", color: "#FF9500", hours: 8)
        let snapshot = PlannerSnapshot(weekKey: "2026-11-09", roles: [role],
            allocations: [DayAllocation(id: "day", roleId: "home", day: "2026-11-09", hours: 8)], tasks: [])
        let status = WeeklyHourStatus(snapshot: snapshot)
        XCTAssertEqual(status.scheduled, 8)
        XCTAssertEqual(status.remaining, 0)
        XCTAssertEqual(status.overbooked, 0)
        XCTAssertEqual(status.headlineHours, 8)
        XCTAssertEqual(status.headlineLabel, "planned")
    }

    func testCompactSummaryReportsOverbookingWithoutHidingUnplacedHours() {
        let roles = [
            Responsibility(id: "a", name: "Overbooked", category: "work", color: "#FF9500", hours: 2),
            Responsibility(id: "b", name: "Still to plan", category: "home", color: "#34C759", hours: 3)
        ]
        let snapshot = PlannerSnapshot(weekKey: "2026-11-09", roles: roles,
            allocations: [DayAllocation(id: "over", roleId: "a", day: "2026-11-09", hours: 4)], tasks: [])
        let status = WeeklyHourStatus(snapshot: snapshot)
        XCTAssertEqual(status.total, 5)
        XCTAssertEqual(status.scheduled, 4)
        XCTAssertEqual(status.remaining, 3)
        XCTAssertEqual(status.overbooked, 2)
        XCTAssertEqual(status.headlineHours, 3)
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

    func testDenseWalletHourStripReservesScrollableFortyFourPointTargets() throws {
        // On a narrow iPhone the visible hour strip is ~326pt wide. The SwiftUI
        // summary now allocates a scrollable content width instead of forcing ten
        // buttons into 32pt regions. This is the content sizing contract.
        let hours = Array(repeating: 2.0, count: 10)
        let visible = 326.0
        let contentWidth = max(visible, Double(hours.count) * 44 + Double(hours.count - 1) * 4)
        let widths = HourStrip.widths(hours: hours, available: contentWidth, spacing: 4, minimum: 44)
        XCTAssertEqual(contentWidth, 476, accuracy: 0.001)
        XCTAssertEqual(widths.count, 10)
        XCTAssertTrue(widths.allSatisfy { $0 >= 44 - 0.001 })
        XCTAssertEqual(widths.reduce(0, +) + Double(hours.count - 1) * 4, contentWidth, accuracy: 0.001)
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

private struct FreeTimeVector: Decodable {
    struct Expected: Decodable, Equatable {
        let roleId: String
        let day: String
        let hours: Double
    }
    let snapshot: PlannerSnapshot
    let today: String
    let expected: [Expected]
}

extension NativeContractsTests {
    func testFreeTimeMatchesSixtyTypeScriptVectors() throws {
        let url = try XCTUnwrap(Bundle.module.url(forResource: "free-time-v1", withExtension: "json", subdirectory: "Fixtures"))
        let vectors = try JSONDecoder().decode([FreeTimeVector].self, from: Data(contentsOf: url))
        XCTAssertEqual(vectors.count, 60)
        for (index, vector) in vectors.enumerated() {
            let actual = FreeTimeMirror.suggestions(for: vector.snapshot, today: vector.today)
                .map { FreeTimeVector.Expected(roleId: $0.roleId, day: $0.day, hours: $0.hours) }
            XCTAssertEqual(actual, vector.expected, "free-time vector \(index)")
        }
    }
    func testDayColumnsFollowAvailableSpaceAtEverySizeAndAccessibilityText() {
        for width in [320.0, 358, 640, 700, 743] {
            XCTAssertEqual(PlannerLayout.dayColumns(availableWidth: width, accessibilityText: false), 1)
        }
        for width in [744.0, 788, 992, 1334] {
            XCTAssertEqual(PlannerLayout.dayColumns(availableWidth: width, accessibilityText: false), 2)
        }
        for width in [358.0, 788, 992, 1334] {
            XCTAssertEqual(PlannerLayout.dayColumns(availableWidth: width, accessibilityText: true), 1)
        }
    }
}

extension NativeContractsTests {
    private func point(_ x: Double, _ y: Double) -> CGPoint { CGPoint(x: x, y: y) }

    func testWeekSwipeCommitsOnlyPastTheThresholdAndOnlyWhenHorizontal() {
        let width: CGFloat = 400
        XCTAssertEqual(WeekSwipeRules.direction(start: point(200, 300), end: point(80, 300), width: width), 1, "dragging left is the next week")
        XCTAssertEqual(WeekSwipeRules.direction(start: point(200, 300), end: point(320, 300), width: width), -1, "dragging right is the previous week")
        XCTAssertNil(WeekSwipeRules.direction(start: point(200, 300), end: point(136, 300), width: width), "exactly 64 points is not past the threshold")
        XCTAssertEqual(WeekSwipeRules.direction(start: point(200, 300), end: point(135, 300), width: width), 1)
        XCTAssertNil(WeekSwipeRules.direction(start: point(200, 300), end: point(80, 420), width: width), "a mostly diagonal drag never changes the week")
        XCTAssertNil(WeekSwipeRules.direction(start: point(10, 300), end: point(130, 300), width: width), "a swipe never starts in the left edge guard")
        XCTAssertNil(WeekSwipeRules.direction(start: point(390, 300), end: point(270, 300), width: width), "a swipe never starts in the right edge guard")
        XCTAssertEqual(WeekSwipeRules.direction(start: point(10, 300), end: point(130, 300), width: 0), -1, "an unknown width applies no edge guard")
    }

    func testWeekSwipeBeginsFromTravelEvenWhenVelocityReadsZero() {
        let width: CGFloat = 400
        // The recognizer can be asked to begin before it has a velocity. Travel decides.
        XCTAssertTrue(WeekSwipeRules.shouldBegin(start: point(200, 300), translation: point(12, 1), velocity: .zero, width: width))
        XCTAssertTrue(WeekSwipeRules.shouldBegin(start: point(200, 300), translation: point(-12, 2), velocity: .zero, width: width))
        // Vertical scrolling is never taken over.
        XCTAssertFalse(WeekSwipeRules.shouldBegin(start: point(200, 300), translation: point(2, 12), velocity: .zero, width: width))
        XCTAssertFalse(WeekSwipeRules.shouldBegin(start: point(200, 300), translation: point(10, 10), velocity: point(500, 0), width: width),
                       "travel outranks velocity once any travel is reported")
        // The dominance ratio is 1.5 to 1: exactly 1.5 does not begin, just over does.
        XCTAssertFalse(WeekSwipeRules.shouldBegin(start: point(200, 300), translation: point(15, 10), velocity: .zero, width: width))
        XCTAssertTrue(WeekSwipeRules.shouldBegin(start: point(200, 300), translation: point(16, 10), velocity: .zero, width: width))
        // With no travel reported yet, velocity is the fallback, and zero velocity never begins.
        XCTAssertTrue(WeekSwipeRules.shouldBegin(start: point(200, 300), translation: .zero, velocity: point(400, 10), width: width))
        XCTAssertFalse(WeekSwipeRules.shouldBegin(start: point(200, 300), translation: .zero, velocity: .zero, width: width))
        // The edge guard still applies, and an unusable width refuses.
        XCTAssertFalse(WeekSwipeRules.shouldBegin(start: point(10, 300), translation: point(30, 0), velocity: .zero, width: width))
        XCTAssertFalse(WeekSwipeRules.shouldBegin(start: point(395, 300), translation: point(-30, 0), velocity: .zero, width: width))
        XCTAssertFalse(WeekSwipeRules.shouldBegin(start: point(200, 300), translation: point(30, 0), velocity: .zero, width: 0))
    }

    func testWeekSwipeShiftFollowsTheFingerAndIsCapped() {
        XCTAssertEqual(WeekSwipeRules.shift(start: point(200, 300), current: point(204, 300)), 0, "under 8 points does not move the week")
        XCTAssertEqual(WeekSwipeRules.shift(start: point(200, 300), current: point(230, 300)), 30)
        XCTAssertEqual(WeekSwipeRules.shift(start: point(200, 300), current: point(120, 300)), -72, "capped at 72 points")
        XCTAssertEqual(WeekSwipeRules.shift(start: point(200, 300), current: point(230, 380)), 0, "a vertical drag never shifts the week")
    }
}
