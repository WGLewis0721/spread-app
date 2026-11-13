#if os(iOS)
import Combine
import Foundation

/// The one local focus session the person sees in the app. Every change goes through the shared rules and the
/// shared store, so the Dynamic Island, the widgets and the app always agree. A break or the next round starts
/// only when the person taps for it. Timer state never changes budgets, allocations, tasks, or completion flags
/// in the authoritative planner.
@MainActor
final class SpreadFocusTimer: ObservableObject {
    @Published private(set) var session: SpreadFocusSession?

    init() {
        SpreadFocusStore.migrate()
        session = SpreadFocusStore.load()
        reconcile()
        SpreadFocusLiveActivityController.refresh(session)
        SpreadFocusWidgetPublisher.publish(session)
    }

    /// Records which profile is on screen. The widgets and the island act only for that profile.
    func noteActiveProfile(_ profileId: String) {
        SpreadFocusStore.setActiveProfile(profileId)
        // The mirror for the widgets depends on the profile on screen, so refresh it now.
        SpreadFocusWidgetPublisher.republishFromStore()
    }

    func visibleSession(for profileId: String) -> SpreadFocusSession? {
        guard session?.profileId == profileId else { return nil }
        return session
    }

    /// The island and the widgets change the same record while the app is not running. Pick up their changes.
    func reloadFromStore() {
        let stored = SpreadFocusStore.load()
        if stored != session { session = stored }
        reconcile()
    }

    /// A single focus session with no break.
    @discardableResult
    func start(profileId: String, roleId: String, roleName: String, minutes: Int, notify: Bool) -> Bool {
        startPlan(profileId: profileId, roleId: roleId, roleName: roleName,
                  plan: SpreadFocusPlan(focusMinutes: minutes,
                                        breakMinutes: SpreadFocusPlan.standard.breakMinutes, rounds: 1),
                  notify: notify)
    }

    /// Focus round 1 of a plan. Refused while another session is running or paused. A session waiting for a
    /// tap may be replaced.
    @discardableResult
    func startPlan(profileId: String, roleId: String, roleName: String, plan: SpreadFocusPlan, notify: Bool) -> Bool {
        if let session, SpreadFocusMachine.reconciled(session, now: Date()).phase != .finished { return false }
        guard let next = SpreadFocusMachine.stretch(
            id: UUID().uuidString, profileId: profileId, roleId: roleId, roleName: roleName,
            plan: plan, kind: .focus, round: 1, now: Date()) else { return false }
        SpreadFocusStore.saveChoice(SpreadFocusChoice(profileId: profileId, roleId: roleId,
                                                      roleName: roleName, plan: plan))
        commit(next, notify: notify)
        return true
    }

    /// Starts a planned block from the sheet. Same rules as the island's Start: nothing else running or waiting.
    @discardableResult
    func startBlock(_ offered: SpreadOfferedBlock, notify: Bool) -> Bool {
        if let session, SpreadFocusMachine.reconciled(session, now: Date()).phase != .finished { return false }
        guard let next = SpreadFocusMachine.stretch(
            id: UUID().uuidString, profileId: offered.record.profileId, roleId: offered.entry.roleId,
            roleName: offered.entry.label, plan: offered.entry.plan, kind: .focus, round: 1, now: Date(),
            blockDay: offered.record.day) else { return false }
        SpreadFocusStore.saveChoice(SpreadFocusChoice(
            profileId: offered.record.profileId, roleId: offered.entry.roleId,
            roleName: offered.entry.label, plan: offered.entry.plan))
        commit(next, notify: notify)
        return true
    }

    /// Starts the break, or the next focus round, once the person asks for it.
    func continueFlow(profileId: String, notify: Bool) {
        guard let current = visibleSession(for: profileId),
              let next = SpreadFocusMachine.followUp(after: current, id: UUID().uuidString, now: Date()) else { return }
        commit(next, notify: notify)
    }

    func pause(profileId: String) {
        guard let current = visibleSession(for: profileId),
              let next = SpreadFocusMachine.pause(current, now: Date()) else { return }
        commit(next, notify: false)
    }

    func resume(profileId: String, notify: Bool) {
        guard let current = visibleSession(for: profileId),
              let next = SpreadFocusMachine.resume(current, now: Date()) else { return }
        commit(next, notify: notify)
    }

    /// Ends the whole flow: the current stretch, and anything that would have followed it.
    func finish(profileId: String) {
        guard let current = visibleSession(for: profileId) else { return }
        commit(SpreadFocusMachine.finished(current), notify: false)
    }

    func pauseForProfileSwitch(to newProfileId: String) {
        guard let current = session, current.profileId != newProfileId,
              current.phase == .running else { return }
        pause(profileId: current.profileId)
        SpreadFocusLiveActivityController.end()
    }

    /// A running stretch whose deadline has passed becomes finished. A break or round that follows waits for a tap.
    func reconcile() {
        guard let current = session else { return }
        let next = SpreadFocusMachine.reconciled(current, now: Date())
        if next != current { commit(next, notify: false) }
    }

    private func commit(_ next: SpreadFocusSession?, notify: Bool) {
        session = next
        SpreadFocusControls.apply(next, notify: notify)
    }
}
#endif
