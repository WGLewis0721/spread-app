import Capacitor
import Foundation
import SpreadCloudCore

/// The bridge between the web planner and the iCloud features. The planner owns every decision
/// about *what* to back up or merge; this only moves bytes, reports facts about iCloud, and keeps
/// this device's identity. Nothing runs unless the web app calls it, and the web app only calls
/// it when the matching `cloud.*` flag is on.
@objc(SpreadCloudPlugin)
public class SpreadCloudPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SpreadCloudPlugin"
    public let jsName = "SpreadCloud"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "backupWrite", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "backupList", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "backupRead", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncStart", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncStop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncQueue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncInbox", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncOutbox", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncDrop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncAck", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncNow", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncResume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncClearPause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncBrowse", returnType: CAPPluginReturnPromise),
    ]

    private let io = DispatchQueue(label: "com.graymatter.spread.cloud.io", qos: .utility)
    private let accounts = AccountMonitor()
    private lazy var store = BackupStore(deviceId: DeviceIdentity.current())
    private let syncStorage = SyncStorage()
    private lazy var sync = SpreadSyncEngine(storage: syncStorage) { [weak self] event in
        self?.notifyListeners(event, data: [:])
    }
    private static let iso: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    override public func load() {
        accounts.start { [weak self] in self?.notifyListeners("accountChanged", data: [:]) }
    }

    private func describe(_ listing: BackupListing) -> [String: Any] {
        var row: [String: Any] = [
            "deviceId": listing.deviceId,
            "name": listing.name,
            "createdAt": Self.iso.string(from: listing.createdAt),
            "bytes": listing.bytes,
            "uploaded": listing.uploaded,
            "downloaded": listing.downloaded,
            "own": listing.deviceId == store.deviceId,
        ]
        if let pin = listing.pin { row["pin"] = pin }
        if let error = listing.uploadError { row["uploadError"] = error }
        return row
    }

    private func fail(_ call: CAPPluginCall, _ error: Error) {
        let code: String
        switch error as? BackupError {
        case .some(.noSpace): code = "noSpace"
        case .some(.verificationFailed): code = "verificationFailed"
        case .some(.invalidArguments): code = "invalidArguments"
        case .some(.notFound): code = "notFound"
        case .some(.downloadTimedOut): code = "downloadTimedOut"
        case .none: code = "failed"
        }
        call.reject(error.localizedDescription, code, error)
    }

    /// Facts only. The web app turns them into the sentence the person reads.
    @objc func status(_ call: CAPPluginCall) {
        Task {
            let account = await accounts.snapshot()
            io.async { [self] in
                let own = store.list(ownOnly: true)
                var result: [String: Any] = [
                    "deviceId": store.deviceId,
                    "cloudKit": account.cloudKit,
                    "driveAvailable": account.driveAvailable,
                    "backupCount": own.count,
                ]
                if let newest = own.first(where: { $0.pin == nil }) {
                    result["lastBackupAt"] = Self.iso.string(from: newest.createdAt)
                    result["lastBackupUploaded"] = newest.uploaded
                    if let error = newest.uploadError { result["lastUploadError"] = error }
                }
                if let uploaded = own.first(where: { $0.uploaded && $0.pin == nil }) {
                    result["lastUploadedAt"] = Self.iso.string(from: uploaded.createdAt)
                }
                call.resolve(result)
            }
        }
    }

    @objc func backupWrite(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), let data = text.data(using: .utf8) else {
            call.reject("text is required", "invalidArguments")
            return
        }
        let pin = call.getString("pin")
        io.async { [self] in
            do {
                let result = try store.write(data, pin: pin)
                call.resolve([
                    "name": result.name,
                    "bytes": result.bytes,
                    "createdAt": Self.iso.string(from: result.createdAt),
                    "verified": result.verified,
                    "inICloudContainer": result.inICloudContainer,
                ])
            } catch {
                fail(call, error)
            }
        }
    }

    @objc func backupList(_ call: CAPPluginCall) {
        let ownOnly = call.getBool("ownOnly") ?? false
        io.async { [self] in
            call.resolve(["backups": store.list(ownOnly: ownOnly).map(describe)])
        }
    }

    @objc func backupRead(_ call: CAPPluginCall) {
        guard let device = call.getString("deviceId"), let name = call.getString("name") else {
            call.reject("deviceId and name are required", "invalidArguments")
            return
        }
        io.async { [self] in
            do {
                let data = try store.read(device: device, name: name)
                guard let text = String(data: data, encoding: .utf8) else { throw BackupError.verificationFailed }
                call.resolve(["text": text])
            } catch {
                fail(call, error)
            }
        }
    }

    // MARK: Sync

    private func decode(_ call: CAPPluginCall) -> [SyncItemDTO]? {
        guard let rows = call.getArray("items") as? [[String: Any]] else { return nil }
        var out: [SyncItemDTO] = []
        for row in rows {
            guard let syncId = row["syncId"] as? String, let itemId = row["itemId"] as? String,
                  let fields = row["fields"] as? String, let v = row["v"] as? String else { return nil }
            var deleted = false
            if let flag = row["deleted"] as? Bool { deleted = flag }
            var at = ""
            if let stamp = row["at"] as? String { at = stamp }
            out.append(SyncItemDTO(syncId: syncId, itemId: itemId, fields: fields, v: v, deleted: deleted, at: at))
        }
        return out
    }

    @objc func syncStart(_ call: CAPPluginCall) {
        Task {
            await sync.start()
            call.resolve()
        }
    }

    /// Allows sending. Refused while sync is paused for any reason.
    @objc func syncResume(_ call: CAPPluginCall) {
        Task {
            if await sync.resume() { call.resolve() } else { call.reject("Sync is paused", "paused") }
        }
    }

    /// The person explicitly chose to upload to the current iCloud again.
    @objc func syncClearPause(_ call: CAPPluginCall) {
        sync.clearPause()
        call.resolve()
    }

    /// Read-only: fetch and list. Never creates the zone or sends. Rejects when iCloud was not reached.
    @objc func syncBrowse(_ call: CAPPluginCall) {
        Task {
            await sync.start()
            if await sync.fetchNow() { call.resolve() } else { call.reject("Couldn't reach iCloud", "fetchFailed") }
        }
    }

    @objc func syncStop(_ call: CAPPluginCall) {
        sync.stop()
        call.resolve()
    }

    @objc func syncQueue(_ call: CAPPluginCall) {
        guard let items = decode(call) else {
            call.reject("items are required", "invalidArguments")
            return
        }
        guard sync.queue(items) else {
            call.reject("The changes could not be saved on this device", "queueWriteFailed")
            return
        }
        call.resolve()
    }

    @objc func syncInbox(_ call: CAPPluginCall) {
        var rows: [[String: Any]] = []
        for item in syncStorage.inboxItems() {
            var row: [String: Any] = [:]
            row["syncId"] = item.syncId
            row["itemId"] = item.itemId
            row["fields"] = item.fields
            row["v"] = item.v
            row["deleted"] = item.deleted
            row["at"] = item.at
            rows.append(row)
        }
        call.resolve(["items": rows])
    }

    @objc func syncOutbox(_ call: CAPPluginCall) {
        call.resolve(["names": syncStorage.outboxNames])
    }

    @objc func syncDrop(_ call: CAPPluginCall) {
        let names = (call.getArray("names") as? [String]) ?? []
        sync.drop(names)
        call.resolve()
    }

    @objc func syncAck(_ call: CAPPluginCall) {
        guard let items = decode(call) else {
            call.reject("items are required", "invalidArguments")
            return
        }
        // Compare-and-remove: a newer version staged since the web app read the inbox stays.
        guard syncStorage.ackInbox(items) else {
            call.reject("The acknowledgment could not be saved", "inboxWriteFailed")
            return
        }
        call.resolve()
    }

    @objc func syncStatus(_ call: CAPPluginCall) {
        Task {
            let current = sync.currentStatus()
            var result: [String: Any] = [
                "running": current.running,
                "zoneDeleted": current.zoneDeleted,
                "quotaExceeded": current.quotaExceeded,
                "damagedRecords": current.damagedRecords,
                "needsRepair": current.needsRepair || syncStorage.needsRepair,
                "outboxCount": syncStorage.outboxCount,
                "inboxCount": syncStorage.inboxItems().count,
            ]
            if let changed = current.accountChanged { result["accountChanged"] = changed }
            if let error = current.lastError { result["lastError"] = error }
            if let key = await sync.userKey() { result["accountKey"] = key }
            call.resolve(result)
        }
    }

    @objc func syncNow(_ call: CAPPluginCall) {
        Task {
            await sync.sendNow()
            _ = await sync.fetchNow()
            call.resolve()
        }
    }
}
