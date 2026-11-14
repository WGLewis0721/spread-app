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
struct NativeLifePriorityPreview: Decodable {
    let roleId: String
    let day: String
    let goalHours: Double
    let reservedHours: Double
    let bankHours: Double
    let eligible: Bool
    let unassignedHours: Double
    let additionalBudgetHours: Double
    let reserveHours: Double
    let shortageHours: Double
}
struct NativePlanAheadPreview: Decodable {
    let sourceWeek: String
    let targetWeek: String
    let roleId: String
    let hours: Double
    let kind: String
    let sourceBudgetBefore: Double
    let sourceBudgetAfter: Double
    let targetBudgetBefore: Double
    let targetBudgetAfter: Double
    let targetCapacityHours: Double?
    let movedTasks: Int
    let eligible: Bool
    let reason: String?
}
struct NativeRecurringPreview: Decodable {
    let eligible: Bool
    let reason: String?
    let roleId: String
    let hours: Double
    let startWeek: String
    let managedFromWeek: String?
    let everyWeeks: Int
    let endWeek: String?
    let nextOccurrences: [String]
    let preservedWeeks: [String]
    let occurrenceCount: Int?
    /// Set days the schedule would place, when the preview has them.
    let dayHours: [NativeDayHours]?
}
/// One week a copy would write, and whether it already holds a plan ("fill" or "filled").
struct NativeWeekCopyTarget: Decodable, Equatable {
    let key: String
    let status: String
}
/// What copying the week on screen into one batch of eight weeks would do. Read only.
struct NativeWeekCopyPreview: Decodable {
    let eligible: Bool
    let reason: String?
    let sourceKey: String
    let batch: Int
    let targets: [NativeWeekCopyTarget]
    let fillCount: Int
    let skipCount: Int
    let hours: Double
    let tasks: Int
}
struct LiveReply: Decodable {
    let planAheadPreview: NativePlanAheadPreview?
    let recurringPreview: NativeRecurringPreview?
    let weekCopyPreview: NativeWeekCopyPreview?
    let priorityPreview: NativeLifePriorityPreview?
    let ok: Bool
    let taskDetail: NativeTaskDetail?
    let error: String?
    let undoId: String?
    let redoId: String?
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
    @Published var redoId: String?
    /// Outcome of the last rollover request: "done", "confirm" (next week has content), or "empty".
    @Published var rolloverOutcome: String?
    private let exchange: (String) async throws -> String
    private var tail: Task<Bool, Never>?
    public init(exchange: @escaping (String) async throws -> String) { self.exchange = exchange }
    var snapshot: PlannerSnapshot? {
        #if DEBUG
        // DEBUG-only preview fixture, selected by a launch argument. Release builds never compile this.
        if let preview = PersonalPreviewFixture.snapshot { return preview }
        #endif
        return state?.envelope.snapshot
    }
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
        if state?.sessionId != value.sessionId || state?.envelope.profileId != value.envelope.profileId || state?.envelope.snapshot.weekKey != value.envelope.snapshot.weekKey { details = [:]; undoId = nil; redoId = nil }
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
            case "capacity-not-set": error = "Set your weekly planning hours before changing a Life area's budget."
            case "capacity-below-assigned": error = "Capacity cannot be below the hours already assigned. Reduce a budget first."
            case "life-capacity-exceeded": error = "Your circle is full. Increase planning hours or return time from another Life area."
            case "budget-below-reserved": error = "That area already has more hours placed on days. Return those first."
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

    /// Backup and restore for modern Spread. Each request goes through the planner's bridge but does not depend on the
    /// open week or revision, so it can run at any time. It changes the plan only when a restore is confirmed.
    private func backupRequest(_ action: [String: Any]) async -> BackupReply? {
        let requestId = UUID().uuidString
        let request: [String: Any] = ["protocolVersion": 1, "requestId": requestId, "action": action]
        guard let bytes = try? JSONSerialization.data(withJSONObject: request),
              let json = String(data: bytes, encoding: .utf8),
              let text = try? await exchange(json),
              let reply = try? JSONDecoder().decode(BackupReply.self, from: Data(text.utf8)),
              reply.requestId == requestId else { return nil }
        return reply
    }

    /// The backup file for every profile, ready to share.
    func makeBackupFile() async -> Result<BackupFile, BackupFailure> {
        let unchanged = "The backup could not be made. Your plan is unchanged."
        guard let reply = await backupRequest(["type": "backupFile"]) else {
            return .failure(BackupFailure(message: unchanged))
        }
        guard reply.ok, let name = reply.name, let text = reply.text else {
            return .failure(BackupFailure(message: reply.message ?? unchanged))
        }
        return .success(BackupFile(name: name, text: text, planName: reply.planName, planText: reply.planText))
    }

    /// Reads a backup or plan file and says what it would do. Changes nothing. A plan that changes the open profile
    /// comes back as a merge preview, made with the removal choices the person has picked.
    func previewBackup(_ text: String, removeAreas: Bool = false, removeItems: Bool = false) async -> Result<BackupPreview, BackupFailure> {
        let unreadable = "That backup could not be read. Nothing was changed."
        guard let reply = await backupRequest([
            "type": "restorePreview", "text": text, "removeAreas": removeAreas, "removeItems": removeItems,
        ]) else {
            return .failure(BackupFailure(message: unreadable))
        }
        guard reply.ok else {
            return .failure(BackupFailure(message: reply.message ?? unreadable, issues: reply.issues ?? []))
        }
        if let merge = reply.merge {
            return .success(BackupPreview(profiles: [], weeks: 0, tasks: 0, merge: merge))
        }
        guard let profiles = reply.profiles else {
            return .failure(BackupFailure(message: reply.message ?? unreadable))
        }
        return .success(BackupPreview(profiles: profiles, weeks: reply.weeks ?? 0, tasks: reply.tasks ?? 0))
    }

    /// Merges a checked plan into the open profile. `revision` is the version the preview was made against: if the
    /// profile has changed since, nothing is merged. A safety copy is saved first. Returns the message to show.
    func mergeBackup(_ text: String, removeAreas: Bool, removeItems: Bool, revision: String) async -> Result<String, BackupFailure> {
        let unchanged = "The plan could not be merged. Nothing was changed."
        guard let reply = await backupRequest([
            "type": "mergeApply", "text": text, "removeAreas": removeAreas, "removeItems": removeItems, "revision": revision,
        ]) else {
            return .failure(BackupFailure(message: unchanged))
        }
        guard reply.ok, let message = reply.message else {
            return .failure(BackupFailure(message: reply.message ?? unchanged, issues: reply.issues ?? []))
        }
        return .success(message)
    }

    /// Adds the chosen profiles from a backup file as new profiles. Returns the message to show.
    func restoreBackup(_ text: String, select: [String]) async -> Result<String, BackupFailure> {
        let unchanged = "The profiles could not be added. Nothing was changed."
        guard let reply = await backupRequest(["type": "restoreApply", "text": text, "select": select]) else {
            return .failure(BackupFailure(message: unchanged))
        }
        guard reply.ok, let message = reply.message else {
            return .failure(BackupFailure(message: reply.message ?? unchanged))
        }
        return .success(message)
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
    func previewRecurringPlan(_ action: [String: Any]) async -> NativeRecurringPreview? {
        let origin = state
        var query = action
        query["type"] = "previewRecurringPlan"
        let reply = await readWeekFeature(query)
        guard state?.sessionId == origin?.sessionId,
              state?.revision == origin?.revision,
              state?.envelope.profileId == origin?.envelope.profileId,
              state?.envelope.snapshot.weekKey == origin?.envelope.snapshot.weekKey else { return nil }
        return reply?.recurringPreview
    }

    /// Previews copying the week on screen into one batch of eight weeks. Changes nothing. The copy itself is sent
    /// with `send`, after the person confirms, and the planner refuses it if the week has changed since.
    func previewWeekCopy(batch: Int) async -> NativeWeekCopyPreview? {
        let origin = state
        let reply = await readWeekFeature(["type": "previewWeekCopy", "batch": batch])
        guard state?.sessionId == origin?.sessionId,
              state?.revision == origin?.revision,
              state?.envelope.profileId == origin?.envelope.profileId,
              state?.envelope.snapshot.weekKey == origin?.envelope.snapshot.weekKey else { return nil }
        return reply?.weekCopyPreview
    }

    func previewPlanAhead(roleId: String, toDay: String, hours: Double,
                          fromDay: String?, targetCapacityHours: Double?) async -> NativePlanAheadPreview? {
        let origin = state
        var action: [String: Any] = [
            "type": "previewPlanAhead", "roleId": roleId,
            "toDay": toDay, "hours": hours
        ]
        if let fromDay { action["fromDay"] = fromDay }
        if let targetCapacityHours { action["targetCapacityHours"] = targetCapacityHours }
        let reply = await readWeekFeature(action)
        guard state?.sessionId == origin?.sessionId,
              state?.revision == origin?.revision,
              state?.envelope.profileId == origin?.envelope.profileId,
              state?.envelope.snapshot.weekKey == origin?.envelope.snapshot.weekKey else { return nil }
        return reply?.planAheadPreview
    }

    func previewLifePriority(roleId: String, goalHours: Double, day: String) async -> NativeLifePriorityPreview? {
        let origin = state
        let reply = await readWeekFeature(["type": "previewLifePriority", "roleId": roleId, "goalHours": goalHours, "day": day])
        guard state?.sessionId == origin?.sessionId,
              state?.revision == origin?.revision,
              state?.envelope.profileId == origin?.envelope.profileId,
              state?.envelope.snapshot.weekKey == origin?.envelope.snapshot.weekKey else { return nil }
        return reply?.priorityPreview
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

    @discardableResult func send(_ action: [String: Any], completionHaptic: Bool = false, expectedRevision: Int? = nil) async -> Bool {
        let previous = tail
        let originSession = state?.sessionId
        let originProfile = state?.envelope.profileId
        let originWeek = state?.envelope.snapshot.weekKey
        let task = Task { @MainActor in
            _ = await previous?.value
            guard let current = self.state, current.sessionId == originSession, current.envelope.profileId == originProfile else { return false }
            if action["type"] as? String != "changeWeek", current.envelope.snapshot.weekKey != originWeek { self.error = "The week changed. Please choose the task again."; return false }
            if let expectedRevision, current.revision != expectedRevision {
                self.error = "Your plan changed. Review the current plan and try again."
                return false
            }
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
                guard reply.ok, reply.saveError == nil else { return false }
                let kind = action["type"] as? String
                if kind == "undo" {
                    self.undoId = nil
                    self.redoId = reply.redoId
                } else if kind == "redo" {
                    self.undoId = reply.undoId
                    self.redoId = nil
                } else if kind != "readTaskContent" {
                    self.undoId = reply.undoId
                    self.redoId = nil
                }
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
    case backup

    var id: String {
        switch self {
        case .newRole: return "newRole"
        case .role(let id): return "role-" + id
        case .task(let role, let task): return "task-" + role + "-" + task
        case .review: return "review"
        case .more: return "more"
        case .profiles: return "profiles"
        case .confirmRollover: return "confirmRollover"
        case .backup: return "backup"
        }
    }
}
#endif
