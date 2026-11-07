import XCTest
@testable import SpreadNativeV2
#if os(iOS)
import SwiftUI
#endif

/// Mathematical contracts for touch interactions. Device feel and haptics require an iPhone.
final class TactilePrecisionTests: XCTestCase {
#if os(iOS)
    /// 25% more perceptible animations without altered thresholds or touch latency.
    func testTactileEmphasisCalibration() {
        XCTAssertEqual(SpreadTactile.emphasis, 1.25, accuracy: 0.00001)
        XCTAssertEqual(SpreadTactile.contactDuration, 0.125, accuracy: 0.00001)
        XCTAssertEqual(SpreadTactile.snapResponse, 0.275, accuracy: 0.00001)
        XCTAssertEqual(SpreadTactile.settleResponse, 0.400, accuracy: 0.00001)
        XCTAssertEqual(SpreadTactile.glideResponse, 0.350, accuracy: 0.00001)
        XCTAssertEqual(SpreadTactile.enterDuration, 0.275, accuracy: 0.00001)
        XCTAssertEqual(SpreadTactile.exitDuration, 0.225, accuracy: 0.00001)
        XCTAssertEqual(SpreadTactile.pressScale, 0.9625, accuracy: 0.00001)
        XCTAssertEqual(SpreadTactile.pressOpacity, 0.850, accuracy: 0.00001)
        XCTAssertEqual(Double(SpreadTactile.entranceDistance), 12.5, accuracy: 0.00001)
        XCTAssertEqual(Double(SpreadTactile.detailDistance), 10.0, accuracy: 0.00001)
        XCTAssertEqual(SpreadTactile.staggerStep, 0.0375, accuracy: 0.00001)
        XCTAssertEqual(SpreadTactile.staggerCap, 0.2625, accuracy: 0.00001)
    }

    @MainActor func testAcknowledgementWithSaveFailureDoesNotReportSuccess() async throws {
        let snapshot = SpreadV2Fixture.week
        let envelope = NativeV2Envelope(profileId: "p", snapshot: snapshot)
        let encoded = try JSONEncoder().encode(envelope)
        let envelopeJSON = try JSONSerialization.jsonObject(with: encoded)
        let state: [String: Any] = ["sessionId": "s", "revision": 1, "envelope": envelopeJSON]
        let planner = LivePlanner { request in
            if request == "null" {
                let bytes = try JSONSerialization.data(withJSONObject: ["ok": true, "state": state])
                return String(decoding: bytes, as: UTF8.self)
            }
            let input = try JSONSerialization.jsonObject(with: Data(request.utf8)) as! [String: Any]
            let bytes = try JSONSerialization.data(withJSONObject: ["ok": true, "state": state,
                "requestId": input["requestId"]!, "saveError": "save-failed"])
            return String(decoding: bytes, as: UTF8.self)
        }
        await planner.refresh()
        let accepted = await planner.send(["type": "setHours", "roleId": "work", "hours": 9], completionHaptic: true)
        XCTAssertFalse(accepted, "A failed durable save must never confirm success to a tactile caller")
        XCTAssertNotNil(planner.saveFailure)
        XCTAssertNotNil(planner.error)
    }
#endif
    func testMagneticRevealSnapsToDetents() {
        XCTAssertEqual(TactilePrecisionMath.revealTarget(current: 0, translation: 43, projected: 43), 92)
        XCTAssertEqual(TactilePrecisionMath.revealTarget(current: 0, translation: -43, projected: -43), -92)
        XCTAssertEqual(TactilePrecisionMath.revealTarget(current: 0, translation: 12, projected: 16), 0)
        XCTAssertEqual(TactilePrecisionMath.revealTarget(current: 0, translation: 24, projected: 80), 92)
        XCTAssertEqual(TactilePrecisionMath.revealTarget(current: 0, translation: -24, projected: -80), -92)
    }

    func testRevealedCardCanReturnToCenter() {
        XCTAssertEqual(TactilePrecisionMath.revealTarget(current: 92, translation: -80, projected: -80), 0)
        XCTAssertEqual(TactilePrecisionMath.revealTarget(current: -92, translation: 80, projected: 80), 0)
        XCTAssertEqual(TactilePrecisionMath.revealTarget(current: 92, translation: -10, projected: -10), 92)
    }

    func testSwipeAxisAndDirection() {
        XCTAssertEqual(TactilePrecisionMath.daySwipeDirection(horizontal: -120, vertical: 12), 1)
        XCTAssertEqual(TactilePrecisionMath.daySwipeDirection(horizontal: 120, vertical: 12), -1)
        XCTAssertEqual(TactilePrecisionMath.daySwipeDirection(horizontal: 50, vertical: 2), 0)
        XCTAssertEqual(TactilePrecisionMath.daySwipeDirection(horizontal: 90, vertical: 90), 0)
        XCTAssertEqual(TactilePrecisionMath.daySwipeDirection(horizontal: 0, vertical: -150), 0)
    }

    func testNonfiniteGestureValuesAreIgnored() {
        XCTAssertEqual(TactilePrecisionMath.revealTarget(current: 0, translation: .infinity, projected: 90), 0)
        XCTAssertEqual(TactilePrecisionMath.daySwipeDirection(horizontal: .nan, vertical: 0), 0)
    }

    func testVelocityCannotInventOppositeRevealOrHijackVerticalScroll() {
        XCTAssertEqual(TactilePrecisionMath.revealTarget(current: 0, translation: 20, projected: -140), 0)
        XCTAssertEqual(TactilePrecisionMath.revealTarget(current: 0, translation: 0, projected: 200), 0)
        XCTAssertEqual(TactilePrecisionMath.daySwipeDirection(horizontal: -24, vertical: 3, projected: -160), 1)
        XCTAssertEqual(TactilePrecisionMath.daySwipeDirection(horizontal: -24, vertical: 3, projected: 160), 0)
        XCTAssertEqual(TactilePrecisionMath.daySwipeDirection(horizontal: -24, vertical: 90, projected: -160), 0)
    }

    func testLifeRightSwipeRequiresDeliberateOffscreenIntent() {
        XCTAssertFalse(TactilePrecisionMath.cardShouldDismissRight(
            traveled: 0, projected: 900, exitDistance: 480))
        XCTAssertFalse(TactilePrecisionMath.cardShouldDismissRight(
            traveled: 90, projected: 450, exitDistance: 480))
        XCTAssertFalse(TactilePrecisionMath.cardShouldDismissRight(
            traveled: -270, projected: -900, exitDistance: 480))
        XCTAssertFalse(TactilePrecisionMath.cardShouldDismissRight(
            traveled: 110, projected: 400, exitDistance: 480))
        XCTAssertTrue(TactilePrecisionMath.cardShouldDismissRight(
            traveled: 265, projected: 265, exitDistance: 480))
        XCTAssertTrue(TactilePrecisionMath.cardShouldDismissRight(
            traveled: 120, projected: 470, exitDistance: 480))
        XCTAssertFalse(TactilePrecisionMath.cardShouldDismissRight(
            traveled: .nan, projected: 900, exitDistance: 480))
        XCTAssertFalse(TactilePrecisionMath.cardShouldDismissRight(
            traveled: 400, projected: 900, exitDistance: 0))
    }

#if os(iOS)
    func testEmphasizedWalletTrayAndCardExitDurations() {
        XCTAssertEqual(SpreadTactile.showTravel, 1.75, accuracy: 0.00001)
        XCTAssertEqual(SpreadTactile.walletFocusDuration, 0.735, accuracy: 0.00001)
        XCTAssertEqual(SpreadTactile.trayDuration, 0.595, accuracy: 0.00001)
        XCTAssertEqual(SpreadTactile.cardDismissDuration, 0.700, accuracy: 0.00001)
    }
#endif

    func testDrawerGlideRespectsEdgeFlickAndVerticalScrolling() {
        XCTAssertTrue(TactilePrecisionMath.drawerShouldClose(
            horizontal: -120, vertical: 6, projected: -180, width: 300, onLeft: true))
        XCTAssertTrue(TactilePrecisionMath.drawerShouldClose(
            horizontal: 120, vertical: 6, projected: 180, width: 300, onLeft: false))
        XCTAssertTrue(TactilePrecisionMath.drawerShouldClose(
            horizontal: -28, vertical: 0, projected: -220, width: 300, onLeft: true))
        XCTAssertFalse(TactilePrecisionMath.drawerShouldClose(
            horizontal: -60, vertical: 100, projected: -400, width: 300, onLeft: true))
        XCTAssertFalse(TactilePrecisionMath.drawerShouldClose(
            horizontal: 120, vertical: 0, projected: 300, width: 300, onLeft: true))
        XCTAssertFalse(TactilePrecisionMath.drawerShouldClose(
            horizontal: -25, vertical: 0, projected: -55, width: 300, onLeft: true))
        XCTAssertFalse(TactilePrecisionMath.drawerShouldClose(
            horizontal: .nan, vertical: 0, projected: -200, width: 300, onLeft: true))
    }

    func testMechanicalHoursReturnToTheirOriginAndRespectBounds() {
        XCTAssertEqual(TactilePrecisionMath.hours(origin: 8, translation: 23.9, step: 0.5), 8)
        XCTAssertEqual(TactilePrecisionMath.hours(origin: 8, translation: 48, step: 0.5), 9)
        XCTAssertEqual(TactilePrecisionMath.hours(origin: 8, translation: -24, step: 0.5), 7.5)
        XCTAssertEqual(TactilePrecisionMath.hours(origin: 8, translation: 0, step: 0.5), 8)
        XCTAssertEqual(TactilePrecisionMath.hours(origin: 0, translation: -900, step: 0.5), 0)
        XCTAssertEqual(TactilePrecisionMath.hours(origin: 167.5, translation: 900, step: 0.5), 168)
        XCTAssertEqual(TactilePrecisionMath.hours(origin: 8, translation: .infinity, step: 0.5), 8)
    }

    func testCueCadenceBoundaryCancellationAndFeedbackOff() {
        var gate = TactileCueGate()
        XCTAssertFalse(gate.tick(at: 1, enabled: false))
        XCTAssertTrue(gate.tick(at: 1))
        XCTAssertFalse(gate.tick(at: 1.01))
        XCTAssertFalse(gate.tick(at: 1.06))
        XCTAssertTrue(gate.tick(at: 1.08))
        XCTAssertFalse(gate.boundary(enabled: false))
        XCTAssertTrue(gate.boundary())
        XCTAssertFalse(gate.boundary())
        gate.reset()
        XCTAssertTrue(gate.tick(at: 1.09))
        XCTAssertTrue(gate.boundary())
        XCTAssertFalse(gate.tick(at: .infinity))
    }

    func testFastWeekFlickIsBoundedAndEdgeGuarded() {
        let start = CGPoint(x: 180, y: 300)
        XCTAssertEqual(WeekSwipeRules.direction(start: start, end: CGPoint(x: 156, y: 303), width: 390,
                                              velocity: CGPoint(x: -800, y: 0)), 1)
        XCTAssertNil(WeekSwipeRules.direction(start: start, end: CGPoint(x: 156, y: 360), width: 390,
                                             velocity: CGPoint(x: -800, y: 0)))
        XCTAssertNil(WeekSwipeRules.direction(start: CGPoint(x: 10, y: 300), end: CGPoint(x: 110, y: 300),
                                             width: 390, velocity: CGPoint(x: 800, y: 0)))
        XCTAssertNil(WeekSwipeRules.direction(start: start, end: CGPoint(x: 156, y: 303), width: 390,
                                             velocity: CGPoint(x: 800, y: 0)))
    }
}
