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
struct NativeTaskStub: Decodable {
    let id: String
    let text: String
    let done: Bool
}
struct NativeDeletedTask: Decodable, Identifiable {
    let id: String
    let hatId: String
    let weekKey: String
    let deletedAt: Double
    let task: NativeTaskStub
}
struct NativeOverdueTask: Decodable, Identifiable {
    let weekKey: String
    let hatId: String
    let day: String
    let task: NativeTaskStub
    var id: String { task.id }
}
struct NativeBulkPreview: Decodable, Identifiable {
    let taskId: String
    let weekKey: String
    let hatId: String
    let targetAllocationId: String?
    let error: String?
    var id: String { taskId }
    var eligible: Bool { targetAllocationId != nil && error == nil }
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
    let monthMarks: [String: NativeDayMark]?
    let deletedTasks: [NativeDeletedTask]?
    let overdueTasks: [NativeOverdueTask]?
    let bulkPreview: [NativeBulkPreview]?
    let bulkMoved: Int?
}

/// Read-only observable projection; all mutations are awaited intents to the React store.
struct HoursShortage: Equatable {
    let roleId: String
    let missingHours: Double
}

/// One adjustment offer for a rejected allocation. The store remains the sole writer.
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
    @Published var hoursShortage: HoursShortage?
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
            case "bank-empty": error = "All hours for this responsibility are placed. Raise its weekly hours, or take hours off another day first."
            case "bank-exceeded": error = "There aren’t enough hours left in this responsibility’s bank. Choose fewer hours, or raise its weekly hours."
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

    /// Role dots for every cell of one calendar month, any week (`month` is 0-11 as in the planner's own month grid).
    /// A read: it changes nothing and is not queued behind writes. Returns nil when the profile has moved on or the
    /// planner cannot answer, so the caller keeps whatever it can already draw.
    func monthMarks(year: Int, month: Int, selectedRoleId: String? = nil) async -> [String: NativeDayMark]? {
        guard let current = state else { return nil }
        let requestId = UUID().uuidString
        var action: [String: Any] = ["type": "monthMarks", "year": year, "month": month]
        if let selectedRoleId { action["selectedRoleId"] = selectedRoleId }
        let request: [String: Any] = ["protocolVersion": 1, "sessionId": current.sessionId,
            "requestId": requestId, "expectedProfileId": current.envelope.profileId,
            "expectedWeek": current.envelope.snapshot.weekKey, "expectedRevision": current.revision,
            "action": action]
        guard let bytes = try? JSONSerialization.data(withJSONObject: request),
              let json = String(data: bytes, encoding: .utf8),
              let text = try? await exchange(json),
              let reply = try? JSONDecoder().decode(LiveReply.self, from: Data(text.utf8)),
              reply.requestId == requestId, reply.ok else { return nil }
        return reply.monthMarks
    }

    /// Read-only request with the same identity/revision guards as other planner reads.
    /// It never changes the user's open week, data, profile, or local storage.
    private func readWeekFeature(_ action: [String: Any]) async -> LiveReply? {
        guard let current = state else { return nil }
        let requestId = UUID().uuidString
        let request: [String: Any] = ["protocolVersion": 1, "sessionId": current.sessionId,
            "requestId": requestId, "expectedProfileId": current.envelope.profileId,
            "expectedWeek": current.envelope.snapshot.weekKey, "expectedRevision": current.revision,
            "action": action]
        guard let bytes = try? JSONSerialization.data(withJSONObject: request),
              let json = String(data: bytes, encoding: .utf8),
              let text = try? await exchange(json),
              let reply = try? JSONDecoder().decode(LiveReply.self, from: Data(text.utf8)),
              reply.requestId == requestId, reply.ok,
              state?.envelope.profileId == current.envelope.profileId else { return nil }
        return reply
    }
    func recentlyDeletedTasks() async -> [NativeDeletedTask]? {
        await readWeekFeature(["type": "readDeletedTasks"])?.deletedTasks
    }
    func allOverdueTasks(today: String) async -> [NativeOverdueTask]? {
        await readWeekFeature(["type": "readOverdueTasks", "today": today])?.overdueTasks
    }
    func previewOverdueMove(taskIds: [String], targetDay: String, today: String) async -> [NativeBulkPreview]? {
        await readWeekFeature(["type": "previewBulkOverdue", "taskIds": taskIds,
                               "targetDay": targetDay, "today": today])?.bulkPreview
    }

    /// Never silently place fewer hours than the person requested. When there
    /// is a shortage, explain the exact missing amount and offer the same role editor
    /// used elsewhere to adjust that responsibility's weekly hour budget.
    @discardableResult func placeHours(roleId: String, day: String, hours: Double) async -> Bool {
        if let snapshot {
            let remaining = max(0, snapshot.remainingHours(for: roleId))
            let missing = max(0, hours - remaining)
            if missing > 0.0001 {
                let name = snapshot.roles.first { $0.id == roleId }?.name ?? "This responsibility"
                refuse("\(name) needs \(SpreadHours.text(missing))h more to place \(SpreadHours.text(hours))h on this day. Adjust its weekly hours or take time from another day.",
                       roleId: roleId, missing: missing)
                return false
            }
        }
        hoursShortage = nil
        return await send(["type": "moveSpreadToDay", "roleId": roleId, "day": day, "hours": hours])
    }

    /// An allocation increase needs only the difference in hours, not the
    /// entire new allocation. Refuse with a measured shortage before a store call.
    @discardableResult func setAllocationHours(_ allocation: DayAllocation, to hours: Double) async -> Bool {
        if let snapshot, hours > allocation.hours {
            let increase = hours - allocation.hours
            let remaining = max(0, snapshot.remainingHours(for: allocation.roleId))
            let missing = max(0, increase - remaining)
            if missing > 0.0001 {
                let name = snapshot.roles.first { $0.id == allocation.roleId }?.name ?? "This responsibility"
                refuse("\(name) needs \(SpreadHours.text(missing))h more for this increase. Adjust its weekly hours or reduce another day.",
                       roleId: allocation.roleId, missing: missing)
                return false
            }
        }
        hoursShortage = nil
        return await send(["type": "allocationHours", "allocationId": allocation.id, "hours": hours])
    }

    /// Refusal never offers a save retry; Adjust hours is relevant only to
    /// insufficient allocation budgets, and never changes an hour automatically.
    private func refuse(_ message: String, roleId: String? = nil, missing: Double = 0) {
        hoursShortage = roleId.map { HoursShortage(roleId: $0, missingHours: missing) }
        error = message
        errorOffersRetry = false
        errorOffersBackup = false
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
