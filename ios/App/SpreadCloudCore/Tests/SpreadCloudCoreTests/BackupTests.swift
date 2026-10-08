import XCTest
@testable import SpreadCloudCore

final class BackupNamingTests: XCTestCase {
    private let date = Date(timeIntervalSince1970: 1_791_469_625) // 2026-10-08T14:27:05Z

    func testRoundTrip() throws {
        let name = try XCTUnwrap(BackupNaming.fileName(createdAt: date, seq: 7))
        XCTAssertEqual(name, "20261008T142705Z-0000007.spreadbackup")
        let parsed = try XCTUnwrap(BackupNaming.parse(fileName: name))
        XCTAssertEqual(parsed.createdAt, date)
        XCTAssertEqual(parsed.seq, 7)
        XCTAssertNil(parsed.pin)
    }

    func testPinnedRoundTrip() throws {
        let name = try XCTUnwrap(BackupNaming.fileName(createdAt: date, seq: 12, pin: "pre-migration-v1"))
        XCTAssertEqual(BackupNaming.parse(fileName: name)?.pin, "pre-migration-v1")
    }

    func testRejectsAnythingThatCouldEscapeTheFolder() {
        for bad in [
            "../20261008T142705Z-0000007.spreadbackup",
            "20261008T142705Z-0000007.spreadbackup/..",
            "20261008T142705Z-0000007.json",
            "20261008T142705Z-7.spreadbackup",
            "20261308T142705Z-0000007.spreadbackup",
            "20261008T252705Z-0000007.spreadbackup",
            "20261008T142705Z-0000007.Bad Pin.spreadbackup",
            "20261008T142705Z-0000007./x.spreadbackup",
            "",
        ] {
            XCTAssertNil(BackupNaming.parse(fileName: bad), bad)
        }
        XCTAssertNil(BackupNaming.fileName(createdAt: date, seq: -1))
        XCTAssertNil(BackupNaming.fileName(createdAt: date, seq: 1, pin: "../x"))
    }

    func testDeviceIdValidation() {
        XCTAssertTrue(BackupNaming.isValidDeviceId("3F2504E0-4F89-41D3-9A0C-0305E82C3301"))
        for bad in ["", "short", "../../etc/passwd", "a/b/cccccccc", "with space 123", String(repeating: "a", count: 65), "caf\u{E9}caf\u{E9}caf\u{E9}"] {
            XCTAssertFalse(BackupNaming.isValidDeviceId(bad), bad)
        }
    }
}

final class BackupRetentionTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 1_791_469_625)

    private func entry(_ daysAgo: Double, hour: Double = 0, pin: String? = nil, bytes: Int = 1000, id: String? = nil) -> BackupEntry {
        BackupEntry(name: id ?? "e-\(daysAgo)-\(hour)-\(pin ?? "")", createdAt: now.addingTimeInterval(-(daysAgo * 86_400) - hour * 3600), pin: pin, bytes: bytes)
    }

    func testKeepsNewestPerDayForAWeekAndDropsTheRestOfThatDay() {
        let a = entry(0, hour: 0, id: "newest-today"), b = entry(0, hour: 2, id: "older-today")
        let doomed = BackupRetention.namesToDelete(entries: [a, b], now: now)
        XCTAssertEqual(doomed, ["older-today"])
    }

    func testNeverDeletesTheNewestRegularBackupEvenWhenAncient() {
        let only = entry(900, id: "ancient")
        XCTAssertEqual(BackupRetention.namesToDelete(entries: [only], now: now), [])
    }

    func testOldBackupsThinOutToWeeklyThenMonthly() {
        var entries: [BackupEntry] = []
        for day in 0..<150 { entries.append(entry(Double(day), id: "d\(day)")) }
        let doomed = BackupRetention.namesToDelete(entries: entries, now: now)
        let kept = entries.filter { !doomed.contains($0.name) }
        XCTAssertLessThanOrEqual(kept.count, 7 + 6 + 5 + 2, "retention should thin a daily history sharply")
        XCTAssertTrue(kept.contains { $0.name == "d0" })
        XCTAssertTrue(entries.prefix(7).allSatisfy { !doomed.contains($0.name) }, "the last 7 days are all kept")
        XCTAssertFalse(kept.contains { $0.name == "d149" } && kept.count > 20)
    }

    func testPinnedBackupsSurviveThirtyDaysThenAgeOut() {
        let fresh = entry(10, pin: "pre-restore", id: "pin-fresh")
        let stale = entry(40, pin: "pre-restore", id: "pin-stale")
        let regular = entry(0, id: "regular")
        let doomed = BackupRetention.namesToDelete(entries: [fresh, stale, regular], now: now)
        XCTAssertFalse(doomed.contains("pin-fresh"))
        XCTAssertTrue(doomed.contains("pin-stale"))
    }

    func testSizeCeilingRemovesOldestButNeverTheNewest() {
        var policy = RetentionPolicy()
        policy.maxBytes = 2500
        let entries = (0..<5).map { entry(Double($0), bytes: 1000, id: "d\($0)") }
        let doomed = BackupRetention.namesToDelete(entries: entries, now: now, policy: policy)
        XCTAssertFalse(doomed.contains("d0"))
        let remaining = entries.filter { !doomed.contains($0.name) }.reduce(0) { $0 + $1.bytes }
        XCTAssertLessThanOrEqual(remaining, 2500)
    }

    func testOnlyEverNamesEntriesItWasGiven() {
        let entries = (0..<30).map { entry(Double($0) * 3, id: "x\($0)") }
        let names = Set(entries.map(\.name))
        XCTAssertTrue(BackupRetention.namesToDelete(entries: entries, now: now).isSubset(of: names))
    }
}
