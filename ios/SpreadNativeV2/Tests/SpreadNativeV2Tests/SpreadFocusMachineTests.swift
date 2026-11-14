import XCTest
@testable import SpreadNativeV2

/// The rules behind the timer, the Live Activity buttons and the widgets. Foundation only, so these also run
/// on the Linux test slice. Nothing here starts a break or the next round by itself.
final class SpreadFocusMachineTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 1_800_000_000)
    private let plan = SpreadFocusPlan.standard   // 25 minutes, 5 minute breaks, 4 rounds

    private func start(_ kind: SpreadFocusKind = .focus, round: Int = 1, plan: SpreadFocusPlan? = nil) -> SpreadFocusSession {
        guard let session = SpreadFocusMachine.stretch(
            id: "s", profileId: "profile-a", roleId: "gym", roleName: "Gym",
            plan: plan ?? self.plan, kind: kind, round: round, now: now) else {
            XCTFail("session should start")
            fatalError()
        }
        return session
    }

    // MARK: Plans

    func testPlanBoundsRefuseNonsense() {
        XCTAssertTrue(SpreadFocusPlan.standard.isValid)
        XCTAssertFalse(SpreadFocusPlan(focusMinutes: 4, breakMinutes: 5, rounds: 4).isValid)
        XCTAssertFalse(SpreadFocusPlan(focusMinutes: 25, breakMinutes: 0, rounds: 4).isValid)
        XCTAssertFalse(SpreadFocusPlan(focusMinutes: 25, breakMinutes: 5, rounds: 0).isValid)
        XCTAssertFalse(SpreadFocusPlan(focusMinutes: 25, breakMinutes: 5, rounds: 9).isValid)
        XCTAssertNil(SpreadFocusMachine.stretch(id: "x", profileId: "", roleId: "gym", roleName: "Gym",
                                                plan: plan, kind: .focus, round: 1, now: now))
        XCTAssertNil(SpreadFocusMachine.stretch(id: "x", profileId: "p", roleId: "gym", roleName: "Gym",
                                                plan: plan, kind: .focus, round: 5, now: now))
    }

    func testFocusAndBreakLengthsComeFromThePlan() {
        let focus = start(.focus)
        XCTAssertEqual(focus.durationSeconds, 1500)
        XCTAssertEqual(focus.endAt, now.addingTimeInterval(1500))
        let rest = start(.rest, round: 1)
        XCTAssertEqual(rest.durationSeconds, 300)
        XCTAssertEqual(rest.currentKind, .rest)
    }

    // MARK: The round sequence

    func testFourRoundsRunFocusBreakAndEndWithNoBreakAfterTheLast() {
        var session: SpreadFocusSession? = start(.focus, round: 1)
        var sequence: [String] = ["focus 1"]
        // Walk the whole plan by finishing each stretch and asking for the next one.
        for _ in 0..<12 {
            guard let current = session else { break }
            let ended = SpreadFocusMachine.finished(current)
            guard let next = SpreadFocusMachine.followUp(after: ended, id: "n", now: now) else { break }
            sequence.append("\(next.currentKind.rawValue) \(next.roundNumber)")
            session = next
        }
        XCTAssertEqual(sequence, ["focus 1", "rest 1", "focus 2", "rest 2", "focus 3", "rest 3", "focus 4"])
    }

    func testOnlyTheLastRoundHasNothingAfterIt() {
        XCTAssertEqual(SpreadFocusMachine.nextLabel(after: start(.focus, round: 1)), "Start break")
        XCTAssertEqual(SpreadFocusMachine.nextLabel(after: start(.rest, round: 1)), "Start focus round 2")
        XCTAssertNil(SpreadFocusMachine.nextLabel(after: start(.focus, round: 4)))
    }

    func testASingleSessionHasNoBreakAndNoNextStep() {
        let single = SpreadFocusPlan(focusMinutes: 45, breakMinutes: 5, rounds: 1)
        let session = start(.focus, round: 1, plan: single)
        XCTAssertEqual(session.roundCount, 1)
        XCTAssertNil(SpreadFocusMachine.next(after: session))
        XCTAssertNil(SpreadFocusMachine.followUp(after: SpreadFocusMachine.finished(session), id: "n", now: now))
    }

    func testNothingFollowsAStretchThatIsStillRunning() {
        let running = start(.focus, round: 1)
        XCTAssertNil(SpreadFocusMachine.followUp(after: running, id: "n", now: now.addingTimeInterval(60)))
    }

    func testAFocusRoundThatRanOutOnItsOwnCanBeContinuedFromWhileTheAppWasAsleep() {
        let running = start(.focus, round: 1)
        let later = now.addingTimeInterval(1501)   // the app did not run; the deadline passed
        let next = SpreadFocusMachine.followUp(after: running, id: "n", now: later)
        XCTAssertEqual(next?.currentKind, .rest)
        XCTAssertEqual(next?.roundNumber, 1)
        XCTAssertEqual(next?.endAt, later.addingTimeInterval(300))
    }

    // MARK: Pause and resume

    func testPausingFreezesTheRemainingTimeAndResumingPicksItUp() {
        let running = start(.focus, round: 1)
        let paused = SpreadFocusMachine.pause(running, now: now.addingTimeInterval(600))
        XCTAssertEqual(paused?.phase, .paused)
        XCTAssertEqual(paused?.pausedSeconds, 900)
        XCTAssertEqual(paused?.remaining(at: now.addingTimeInterval(9999)), 900)
        let resumed = SpreadFocusMachine.resume(paused!, now: now.addingTimeInterval(9999))
        XCTAssertEqual(resumed?.phase, .running)
        XCTAssertEqual(resumed?.remaining(at: now.addingTimeInterval(9999)), 900)
    }

    func testPausingAfterTheDeadlineFinishesInsteadOfPausingAtZero() {
        let running = start(.focus, round: 1)
        let late = SpreadFocusMachine.pause(running, now: now.addingTimeInterval(1600))
        XCTAssertEqual(late?.phase, .finished)
        XCTAssertNil(late?.endAt)
    }

    func testOnlyARunningStretchPausesAndOnlyAPausedOneResumes() {
        let running = start(.focus, round: 1)
        XCTAssertNil(SpreadFocusMachine.resume(running, now: now))
        let paused = SpreadFocusMachine.pause(running, now: now.addingTimeInterval(10))!
        XCTAssertNil(SpreadFocusMachine.pause(paused, now: now))
    }

    func testReconcileTurnsAnExpiredRunningStretchIntoAFinishedOne() {
        let running = start(.focus, round: 1)
        XCTAssertEqual(SpreadFocusMachine.reconciled(running, now: now.addingTimeInterval(10)), running)
        let reconciled = SpreadFocusMachine.reconciled(running, now: now.addingTimeInterval(1501))
        XCTAssertEqual(reconciled.phase, .finished)
        XCTAssertEqual(reconciled.pausedSeconds, 0)
    }

    // MARK: Old records and the store

    func testASessionSavedBeforeRoundsDecodesAsOneFocusStretch() throws {
        let legacy = """
        {"id":"old","profileId":"p","roleId":"gym","roleName":"Gym","durationSeconds":1500,
         "pausedSeconds":1500,"endAt":1800001500,"phase":"running"}
        """
        let session = try JSONDecoder().decode(SpreadFocusSession.self, from: Data(legacy.utf8))
        XCTAssertEqual(session.currentKind, .focus)
        XCTAssertEqual(session.roundNumber, 1)
        XCTAssertEqual(session.roundCount, 1)
        XCTAssertNil(SpreadFocusMachine.next(after: session))
    }

    private func isolatedDefaults() -> UserDefaults {
        let name = "spread.test.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: name)!
        defaults.removePersistentDomain(forName: name)
        return defaults
    }

    func testTheStoreRoundTripsTheSessionAndTheLastChoice() {
        let defaults = isolatedDefaults()
        let session = start(.rest, round: 2)
        SpreadFocusStore.save(session, defaults)
        XCTAssertEqual(SpreadFocusStore.load(defaults), session)
        SpreadFocusStore.save(nil, defaults)
        XCTAssertNil(SpreadFocusStore.load(defaults))

        let choice = SpreadFocusChoice(profileId: "profile-a", roleId: "gym", roleName: "Gym", plan: plan)
        SpreadFocusStore.saveChoice(choice, defaults)
        XCTAssertEqual(SpreadFocusStore.loadChoice(defaults), choice)
    }

    func testAnEarlierBuildsSessionMovesIntoTheSharedStoreOnce() {
        let legacy = isolatedDefaults()
        let shared = isolatedDefaults()
        let session = start(.focus, round: 1)
        legacy.set(try! JSONEncoder().encode(session), forKey: SpreadFocusStore.sessionKey)
        SpreadFocusStore.migrate(from: legacy, to: shared)
        XCTAssertEqual(SpreadFocusStore.load(shared), session)
        XCTAssertNil(legacy.data(forKey: SpreadFocusStore.sessionKey))
    }

    func testWidgetActionsUseSharedOptInsInsteadOfExtensionPrivateDefaults() {
        let app = isolatedDefaults()
        let shared = isolatedDefaults()

        app.set(true, forKey: SpreadWidgetShared.todayEnabledKey)
        app.set(true, forKey: SpreadFocusPreferences.liveActivityKey)
        app.set(true, forKey: SpreadFocusPreferences.showNameKey)
        app.set(true, forKey: SpreadFocusPreferences.notifyKey)
        SpreadFocusPreferences.publishFromApp(app, to: shared)

        XCTAssertTrue(SpreadFocusPreferences.widgetsEnabled(shared))
        XCTAssertTrue(SpreadFocusPreferences.liveActivityEnabled(shared))
        XCTAssertTrue(SpreadFocusPreferences.showName(shared))
        XCTAssertTrue(SpreadFocusPreferences.notifyWhenDone(shared))
        XCTAssertTrue(shared.bool(forKey: SpreadWidgetShared.timerEnabledMirrorKey))

        // A widget process has different UserDefaults.standard. Its actions
        // must read the App Group, not re-interpret absent values as opt-out.
        app.set(false, forKey: SpreadFocusPreferences.liveActivityKey)
        XCTAssertTrue(SpreadFocusPreferences.liveActivityEnabled(shared))
        SpreadFocusPreferences.publishFromApp(app, to: shared)
        XCTAssertFalse(SpreadFocusPreferences.liveActivityEnabled(shared))

        for key in [SpreadWidgetShared.todayEnabledKey,
                    SpreadFocusPreferences.showNameKey, SpreadFocusPreferences.notifyKey] {
            app.set(false, forKey: key)
        }
        SpreadFocusPreferences.publishFromApp(app, to: shared)
        XCTAssertFalse(SpreadFocusPreferences.widgetsEnabled(shared))
        XCTAssertFalse(SpreadFocusPreferences.showName(shared))
        XCTAssertFalse(SpreadFocusPreferences.notifyWhenDone(shared))
        XCTAssertFalse(shared.bool(forKey: SpreadWidgetShared.timerEnabledMirrorKey))
    }

    func testWidgetsMayStartOnlyForTheProfileOnScreenAndOnlyWhenNothingIsWaiting() {
        let defaults = isolatedDefaults()
        XCTAssertFalse(SpreadFocusStore.canStartFromWidget(now: now, defaults))   // no plan chosen yet
        SpreadFocusStore.saveChoice(SpreadFocusChoice(profileId: "profile-a", roleId: "gym", roleName: "Gym", plan: plan), defaults)
        XCTAssertFalse(SpreadFocusStore.canStartFromWidget(now: now, defaults))   // no profile on screen yet
        SpreadFocusStore.setActiveProfile("profile-b", defaults)
        XCTAssertFalse(SpreadFocusStore.canStartFromWidget(now: now, defaults))   // another profile
        SpreadFocusStore.setActiveProfile("profile-a", defaults)
        XCTAssertTrue(SpreadFocusStore.canStartFromWidget(now: now, defaults))
        SpreadFocusStore.save(start(.focus, round: 1), defaults)
        XCTAssertFalse(SpreadFocusStore.canStartFromWidget(now: now.addingTimeInterval(60), defaults))   // running
        XCTAssertFalse(SpreadFocusStore.canStartFromWidget(now: now.addingTimeInterval(1501), defaults)) // waiting for a break
    }

    func testAFinishedSessionWithNothingAfterItIsOnScreenOnlyUntilFinished() {
        let single = SpreadFocusPlan(focusMinutes: 45, breakMinutes: 5, rounds: 1)
        let session = start(.focus, round: 1, plan: single)
        XCTAssertTrue(SpreadFocusMachine.isOnScreen(session))
        XCTAssertFalse(SpreadFocusMachine.isOnScreen(SpreadFocusMachine.finished(session)))
        XCTAssertTrue(SpreadFocusMachine.isOnScreen(SpreadFocusMachine.finished(start(.focus, round: 1))))
    }
}
