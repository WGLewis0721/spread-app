import Foundation

/// Unsubmitted text is a device-local editing preference, never a second task
/// store. Only the acknowledged addTask intent creates the actual planner task.
enum TaskDraftMemory {
    static func key(profileId: String?, weekKey: String, roleId: String, day: String? = nil) -> String {
        // Component encoding prevents delimiter collisions in imported IDs.
        // No profile means no loaded planner: use an ephemeral key rather than
        // allowing anonymous editing state to leak into another person's plan.
        var scope = [profileId ?? UUID().uuidString, weekKey, roleId]
        // Preserve existing Wallet draft keys; focused day drafts get a separate scope.
        if let day { scope.append(day) }
        return "spread.native.task-draft." + scope.map { Data($0.utf8).base64EncodedString() }.joined(separator: ".")
    }
}
