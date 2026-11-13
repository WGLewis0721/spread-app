#if os(iOS)
import ActivityKit
import Foundation
import XCTest
@testable import SpreadNativeV2

final class SpreadFocusActivityTests: XCTestCase {
    func testStateRoundTripAndPrivacyLabel() throws {
        let end = Date(timeIntervalSince1970: 1_800_000_900)
        let state = SpreadFocusActivityAttributes.ContentState(
            phase: "running", deadline: end, remainingSeconds: 900)
        let copy = try JSONDecoder().decode(
            SpreadFocusActivityAttributes.ContentState.self,
            from: JSONEncoder().encode(state))
        XCTAssertEqual(copy, state)

        let hidden = SpreadFocusActivityAttributes(
            sessionId: "temporary-id", title: "Focus session")
        XCTAssertEqual(hidden.title, "Focus session")
        XCTAssertNotEqual(hidden.title, "Gym")
    }
}
#endif
