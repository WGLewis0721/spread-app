import Foundation
import SpreadCloudCore

struct BackupListing {
    let deviceId: String
    let name: String
    let createdAt: Date
    let pin: String?
    let bytes: Int
    /// true once the file is fully in iCloud (always false for local-only copies).
    let uploaded: Bool
    /// false for another device's backup that iCloud has not downloaded yet.
    let downloaded: Bool
    let uploadError: String?
}

struct BackupWriteResult {
    let name: String
    let bytes: Int
    let createdAt: Date
    /// The file was written, read back and compared byte for byte on this device.
    let verified: Bool
    /// A copy was handed to the iCloud container (upload happens in the background, see `list`).
    let inICloudContainer: Bool
}

enum BackupError: Error {
    case invalidArguments
    case noSpace
    case verificationFailed
    case notFound
    case downloadTimedOut
}

/// Writes and reads Spread backups.
///
/// Each backup is written to this device's own folder first, read back and compared, and only
/// then copied into the iCloud Documents container (`Backups/<deviceId>/`). A device only writes
/// to or prunes its own folder. Other devices' folders are read-only here, so one device can never
/// damage another's history. All calls block; run them off the main thread.
final class BackupStore {
    private let fileManager = FileManager.default
    let deviceId: String

    init(deviceId: String) {
        self.deviceId = deviceId
    }

    // MARK: Locations

    private func localRoot() throws -> URL {
        let library = try fileManager.url(for: .libraryDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        return library.appendingPathComponent("SpreadBackups", isDirectory: true)
    }

    private func localFolder(for device: String) throws -> URL {
        let folder = try localRoot().appendingPathComponent(device, isDirectory: true)
        try fileManager.createDirectory(at: folder, withIntermediateDirectories: true)
        return folder
    }

    /// Asking for the container can block while iCloud wakes up, so this must not run on the main thread.
    private func ubiquityRoot() -> URL? {
        guard let container = fileManager.url(forUbiquityContainerIdentifier: SpreadCloudConfig.containerId) else { return nil }
        return container.appendingPathComponent("Documents", isDirectory: true).appendingPathComponent(BackupNaming.rootFolder, isDirectory: true)
    }

    private func ubiquityFolder(for device: String, create: Bool) -> URL? {
        guard BackupNaming.isValidDeviceId(device), let root = ubiquityRoot() else { return nil }
        let folder = root.appendingPathComponent(device, isDirectory: true)
        if create { try? fileManager.createDirectory(at: folder, withIntermediateDirectories: true) }
        return folder
    }

    // MARK: Write

    func write(_ data: Data, pin: String?, now: Date = Date()) throws -> BackupWriteResult {
        if let pin, !BackupNaming.isValidPinLabel(pin) { throw BackupError.invalidArguments }
        guard !data.isEmpty else { throw BackupError.invalidArguments }
        let localDir = try localFolder(for: deviceId)
        let iCloudDir = ubiquityFolder(for: deviceId, create: true)

        let seq = nextSequence(localDir: localDir, iCloudDir: iCloudDir)
        guard let name = BackupNaming.fileName(createdAt: now, seq: seq, pin: pin) else { throw BackupError.invalidArguments }
        let target = localDir.appendingPathComponent(name)

        do {
            try data.write(to: target, options: .atomic)
        } catch {
            if (error as NSError).code == NSFileWriteOutOfSpaceError { throw BackupError.noSpace }
            throw error
        }
        guard let written = try? Data(contentsOf: target), written == data else {
            try? fileManager.removeItem(at: target)
            throw BackupError.verificationFailed
        }

        var copied = false
        if let iCloudDir {
            copied = copy(target, into: iCloudDir.appendingPathComponent(name))
        }
        prune(now: now)
        return BackupWriteResult(name: name, bytes: data.count, createdAt: now, verified: true, inICloudContainer: copied)
    }

    private func nextSequence(localDir: URL, iCloudDir: URL?) -> Int {
        var highest = 0
        for folder in [localDir] + (iCloudDir.map { [$0] } ?? []) {
            for item in (try? fileManager.contentsOfDirectory(atPath: folder.path)) ?? [] {
                if let parsed = BackupNaming.parse(fileName: realName(item)) { highest = max(highest, parsed.seq) }
            }
        }
        return highest + 1
    }

    /// iCloud may list a file that is not downloaded yet as `.<name>.icloud`.
    private func realName(_ item: String) -> String {
        if item.hasPrefix("."), item.hasSuffix(".icloud") { return String(item.dropFirst().dropLast(".icloud".count)) }
        return item
    }

    private func copy(_ source: URL, into destination: URL) -> Bool {
        var coordinationError: NSError?
        var ok = false
        NSFileCoordinator(filePresenter: nil).coordinate(writingItemAt: destination, options: .forReplacing, error: &coordinationError) { url in
            do {
                if fileManager.fileExists(atPath: url.path) { try fileManager.removeItem(at: url) }
                try fileManager.copyItem(at: source, to: url)
                ok = true
            } catch {
                ok = false
            }
        }
        return ok && coordinationError == nil
    }

    // MARK: List

    /// `scope`: this device's backups (`ownOnly`) or every device's.
    func list(ownOnly: Bool) -> [BackupListing] {
        var results: [BackupListing] = []
        var seen = Set<String>()

        if let root = ubiquityRoot(), let devices = try? fileManager.contentsOfDirectory(atPath: root.path) {
            for device in devices where BackupNaming.isValidDeviceId(device) {
                if ownOnly && device != deviceId { continue }
                let folder = root.appendingPathComponent(device, isDirectory: true)
                for item in (try? fileManager.contentsOfDirectory(atPath: folder.path)) ?? [] {
                    let name = realName(item)
                    guard let parsed = BackupNaming.parse(fileName: name) else { continue }
                    let url = folder.appendingPathComponent(item)
                    let values = try? url.resourceValues(forKeys: [
                        .fileSizeKey, .ubiquitousItemIsUploadedKey, .ubiquitousItemUploadingErrorKey, .ubiquitousItemDownloadingStatusKey,
                    ])
                    let placeholder = item != name
                    let status = values?.ubiquitousItemDownloadingStatus
                    let downloaded = !placeholder && (status == nil || status == .current || status == .downloaded)
                    results.append(BackupListing(
                        deviceId: device, name: name, createdAt: parsed.createdAt, pin: parsed.pin,
                        bytes: values?.fileSize ?? 0,
                        uploaded: values?.ubiquitousItemIsUploaded ?? false,
                        downloaded: downloaded,
                        uploadError: values?.ubiquitousItemUploadingError?.localizedDescription
                    ))
                    seen.insert("\(device)/\(name)")
                }
            }
        }

        // This device's local copies that never reached the container (iCloud off or full).
        if let local = try? localFolder(for: deviceId) {
            for item in (try? fileManager.contentsOfDirectory(atPath: local.path)) ?? [] {
                guard let parsed = BackupNaming.parse(fileName: item), !seen.contains("\(deviceId)/\(item)") else { continue }
                let size = (try? fileManager.attributesOfItem(atPath: local.appendingPathComponent(item).path)[.size] as? Int) ?? 0
                results.append(BackupListing(deviceId: deviceId, name: item, createdAt: parsed.createdAt, pin: parsed.pin, bytes: size,
                                             uploaded: false, downloaded: true, uploadError: nil))
            }
        }
        return results.sorted { $0.createdAt > $1.createdAt }
    }

    // MARK: Read

    func read(device: String, name: String, timeout: TimeInterval = 30) throws -> Data {
        guard BackupNaming.isValidDeviceId(device), BackupNaming.parse(fileName: name) != nil else { throw BackupError.invalidArguments }
        if device == deviceId, let local = try? localFolder(for: device).appendingPathComponent(name),
           let data = try? Data(contentsOf: local) {
            return data
        }
        guard let folder = ubiquityFolder(for: device, create: false) else { throw BackupError.notFound }
        let url = folder.appendingPathComponent(name)
        try? fileManager.startDownloadingUbiquitousItem(at: url)
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            var result: Data?
            var coordinationError: NSError?
            NSFileCoordinator(filePresenter: nil).coordinate(readingItemAt: url, options: [], error: &coordinationError) { readable in
                result = try? Data(contentsOf: readable)
            }
            if let result, !result.isEmpty { return result }
            Thread.sleep(forTimeInterval: 0.5)
        }
        throw BackupError.downloadTimedOut
    }

    // MARK: Prune

    /// Applies the retention policy to this device's own folders only.
    func prune(now: Date = Date()) {
        if let local = try? localFolder(for: deviceId) {
            // Local copies are only a safety net while iCloud is unavailable: keep the newest few.
            let entries = entries(in: local)
            let regular = entries.filter { $0.pin == nil }.sorted { $0.createdAt > $1.createdAt }
            for entry in regular.dropFirst(3) { try? fileManager.removeItem(at: local.appendingPathComponent(entry.name)) }
            let pinned = entries.filter { $0.pin != nil }
            for name in BackupRetention.namesToDelete(entries: pinned, now: now) { try? fileManager.removeItem(at: local.appendingPathComponent(name)) }
        }
        if let folder = ubiquityFolder(for: deviceId, create: false) {
            for name in BackupRetention.namesToDelete(entries: entries(in: folder), now: now) {
                let url = folder.appendingPathComponent(name)
                var coordinationError: NSError?
                NSFileCoordinator(filePresenter: nil).coordinate(writingItemAt: url, options: .forDeleting, error: &coordinationError) { target in
                    try? fileManager.removeItem(at: target)
                }
            }
        }
    }

    private func entries(in folder: URL) -> [BackupEntry] {
        ((try? fileManager.contentsOfDirectory(atPath: folder.path)) ?? []).compactMap { item in
            let name = realName(item)
            guard let parsed = BackupNaming.parse(fileName: name) else { return nil }
            let size = (try? fileManager.attributesOfItem(atPath: folder.appendingPathComponent(item).path)[.size] as? Int) ?? 0
            return BackupEntry(name: name, createdAt: parsed.createdAt, pin: parsed.pin, bytes: size)
        }
    }
}
