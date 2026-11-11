import XCTest
@testable import SpreadNativeV2

/// What a finished Life card drag means, with the numbers PR #158 shipped.
/// exitDistance is 480, the value a 390 pt phone uses.
final class LifeCardSwipeRulesTests: XCTestCase {
    private func outcome(
        editing: Bool = true, dismissing: Bool = false, reveal: Double = 0,
        h: Double, v: Double = 0, predicted: Double? = nil
    ) -> LifeCardSwipeRules.Outcome {
        LifeCardSwipeRules.outcome(
            editing: editing, dismissing: dismissing, reveal: reveal,
            horizontal: h, vertical: v, predictedEnd: predicted ?? h, exitDistance: 480)
    }

    func testOutsideEditOrWhileLeavingADragMeansNothing() {
        XCTAssertEqual(outcome(editing: false, h: -120), .ignore)
        XCTAssertEqual(outcome(editing: false, h: 400), .ignore)
        XCTAssertEqual(outcome(dismissing: true, h: 400), .ignore)
    }

    func testMostlyVerticalDragReturnsFromTheFingerAndLeavesManageAlone() {
        XCTAssertEqual(outcome(h: 60, v: 60), .keepReveal)
        XCTAssertEqual(outcome(h: -100, v: 80), .keepReveal)
        XCTAssertEqual(outcome(h: 0, v: 0), .keepReveal)
    }

    func testLeftDragOpensManageAtTheTrayWidth() {
        XCTAssertEqual(outcome(h: -60, v: 4), .reveal(-92))
        XCTAssertEqual(outcome(h: -34, v: 0), .reveal(-92))
        XCTAssertEqual(outcome(h: -300, v: 0), .reveal(-92))
    }

    func testShortLeftDragLeavesManageClosed() {
        XCTAssertEqual(outcome(h: -20, v: 0), .reveal(0))
        XCTAssertEqual(outcome(h: -10, v: 0, predicted: 90), .reveal(0))
    }

    func testOpenManageStaysOpenOnASmallLeftDragAndClosesOnARightReturn() {
        XCTAssertEqual(outcome(reveal: -92, h: -10), .reveal(-92))
        XCTAssertEqual(outcome(reveal: -92, h: 60), .closeReveal)
    }

    func testDecisiveRightDragRemovesTheLifeArea() {
        XCTAssertEqual(outcome(h: 300), .dismiss)
        XCTAssertEqual(outcome(h: 265), .dismiss)
        XCTAssertEqual(outcome(h: 120, predicted: 470), .dismiss)
    }

    func testIndecisiveRightDragReturnsTheCardAndClosesManage() {
        XCTAssertEqual(outcome(h: 100), .closeReveal)
        XCTAssertEqual(outcome(h: 260), .closeReveal)
        XCTAssertEqual(outcome(h: 120, predicted: 400), .closeReveal)
        XCTAssertEqual(outcome(reveal: -92, h: 92, predicted: 900), .closeReveal)
    }

    func testCardFollowsTheFingerButNotFurtherLeftThanManageNeeds() {
        XCTAssertEqual(LifeCardSwipeRules.liveOffset(horizontal: -300, exitDistance: 480), -110)
        XCTAssertEqual(LifeCardSwipeRules.liveOffset(horizontal: -50, exitDistance: 480), -50)
        XCTAssertEqual(LifeCardSwipeRules.liveOffset(horizontal: 200, exitDistance: 480), 200)
        XCTAssertEqual(LifeCardSwipeRules.liveOffset(horizontal: 700, exitDistance: 480), 480)
    }

    func testTappingACardInEditDoesNotSelectIt() {
        XCTAssertFalse(LifeCardSwipeRules.tapSelects(editing: true))
        XCTAssertTrue(LifeCardSwipeRules.tapSelects(editing: false))
    }
}
