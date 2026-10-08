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

    func testInboxIsAckedByExactVersion() {
        let storage = SyncStorage(folder: folder)
        storage.putInbox([item("a"), item("b")])
        storage.ackInbox([item("a")])
        XCTAssertEqual(storage.inboxItems().map(\.itemId), ["b"])
    }

    func testANewerVersionStagedAfterTheReadSurvivesTheAck() {
        let storage = SyncStorage(folder: folder)
        storage.putInbox([item("a", "{\"v\":2}")])
        // The web app read version 2; version 3 arrives before it acknowledges.
        storage.putInbox([item("a", "{\"v\":3}")])
        XCTAssertTrue(storage.ackInbox([item("a", "{\"v\":2}")]))
        XCTAssertEqual(storage.inboxItems().first?.fields, "{\"v\":3}")
        // And it survives a relaunch.
        XCTAssertEqual(SyncStorage(folder: folder).inboxItems().first?.fields, "{\"v\":3}")
    }

    func testAnAckThatCannotBeSavedIsReported() throws {
        let storage = SyncStorage(folder: folder)
        storage.putInbox([item("a")])
        try FileManager.default.removeItem(at: folder.appendingPathComponent("inbox.json"))
        try FileManager.default.createDirectory(at: folder.appendingPathComponent("inbox.json"), withIntermediateDirectories: true)
        XCTAssertFalse(storage.ackInbox([item("a")]))
    }
}

final class OutboxGateTests: XCTestCase {
    private func item(_ syncId: String = "P", _ id: String = "a") -> SyncItemDTO {
        SyncItemDTO(syncId: syncId, itemId: id, fields: "{}", v: "{}", deleted: false, at: "t")
    }
    private func decide(
        item: SyncItemDTO? = nil,
        meta: OutboxMeta? = OutboxMeta(account: "A"),
        resumed: Bool = true,
        profiles: Set<String> = ["P"],
        pause: SyncPause = SyncPause(),
        confirmed: String? = "A"
    ) -> SendDecision {
        OutboxGate.decide(item: item ?? self.item(), meta: meta, resumed: resumed, resumedProfiles: profiles, pause: pause, confirmedAccount: confirmed)
    }

    func testAConfirmedProfileUnderItsOwnAccountSends() {
        XCTAssertEqual(decide(), .send)
    }

    func testFetchOnlyModeNeverSends() {
        XCTAssertEqual(decide(resumed: false), .skip(.notResumed))
    }

    func testAnyPauseBlocksSending() {
        var zone = SyncPause(); zone.zoneDeleted = true
        var account = SyncPause(); account.accountChanged = "switchAccounts"
        var damaged = SyncPause(); damaged.damaged = true
        for pause in [zone, account, damaged] { XCTAssertEqual(decide(pause: pause), .skip(.paused)) }
    }

    func testAnotherProfilesQueueIsHeldWhenOnlyOneWasConfirmed() {
        XCTAssertEqual(decide(item: item("Q"), profiles: ["P"]), .skip(.otherProfile))
    }

    func testAChangeQueuedUnderAnotherAccountIsHeld() {
        XCTAssertEqual(decide(meta: OutboxMeta(account: "A"), confirmed: "B"), .skip(.wrongAccount))
    }

    func testAnUnverifiedAccountSendsNothing() {
        XCTAssertEqual(decide(confirmed: nil), .skip(.accountUnknown))
    }

    func testTheBoundAccountMustMatchTheConfirmedOne() {
        var pause = SyncPause(); pause.boundAccount = "A"
        XCTAssertEqual(decide(pause: pause, confirmed: "B"), .skip(.wrongAccount))
    }

    func testAStaleBaseIsNotSentWithIcloudsNewTag() {
        XCTAssertEqual(decide(meta: OutboxMeta(account: "A", stale: true)), .skip(.staleBase))
    }

    func testAMissingItemIsSkipped() {
        XCTAssertEqual(OutboxGate.decide(item: nil, meta: nil, resumed: true, resumedProfiles: ["P"], pause: SyncPause(), confirmedAccount: "A"), .skip(.missing))
    }
}

final class OutboxIsolationTests: XCTestCase {
    private var folder: URL!
    override func setUp() { folder = FileManager.default.temporaryDirectory.appendingPathComponent("spread-iso-\(UUID().uuidString)") }
    override func tearDown() { try? FileManager.default.removeItem(at: folder) }

    private func item(_ syncId: String, _ id: String, _ fields: String = "{}") -> SyncItemDTO {
        SyncItemDTO(syncId: syncId, itemId: id, fields: fields, v: "{}", deleted: false, at: "t")
    }

    func testQueuedChangesRememberTheirAccount() {
        let s = SyncStorage(folder: folder)
        s.putOutbox([item("P", "a")], account: "A")
        XCTAssertEqual(SyncStorage(folder: folder).meta(for: "P|a"), OutboxMeta(account: "A"))
    }

    func testAnIncomingVersionMarksTheQueuedPayloadStaleUntilTheWebAppQueuesAReplacement() {
        let s = SyncStorage(folder: folder)
        s.putOutbox([item("P", "a", "{\"v\":\"local\"}")], account: "A")
        s.markStale(["P|a"])
        XCTAssertEqual(s.meta(for: "P|a")?.stale, true)
        XCTAssertEqual(SyncStorage(folder: folder).meta(for: "P|a")?.stale, true, "survives a relaunch")
        s.putOutbox([item("P", "a", "{\"v\":\"merged\"}")], account: "A")
        XCTAssertEqual(s.meta(for: "P|a")?.stale, false, "the merged replacement is sendable")
    }

    func testMarkingStaleOnlyTouchesWhatIsQueued() {
        let s = SyncStorage(folder: folder)
        s.markStale(["P|nothing-queued"])
        XCTAssertNil(s.meta(for: "P|nothing-queued"))
    }

    func testForgettingOneProfileLeavesTheOtherAlone() {
        let s = SyncStorage(folder: folder)
        s.putOutbox([item("P", "a"), item("Q", "b")], account: "A")
        s.putInbox([item("P", "x"), item("Q", "y")])
        s.setSystemFields(Data([1]), for: "P|a")
        s.setSystemFields(Data([2]), for: "Q|b")
        XCTAssertTrue(s.forget(syncId: "P"))
        XCTAssertEqual(s.outboxNames, ["Q|b"])
        XCTAssertEqual(s.inboxItems().map(\.recordName), ["Q|y"])
        XCTAssertNil(s.systemFields(for: "P|a"))
        XCTAssertNotNil(s.systemFields(for: "Q|b"))
        XCTAssertNil(s.meta(for: "P|a"))
        XCTAssertEqual(SyncStorage(folder: folder).outboxNames, ["Q|b"])
    }

    func testResumeScopeListsOnlyTheConfirmedProfilesNames() {
        let s = SyncStorage(folder: folder)
        s.putOutbox([item("P", "a"), item("P", "b"), item("Q", "c")], account: "A")
        XCTAssertEqual(s.outboxNames(forSyncId: "P"), ["P|a", "P|b"])
    }

    func testUnstampedChangesTakeTheAccountOfTheProfileBeingLinked() {
        let s = SyncStorage(folder: folder)
        s.putOutbox([item("P", "a"), item("Q", "b")], account: nil)
        s.stampUnstamped(syncId: "P", account: "B")
        XCTAssertEqual(s.meta(for: "P|a")?.account, "B")
        XCTAssertNil(s.meta(for: "Q|b")?.account, "another profile is not stamped by this one's consent")
    }

    func testAConfirmedChangeLeavesNoMetadataBehind() {
        let s = SyncStorage(folder: folder)
        let sent = item("P", "a")
        s.putOutbox([sent], account: "A")
        s.confirmSent(sent)
        XCTAssertNil(s.meta(for: "P|a"))
    }

    func testADamagedPauseFileFailsClosedAndStaysClosed() throws {
        _ = SyncStorage(folder: folder)
        try Data("garbage".utf8).write(to: folder.appendingPathComponent("pause.json"))
        let first = SyncStorage(folder: folder)
        XCTAssertTrue(first.pause.damaged)
        XCTAssertTrue(first.pause.isPaused)
        XCTAssertTrue(first.needsRepair)
        // The next launch must not read the missing file as "no pause".
        let second = SyncStorage(folder: folder)
        XCTAssertTrue(second.pause.isPaused)
        // Only an explicit clear opens it again.
        second.updatePause { $0 = SyncPause() }
        XCTAssertFalse(SyncStorage(folder: folder).pause.isPaused)
    }

    func testAnOlderPauseFileWithoutTheNewFieldStillReads() throws {
        _ = SyncStorage(folder: folder)
        try Data("{\"zoneDeleted\":true}".utf8).write(to: folder.appendingPathComponent("pause.json"))
        let s = SyncStorage(folder: folder)
        XCTAssertTrue(s.pause.zoneDeleted)
        XCTAssertFalse(s.pause.damaged)
    }

    func testEngineStateWriteFailureIsReported() throws {
        let s = SyncStorage(folder: folder)
        try FileManager.default.createDirectory(at: s.engineStateURL, withIntermediateDirectories: true)
        XCTAssertFalse(s.saveEngineState(Data([1])))
    }
}
