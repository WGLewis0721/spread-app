#if DEBUG
import XCTest
@testable import SpreadNativeV2

final class SpreadFocusDiagnosticsTests: XCTestCase {
    func testStorageAndEligibilityClassificationsUseIsolatedDefaults() throws {
        let suite = "spread.focus.tests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        func snapshot(_ enabled: Bool = true) -> SpreadFocusDiagnostics.Snapshot {
            SpreadFocusDiagnostics.snapshot(defaults, enabled: enabled, now: now)
        }
        XCTAssertEqual(snapshot().storage, "missing")
        defaults.set(Data("invalid".utf8), forKey: SpreadFocusStore.sessionKey)
        XCTAssertEqual(snapshot().storage, "decode_failed")
        let session = try XCTUnwrap(SpreadFocusMachine.stretch(
            id: "test-session", profileId: "a", roleId: "r", roleName: "test",
            plan: .standard, kind: .focus, round: 1, now: now))
        SpreadFocusStore.save(session, defaults)
        XCTAssertEqual(snapshot().storage, "decoded")
        XCTAssertEqual(snapshot().profile, "missing")
        SpreadFocusStore.setActiveProfile("b", defaults)
        XCTAssertEqual(snapshot().profile, "mismatch")
        SpreadFocusStore.setActiveProfile("a", defaults)
        XCTAssertEqual(snapshot().profile, "match")
        XCTAssertFalse(snapshot(false).enabled)
        XCTAssertTrue(snapshot().enabled)
        XCTAssertEqual(snapshot().phase, "running")
        XCTAssertEqual(snapshot().deadline, String(format: "%.3f", try XCTUnwrap(session.endAt).timeIntervalSince1970))
        XCTAssertEqual(SpreadFocusStore.load(defaults), session)
    }
}
#endif
