import CloudKit
import Foundation
#if canImport(SpreadCloudCore)
import SpreadCloudCore
#endif

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

    /// Set by `resume(syncId:)`. Until then the engine only fetches: nothing is created or sent in iCloud.
    private var resumed = false
    /// Profiles whose upload the person has confirmed in this run. Only their queued changes may be sent.
    private var resumedProfiles = Set<String>()
    /// The iCloud account verified at the moment of the last resume. Nothing is sent without one.
    private var confirmedAccount: String?
    /// The saved fetch position must not move past an inbound change that could not be written down.
    private var holdEngineState = false

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
        let created = CKSyncEngine(configuration)
        // A restored engine may carry pending sends from an earlier run (an old account, a profile
        // that has since stopped syncing). None of them may go out: only `resume` queues work.
        created.state.remove(pendingRecordZoneChanges: created.state.pendingRecordZoneChanges)
        created.state.remove(pendingDatabaseChanges: created.state.pendingDatabaseChanges)
        engine = created
        resetSendScope()
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

    /// Allow sending ONE profile's queued changes: create the zone if needed and queue that profile's
    /// outbox. Refused while paused, and refused when the signed-in account cannot be verified or does
    /// not match the account sync was set up with. Other profiles' queues stay where they are.
    /// If iCloud has a newer version of an item it rejects the write and hands that version to the
    /// web app, which merges it, so this cannot overwrite.
    @discardableResult
    func resume(syncId: String) async -> Bool {
        guard !syncId.isEmpty, !storage.pause.isPaused, let engine else { return false }
        // Identity must be known. An unreachable or signed-out account cannot be shown to match.
        guard let live = await userKey() else { return false }
        if let bound = storage.pause.boundAccount, bound != live {
            pauseNow(account: "switchAccounts")
            return false
        }
        if storage.pause.boundAccount == nil {
            // The binding must be on disk before anything is sent; if it cannot be saved, nothing is.
            guard storage.updatePause({ $0.boundAccount = live }) else { return false }
        }
        guard self.engine === engine, !storage.pause.isPaused else { return false }
        confirmedAccount = live
        resumed = true
        resumedProfiles.insert(syncId)
        storage.stampUnstamped(syncId: syncId, account: live)
        engine.state.add(pendingDatabaseChanges: [.saveZone(CKRecordZone(zoneID: Self.zoneID))])
        var resend: [CKSyncEngine.PendingRecordZoneChange] = []
        for name in storage.outboxNames(forSyncId: syncId) { resend.append(.saveRecord(recordID(for: name))) }
        if !resend.isEmpty { engine.state.add(pendingRecordZoneChanges: resend) }
        return true
    }

    /// The person chose to upload ONE profile to the iCloud account that is signed in now. This lifts
    /// the pause and forgets the old account binding and engine position. Queued changes of every
    /// other profile stay queued under the account they were made for and are not released.
    func clearPause(syncId: String) {
        engine = nil
        resetSendScope()
        storage.updatePause { $0 = SyncPause() }
        storage.resetCloudState()
        update { (status: inout Status) in
            status.running = false
            status.zoneDeleted = false
            status.accountChanged = nil
        }
    }

    /// A profile stopped syncing: nothing held for it may be sent or applied later.
    @discardableResult
    func forget(syncId: String) -> Bool {
        if let engine {
            var removals: [CKSyncEngine.PendingRecordZoneChange] = []
            for name in storage.outboxNames(forSyncId: syncId) { removals.append(.saveRecord(recordID(for: name))) }
            if !removals.isEmpty { engine.state.remove(pendingRecordZoneChanges: removals) }
        }
        resumedProfiles.remove(syncId)
        return storage.forget(syncId: syncId)
    }

    private func resetSendScope() {
        resumed = false
        resumedProfiles = []
        confirmedAccount = nil
        holdEngineState = false
    }

    private func pauseNow(zoneDeleted: Bool = false, account: String? = nil) {
        storage.updatePause {
            if zoneDeleted { $0.zoneDeleted = true }
            if let account { $0.accountChanged = account }
        }
        if let running = engine { Task { await running.cancelOperations() } }
        engine = nil
        resetSendScope()
        let pause = storage.pause
        update { (status: inout Status) in
            status.running = false
            status.zoneDeleted = pause.zoneDeleted
            status.accountChanged = pause.accountChanged
        }
    }

    func stop() {
        if let running = engine { Task { await running.cancelOperations() } }
        engine = nil
        resetSendScope()
        update { (status: inout Status) in status.running = false }
    }

    /// Queue local changes. They are written to disk first, so a crash cannot lose them.
    @discardableResult
    func queue(_ items: [SyncItemDTO]) -> Bool {
        // Stamped with the account bound now, so it can only ever be sent to that account.
        guard storage.putOutbox(items, account: storage.pause.boundAccount) else { return false }
        guard let engine, resumed else { return true }
        var changes: [CKSyncEngine.PendingRecordZoneChange] = []
        for item in items where resumedProfiles.contains(item.syncId) { changes.append(.saveRecord(recordID(for: item.recordName))) }
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
        guard resumed, !storage.pause.isPaused else { return }
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
        // A callback from an engine that has been stopped, paused or replaced must not touch anything.
        guard syncEngine === engine else { return }
        switch event {
        case .stateUpdate(let update):
            // The fetch position only advances once every inbound change before it is safely written down;
            // otherwise a relaunch would resume past a change that exists nowhere on this device.
            if holdEngineState { break }
            if let data = try? JSONEncoder().encode(update.stateSerialization), !storage.saveEngineState(data) {
                self.update { (status: inout Status) in status.lastError = "engineStateWrite" }
            }

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
                // Anything queued for these records was made without iCloud's new version. It keeps its
                // place in the outbox but cannot be sent until the web app has merged and queued a replacement.
                storage.markStale(incoming.map(\.recordName))
                if storage.putInbox(incoming) {
                    emit("syncInbound")
                } else {
                    holdEngineState = true
                    self.update { (status: inout Status) in status.lastError = "inboxWrite" }
                }
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
                // The queued payload was made against the older record: hold it until it is merged.
                storage.markStale([name])
                if storage.putInbox([dto]) {
                    emit("syncInbound")
                } else {
                    holdEngineState = true
                    update { (status: inout Status) in status.lastError = "inboxWrite" }
                }
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
        // The last checkpoint before a record leaves the device: a stopped, paused or replaced engine sends nothing.
        guard syncEngine === engine else { return nil }
        let scope = context.options.scope
        let pending = syncEngine.state.pendingRecordZoneChanges.filter { scope.contains($0) }
        return await CKSyncEngine.RecordZoneChangeBatch(pendingChanges: pending) { [self] recordID in
            let name = recordID.recordName
            let item = storage.outboxItem(name)
            let decision = OutboxGate.decide(
                item: item,
                meta: storage.meta(for: name),
                resumed: resumed,
                resumedProfiles: resumedProfiles,
                pause: storage.pause,
                confirmedAccount: confirmedAccount
            )
            guard decision == .send, let item else {
                // Not sendable now. The change stays in the outbox; `resume`/`queue` schedule it again when it may go.
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
