import XCTest
@testable import SpreadNativeV2

/// The controls each focus widget size shows. The rules are shared, so the Linux slice tests them directly.
final class SpreadFocusControlRulesTests: XCTestCase {
    private func all(running: Bool = false, paused: Bool = false, waitingNext: Bool = false,
                     hasBlock: Bool = false, canStart: Bool = false) -> [SpreadFocusControl] {
        SpreadFocusControlRules.all(running: running, paused: paused, waitingNext: waitingNext,
                                    hasBlock: hasBlock, canStart: canStart)
    }

    func testRunningOffersPauseThenFinishThenTheLink() {
        XCTAssertEqual(all(running: true), [.pause, .finish, .openSpread])
    }

    func testPausedOffersResumeThenFinish() {
        XCTAssertEqual(all(paused: true), [.resume, .finish, .openSpread])
    }

    func testWaitingForATapOffersTheNextStepThenFinish() {
        XCTAssertEqual(all(waitingNext: true), [.next, .finish, .openSpread])
    }

    func testIdleOffersTodaysBlockBeforeTheLastPlan() {
        XCTAssertEqual(all(hasBlock: true, canStart: true), [.startBlock, .openSpread])
        XCTAssertEqual(all(canStart: true), [.startFocus, .openSpread])
    }

    func testIdleWithNothingToStartOffersOnlyTheLink() {
        XCTAssertEqual(all(), [.openSpread])
    }

    func testTheSmallSizeShowsOneControlTheMediumTwoAndTheLargeAll() {
        let running = all(running: true)
        XCTAssertEqual(SpreadFocusControlRules.shown(running, size: .small), [.pause])
        XCTAssertEqual(SpreadFocusControlRules.shown(running, size: .medium), [.pause, .finish])
        XCTAssertEqual(SpreadFocusControlRules.shown(running, size: .large), [.pause, .finish, .openSpread])
    }

    func testTheControlsGrowWithTheSizeWhateverTheState() {
        let states = [
            all(running: true), all(paused: true), all(waitingNext: true),
            all(hasBlock: true, canStart: true), all(canStart: true), all(),
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

    func testAWidgetNeverShowsMoreControlsThanApply() {
        XCTAssertEqual(SpreadFocusControlRules.shown(all(), size: .large), [.openSpread])
        XCTAssertEqual(SpreadFocusControlRules.shown(all(), size: .medium), [.openSpread])
    }
}
