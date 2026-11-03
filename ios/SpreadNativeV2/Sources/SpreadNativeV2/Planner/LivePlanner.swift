#if os(iOS)
import SwiftUI
import UIKit

public struct NativeProfile: Decodable, Identifiable {
    public let id: String
    public let name: String
}
struct LiveState: Decodable {
    let sessionId: String
    let revision: Int
    let envelope: NativeV2Envelope
}
struct LiveReply: Decodable {
    let ok: Bool
    let taskDetail: NativeTaskDetail?
    let error: String?
    let undoId: String?
    let requestId: String?
    let state: LiveState?
    let profiles: [NativeProfile]?
    let saveError: String?
    let recoveryNotice: String?
    let rollover: String?
    let exported: NativeExport?
}

/// Read-only observable projection; all mutations are awaited intents to the React store.
@MainActor public final class LivePlanner: ObservableObject {
    @Published var state: LiveState?
    @Published var profiles: [NativeProfile] = []
    @Published var details: [String: NativeTaskContent] = [:]
    @Published var error: String? {
        didSet { if error == nil { errorOffersRetry = false; errorOffersBackup = false } }
    }
    /// Whether the alert for `error` is about saving. Only then does it offer Retry saving / Backup and restore;
    /// a refusal such as "Place hours for this responsibility on that day first." gets a plain OK.
    @Published var errorOffersRetry = false
    @Published var errorOffersBackup = false
    @Published var saveFailure: String?
    @Published var recoveryNotice: String?
    @Published var busy = false
    @Published var undoId: String?
    /// Outcome of the last rollover request: "done", "confirm" (next week has content), or "empty".
    @Published var rolloverOutcome: String?
    private let exchange: (String) async throws -> String
    private var tail: Task<Bool, Never>?
    public init(exchange: @escaping (String) async throws -> String) { self.exchange = exchange }
    var snapshot: PlannerSnapshot? { state?.envelope.snapshot }
    public func refresh() async {
        let previous = tail
        let task = Task { @MainActor in
            _ = await previous?.value
            do { _ = try await self.receive("null"); return true }
            catch { self.error = error.localizedDescription; return false }
        }
        tail = task
        _ = await task.value
    }
    private func receive(_ json: String, expectedRequestId: String? = nil) async throws -> LiveReply {
        let text = try await exchange(json)
        let reply = try JSONDecoder().decode(LiveReply.self, from: Data(text.utf8))
        if let expectedRequestId, reply.requestId != expectedRequestId { throw NSError(domain: "Spread", code: 4, userInfo: [NSLocalizedDescriptionKey: "Unmatched planner acknowledgement."]) }
        guard let value = reply.state, value.envelope.isSupported else {
            throw NSError(domain: "Spread", code: 1, userInfo: [NSLocalizedDescriptionKey: "Planner is still starting. Try again."])
        }
        if state?.sessionId != value.sessionId || state?.envelope.profileId != value.envelope.profileId || state?.envelope.snapshot.weekKey != value.envelope.snapshot.weekKey { details = [:]; undoId = nil }
        state = value
        profiles = reply.profiles ?? []
        if let detail = reply.taskDetail { details = [detail.taskId: detail.content] }
        recoveryNotice = reply.recoveryNotice
        saveFailure = reply.saveError
        if reply.saveError == "newer" {
            error = "This plan was saved by a newer Spread version. Update Spread before editing."
            errorOffersRetry = false; errorOffersBackup = true
        } else if reply.saveError != nil {
            error = "Couldn’t save on this device. Retry saving or open Backup and restore before closing Spread."
            errorOffersRetry = true; errorOffersBackup = true
        } else if !reply.ok {
            errorOffersRetry = false; errorOffersBackup = false
            switch reply.error {
            case "stale-profile", "stale-week", "stale-revision", "stale-session": error = "Your plan changed. Review the current plan and try again."
            case "ineligible-day": error = "Place hours for this responsibility on that day first."
            case "save-failed", "save-unavailable":
                error = "Couldn’t save on this device. Retry saving or back up before closing Spread."
                errorOffersRetry = true; errorOffersBackup = true
            default: error = "The change could not be completed. Your current plan is shown."
            }
        }
        return reply
    }
    /// Read-only export of the open week. Changes nothing; returns nil (and says so) when the plan has moved on.
    func exportWeek(_ format: String) async -> NativeExport? {
        guard let current = state else { return nil }
        let requestId = UUID().uuidString
        let request: [String: Any] = ["protocolVersion": 1, "sessionId": current.sessionId,
            "requestId": requestId, "expectedProfileId": current.envelope.profileId,
            "expectedWeek": current.envelope.snapshot.weekKey, "expectedRevision": current.revision,
            "action": ["type": "exportWeek", "format": format]]
        guard let bytes = try? JSONSerialization.data(withJSONObject: request), let json = String(data: bytes, encoding: .utf8) else { return nil }
        do {
            let text = try await exchange(json)
            let reply = try JSONDecoder().decode(LiveReply.self, from: Data(text.utf8))
            guard reply.requestId == requestId, reply.ok, let exported = reply.exported else {
                error = "The week could not be exported. Your plan is unchanged."
                return nil
            }
            return exported
        } catch {
            self.error = "The week could not be exported. Your plan is unchanged."
            return nil
        }
    }

    @discardableResult func send(_ action: [String: Any], completionHaptic: Bool = false) async -> Bool {
        let previous = tail
        let originProfile = state?.envelope.profileId
        let originWeek = state?.envelope.snapshot.weekKey
        let task = Task { @MainActor in
            _ = await previous?.value
            guard let current = self.state, current.envelope.profileId == originProfile else { return false }
            if action["type"] as? String != "changeWeek", current.envelope.snapshot.weekKey != originWeek { self.error = "The week changed. Please choose the task again."; return false }
            self.busy = true
            defer { self.busy = false }
            do {
                let requestId = UUID().uuidString
                let request: [String: Any] = ["protocolVersion": 1, "sessionId": current.sessionId,
                    "requestId": requestId, "expectedProfileId": current.envelope.profileId,
                    "expectedWeek": current.envelope.snapshot.weekKey, "expectedRevision": current.revision, "action": action]
                let bytes = try JSONSerialization.data(withJSONObject: request)
                let json = String(decoding: bytes, as: UTF8.self)
                let reply: LiveReply
                do { reply = try await self.receive(json, expectedRequestId: requestId) }
                catch { reply = try await self.receive(json, expectedRequestId: requestId) } // Same correlation ID: safe after a lost ACK.
                guard reply.ok else { return false }
                if action["type"] as? String != "readTaskContent" { self.undoId = reply.undoId }
                if action["type"] as? String == "rollover" { self.rolloverOutcome = reply.rollover }
                // Haptic only after the store has acknowledged the change (never on a speculative tap).
                if completionHaptic { SpreadHaptics.completed() }
                return true
            } catch { self.error = error.localizedDescription; return false }
        }
        tail = task
        return await task.value
    }
}

/// Destinations and sheets the shell can present. Each case maps to one native surface.
enum LiveSheet: Identifiable, Equatable {
    case newRole
    case role(String)
    case task(String, String)      // roleId, taskId
    case review
    case more
    case profiles
    case confirmRollover
    case confirmDeleteRole(String)

    var id: String {
        switch self {
        case .newRole: return "newRole"
        case .role(let id): return "role-" + id
        case .task(let role, let task): return "task-" + role + "-" + task
        case .review: return "review"
        case .more: return "more"
        case .profiles: return "profiles"
        case .confirmRollover: return "confirmRollover"
        case .confirmDeleteRole(let id): return "confirmDeleteRole-" + id
        }
    }
}
#endif
