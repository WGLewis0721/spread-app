import Foundation

/// Unsubmitted text is a device-local editing preference, never a second task
/// store. Only the acknowledged addTask intent creates the actual planner task.
enum TaskDraftMemory {
    static func key(profileId: String?, weekKey: String, roleId: String) -> String {
        // Component encoding prevents delimiter collisions in imported IDs.
        // No profile means no loaded planner: use an ephemeral key rather than
        // allowing anonymous editing state to leak into another person's plan.
        let scope = [profileId ?? UUID().uuidString, weekKey, roleId]
        return "spread.native.task-draft." + scope.map { Data($0.utf8).base64EncodedString() }.joined(separator: ".")
    }
}
