#if os(iOS)
import Foundation
import CryptoKit
import UniformTypeIdentifiers

/// Application Support copies are independent of provider URLs and included in device backups.
/// References include profile and task scope; names never determine paths.
public enum LifeAttachmentStore {
    static let fileLimit = 25 * 1024 * 1024
    static let taskLimit = 100 * 1024 * 1024

    enum Failure: LocalizedError {
        case invalidReference, tooLarge, taskFull, corrupt, provider
        var errorDescription: String? {
            switch self {
            case .tooLarge: return "Choose a file smaller than 25 MB."
            case .taskFull: return "This task can hold up to 100 MB of files."
            default: return "This file could not be added. Try again or choose another file."
            }
        }
    }
    private static func hash(_ data: Data) -> String { SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() }
    private static func directory(profile: String, task: String) throws -> URL {
        guard !profile.isEmpty, !task.isEmpty else { throw Failure.invalidReference }
        let base = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        return base.appendingPathComponent("SpreadLifeFiles/v1", isDirectory: true)
            .appendingPathComponent(hash(Data(profile.utf8)), isDirectory: true)
            .appendingPathComponent(hash(Data(task.utf8)), isDirectory: true)
    }
    public static func url(profile: String, task: String, file: NativeManagedFile) throws -> URL {
        guard UUID(uuidString: file.id) != nil else { throw Failure.invalidReference }
        let url = try directory(profile: profile, task: task).appendingPathComponent(file.id)
        let bytes = try Data(contentsOf: url, options: .mappedIfSafe)
        guard bytes.count == file.byteCount, hash(bytes) == file.checksum else { throw Failure.corrupt }
        return url
    }
    /// Coordinates a provider read and atomically writes the managed copy before exposing a reference.
    static func importFile(_ source: URL, profile: String, task: String, existing: [NativeManagedFile]) throws -> NativeManagedFile {
        let granted = source.startAccessingSecurityScopedResource()
        defer { if granted { source.stopAccessingSecurityScopedResource() } }
        var coordinatorError: NSError?
        var outcome: Result<NativeManagedFile, Error> = .failure(Failure.provider)
        NSFileCoordinator().coordinate(readingItemAt: source, options: [], error: &coordinatorError) { available in
            outcome = Result {
                let resource = try available.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey, .contentTypeKey])
                guard resource.isRegularFile == true else { throw Failure.provider }
                guard (resource.fileSize ?? fileLimit + 1) <= fileLimit else { throw Failure.tooLarge }
                let data = try Data(contentsOf: available, options: .mappedIfSafe)
                guard data.count <= fileLimit else { throw Failure.tooLarge }
                guard existing.reduce(0, { $0 + $1.byteCount }) + data.count <= taskLimit else { throw Failure.taskFull }
                let file = NativeManagedFile(id: UUID().uuidString, name: source.lastPathComponent,
                    mimeType: resource.contentType?.preferredMIMEType ?? "application/octet-stream",
                    byteCount: data.count, checksum: hash(data))
                let folder = try directory(profile: profile, task: task)
                try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                try data.write(to: folder.appendingPathComponent(file.id), options: .atomic)
                _ = try url(profile: profile, task: task, file: file)
                return file
            }
        }
        if let coordinatorError { throw coordinatorError }
        return try outcome.get()
    }
    public struct ArchiveEntry: Codable {
        public let profileId: String
        public let taskId: String
        public let file: NativeManagedFile
        public let base64: String
    }
    private static var transactions: [String: [URL]] = [:]
    public static func read(profile: String, task: String, file: NativeManagedFile) throws -> String {
        try Data(contentsOf: url(profile: profile, task: task, file: file)).base64EncodedString()
    }
    /// Every byte is validated before touching final paths. Existing files are never overwritten.
    /// Only newly-created copies are journalled, so rollback cannot remove another profile's data.
    public static func install(_ entries: [ArchiveEntry]) throws -> String {
        let token = UUID().uuidString
        var staged: [(URL, Data)] = []
        var seen = Set<String>()
        var totals: [String: Int] = [:]
        for entry in entries {
            let file = entry.file
            guard UUID(uuidString: file.id) != nil, !file.name.isEmpty,
                file.mimeType.contains("/"), file.byteCount >= 0, file.byteCount <= fileLimit,
                let bytes = Data(base64Encoded: entry.base64), bytes.count == file.byteCount,
                hash(bytes) == file.checksum else { throw Failure.corrupt }
            let folder = try directory(profile: entry.profileId, task: entry.taskId)
            let target = folder.appendingPathComponent(file.id)
            guard seen.insert(target.path).inserted else { throw Failure.invalidReference }
            totals[folder.path, default: 0] += bytes.count
            guard totals[folder.path, default: 0] <= taskLimit else { throw Failure.taskFull }
            if FileManager.default.fileExists(atPath: target.path) {
                guard try Data(contentsOf: target) == bytes else { throw Failure.corrupt }
            } else { staged.append((target, bytes)) }
        }
        var installed: [URL] = []
        do {
            for (target, bytes) in staged {
                try FileManager.default.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
                try bytes.write(to: target, options: .atomic)
                installed.append(target)
            }
            transactions[token] = installed
            return token
        } catch {
            for target in installed { try? FileManager.default.removeItem(at: target) }
            throw error
        }
    }
    public static func rollback(_ token: String) throws {
        guard let files = transactions[token] else { throw Failure.invalidReference }
        for file in files { try FileManager.default.removeItem(at: file) }
        transactions.removeValue(forKey: token)
    }
    public static func finish(_ token: String) { transactions.removeValue(forKey: token) }

}
#endif
