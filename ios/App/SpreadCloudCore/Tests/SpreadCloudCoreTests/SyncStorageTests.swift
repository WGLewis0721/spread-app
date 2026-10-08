import XCTest
@testable import SpreadCloudCore

final class SyncStorageTests: XCTestCase {
    private var folder: URL!

    override func setUp() {
        folder = FileManager.default.temporaryDirectory.appendingPathComponent("spread-sync-\(UUID().uuidString)")
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: folder)
    }

    private func item(_ id: String, _ fields: String = "{}", at: String = "t") -> SyncItemDTO {
        SyncItemDTO(syncId: "s", itemId: id, fields: fields, v: "{}", deleted: false, at: at)
    }

    func testQueuedChangesSurviveARelaunch() {
        let first = SyncStorage(folder: folder)
        XCTAssertTrue(first.putOutbox([item("a"), item("b")]))
        let second = SyncStorage(folder: folder)
        XCTAssertEqual(second.outboxNames, ["s|a", "s|b"])
        XCTAssertFalse(second.needsRepair)
    }

    func testConfirmSentKeepsANewerQueuedVersion() {
        let storage = SyncStorage(folder: folder)
        storage.putOutbox([item("a", "{\"v\":1}")])
        storage.putOutbox([item("a", "{\"v\":2}")])
        storage.confirmSent(item("a", "{\"v\":1}"))
        XCTAssertEqual(storage.outboxNames, ["s|a"])
        storage.confirmSent(item("a", "{\"v\":2}"))
        XCTAssertEqual(storage.outboxNames, [])
    }

    func testACorruptQueueFileIsSetAsideAndReported() throws {
        _ = SyncStorage(folder: folder)
        try Data("not json".utf8).write(to: folder.appendingPathComponent("outbox.json"))
        let storage = SyncStorage(folder: folder)
        XCTAssertTrue(storage.needsRepair)
        XCTAssertEqual(storage.outboxNames, [])
        let names = try FileManager.default.contentsOfDirectory(atPath: folder.path)
        XCTAssertTrue(names.contains { $0.hasPrefix("outbox.json.corrupt-") })
        XCTAssertFalse(names.contains("outbox.json"))
    }

    func testAFailedWriteIsReportedNotSwallowed() throws {
        let storage = SyncStorage(folder: folder)
        // A directory where the file should be makes the write fail.
        try FileManager.default.createDirectory(at: folder.appendingPathComponent("outbox.json"), withIntermediateDirectories: true)
        XCTAssertFalse(storage.putOutbox([item("a")]))
        XCTAssertTrue(storage.needsRepair)
    }

    func testAPauseSurvivesARelaunchAndIsExplicitlyCleared() {
        let first = SyncStorage(folder: folder)
        XCTAssertTrue(first.updatePause { $0.zoneDeleted = true })
        XCTAssertTrue(SyncStorage(folder: folder).pause.isPaused)
        first.updatePause { $0 = SyncPause() }
        XCTAssertFalse(SyncStorage(folder: folder).pause.isPaused)
    }

    func testResetKeepsTheUsersPendingWork() {
        let storage = SyncStorage(folder: folder)
        storage.putOutbox([item("a")])
        storage.setSystemFields(Data([1, 2]), for: "s|a")
        storage.resetCloudState()
        XCTAssertEqual(storage.outboxNames, ["s|a"])
        XCTAssertNil(storage.systemFields(for: "s|a"))
    }

    func testInboxIsAckedByName() {
        let storage = SyncStorage(folder: folder)
        storage.putInbox([item("a"), item("b")])
        storage.ackInbox(["s|a"])
        XCTAssertEqual(storage.inboxItems().map(\.itemId), ["b"])
    }
}
