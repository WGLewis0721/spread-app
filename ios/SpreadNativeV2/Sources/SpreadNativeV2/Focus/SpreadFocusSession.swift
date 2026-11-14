import Foundation

// The one local focus session, the rules that move it on, and where it is kept. Foundation only, so this
// file compiles into the app, the WidgetKit extension and the Linux test slice. The app's timer, the Live
// Activity buttons and the widgets all go through these functions, so a pause from the island is the same
// pause the app shows. Nothing here reads or writes the planner, and nothing here chooses when work starts:
// the person starts each round, and each break, by tapping.

/// Focus work, or a break. The stored word for a break is "rest".
enum SpreadFocusKind: String, Codable, Equatable {
    case focus
    case rest
}

/// What the person chose: lengths in minutes and how many focus rounds. A break follows every round except
/// the last. One round is a single focus session with no break.
struct SpreadFocusPlan: Codable, Equatable {
    var focusMinutes: Int
    var breakMinutes: Int
    var rounds: Int

    static let standard = SpreadFocusPlan(focusMinutes: 25, breakMinutes: 5, rounds: 4)

    /// Focus keeps the bounds the single-session timer has always used. Breaks and rounds have their own.
    var isValid: Bool {
        (5...240).contains(focusMinutes) && (1...60).contains(breakMinutes) && (1...8).contains(rounds)
    }
}

/// The last plan the person started, and whose it was. Widgets and the island start the next round from it.
struct SpreadFocusChoice: Codable, Equatable {
    let profileId: String
    let roleId: String
    let roleName: String
    let plan: SpreadFocusPlan
}

struct SpreadFocusSession: Codable, Equatable {
    enum Phase: String, Codable { case running, paused, finished }

    let id: String
    let profileId: String
    let roleId: String
    let roleName: String
    /// The length of this stretch: a focus round or a break.
    let durationSeconds: Int
    var pausedSeconds: Int
    var endAt: Date?
    var phase: Phase
    // Round fields arrived after the single session. A session saved before them is one focus stretch.
    var kind: SpreadFocusKind?
    var round: Int?
    var rounds: Int?
    var focusSeconds: Int?
    var breakSeconds: Int?
    /// The day of the planned block this session works through, as YYYY-MM-DD. Nil for a session started by hand.
    var blockDay: String?
    /// True when the person stopped this stretch before its time ran out. The next step then waits for a tap.
    var stoppedEarly: Bool?

    init(id: String, profileId: String, roleId: String, roleName: String, durationSeconds: Int,
         pausedSeconds: Int, endAt: Date?, phase: Phase, kind: SpreadFocusKind? = nil,
         round: Int? = nil, rounds: Int? = nil, focusSeconds: Int? = nil, breakSeconds: Int? = nil,
         blockDay: String? = nil) {
        self.id = id
        self.profileId = profileId
        self.roleId = roleId
        self.roleName = roleName
        self.durationSeconds = durationSeconds
        self.pausedSeconds = pausedSeconds
        self.endAt = endAt
        self.phase = phase
        self.kind = kind
        self.round = round
        self.rounds = rounds
        self.focusSeconds = focusSeconds
        self.breakSeconds = breakSeconds
        self.blockDay = blockDay
    }

    var currentKind: SpreadFocusKind { kind ?? .focus }
    var roundNumber: Int { round ?? 1 }
    var roundCount: Int { rounds ?? 1 }

    /// Whole seconds left. A running stretch counts down to its absolute deadline; a paused one is frozen.
    func remaining(at now: Date = Date()) -> Int {
        switch phase {
        case .running:
            return max(0, Int(ceil((endAt ?? now).timeIntervalSince(now))))
        case .paused:
            return max(0, pausedSeconds)
        case .finished:
            return 0
        }
    }
}

enum SpreadFocusClock {
    static func display(_ seconds: Int) -> String {
        let clamped = max(0, seconds)
        return String(format: "%02d:%02d", clamped / 60, clamped % 60)
    }
}

/// The rules that move a session on. Each function returns the changed session, or nil when the change is
/// not allowed right now. None of them starts anything by itself: a break or the next round follows only
/// when the person asks for it.
enum SpreadFocusMachine {
    /// A stretch of the plan, starting now: focus round `round`, or the break that follows it.
    static func stretch(id: String, profileId: String, roleId: String, roleName: String,
                        plan: SpreadFocusPlan, kind: SpreadFocusKind, round: Int,
                        now: Date, blockDay: String? = nil) -> SpreadFocusSession? {
        guard plan.isValid, (1...plan.rounds).contains(round), !profileId.isEmpty, !roleId.isEmpty else {
            return nil
        }
        let focus = plan.focusMinutes * 60
        let brk = plan.breakMinutes * 60
        let seconds = kind == .focus ? focus : brk
        return SpreadFocusSession(
            id: id, profileId: profileId, roleId: roleId, roleName: roleName,
            durationSeconds: seconds, pausedSeconds: seconds,
            endAt: now.addingTimeInterval(TimeInterval(seconds)), phase: .running,
            kind: kind, round: round, rounds: plan.rounds, focusSeconds: focus, breakSeconds: brk,
            blockDay: blockDay)
    }

    /// A running stretch whose deadline has passed is finished, with no paused time left.
    static func reconciled(_ session: SpreadFocusSession, now: Date) -> SpreadFocusSession {
        guard session.phase == .running, session.remaining(at: now) == 0 else { return session }
        return finished(session)
    }

    static func finished(_ session: SpreadFocusSession) -> SpreadFocusSession {
        var next = session
        next.phase = .finished
        next.endAt = nil
        next.pausedSeconds = 0
        return next
    }

    /// Pauses a running stretch. If its deadline has already passed, it finishes instead.
    static func pause(_ session: SpreadFocusSession, now: Date) -> SpreadFocusSession? {
        guard session.phase == .running else { return nil }
        if session.remaining(at: now) == 0 { return finished(session) }
        var next = session
        next.pausedSeconds = session.remaining(at: now)
        next.endAt = nil
        next.phase = .paused
        return next
    }

    static func resume(_ session: SpreadFocusSession, now: Date) -> SpreadFocusSession? {
        guard session.phase == .paused, session.pausedSeconds > 0 else { return nil }
        var next = session
        next.endAt = now.addingTimeInterval(TimeInterval(session.pausedSeconds))
        next.phase = .running
        return next
    }

    /// What follows a stretch. After focus round r comes a break, unless r was the last round. After a
    /// break comes focus round r + 1. Nil when the plan is over.
    static func next(after session: SpreadFocusSession) -> (kind: SpreadFocusKind, round: Int)? {
        switch session.currentKind {
        case .focus:
            guard session.roundNumber < session.roundCount, (session.breakSeconds ?? 0) > 0 else { return nil }
            return (.rest, session.roundNumber)
        case .rest:
            guard session.roundNumber < session.roundCount else { return nil }
            return (.focus, session.roundNumber + 1)
        }
    }

    /// The words the Continue control shows, or nil when nothing follows.
    static func nextLabel(after session: SpreadFocusSession) -> String? {
        guard let step = next(after: session) else { return nil }
        return step.kind == .rest ? "Start break" : "Start focus round \(step.round)"
    }

    /// The stretch that follows a finished one, starting now. Nil while the current stretch still runs.
    static func followUp(after session: SpreadFocusSession, id: String, now: Date) -> SpreadFocusSession? {
        let ended = reconciled(session, now: now)
        guard ended.phase == .finished, let step = next(after: ended) else { return nil }
        let plan = SpreadFocusPlan(
            focusMinutes: (ended.focusSeconds ?? ended.durationSeconds) / 60,
            breakMinutes: (ended.breakSeconds ?? SpreadFocusPlan.standard.breakMinutes * 60) / 60,
            rounds: ended.roundCount)
        return stretch(id: id, profileId: ended.profileId, roleId: ended.roleId, roleName: ended.roleName,
                       plan: plan, kind: step.kind, round: step.round, now: now, blockDay: ended.blockDay)
    }

    /// Stops a running or paused stretch now. The flow is kept: the step that follows waits for a tap, so Forward
    /// can start it. Nil when there is no stretch running or paused.
    static func stopped(_ session: SpreadFocusSession, now: Date) -> SpreadFocusSession? {
        guard session.phase == .running || session.phase == .paused else { return nil }
        var next = finished(session)
        next.stoppedEarly = true
        return next
    }

    /// Moves on to the step that follows the current stretch, starting it now. A running or paused stretch ends
    /// first, as if it were stopped. Nil when nothing follows.
    static func forward(_ session: SpreadFocusSession, id: String, now: Date) -> SpreadFocusSession? {
        let ended: SpreadFocusSession
        if session.phase == .running || session.phase == .paused {
            ended = stopped(session, now: now) ?? session
        } else {
            ended = session
        }
        return followUp(after: ended, id: id, now: now)
    }

    /// Whether the session still matters on screen: running or paused, or finished with a next step.
    static func isOnScreen(_ session: SpreadFocusSession) -> Bool {
        session.phase != .finished || nextLabel(after: session) != nil
    }
}

/// Settings read by focus controls in both the app and its widget extension.
/// @AppStorage stays in the app's private defaults; a widget intent executes in a
/// different process and must not consult that process's UserDefaults.standard.
/// Only the containing app copies the user's choices into the shared App Group.
enum SpreadFocusPreferences {
    static let liveActivityKey = "native.focus.liveActivityEnabled"
    static let showNameKey = "native.focus.showNameOutsideApp"
    static let notifyKey = "native.focus.notifyWhenDone"

    static func publishFromApp(_ app: UserDefaults = .standard,
                               to shared: UserDefaults = SpreadFocusStore.shared) {
        let widgets = app.bool(forKey: SpreadWidgetShared.todayEnabledKey)
        shared.set(widgets, forKey: SpreadWidgetShared.todayEnabledKey)
        shared.set(widgets, forKey: SpreadWidgetShared.timerEnabledMirrorKey)
        for key in [liveActivityKey, showNameKey, notifyKey] {
            shared.set(app.bool(forKey: key), forKey: key)
        }
    }

    static func widgetsEnabled(_ shared: UserDefaults = SpreadFocusStore.shared) -> Bool {
        shared.bool(forKey: SpreadWidgetShared.todayEnabledKey)
    }

    static func liveActivityEnabled(_ shared: UserDefaults = SpreadFocusStore.shared) -> Bool {
        shared.bool(forKey: liveActivityKey)
    }

    static func showName(_ shared: UserDefaults = SpreadFocusStore.shared) -> Bool {
        shared.bool(forKey: showNameKey)
    }

    static func notifyWhenDone(_ shared: UserDefaults = SpreadFocusStore.shared) -> Bool {
        shared.bool(forKey: notifyKey)
    }
}

/// Where the session, the last choice and the active profile are kept: the shared App Group, so the
/// widgets and the intents read and change them as well as the app.
enum SpreadFocusStore {
    static let appGroup = "group.com.graymatter.spread"
    static let sessionKey = "native.focus.session.v1"
    static let choiceKey = "spread.focus.choice.v1"
    static let profileKey = "spread.focus.activeProfile.v1"

    static var shared: UserDefaults { UserDefaults(suiteName: appGroup) ?? .standard }

    static func load(_ defaults: UserDefaults = SpreadFocusStore.shared) -> SpreadFocusSession? {
        guard let data = defaults.data(forKey: sessionKey) else { return nil }
        return try? JSONDecoder().decode(SpreadFocusSession.self, from: data)
    }

    static func save(_ session: SpreadFocusSession?, _ defaults: UserDefaults = SpreadFocusStore.shared) {
        guard let session, let data = try? JSONEncoder().encode(session) else {
            defaults.removeObject(forKey: sessionKey)
            return
        }
        defaults.set(data, forKey: sessionKey)
    }

    /// Moves a session an earlier build kept in the app's own defaults into the shared store, once.
    static func migrate(from legacy: UserDefaults = .standard, to defaults: UserDefaults = SpreadFocusStore.shared) {
        guard defaults.object(forKey: sessionKey) == nil, let data = legacy.data(forKey: sessionKey) else { return }
        defaults.set(data, forKey: sessionKey)
        legacy.removeObject(forKey: sessionKey)
    }

    static func loadChoice(_ defaults: UserDefaults = SpreadFocusStore.shared) -> SpreadFocusChoice? {
        guard let data = defaults.data(forKey: choiceKey) else { return nil }
        return try? JSONDecoder().decode(SpreadFocusChoice.self, from: data)
    }

    static func saveChoice(_ choice: SpreadFocusChoice, _ defaults: UserDefaults = SpreadFocusStore.shared) {
        guard let data = try? JSONEncoder().encode(choice) else { return }
        defaults.set(data, forKey: choiceKey)
    }

    static func activeProfile(_ defaults: UserDefaults = SpreadFocusStore.shared) -> String? {
        defaults.string(forKey: profileKey)
    }

    static func setActiveProfile(_ profileId: String, _ defaults: UserDefaults = SpreadFocusStore.shared) {
        defaults.set(profileId, forKey: profileKey)
    }

    /// Whether a widget or the island may start work now: nothing is running, paused or waiting for a tap, and
    /// either today's planned block is available for the profile on screen, or the last plan belongs to it.
    static func canStartFromWidget(now: Date = Date(), _ defaults: UserDefaults = SpreadFocusStore.shared) -> Bool {
        if let current = load(defaults) {
            let ended = SpreadFocusMachine.reconciled(current, now: now)
            guard ended.phase == .finished, SpreadFocusMachine.nextLabel(after: ended) == nil else { return false }
        }
        if SpreadDayPlanStore.nextBlock(now: now, defaults) != nil { return true }
        guard let choice = loadChoice(defaults), activeProfile(defaults) == choice.profileId else { return false }
        return true
    }
}

#if DEBUG
/// Diagnostic classifications only; never include profile IDs, session IDs, or planner content.
enum SpreadFocusDiagnostics {
    struct Snapshot {
        let storage: String
        let profile: String
        let enabled: Bool
        let phase: String
        let deadline: String
    }

    static func snapshot(_ defaults: UserDefaults, enabled: Bool, now: Date = Date()) -> Snapshot {
        let object = defaults.object(forKey: SpreadFocusStore.sessionKey)
        let data = defaults.data(forKey: SpreadFocusStore.sessionKey)
        let session = data.flatMap { try? JSONDecoder().decode(SpreadFocusSession.self, from: $0) }
        let storage = object == nil ? "missing" : (session == nil ? "decode_failed" : "decoded")
        let active = SpreadFocusStore.activeProfile(defaults)
        let profile = session == nil ? "unknown" : (active == nil ? "missing" : (active == session?.profileId ? "match" : "mismatch"))
        let current = session.map { SpreadFocusMachine.reconciled($0, now: now) }
        let deadline = current?.endAt.map { String(format: "%.3f", $0.timeIntervalSince1970) } ?? "none"
        return Snapshot(storage: storage, profile: profile, enabled: enabled,
                        phase: current?.phase.rawValue ?? "none", deadline: deadline)
    }

    static func log(_ event: String, defaults: UserDefaults = SpreadFocusStore.shared,
                    enabled: Bool, extra: String = "") {
        let state = snapshot(defaults, enabled: enabled)
        let suite = UserDefaults(suiteName: SpreadFocusStore.appGroup) == nil ? "unavailable_fallback" : "available"
        NSLog("[SpreadFocusDiag] t=%.3f event=%@ suite=%@ storage=%@ profile=%@ enabled=%@ phase=%@ deadline=%@ %@",
              Date().timeIntervalSince1970, event, suite, state.storage, state.profile,
              String(state.enabled), state.phase, state.deadline, extra)
    }
}
#endif
