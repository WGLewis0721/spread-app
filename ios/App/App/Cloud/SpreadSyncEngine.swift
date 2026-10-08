import CloudKit
import Foundation

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
    }

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

    func start() {
        if engine != nil { return }
        var serialization: CKSyncEngine.State.Serialization?
        if let data = storage.loadEngineState() {
            serialization = try? JSONDecoder().decode(CKSyncEngine.State.Serialization.self, from: data)
        }
        var configuration = CKSyncEngine.Configuration(database: container.privateCloudDatabase, stateSerialization: serialization, delegate: self)
        configuration.automaticallySync = true
        let created = CKSyncEngine(configuration)
        created.state.add(pendingDatabaseChanges: [.saveZone(CKRecordZone(zoneID: Self.zoneID))])
        engine = created
        update { $0.running = true; $0.accountChanged = nil; $0.zoneDeleted = false; $0.quotaExceeded = false; $0.lastError = nil }
    }

    func stop() {
        engine = nil
        update { $0.running = false }
    }

    /// Queue local changes. They are written to disk first, so a crash cannot lose them.
    func queue(_ items: [SyncItemDTO]) {
        storage.putOutbox(items)
        guard let engine else { return }
        engine.state.add(pendingRecordZoneChanges: items.map { .saveRecord(recordID(for: $0.recordName)) })
    }

    func fetchNow() async {
        try? await engine?.fetchChanges()
    }

    func sendNow() async {
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
                self.update { $0.accountChanged = nil }
            case .signOut:
                // Keep every local change. Sync waits until the person decides what to do.
                storage.resetCloudState()
                self.update { $0.accountChanged = "signOut" }
            case .switchAccounts:
                storage.resetCloudState()
                self.update { $0.accountChanged = "switchAccounts" }
            @unknown default:
                break
            }

        case .fetchedDatabaseChanges(let changes):
            for deletion in changes.deletions where deletion.zoneID == Self.zoneID {
                // The person (or iCloud storage management) removed the data. Never re-upload silently.
                storage.resetCloudState()
                self.update { $0.zoneDeleted = true }
            }

        case .fetchedRecordZoneChanges(let changes):
            var incoming: [SyncItemDTO] = []
            for modification in changes.modifications {
                guard let dto = dto(from: modification.record) else { continue }
                storage.setSystemFields(systemFields(of: modification.record), for: dto.recordName)
                incoming.append(dto)
            }
            if !incoming.isEmpty {
                storage.putInbox(incoming)
                emit("syncInbound")
            }

        case .sentRecordZoneChanges(let sent):
            for record in sent.savedRecords {
                storage.setSystemFields(systemFields(of: record), for: record.recordID.recordName)
                if let dto = dto(from: record) { storage.confirmSent(dto) }
            }
            for failure in sent.failedRecordSaves { handleFailedSave(failure, syncEngine: syncEngine) }
            update { $0.quotaExceeded = sent.failedRecordSaves.contains { $0.error.code == .quotaExceeded } }

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
            syncEngine.state.add(pendingDatabaseChanges: [.saveZone(CKRecordZone(zoneID: Self.zoneID))])
            syncEngine.state.add(pendingRecordZoneChanges: [.saveRecord(failure.record.recordID)])
        case .unknownItem:
            storage.setSystemFields(nil, for: name)
            syncEngine.state.add(pendingRecordZoneChanges: [.saveRecord(failure.record.recordID)])
        case .networkFailure, .networkUnavailable, .zoneBusy, .serviceUnavailable, .notAuthenticated, .operationCancelled, .requestRateLimited:
            // CKSyncEngine retries these itself.
            syncEngine.state.add(pendingRecordZoneChanges: [.saveRecord(failure.record.recordID)])
        case .quotaExceeded:
            break
        default:
            update { $0.lastError = "\(failure.error.code.rawValue)" }
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

    private func record(for item: SyncItemDTO, recordID: CKRecord.ID) -> CKRecord {
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
        try? Data(item.fields.utf8).write(to: file, options: .atomic)
        record["payload"] = CKAsset(fileURL: file)
        return record
    }

    private func dto(from record: CKRecord) -> SyncItemDTO? {
        guard record.recordType == Self.recordType,
              let syncId = record["syncId"] as? String,
              let itemId = record["itemId"] as? String,
              let v = record["v"] as? String else { return nil }
        let fields: String
        if let url = (record["payload"] as? CKAsset)?.fileURL, let text = try? String(contentsOf: url, encoding: .utf8) {
            fields = text
        } else {
            fields = "{}"
        }
        return SyncItemDTO(
            syncId: syncId, itemId: itemId, fields: fields, v: v,
            deleted: (record["deleted"] as? Int64 ?? 0) != 0,
            at: record["at"] as? String ?? ""
        )
    }

    private func systemFields(of record: CKRecord) -> Data {
        let coder = NSKeyedArchiver(requiringSecureCoding: true)
        record.encodeSystemFields(with: coder)
        coder.finishEncoding()
        return coder.encodedData
    }
}
