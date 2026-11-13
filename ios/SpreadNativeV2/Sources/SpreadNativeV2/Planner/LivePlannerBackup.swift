import Foundation

// Types for modern Spread's backup and restore. The file itself is built, read and restored by the same code as the
// web planner's More sheet; these types only carry what the sheet needs. See `native-backup-bridge.ts`.

/// One profile listed in a backup file.
struct BackupProfile: Decodable, Identifiable, Equatable {
    let id: String
    let name: String
    /// False for a profile the file holds but that is damaged. It is listed, and it cannot be restored.
    let readable: Bool
    let weeks: Int
    let tasks: Int
    let range: String
}

/// The reply to a backup request, as the planner's bridge sends it.
struct BackupReply: Decodable {
    let requestId: String?
    let ok: Bool
    let kind: String?
    let name: String?
    let text: String?
    let profiles: [BackupProfile]?
    let weeks: Int?
    let tasks: Int?
    let message: String?
    let error: String?
}

/// The file to share: its name and its text.
struct BackupFile: Equatable {
    let name: String
    let text: String
}

/// What a backup file holds, before anything is restored.
struct BackupPreview: Equatable {
    let profiles: [BackupProfile]
    let weeks: Int
    let tasks: Int
}

/// Why a backup or restore step did not finish. The message is plain text for the sheet.
struct BackupFailure: Error, Equatable {
    let message: String
}
