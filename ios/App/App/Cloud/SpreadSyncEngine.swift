import CloudKit
import Foundation
import SpreadCloudCore

/// Moves SyncItemDTOs between this device and the person's private iCloud database using Apple's
/// `CKSyncEngine`. It decides nothing about content: a version iCloud rejects is handed to the
/// web app as an inbound item and the web app merges it, so a conflict is never settled here by
/// "last write wins".
///
/// Records live in one zone (`Spread`), one record per item, named `<syncId>|<itemId>`. The item's
/// fields travel as a file (`payload`, a CKAsset) so size never hits the 1 MB record limit.
final class SpreadSyncEngine: NSObject, CKSyncEngineDelegate {
    static let zoneID = CKRecordZone.ID(zoneName: "Spread", ownerName: CKCurrentUserDefaultName)
    static let recordType = "SpreadItem"

    struct Status {
        var running = false
        var accountChanged: String?
        var zoneDeleted = false
        var quotaExceeded = false
        var lastError: String?
        /// Records iCloud sent that failed the payload check. They were not applied.
        var damagedRecords = 0
        /// A local queue file was unreadable and has been set aside.
        var needsRepair = false
    }

    /// Set by `resume()`. Until then the engine only fetches: nothing is created or sent in iCloud.
    private var resumed = false

    /// Temp payload files for records handed to CloudKit; removed once the send finishes.
    private var tempFiles: [URL] = []
    private let tempLock = NSLock()

    private let storage: SyncStorage
    private let container: CKContainer
    private var engine: CKSyncEngine?
    private let statusLock = NSLock()
    private var status = Status()
    private let emit: (_ event: String) -> Void

    init(storage: SyncStorage, emit: @escaping (_ event: String) -> Void) {
        self.storage = storage
        self.container = CKContainer(identifier: SpreadCloudConfig.containerId)
        self.emit = emit
        super.init()
        let pause = storage.pause
        status.zoneDeleted = pause.zoneDeleted
        status.accountChanged = pause.accountChanged
        status.needsRepair = storage.needsRepair
    }

    // MARK: Control

    func currentStatus() -> Status {
        statusLock.lock(); defer { statusLock.unlock() }
        return status
    }

    private func update(_ change: (inout Status) -> Void) {
        statusLock.lock()
        change(&status)
        statusLock.unlock()
        emit("syncStatus")
    }

    /// Starts fetching only. It never creates the iCloud zone or sends anything: the web app calls
    /// `resume()` once it knows the account matches and the person has agreed to upload.
    func start() async {
        if engine != nil { return }
        var pause = storage.pause
        // The account check runs here, not only in the web app, so a relaunch cannot skip it.
        if !pause.isPaused, let bound = pause.boundAccount, let live = await userKey(), live != bound {
            storage.updatePause { $0.accountChanged = "switchAccounts" }
            pause = storage.pause
        }
        if engine != nil { return }
        if pause.isPaused {
            update { (status: inout Status) in
                status.running = false
                status.zoneDeleted = pause.zoneDeleted
                status.accountChanged = pause.accountChanged
                status.needsRepair = storage.needsRepair
            }
            return
        }
        var serialization: CKSyncEngine.State.Serialization?
        if let data = storage.loadEngineState() {
            serialization = try? JSONDecoder().decode(CKSyncEngine.State.Serialization.self, from: data)
        }
        var configuration = CKSyncEngine.Configuration(database: container.privateCloudDatabase, stateSerialization: serialization, delegate: self)
        configuration.automaticallySync = true
        engine = CKSyncEngine(configuration)
        resumed = false
        update { (status: inout Status) in
            status.running = true
            status.accountChanged = nil
            status.zoneDeleted = false
            status.quotaExceeded = false
            status.lastError = nil
            status.damagedRecords = 0
            status.needsRepair = storage.needsRepair
        }
    }

    /// Allow sending: create the zone if needed and send what the outbox holds. Refused while paused.
    /// If iCloud has a newer version of an item it rejects the write and hands that version to the
    /// web app, which merges it, so this cannot overwrite.
    @discardableResult
    func resume() async -> Bool {
        let pause = storage.pause
        guard !pause.isPaused, let engine else { return false }
        if pause.boundAccount == nil, let live = await userKey() {
            storage.updatePause { $0.boundAccount = live }
        }
        resumed = true
        engine.state.add(pendingDatabaseChanges: [.saveZone(CKRecordZone(zoneID: Self.zoneID))])
        var resend: [CKSyncEngine.PendingRecordZoneChange] = []
        for name in storage.outboxNames { resend.append(.saveRecord(recordID(for: name))) }
        if !resend.isEmpty { engine.state.add(pendingRecordZoneChanges: resend) }
        return true
    }

    /// The person chose to upload this device's data to the current iCloud again. Clears the pause
    /// and the old account binding and forgets the old engine state; the outbox is kept.
    func clearPause() {
        engine = nil
        resumed = false
        storage.updatePause { $0 = SyncPause() }
        storage.resetCloudState()
        update { (status: inout Status) in
            status.running = false
            status.zoneDeleted = false
            status.accountChanged = nil
        }
    }

    private func pauseNow(zoneDeleted: Bool = false, account: String? = nil) {
        storage.updatePause {
            if zoneDeleted { $0.zoneDeleted = true }
            if let account { $0.accountChanged = account }
        }
        engine?.cancelOperations()
        engine = nil
        resumed = false
        let pause = storage.pause
        update { (status: inout Status) in
            status.running = false
            status.zoneDeleted = pause.zoneDeleted
            status.accountChanged = pause.accountChanged
        }
    }

    func stop() {
        engine = nil
        resumed = false
        update { (status: inout Status) in status.running = false }
    }

    /// Queue local changes. They are written to disk first, so a crash cannot lose them.
    @discardableResult
    func queue(_ items: [SyncItemDTO]) -> Bool {
        guard storage.putOutbox(items) else { return false }
        guard let engine, resumed else { return true }
        var changes: [CKSyncEngine.PendingRecordZoneChange] = []
        for item in items { changes.append(.saveRecord(recordID(for: item.recordName))) }
        engine.state.add(pendingRecordZoneChanges: changes)
        return true
    }

    /// The web app no longer needs these sent (it merged iCloud's newer version instead).
    func drop(_ names: [String]) {
        storage.dropOutbox(names)
        guard let engine else { return }
        var removals: [CKSyncEngine.PendingRecordZoneChange] = []
        for name in names { removals.append(.saveRecord(recordID(for: name))) }
        engine.state.remove(pendingRecordZoneChanges: removals)
    }

    /// True when iCloud was reached. False means "couldn't tell", which is not "nothing there".
    func fetchNow() async -> Bool {
        guard let engine else { return false }
        do {
            try await engine.fetchChanges()
            return true
        } catch {
            update { (status: inout Status) in status.lastError = "fetchFailed" }
            return false
        }
    }

    func sendNow() async {
        guard resumed else { return }
        try? await engine?.sendChanges()
    }

    func userKey() async -> String? {
        guard let id = try? await container.userRecordID() else { return nil }
        return id.recordName
    }

    private func recordID(for name: String) -> CKRecord.ID {
        CKRecord.ID(recordName: name, zoneID: Self.zoneID)
    }

    // MARK: CKSyncEngineDelegate

    func handleEvent(_ event: CKSyncEngine.Event, syncEngine: CKSyncEngine) async {
        switch event {
        case .stateUpdate(let update):
            if let data = try? JSONEncoder().encode(update.stateSerialization) { storage.saveEngineState(data) }

        case .accountChange(let change):
            switch change.changeType {
            case .signIn:
                // Signing back in does not lift a pause: only the person can, explicitly.
                break
            case .signOut:
                // Keep every local change. Sync waits until the person decides what to do.
                storage.resetCloudState()
                pauseNow(account: "signOut")
            case .switchAccounts:
                storage.resetCloudState()
                pauseNow(account: "switchAccounts")
            @unknown default:
                break
            }

        case .fetchedDatabaseChanges(let changes):
            for deletion in changes.deletions where deletion.zoneID == Self.zoneID {
                // The person (or iCloud storage management) removed the data. Never re-upload silently.
                storage.resetCloudState()
                pauseNow(zoneDeleted: true)
            }

        case .fetchedRecordZoneChanges(let changes):
            var incoming: [SyncItemDTO] = []
            for modification in changes.modifications {
                guard let dto = dto(from: modification.record) else { continue }
                storage.setSystemFields(systemFields(of: modification.record), for: dto.recordName)
                incoming.append(dto)
            }
            if !incoming.isEmpty {
                if !storage.putInbox(incoming) { self.update { (status: inout Status) in status.lastError = "inboxWrite" } }
                emit("syncInbound")
            }

        case .sentRecordZoneChanges(let sent):
            for record in sent.savedRecords {
                storage.setSystemFields(systemFields(of: record), for: record.recordID.recordName)
                if let dto = dto(from: record) { storage.confirmSent(dto) }
            }
            removeTempFiles()
            for failure in sent.failedRecordSaves { handleFailedSave(failure, syncEngine: syncEngine) }
            var quota = false
            for failure in sent.failedRecordSaves where failure.error.code == .quotaExceeded { quota = true }
            let quotaExceeded = quota
            self.update { (status: inout Status) in status.quotaExceeded = quotaExceeded }

        case .sentDatabaseChanges, .willFetchChanges, .willFetchRecordZoneChanges, .didFetchRecordZoneChanges,
             .didFetchChanges, .willSendChanges, .didSendChanges:
            break

        @unknown default:
            break
        }
    }

    private func handleFailedSave(_ failure: CKSyncEngine.Event.SentRecordZoneChanges.FailedRecordSave, syncEngine: CKSyncEngine) {
        let name = failure.record.recordID.recordName
        switch failure.error.code {
        case .serverRecordChanged:
            // Someone else wrote first. Hand their version to the web app to merge; the web app
            // then queues the merged result. Our queued version stays in the outbox until then.
            if let server = failure.error.serverRecord, let dto = dto(from: server) {
                storage.setSystemFields(systemFields(of: server), for: name)
                storage.putInbox([dto])
                emit("syncInbound")
            }
        case .zoneNotFound:
            // The iCloud copy was removed. Do not recreate it and re-upload on our own.
            pauseNow(zoneDeleted: true)
        case .unknownItem:
            storage.setSystemFields(nil, for: name)
            syncEngine.state.add(pendingRecordZoneChanges: [.saveRecord(failure.record.recordID)])
        case .networkFailure, .networkUnavailable, .zoneBusy, .serviceUnavailable, .notAuthenticated, .operationCancelled, .requestRateLimited:
            // CKSyncEngine retries these itself.
            syncEngine.state.add(pendingRecordZoneChanges: [.saveRecord(failure.record.recordID)])
        case .quotaExceeded:
            break
        default:
            let code = String(failure.error.code.rawValue)
            update { (status: inout Status) in status.lastError = code }
        }
    }

    func nextRecordZoneChangeBatch(_ context: CKSyncEngine.SendChangesContext, syncEngine: CKSyncEngine) async -> CKSyncEngine.RecordZoneChangeBatch? {
        let scope = context.options.scope
        let pending = syncEngine.state.pendingRecordZoneChanges.filter { scope.contains($0) }
        return await CKSyncEngine.RecordZoneChangeBatch(pendingChanges: pending) { [self] recordID in
            guard let item = storage.outboxItem(recordID.recordName) else {
                // Nothing left to send for this record: drop the pending change.
                syncEngine.state.remove(pendingRecordZoneChanges: [.saveRecord(recordID)])
                return nil
            }
            return record(for: item, recordID: recordID)
        }
    }

    // MARK: Records

    private func record(for item: SyncItemDTO, recordID: CKRecord.ID) -> CKRecord? {
        guard PayloadCheck.fits(item.fields) else {
            // Too large to send: keep it in the outbox and say so, rather than sending part of it.
            self.update { (status: inout Status) in status.lastError = "payloadTooLarge" }
            return nil
        }
        let record: CKRecord
        if let data = storage.systemFields(for: item.recordName),
           let coder = try? NSKeyedUnarchiver(forReadingFrom: data) {
            coder.requiresSecureCoding = true
            record = CKRecord(coder: coder) ?? CKRecord(recordType: Self.recordType, recordID: recordID)
            coder.finishDecoding()
        } else {
            record = CKRecord(recordType: Self.recordType, recordID: recordID)
        }
        record["syncId"] = item.syncId as CKRecordValue
        record["itemId"] = item.itemId as CKRecordValue
        record["v"] = item.v as CKRecordValue
        record["deleted"] = (item.deleted ? 1 : 0) as CKRecordValue
        record["at"] = item.at as CKRecordValue
        let file = FileManager.default.temporaryDirectory.appendingPathComponent("spread-\(UUID().uuidString).json")
        do {
            try Data(item.fields.utf8).write(to: file, options: .atomic)
        } catch {
            // Never hand CloudKit an asset that does not exist. The change stays in the outbox.
            self.update { (status: inout Status) in status.lastError = "payloadWrite" }
            return nil
        }
        tempLock.lock(); tempFiles.append(file); tempLock.unlock()
        record["h"] = PayloadCheck.hash(item.fields) as CKRecordValue
        record["payload"] = CKAsset(fileURL: file)
        return record
    }

    private func dto(from record: CKRecord) -> SyncItemDTO? {
        guard record.recordType == Self.recordType,
              let syncId = record["syncId"] as? String,
              let itemId = record["itemId"] as? String,
              let v = record["v"] as? String else { return nil }
        let text = (record["payload"] as? CKAsset)?.fileURL.flatMap { try? String(contentsOf: $0, encoding: .utf8) }
        guard case .ok(let fields) = PayloadCheck.verify(text: text, expectedHash: record["h"] as? String) else {
            // Missing, truncated or altered: never read as an empty item. Counted and reported.
            self.update { (status: inout Status) in
                status.damagedRecords += 1
                status.lastError = "payloadDamaged"
            }
            return nil
        }
        var deleted = false
        if let flag = record["deleted"] as? NSNumber { deleted = flag.int64Value != 0 }
        var at = ""
        if let stamp = record["at"] as? String { at = stamp }
        return SyncItemDTO(syncId: syncId, itemId: itemId, fields: fields, v: v, deleted: deleted, at: at)
    }

    private func removeTempFiles() {
        tempLock.lock()
        let files = tempFiles
        tempFiles = []
        tempLock.unlock()
        for file in files { try? FileManager.default.removeItem(at: file) }
    }

    private func systemFields(of record: CKRecord) -> Data {
        let coder = NSKeyedArchiver(requiringSecureCoding: true)
        record.encodeSystemFields(with: coder)
        coder.finishEncoding()
        return coder.encodedData
    }
}
