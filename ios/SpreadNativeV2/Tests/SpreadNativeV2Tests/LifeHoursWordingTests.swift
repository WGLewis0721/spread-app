#if os(iOS)
import XCTest
@testable import SpreadNativeV2

/// Singular and plural hour wording. Life reads these aloud and prints them, so "1 hours" must not appear.
final class LifeHoursWordingTests: XCTestCase {
    func testSpokenHoursUseTheSingularOnlyForExactlyOneHour() {
        XCTAssertEqual(SpreadHours.spoken(1), "1 hour")
        XCTAssertEqual(SpreadHours.spoken(1.0), "1 hour")
        XCTAssertEqual(SpreadHours.spoken(0.5), "0.5 hours")
        XCTAssertEqual(SpreadHours.spoken(1.5), "1.5 hours")
        XCTAssertEqual(SpreadHours.spoken(2), "2 hours")
        XCTAssertEqual(SpreadHours.spoken(0), "0 hours")
    }
}
#endif
