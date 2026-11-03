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

    func testSnapshotJSONRoundTripDoesNotMutateRecords() throws {
        let fixture = SpreadV2Fixture.week
        let encoded = try JSONEncoder().encode(fixture)
        XCTAssertEqual(try JSONDecoder().decode(PlannerSnapshot.self, from: encoded), fixture)
    }
}
