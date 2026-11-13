import XCTest
@testable import SpreadNativeV2

/// Stop and Forward, the two controls that move a focus flow on by hand. Cancel needs no rule: it clears the session.
final class SpreadFocusStopForwardTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 1_800_000_000)

    private func focusRound(_ round: Int = 1, rounds: Int = 2) throws -> SpreadFocusSession {
        let planned = SpreadFocusPlan(focusMinutes: 25, breakMinutes: 5, rounds: rounds)
        return try XCTUnwrap(SpreadFocusMachine.stretch(
            id: "a", profileId: "p", roleId: "r", roleName: "Work", plan: planned,
            kind: .focus, round: round, now: now))
    }

    func testStoppingARunningRoundKeepsTheBreakWaitingForATap() throws {
        let stopped = try XCTUnwrap(SpreadFocusMachine.stopped(try focusRound(), now: now))
        XCTAssertEqual(stopped.phase, .finished)
        XCTAssertEqual(stopped.stoppedEarly, true)
        XCTAssertNil(stopped.endAt, "a stopped stretch has no deadline")
        XCTAssertEqual(SpreadFocusMachine.nextLabel(after: stopped), "Start break",
                       "the break is still there to start, and nothing starts it by itself")
    }

    func testStoppingAPausedRoundAlsoKeepsTheBreakWaiting() throws {
        let paused = try XCTUnwrap(SpreadFocusMachine.pause(try focusRound(), now: now))
        let stopped = try XCTUnwrap(SpreadFocusMachine.stopped(paused, now: now))
        XCTAssertEqual(stopped.phase, .finished)
        XCTAssertEqual(SpreadFocusMachine.nextLabel(after: stopped), "Start break")
    }

    func testStoppingWhatIsAlreadyFinishedDoesNothing() throws {
        let stopped = try XCTUnwrap(SpreadFocusMachine.stopped(try focusRound(), now: now))
        XCTAssertNil(SpreadFocusMachine.stopped(stopped, now: now))
    }

    func testStoppingTheLastStretchLeavesNothingToContinue() throws {
        let last = try focusRound(2, rounds: 2)
        let stopped = try XCTUnwrap(SpreadFocusMachine.stopped(last, now: now))
        XCTAssertNil(SpreadFocusMachine.nextLabel(after: stopped),
                     "with nothing after it, the island and the widgets release the session")
    }

    func testForwardFromARunningRoundStartsTheBreakAtOnce() throws {
        let next = try XCTUnwrap(SpreadFocusMachine.forward(try focusRound(), id: "b", now: now))
        XCTAssertEqual(next.phase, .running)
        XCTAssertEqual(next.currentKind, .rest)
        XCTAssertEqual(next.roundNumber, 1)
        XCTAssertEqual(next.endAt, now.addingTimeInterval(5 * 60), "the break runs for its planned five minutes")
        XCTAssertNil(next.stoppedEarly)
    }

    func testForwardFromAStoppedRoundStartsTheBreak() throws {
        let stopped = try XCTUnwrap(SpreadFocusMachine.stopped(try focusRound(), now: now))
        let next = try XCTUnwrap(SpreadFocusMachine.forward(stopped, id: "b", now: now))
        XCTAssertEqual(next.currentKind, .rest)
        XCTAssertEqual(next.phase, .running)
    }

    func testForwardFromAPausedRoundStartsTheBreak() throws {
        let paused = try XCTUnwrap(SpreadFocusMachine.pause(try focusRound(), now: now))
        let next = try XCTUnwrap(SpreadFocusMachine.forward(paused, id: "b", now: now))
        XCTAssertEqual(next.currentKind, .rest)
        XCTAssertEqual(next.phase, .running)
    }

    func testForwardAfterTheBreakStartsTheNextRound() throws {
        let breakSession = try XCTUnwrap(SpreadFocusMachine.forward(try focusRound(), id: "b", now: now))
        let round2 = try XCTUnwrap(SpreadFocusMachine.forward(breakSession, id: "c", now: now.addingTimeInterval(60)))
        XCTAssertEqual(round2.currentKind, .focus)
        XCTAssertEqual(round2.roundNumber, 2)
    }

    func testForwardOnTheLastStretchChangesNothing() throws {
        let last = try focusRound(2, rounds: 2)
        XCTAssertNil(SpreadFocusMachine.forward(last, id: "b", now: now),
                     "nothing follows the last stretch, so Forward is refused and the session is left as it was")
    }

    func testStoppedTheFlagSurvivesTheRoundTripThatTheWidgetsUse() throws {
        let stopped = try XCTUnwrap(SpreadFocusMachine.stopped(try focusRound(), now: now))
        let data = try JSONEncoder().encode(stopped)
        let decoded = try JSONDecoder().decode(SpreadFocusSession.self, from: data)
        XCTAssertEqual(decoded.stoppedEarly, true)
        XCTAssertEqual(decoded, stopped)
    }

    func testASessionSavedBeforeTheFlagExistedStillReadsAsRunningOrFinished() throws {
        let running = try focusRound()
        let data = try JSONEncoder().encode(running)
        let decoded = try JSONDecoder().decode(SpreadFocusSession.self, from: data)
        XCTAssertNil(decoded.stoppedEarly, "an older session has no stopped flag, so it reads as not stopped")
        XCTAssertEqual(decoded.phase, .running)
    }
}
