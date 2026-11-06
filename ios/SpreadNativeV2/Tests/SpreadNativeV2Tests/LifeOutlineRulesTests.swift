import XCTest
@testable import SpreadNativeV2

final class LifeOutlineRulesTests: XCTestCase {
    func testDecimalRomanAndAlphabeticCarry() {
        XCTAssertEqual(LifeOutlineRules.next("9"), "10")
        XCTAssertEqual(LifeOutlineRules.next("I"), "II")
        XCTAssertEqual(LifeOutlineRules.next("IX"), "X")
        XCTAssertEqual(LifeOutlineRules.next("XXIX"), "XXX")
        XCTAssertEqual(LifeOutlineRules.next("A"), "B")
        XCTAssertEqual(LifeOutlineRules.next("Z"), "AA")
        XCTAssertEqual(LifeOutlineRules.next("AZ"), "BA")
    }
    func testChecklistResetsAndBulletsContinue() {
        XCTAssertEqual(LifeOutlineRules.next("☑"), "☐")
        XCTAssertEqual(LifeOutlineRules.next("☐"), "☐")
        XCTAssertEqual(LifeOutlineRules.next("•"), "•")
    }
    func testMalformedAndOverflowInputIsRejected() {
        XCTAssertNil(LifeOutlineRules.next(""))
        XCTAssertNil(LifeOutlineRules.next("not a marker"))
        XCTAssertNil(LifeOutlineRules.next(String(Int.max)))
        XCTAssertNil(LifeOutlineRules.next(String(repeating: "Z", count: 100)))
    }
}
