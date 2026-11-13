#if os(iOS)
import AppIntents
import Foundation

// The focus controls on the Live Activity, the Timer widget and the Today widget. Each one changes the same
// local record the app's timer reads, so the island, the widgets and the app stay on one session. A break or
// the next round starts only when the person taps for it. Nothing here moves hours, completes tasks, or
// schedules work. Every control acts only for the profile on screen.

/// The one place a control's change is saved and shown everywhere it appears.
@MainActor
enum SpreadFocusControls {
    /// The session for the profile on screen, with a stretch that ran out while the app was asleep saved as
    /// finished. Nil when there is nothing for the profile on screen.
    static func current(now: Date = Date()) -> SpreadFocusSession? {
        guard let stored = SpreadFocusStore.load(),
              SpreadFocusStore.activeProfile() == stored.profileId else { return nil }
        let reconciled = SpreadFocusMachine.reconciled(stored, now: now)
        if reconciled != stored {
            apply(reconciled, notify: false)
        }
        return reconciled
    }

    /// Saves a change and brings the island, the widgets and the reminder into step with it.
    static func apply(_ session: SpreadFocusSession?, notify: Bool) {
        if let session { SpreadDayPlanStore.recordCompletion(of: session) }
        SpreadFocusStore.save(session)
        SpreadFocusLiveActivityController.refresh(session)
        SpreadFocusWidgetPublisher.publish(session)
        if let session, session.phase == .running, notify {
            Task { await SpreadLocalAlerts.scheduleFocus(session) }
        } else {
            SpreadLocalAlerts.cancelFocus()
        }
    }

    /// Whether the person chose to be told when a stretch ends.
    static var notifyWhenDone: Bool {
        UserDefaults.standard.bool(forKey: "native.focus.notifyWhenDone")
    }
}

/// Starts today's planned block: its first focus round, sized to the hours planned for that Life area. Only when
/// nothing is running, paused or waiting for a tap. The planner is only read; nothing is written back to it.
struct StartSpreadBlockIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Start today's block"
    static var description = IntentDescription("Start the focus rounds planned for today.")

    @MainActor
    func perform() async throws -> some IntentResult {
        guard let offered = SpreadDayPlanStore.nextBlock(now: Date()) else { return .result() }
        if let existing = SpreadFocusControls.current(),
           existing.phase != .finished || SpreadFocusMachine.nextLabel(after: existing) != nil {
            return .result()
        }
        guard let session = SpreadFocusMachine.stretch(
            id: UUID().uuidString, profileId: offered.record.profileId, roleId: offered.entry.roleId,
            roleName: offered.entry.label, plan: offered.entry.plan, kind: .focus, round: 1, now: Date(),
            blockDay: offered.record.day) else { return .result() }
        SpreadFocusStore.saveChoice(SpreadFocusChoice(
            profileId: offered.record.profileId, roleId: offered.entry.roleId,
            roleName: offered.entry.label, plan: offered.entry.plan))
        SpreadFocusControls.apply(session, notify: SpreadFocusControls.notifyWhenDone)
        return .result()
    }
}

/// Starts focus round 1 of the last plan. Only when nothing is running, paused or waiting for a tap.
struct StartSpreadFocusIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Start focus"
    static var description = IntentDescription("Start a focus session with your last plan.")

    @MainActor
    func perform() async throws -> some IntentResult {
        guard let choice = SpreadFocusStore.loadChoice(),
              SpreadFocusStore.activeProfile() == choice.profileId else { return .result() }
        if let existing = SpreadFocusControls.current(),
           existing.phase != .finished || SpreadFocusMachine.nextLabel(after: existing) != nil {
            return .result()
        }
        guard let session = SpreadFocusMachine.stretch(
            id: UUID().uuidString, profileId: choice.profileId, roleId: choice.roleId, roleName: choice.roleName,
            plan: choice.plan, kind: .focus, round: 1, now: Date()) else { return .result() }
        SpreadFocusControls.apply(session, notify: SpreadFocusControls.notifyWhenDone)
        return .result()
    }
}

struct PauseSpreadFocusIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Pause focus"

    @MainActor
    func perform() async throws -> some IntentResult {
        guard let session = SpreadFocusControls.current(),
              let paused = SpreadFocusMachine.pause(session, now: Date()) else { return .result() }
        SpreadFocusControls.apply(paused, notify: false)
        return .result()
    }
}

struct ResumeSpreadFocusIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Resume focus"

    @MainActor
    func perform() async throws -> some IntentResult {
        guard let session = SpreadFocusControls.current(),
              let resumed = SpreadFocusMachine.resume(session, now: Date()) else { return .result() }
        SpreadFocusControls.apply(resumed, notify: SpreadFocusControls.notifyWhenDone)
        return .result()
    }
}

/// Stops the running or paused stretch now. The flow is kept: the next step waits for a tap, so Forward starts it.
/// Nothing starts. Hours, tasks and the week are not changed.
struct StopSpreadFocusIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Stop focus"
    static var description = IntentDescription("Stop the current stretch now. Nothing starts after it.")

    @MainActor
    func perform() async throws -> some IntentResult {
        guard let session = SpreadFocusControls.current(),
              let stopped = SpreadFocusMachine.stopped(session, now: Date()) else { return .result() }
        SpreadFocusControls.apply(stopped, notify: false)
        return .result()
    }
}

/// Cancels the whole focus session: the current stretch and anything that would have followed it. The island and
/// the widgets release it at once. Nothing is recorded as done, and nothing starts.
struct CancelSpreadFocusIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Cancel focus"
    static var description = IntentDescription("Cancel the focus session. Nothing is recorded, and nothing starts.")

    @MainActor
    func perform() async throws -> some IntentResult {
        guard SpreadFocusControls.current() != nil else { return .result() }
        SpreadFocusControls.apply(nil, notify: false)
        return .result()
    }
}

/// Moves on to the next step: the break or the next focus round. A running stretch ends first, so Forward also
/// skips the rest of a stretch. Nothing starts without this tap.
struct ForwardSpreadFocusIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Forward to next step"
    static var description = IntentDescription("Start the break, or the next focus round, now.")

    @MainActor
    func perform() async throws -> some IntentResult {
        guard let session = SpreadFocusControls.current(),
              let next = SpreadFocusMachine.forward(session, id: UUID().uuidString, now: Date()) else {
            return .result()
        }
        SpreadFocusControls.apply(next, notify: SpreadFocusControls.notifyWhenDone)
        return .result()
    }
}
#endif
