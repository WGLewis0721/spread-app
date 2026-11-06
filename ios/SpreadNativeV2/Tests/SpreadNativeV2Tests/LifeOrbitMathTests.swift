import XCTest
@testable import SpreadNativeV2
final class LifeOrbitMathTests: XCTestCase {
    func testSeamAndReversal() {
        let forward = LifeOrbitMath.delta(from: 179, to: -179)
        let backward = LifeOrbitMath.delta(from: -179, to: 179)
        XCTAssertEqual(forward, 2)
        XCTAssertEqual(backward, -2)
        XCTAssertEqual(forward + backward, 0)
        XCTAssertEqual(-Double(Int(LifeOrbitMath.delta(from: 179, to: 164) / 15)) * 0.5, 0.5)
    }
    func testStationaryHoldIntegratesRateWithSixteenHourMaximum() {
        let one = LifeOrbitMath.holdCredit(distance: 1000, interval: 1)
        let frames = (0..<60).reduce(0.0) { total, _ in total + LifeOrbitMath.holdCredit(distance: 1000, interval: 1.0 / 60) }
        XCTAssertEqual(one, 16)
        XCTAssertEqual(frames, one, accuracy: 0.000001)
        XCTAssertEqual(LifeOrbitMath.holdCredit(distance: -1000, interval: 1), one)
        XCTAssertEqual(LifeOrbitMath.holdCredit(distance: 12, interval: 10), 0)
        XCTAssertEqual(LifeOrbitMath.holdCredit(distance: 22, interval: 1), 1)
        XCTAssertEqual(LifeOrbitMath.holdCredit(distance: 22, interval: -1), 0)
    }
    func testFlickAndLimits() {
        XCTAssertEqual(LifeOrbitMath.capacityDelta(distance: 17, elapsed: 0.1), 0)
        XCTAssertEqual(LifeOrbitMath.capacityDelta(distance: 18, elapsed: 0.1), 1)
        XCTAssertEqual(LifeOrbitMath.capacityDelta(distance: -18, elapsed: 0.1), -1)
        XCTAssertEqual(LifeOrbitMath.limit(-0.5, minimum: 0, maximum: 0), 0)
        XCTAssertEqual(LifeOrbitMath.limit(3.5, minimum: 4, maximum: 12), 4)
        XCTAssertEqual(LifeOrbitMath.limit(12.5, minimum: 4, maximum: 12), 12)
    }
}
