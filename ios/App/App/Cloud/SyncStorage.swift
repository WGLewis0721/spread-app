import Foundation

/// One synced item as it crosses the bridge. The native side never looks inside `fields` or `v`:
/// the web app owns what an item means and how two versions merge.
struct SyncItemDTO: Codable, Equatable {
    var syncId: String
    var itemId: String
    /// JSON text of the item's fields (empty object for a tombstone).
    var fields: String
    /// JSON text of the version vector.
    var v: String
    var deleted: Bool
    var at: String

    var recordName: String { "\(syncId)|\(itemId)" }
}

/// Everything the sync engine must not lose across a relaunch, as small JSON files in
/// Application Support. The files are excluded from device backups: restoring a phone from
/// another phone's backup must not inherit that phone's change tokens or half-sent changes.
final class SyncStorage {
    private let lock = NSLock()
    private let folder: URL
    private var outbox: [String: SyncItemDTO]
    private var inbox: [String: SyncItemDTO]
    private var systemFields: [String: Data]

    init() {
        let base = (try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true))
            ?? FileManager.default.temporaryDirectory
        var folder = base.appendingPathComponent("SpreadSync", isDirectory: true)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? folder.setResourceValues(values)
        self.folder = folder
        outbox = SyncStorage.load([String: SyncItemDTO].self, from: folder.appendingPathComponent("outbox.json")) ?? [:]
        inbox = SyncStorage.load([String: SyncItemDTO].self, from: folder.appendingPathComponent("inbox.json")) ?? [:]
        systemFields = SyncStorage.load([String: Data].self, from: folder.appendingPathComponent("system-fields.json")) ?? [:]
    }

    private static func load<T: Decodable>(_ type: T.Type, from url: URL) -> T? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    private func save<T: Encodable>(_ value: T, as name: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        try? data.write(to: folder.appendingPathComponent(name), options: .atomic)
    }

    // MARK: Engine state

    var engineStateURL: URL { folder.appendingPathComponent("engine-state.json") }

    func loadEngineState() -> Data? { try? Data(contentsOf: engineStateURL) }

    func saveEngineState(_ data: Data) { try? data.write(to: engineStateURL, options: .atomic) }

    func clearEngineState() {
        lock.lock(); defer { lock.unlock() }
        try? FileManager.default.removeItem(at: engineStateURL)
        systemFields = [:]
        save(systemFields, as: "system-fields.json")
    }

    // MARK: Outbox (changes made here that iCloud has not confirmed)

    func putOutbox(_ items: [SyncItemDTO]) {
        lock.lock(); defer { lock.unlock() }
        for item in items { outbox[item.recordName] = item }
        save(outbox, as: "outbox.json")
    }

    func outboxItem(_ recordName: String) -> SyncItemDTO? {
        lock.lock(); defer { lock.unlock() }
        return outbox[recordName]
    }

    /// Remove an item once iCloud has it, unless the web app queued a newer version meanwhile.
    func confirmSent(_ sent: SyncItemDTO) {
        lock.lock(); defer { lock.unlock() }
        if outbox[sent.recordName] == sent {
            outbox.removeValue(forKey: sent.recordName)
            save(outbox, as: "outbox.json")
        }
    }

    func dropOutbox(_ names: [String]) {
        lock.lock(); defer { lock.unlock() }
        for name in names { outbox.removeValue(forKey: name) }
        save(outbox, as: "outbox.json")
    }

    var outboxNames: [String] {
        lock.lock(); defer { lock.unlock() }
        return outbox.keys.sorted()
    }

    var outboxCount: Int {
        lock.lock(); defer { lock.unlock() }
        return outbox.count
    }

    // MARK: Inbox (changes from iCloud the web app has not merged yet)

    func putInbox(_ items: [SyncItemDTO]) {
        lock.lock(); defer { lock.unlock() }
        for item in items { inbox[item.recordName] = item }
        save(inbox, as: "inbox.json")
    }

    func inboxItems() -> [SyncItemDTO] {
        lock.lock(); defer { lock.unlock() }
        return inbox.values.sorted { $0.recordName < $1.recordName }
    }

    func ackInbox(_ names: [String]) {
        lock.lock(); defer { lock.unlock() }
        for name in names { inbox.removeValue(forKey: name) }
        save(inbox, as: "inbox.json")
    }

    // MARK: Record system fields (the change tags CloudKit needs to accept an update)

    func setSystemFields(_ data: Data?, for recordName: String) {
        lock.lock(); defer { lock.unlock() }
        systemFields[recordName] = data
        save(systemFields, as: "system-fields.json")
    }

    func systemFields(for recordName: String) -> Data? {
        lock.lock(); defer { lock.unlock() }
        return systemFields[recordName]
    }

    /// Everything but the user's pending work: used when iCloud account changes or sync is turned off.
    func resetCloudState() {
        clearEngineState()
    }
}
