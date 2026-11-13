#if os(iOS)
import Foundation
import XCTest
@testable import SpreadNativeV2

final class SpreadFocusClockTests: XCTestCase {
    func testRunningCountdownUsesAbsoluteDeadline() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let session = SpreadFocusSession(
            id: "session", profileId: "local", roleId: "gym", roleName: "Gym",
            durationSeconds: 1500, pausedSeconds: 1500,
            endAt: now.addingTimeInterval(1500), phase: .running)
        XCTAssertEqual(session.remaining(at: now), 1500)
        XCTAssertEqual(session.remaining(at: now.addingTimeInterval(1000)), 500)
        XCTAssertEqual(session.remaining(at: now.addingTimeInterval(1501)), 0)
    }

    func testPausedTimeIsStableEvenAsWallClockAdvances() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let session = SpreadFocusSession(
            id: "paused", profileId: "local", roleId: "gym", roleName: "Gym",
            durationSeconds: 1500, pausedSeconds: 319, endAt: nil, phase: .paused)
        XCTAssertEqual(session.remaining(at: now), 319)
        XCTAssertEqual(session.remaining(at: now.addingTimeInterval(3600)), 319)
        XCTAssertEqual(SpreadFocusClock.display(319), "05:19")
        XCTAssertEqual(SpreadFocusClock.display(-1), "00:00")
    }

    func testTimerSurvivesCodableRoundTripWithoutPlannerMutations() throws {
        let original = SpreadFocusSession(
            id: "id", profileId: "profile-a", roleId: "service",
            roleName: "Community Service", durationSeconds: 3600,
            pausedSeconds: 3600, endAt: Date(timeIntervalSince1970: 1_800_001_000),
            phase: .running)
        let restored = try JSONDecoder().decode(SpreadFocusSession.self,
                                                from: JSONEncoder().encode(original))
        XCTAssertEqual(original, restored)
        XCTAssertEqual(restored.profileId, "profile-a")
        XCTAssertEqual(restored.roleId, "service")
    }
}
#endif
