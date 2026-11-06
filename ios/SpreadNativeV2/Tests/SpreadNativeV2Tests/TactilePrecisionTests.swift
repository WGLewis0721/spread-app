import XCTest
@testable import SpreadNativeV2

/// Mathematical contracts for touch interactions. Device feel and haptics require an iPhone.
final class TactilePrecisionTests: XCTestCase {
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
}
