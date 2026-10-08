import XCTest
@testable import SpreadCloudCore

final class PayloadCheckTests: XCTestCase {
    func testRoundTrip() {
        let text = #"{"text":"Pay rent"}"#
        XCTAssertEqual(PayloadCheck.verify(text: text, expectedHash: PayloadCheck.hash(text)), .ok(text))
    }

    func testMissingAssetIsNotAnEmptyItem() {
        XCTAssertEqual(PayloadCheck.verify(text: nil, expectedHash: PayloadCheck.hash("{}")), .missing)
    }

    func testTruncatedPayloadIsRefused() {
        let text = #"{"text":"Pay rent","done":false}"#
        let cut = String(text.prefix(12))
        XCTAssertEqual(PayloadCheck.verify(text: cut, expectedHash: PayloadCheck.hash(text)), .mismatch)
    }

    func testMissingHashIsRefused() {
        XCTAssertEqual(PayloadCheck.verify(text: "{}", expectedHash: nil), .mismatch)
    }

    func testHashIsStableAndSixteenDigits() {
        XCTAssertEqual(PayloadCheck.hash("").count, 16)
        XCTAssertEqual(PayloadCheck.hash(""), "cbf29ce484222325")
        XCTAssertEqual(PayloadCheck.hash("a"), "af63dc4c8601ec8c")
    }

    func testSizeCap() {
        XCTAssertTrue(PayloadCheck.fits("small"))
        XCTAssertFalse(PayloadCheck.fits(String(repeating: "x", count: PayloadCheck.maxBytes + 1)))
    }
}
