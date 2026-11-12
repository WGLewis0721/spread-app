import XCTest
@testable import SpreadNativeV2

final class ReleaseNotesTests: XCTestCase {
    func testBundledReleaseNotesLoadOfflineAndMatchCurrentMarketingVersion() {
        let releases = SpreadReleaseNotes.entries
        XCTAssertFalse(releases.isEmpty)
        XCTAssertEqual(releases.first?.version, "1.0")
        XCTAssertEqual(Set(releases.map(\.id)).count, releases.count)
        for release in releases {
            XCTAssertFalse(release.id.isEmpty)
            XCTAssertFalse(release.title.isEmpty)
            XCTAssertFalse(release.changes.isEmpty)
            XCTAssertTrue(release.changes.allSatisfy { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty })
        }
    }

    func testUnseenReleaseIsShownOnceAndReadAgainFromHistory() {
        let latest = try! XCTUnwrap(SpreadReleaseNotes.newest(for: "1.0"))
        XCTAssertTrue(SpreadReleaseNotes.shouldPresent(version: "1.0", lastSeenID: ""))
        XCTAssertFalse(SpreadReleaseNotes.shouldPresent(version: "1.0", lastSeenID: latest.id))
        XCTAssertTrue(SpreadReleaseNotes.entries.contains(latest))
    }

    func testVersionWithoutPatchNotesDoesNotShowStaleAnnouncement() {
        XCTAssertNil(SpreadReleaseNotes.newest(for: "9.9"))
        XCTAssertFalse(SpreadReleaseNotes.shouldPresent(version: "9.9", lastSeenID: ""))
    }

    func testNewEntryForSameMarketingVersionTriggersExactlyOnce() {
        let old = SpreadReleaseNote(id: "first", version: "1.0",
                                    date: "2026-11-11", title: "First", changes: ["Change one"])
        let newest = SpreadReleaseNote(id: "second", version: "1.0",
                                       date: "2026-11-12", title: "Second", changes: ["Change two"])
        let entries = [newest, old]
        XCTAssertEqual(SpreadReleaseNotes.newest(for: "1.0", in: entries), newest)
        XCTAssertTrue(SpreadReleaseNotes.shouldPresent(version: "1.0", lastSeenID: old.id, entries: entries))
        XCTAssertFalse(SpreadReleaseNotes.shouldPresent(version: "1.0", lastSeenID: newest.id, entries: entries))
    }
}
