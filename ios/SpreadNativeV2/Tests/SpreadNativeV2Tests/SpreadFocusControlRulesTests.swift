import XCTest
@testable import SpreadNativeV2

/// The controls each focus surface shows. The rules are shared by the Timer widget, the Today panel and the island,
/// so the Linux slice tests them directly.
final class SpreadFocusControlRulesTests: XCTestCase {
    private func all(running: Bool = false, paused: Bool = false, waiting: Bool = false, hasNext: Bool = false,
                     hasBlock: Bool = false, canStart: Bool = false) -> [SpreadFocusControl] {
        SpreadFocusControlRules.all(running: running, paused: paused, waiting: waiting, hasNext: hasNext,
                                    hasBlock: hasBlock, canStart: canStart)
    }

    func testRunningOffersPauseForwardStopCancelThenTheLink() {
        XCTAssertEqual(all(running: true, hasNext: true), [.pause, .forward, .stop, .cancel, .openSpread])
    }

    func testRunningTheLastStretchHasNoForward() {
        XCTAssertEqual(all(running: true), [.pause, .stop, .cancel, .openSpread])
    }

    func testPausedOffersResumeInPlaceOfPause() {
        XCTAssertEqual(all(paused: true, hasNext: true), [.resume, .forward, .stop, .cancel, .openSpread])
    }

    func testAStretchWaitingForATapOffersForwardThenCancel() {
        XCTAssertEqual(all(waiting: true, hasNext: true), [.forward, .cancel, .openSpread])
    }

    func testAWaitingStretchWithNothingAfterItOffersOnlyCancel() {
        XCTAssertEqual(all(waiting: true), [.cancel, .openSpread])
    }

    func testIdleOffersTodaysBlockBeforeTheLastPlan() {
        XCTAssertEqual(all(hasBlock: true, canStart: true), [.startBlock, .openSpread])
        XCTAssertEqual(all(canStart: true), [.startFocus, .openSpread])
    }

    func testIdleWithNothingToStartOffersOnlyTheLink() {
        XCTAssertEqual(all(), [.openSpread])
    }

    func testTheSmallSizeShowsOneControlTheMediumTwoAndTheLargeAll() {
        let running = all(running: true, hasNext: true)
        XCTAssertEqual(SpreadFocusControlRules.shown(running, size: .small), [.pause])
        XCTAssertEqual(SpreadFocusControlRules.shown(running, size: .medium), [.pause, .forward])
        XCTAssertEqual(SpreadFocusControlRules.shown(running, size: .large),
                       [.pause, .forward, .stop, .cancel, .openSpread])
    }

    func testTheControlsGrowWithTheSizeWhateverTheState() {
        let states = [
            all(running: true, hasNext: true), all(running: true), all(paused: true, hasNext: true),
            all(waiting: true, hasNext: true), all(waiting: true), all(hasBlock: true, canStart: true),
            all(canStart: true), all(),
        ]
        for controls in states {
            let small = SpreadFocusControlRules.shown(controls, size: .small).count
            let medium = SpreadFocusControlRules.shown(controls, size: .medium).count
            let large = SpreadFocusControlRules.shown(controls, size: .large).count
            XCTAssertLessThanOrEqual(small, medium)
            XCTAssertLessThanOrEqual(medium, large)
            XCTAssertEqual(large, controls.count, "the large size shows every control that applies")
        }
    }

    func testCancelIsOfferedWhileAnyStretchIsOnScreen() {
        for controls in [all(running: true), all(paused: true), all(waiting: true)] {
            XCTAssertTrue(controls.contains(.cancel), "cancel must release the session from any stretch on screen")
        }
    }

    func testAWidgetNeverShowsMoreControlsThanApply() {
        XCTAssertEqual(SpreadFocusControlRules.shown(all(), size: .large), [.openSpread])
        XCTAssertEqual(SpreadFocusControlRules.shown(all(), size: .medium), [.openSpread])
    }
}
