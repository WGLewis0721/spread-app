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

/// What a plan file would change in the open profile, counted. Every count is taken from the merged result, so the
/// summary matches what the merge does.
struct MergeCounts: Decodable, Equatable {
    let areasAdded: Int
    let areasChanged: Int
    let areasRemoved: Int
    let areasKept: Int
    let weeks: Int
    let weeksChanged: Int
    let tasksAdded: Int
    let tasksChanged: Int
    let tasksMoved: Int
    let tasksRemoved: Int
    let tasksKept: Int
    let hoursChanged: Int
    let daysChanged: Int
    let capacityChanged: Int
    let plansStopped: Int
}

/// One area in a merge: added, changed, removed (if chosen) or kept (not in the file, so left as it is).
struct MergeArea: Decodable, Equatable {
    let name: String
    let change: String
    let before: String?
    let after: String?
}

/// The preview of a plan merge. `revision` is the profile version it was made against; the merge sends it back, and
/// it refuses if the profile has changed since.
struct MergePreview: Decodable, Equatable {
    let profileName: String
    let revision: String
    let basedOn: String?
    let stale: Bool
    let counts: MergeCounts
    let areas: [MergeArea]
    let areasOmitted: Int
    let issues: [String]
}

/// The reply to a backup request, as the planner's bridge sends it.
struct BackupReply: Decodable {
    let requestId: String?
    let ok: Bool
    let kind: String?
    let name: String?
    let text: String?
    /// The plan file for the same profile: its name and its plain-text schedule. Present on a backup reply.
    let planName: String?
    let planText: String?
    let profiles: [BackupProfile]?
    let weeks: Int?
    let tasks: Int?
    let merge: MergePreview?
    let message: String?
    let error: String?
    let issues: [String]?
}

/// The files to share: the `.spread` backup (name and text) and the plan file (name and text).
struct BackupFile: Equatable {
    let name: String
    let text: String
    let planName: String?
    let planText: String?
}

/// What a file holds, before anything is changed: either the profiles a restore would add, or a merge preview.
struct BackupPreview: Equatable {
    let profiles: [BackupProfile]
    let weeks: Int
    let tasks: Int
    var merge: MergePreview? = nil
}

/// Why a backup, restore or merge step did not finish. The message is plain text for the sheet; `issues` lists each
/// problem found in a plan file, so the person can fix them.
struct BackupFailure: Error, Equatable {
    let message: String
    var issues: [String] = []
}
