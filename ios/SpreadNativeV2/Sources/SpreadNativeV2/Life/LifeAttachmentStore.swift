#if os(iOS)
import Foundation
import CryptoKit
import UniformTypeIdentifiers

struct NativeManagedFile: Codable, Equatable, Identifiable {
    let id: String
    let name: String
    let mimeType: String
    let byteCount: Int
    let checksum: String
}

/// Application Support copies are independent of provider URLs and included in device backups.
/// References include profile and task scope; names never determine paths.
enum LifeAttachmentStore {
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
    static func url(profile: String, task: String, file: NativeManagedFile) throws -> URL {
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
}
#endif
