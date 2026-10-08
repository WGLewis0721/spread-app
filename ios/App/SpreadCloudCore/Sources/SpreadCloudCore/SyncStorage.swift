import Foundation

/// One synced item as it crosses the bridge. The native side never looks inside `fields` or `v`:
/// the web app owns what an item means and how two versions merge.
public struct SyncItemDTO: Codable, Equatable {
    public var syncId: String
    public var itemId: String
    /// JSON text of the item's fields (empty object for a tombstone).
    public var fields: String
    /// JSON text of the version vector.
    public var v: String
    public var deleted: Bool
    public var at: String

    public init(syncId: String, itemId: String, fields: String, v: String, deleted: Bool, at: String) {
        self.syncId = syncId
        self.itemId = itemId
        self.fields = fields
        self.v = v
        self.deleted = deleted
        self.at = at
    }

    public var recordName: String { "\(syncId)|\(itemId)" }
}

/// Why sync must not send, kept on disk so a relaunch cannot forget it.
public struct SyncPause: Codable, Equatable {
    public var zoneDeleted = false
    /// "signOut" or "switchAccounts"
    public var accountChanged: String?
    /// The iCloud account this device's sync was set up with.
    public var boundAccount: String?
    /// The pause file existed but could not be read. Sending is refused until the person decides:
    /// a damaged "do not send" must never read as "send".
    public var damaged = false

    public init() {}

    public var isPaused: Bool { zoneDeleted || accountChanged != nil || damaged }

    enum CodingKeys: String, CodingKey { case zoneDeleted, accountChanged, boundAccount, damaged }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        zoneDeleted = try c.decodeIfPresent(Bool.self, forKey: .zoneDeleted) ?? false
        accountChanged = try c.decodeIfPresent(String.self, forKey: .accountChanged)
        boundAccount = try c.decodeIfPresent(String.self, forKey: .boundAccount)
        damaged = try c.decodeIfPresent(Bool.self, forKey: .damaged) ?? false
    }
}

/// What is known about a queued change besides its content.
public struct OutboxMeta: Codable, Equatable {
    /// The iCloud account that was bound when the change was queued. A change is only ever sent to that account.
    public var account: String?
    /// iCloud's version of this record arrived after the change was queued. The queued content was
    /// made without it, so it must not be sent (with iCloud's new tag) until the web app has merged
    /// and queued a replacement.
    public var stale: Bool

    public init(account: String?, stale: Bool = false) {
        self.account = account
        self.stale = stale
    }
}

/// Everything the sync engine must not lose across a relaunch, as small JSON files in
/// Application Support. The files are excluded from device backups: restoring a phone from
/// another phone's backup must not inherit that phone's change tokens or half-sent changes.
public final class SyncStorage {
    private let lock = NSLock()
    private let folder: URL
    private var outbox: [String: SyncItemDTO]
    private var inbox: [String: SyncItemDTO]
    private var systemFields: [String: Data]
    private var pauseState: SyncPause
    private var outboxMeta: [String: OutboxMeta]
    /// Set when a queue file was unreadable (moved aside) or a write failed. The web app is told.
    public private(set) var needsRepair = false

    /// `folder` is for tests; the app passes nothing and gets Application Support.
    public init(folder given: URL? = nil) {
        var folder: URL
        if let given {
            folder = given
        } else {
            let base = (try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true))
                ?? FileManager.default.temporaryDirectory
            folder = base.appendingPathComponent("SpreadSync", isDirectory: true)
        }
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        #if os(iOS) || os(macOS)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? folder.setResourceValues(values)
        #endif
        self.folder = folder
        var repair = false
        outbox = SyncStorage.load([String: SyncItemDTO].self, from: folder.appendingPathComponent("outbox.json"), repair: &repair) ?? [:]
        inbox = SyncStorage.load([String: SyncItemDTO].self, from: folder.appendingPathComponent("inbox.json"), repair: &repair) ?? [:]
        systemFields = SyncStorage.load([String: Data].self, from: folder.appendingPathComponent("system-fields.json"), repair: &repair) ?? [:]
        outboxMeta = SyncStorage.load([String: OutboxMeta].self, from: folder.appendingPathComponent("outbox-meta.json"), repair: &repair) ?? [:]
        var pauseRepair = false
        var loadedPause = SyncStorage.load(SyncPause.self, from: folder.appendingPathComponent("pause.json"), repair: &pauseRepair) ?? SyncPause()
        if pauseRepair {
            // The file that says whether sending is allowed is unreadable: fail closed, and keep it closed.
            loadedPause = SyncPause()
            loadedPause.damaged = true
        }
        pauseState = loadedPause
        needsRepair = repair || pauseRepair
        if pauseRepair { save(pauseState, as: "pause.json") }
    }

    /// A missing file is normal (first run). A file that exists but cannot be read or decoded is set
    /// aside as `<name>.corrupt-<time>` so it can be inspected, and `repair` is raised.
    private static func load<T: Decodable>(_ type: T.Type, from url: URL, repair: inout Bool) -> T? {
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        if let data = try? Data(contentsOf: url), let value = try? JSONDecoder().decode(type, from: data) { return value }
        let aside = url.deletingLastPathComponent().appendingPathComponent(url.lastPathComponent + ".corrupt-\(Int(Date().timeIntervalSince1970))")
        try? FileManager.default.moveItem(at: url, to: aside)
        repair = true
        return nil
    }

    @discardableResult
    private func save<T: Encodable>(_ value: T, as name: String) -> Bool {
        do {
            let data = try JSONEncoder().encode(value)
            try data.write(to: folder.appendingPathComponent(name), options: .atomic)
            return true
        } catch {
            needsRepair = true
            return false
        }
    }

    // MARK: Pause (durable)

    public var pause: SyncPause {
        lock.lock(); defer { lock.unlock() }
        return pauseState
    }

    @discardableResult
    public func updatePause(_ change: (inout SyncPause) -> Void) -> Bool {
        lock.lock(); defer { lock.unlock() }
        change(&pauseState)
        return save(pauseState, as: "pause.json")
    }

    // MARK: Engine state

    public var engineStateURL: URL { folder.appendingPathComponent("engine-state.json") }

    public func loadEngineState() -> Data? { try? Data(contentsOf: engineStateURL) }

    /// False when the engine state could not be written. Callers must then not treat the fetched
    /// position as saved.
    @discardableResult
    public func saveEngineState(_ data: Data) -> Bool {
        do {
            try data.write(to: engineStateURL, options: .atomic)
            return true
        } catch {
            needsRepair = true
            return false
        }
    }

    public func clearEngineState() {
        lock.lock(); defer { lock.unlock() }
        try? FileManager.default.removeItem(at: engineStateURL)
        systemFields = [:]
        save(systemFields, as: "system-fields.json")
    }

    // MARK: Outbox (changes made here that iCloud has not confirmed)

    /// False when the queue could not be written; the caller must report that, not assume it is queued.
    @discardableResult
    public func putOutbox(_ items: [SyncItemDTO], account: String? = nil) -> Bool {
        lock.lock(); defer { lock.unlock() }
        for item in items {
            outbox[item.recordName] = item
            // A freshly queued change is a new payload made from what the web app knows now: it is
            // no longer stale, and it belongs to the account that is bound now.
            outboxMeta[item.recordName] = OutboxMeta(account: account)
        }
        let saved = save(outbox, as: "outbox.json")
        return save(outboxMeta, as: "outbox-meta.json") && saved
    }

    public func meta(for recordName: String) -> OutboxMeta? {
        lock.lock(); defer { lock.unlock() }
        return outboxMeta[recordName]
    }

    /// iCloud's version of these records arrived: queued content for them was made without it.
    @discardableResult
    public func markStale(_ names: [String]) -> Bool {
        lock.lock(); defer { lock.unlock() }
        var changed = false
        for name in names where outbox[name] != nil {
            var meta = outboxMeta[name] ?? OutboxMeta(account: nil)
            if !meta.stale {
                meta.stale = true
                outboxMeta[name] = meta
                changed = true
            }
        }
        return changed ? save(outboxMeta, as: "outbox-meta.json") : true
    }

    /// Queued changes of one profile (record names are `<syncId>|<itemId>`).
    public func outboxNames(forSyncId syncId: String) -> [String] {
        lock.lock(); defer { lock.unlock() }
        return outbox.keys.filter { $0.hasPrefix("\(syncId)|") }.sorted()
    }

    /// Changes queued before an account was bound belong to the profile being linked now; they take that account.
    @discardableResult
    public func stampUnstamped(syncId: String, account: String) -> Bool {
        lock.lock(); defer { lock.unlock() }
        var changed = false
        for name in outbox.keys where name.hasPrefix("\(syncId)|") {
            var meta = outboxMeta[name] ?? OutboxMeta(account: nil)
            if meta.account == nil {
                meta.account = account
                outboxMeta[name] = meta
                changed = true
            }
        }
        return changed ? save(outboxMeta, as: "outbox-meta.json") : true
    }

    /// Remove everything held for one profile: queued changes, unmerged inbound changes, record tags.
    /// Used when the profile stops syncing, so its residue can never be sent later.
    @discardableResult
    public func forget(syncId: String) -> Bool {
        lock.lock(); defer { lock.unlock() }
        let prefix = "\(syncId)|"
        for name in outbox.keys where name.hasPrefix(prefix) { outbox.removeValue(forKey: name) }
        for name in inbox.keys where name.hasPrefix(prefix) { inbox.removeValue(forKey: name) }
        for name in outboxMeta.keys where name.hasPrefix(prefix) { outboxMeta.removeValue(forKey: name) }
        for name in systemFields.keys where name.hasPrefix(prefix) { systemFields.removeValue(forKey: name) }
        let a = save(outbox, as: "outbox.json")
        let b = save(inbox, as: "inbox.json")
        let c = save(outboxMeta, as: "outbox-meta.json")
        let d = save(systemFields, as: "system-fields.json")
        return a && b && c && d
    }

    public func outboxItem(_ recordName: String) -> SyncItemDTO? {
        lock.lock(); defer { lock.unlock() }
        return outbox[recordName]
    }

    /// Remove an item once iCloud has it, unless the web app queued a newer version meanwhile.
    public func confirmSent(_ sent: SyncItemDTO) {
        lock.lock(); defer { lock.unlock() }
        if outbox[sent.recordName] == sent {
            outbox.removeValue(forKey: sent.recordName)
            outboxMeta.removeValue(forKey: sent.recordName)
            save(outbox, as: "outbox.json")
            save(outboxMeta, as: "outbox-meta.json")
        }
    }

    public func dropOutbox(_ names: [String]) {
        lock.lock(); defer { lock.unlock() }
        for name in names {
            outbox.removeValue(forKey: name)
            outboxMeta.removeValue(forKey: name)
        }
        save(outbox, as: "outbox.json")
        save(outboxMeta, as: "outbox-meta.json")
    }

    public var outboxNames: [String] {
        lock.lock(); defer { lock.unlock() }
        return outbox.keys.sorted()
    }

    public var outboxCount: Int {
        lock.lock(); defer { lock.unlock() }
        return outbox.count
    }

    // MARK: Inbox (changes from iCloud the web app has not merged yet)

    @discardableResult
    public func putInbox(_ items: [SyncItemDTO]) -> Bool {
        lock.lock(); defer { lock.unlock() }
        for item in items { inbox[item.recordName] = item }
        return save(inbox, as: "inbox.json")
    }

    public func inboxItems() -> [SyncItemDTO] {
        lock.lock(); defer { lock.unlock() }
        return inbox.values.sorted { $0.recordName < $1.recordName }
    }

    /// Removes an item only if it is still exactly the version the caller merged. Returns false if
    /// the change could not be saved.
    @discardableResult
    public func ackInbox(_ items: [SyncItemDTO]) -> Bool {
        lock.lock(); defer { lock.unlock() }
        var changed = false
        for item in items where inbox[item.recordName] == item {
            inbox.removeValue(forKey: item.recordName)
            changed = true
        }
        return changed ? save(inbox, as: "inbox.json") : true
    }

    // MARK: Record system fields (the change tags CloudKit needs to accept an update)

    public func setSystemFields(_ data: Data?, for recordName: String) {
        lock.lock(); defer { lock.unlock() }
        systemFields[recordName] = data
        save(systemFields, as: "system-fields.json")
    }

    public func systemFields(for recordName: String) -> Data? {
        lock.lock(); defer { lock.unlock() }
        return systemFields[recordName]
    }

    /// Everything but the user's pending work: used when iCloud account changes or sync is turned off.
    public func resetCloudState() {
        clearEngineState()
    }
}
