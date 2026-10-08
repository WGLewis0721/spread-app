import Foundation

public enum SkipReason: Equatable {
    /// Sending has not been allowed since the engine started (fetch-only).
    case notResumed
    /// A durable pause (account change, deleted zone, damaged pause file) is in force.
    case paused
    /// The change belongs to a profile whose upload the person has not confirmed in this run.
    case otherProfile
    /// Nothing is queued under this name any more.
    case missing
    /// iCloud's newer version arrived after this was queued; the web app has not merged it yet.
    case staleBase
    /// Queued under a different iCloud account than the one now confirmed.
    case wrongAccount
    /// The signed-in account has not been verified, so nothing can be shown to belong to it.
    case accountUnknown
}

public enum SendDecision: Equatable {
    case send
    case skip(SkipReason)
}

/// The single rule for "may this queued change go to iCloud now?". The engine asks it for every
/// record at the last moment before CloudKit takes the record, so no earlier mistake (a restored
/// pending operation, a stale callback, a queue left by another profile or account) can send.
public enum OutboxGate {
    public static func decide(
        item: SyncItemDTO?,
        meta: OutboxMeta?,
        resumed: Bool,
        resumedProfiles: Set<String>,
        pause: SyncPause,
        confirmedAccount: String?
    ) -> SendDecision {
        if !resumed { return .skip(.notResumed) }
        if pause.isPaused { return .skip(.paused) }
        guard let item else { return .skip(.missing) }
        if !resumedProfiles.contains(item.syncId) { return .skip(.otherProfile) }
        guard let confirmedAccount else { return .skip(.accountUnknown) }
        if let bound = pause.boundAccount, bound != confirmedAccount { return .skip(.wrongAccount) }
        if let queuedUnder = meta?.account, queuedUnder != confirmedAccount { return .skip(.wrongAccount) }
        if meta?.stale == true { return .skip(.staleBase) }
        return .send
    }
}
