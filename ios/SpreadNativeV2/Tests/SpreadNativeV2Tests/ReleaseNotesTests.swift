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

    func testEveryEntryNewerThanTheLastSeenOpensTogetherNewestFirst() {
        let a = SpreadReleaseNote(id: "a", version: "1.0", date: "2026-11-11", title: "T", changes: ["A"])
        let b = SpreadReleaseNote(id: "b", version: "1.0", date: "2026-11-12", title: "T", changes: ["B"])
        let c = SpreadReleaseNote(id: "c", version: "1.0", date: "2026-11-12", title: "T", changes: ["C"])
        let entries = [c, b, a]
        XCTAssertEqual(SpreadReleaseNotes.unseen(for: "1.0", lastSeenID: "a", in: entries), [c, b])
        XCTAssertEqual(SpreadReleaseNotes.unseen(for: "1.0", lastSeenID: "b", in: entries), [c])
        XCTAssertEqual(SpreadReleaseNotes.unseen(for: "1.0", lastSeenID: "c", in: entries), [])
    }

    func testFirstLaunchShowsOnlyTheNewestDaysNotes() {
        let a = SpreadReleaseNote(id: "a", version: "1.0", date: "2026-11-11", title: "T", changes: ["A"])
        let b = SpreadReleaseNote(id: "b", version: "1.0", date: "2026-11-12", title: "T", changes: ["B"])
        let c = SpreadReleaseNote(id: "c", version: "1.0", date: "2026-11-12", title: "T", changes: ["C"])
        XCTAssertEqual(SpreadReleaseNotes.unseen(for: "1.0", lastSeenID: "", in: [c, b, a]), [c, b])
    }

    func testUnseenNotesReadAsOneListInOrder() {
        let b = SpreadReleaseNote(id: "b", version: "1.0", date: "2026-11-12", title: "T", changes: ["B1", "B2"])
        let c = SpreadReleaseNote(id: "c", version: "1.0", date: "2026-11-12", title: "T", changes: ["C1"])
        let merged = SpreadReleaseNotes.combined([c, b])
        XCTAssertEqual(merged?.changes, ["C1", "B1", "B2"])
        XCTAssertEqual(merged?.id, "c")
        XCTAssertNil(SpreadReleaseNotes.combined([]))
    }
}
