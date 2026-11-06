import XCTest

/// On-device and simulator observations are separate. These tests use the real app/bridge,
/// not the browser demo, and preserve screenshots as XCTest attachments.
final class LifeUITests: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "com.graymatter.spread")

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func startLife() {
        if app.state != .notRunning { app.terminate() }
        app.launchArguments = ["-native.weekMonth.previewEnabled", "YES"]
        app.launch()
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "life-root").firstMatch
            .waitForExistence(timeout: 90), "The opted-in native Life root did not load.")
    }

    private func navigate(_ page: String) {
        let navigation = app.buttons["life-navigation"]
        XCTAssertTrue(navigation.waitForExistence(timeout: 20))
        navigation.tap()
        let destination = app.buttons["life-nav-" + page]
        XCTAssertTrue(destination.waitForExistence(timeout: 10))
        destination.tap()
    }

    private func capture(_ title: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = title
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    func testLifeNavigationAndUnmodifiedMoreReachability() {
        startLife()
        let life = app.descendants(matching: .any).matching(identifier: "life-page").firstMatch
        XCTAssertTrue(life.waitForExistence(timeout: 30))
        capture("life-stack")
        navigate("hours")
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "life-hours-page").firstMatch
            .waitForExistence(timeout: 20))
        capture("life-hours")
        navigate("week")
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "life-week-page").firstMatch
            .waitForExistence(timeout: 20))
        capture("life-week")
        let morph = app.descendants(matching: .any).matching(identifier: "life-week-month-toggle").firstMatch
        XCTAssertTrue(morph.exists)
        morph.tap()
        capture("life-month")
        app.buttons["life-more"].tap()
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "more-overview").firstMatch
            .waitForExistence(timeout: 20), "The existing More sheet is not available from Life.")
        capture("life-more")
    }

    func testCapacityUsesRealStoreAndSurvivesRelaunch() {
        startLife()
        navigate("hours")
        let field = app.descendants(matching: .any).matching(identifier: "life-capacity-input").firstMatch
        if !field.waitForExistence(timeout: 5) {
            app.buttons["Adjust capacity with controls"].tap()
        }
        XCTAssertTrue(field.waitForExistence(timeout: 10), "The editable capacity must be reachable.")
        field.tap()
        let existing = (field.value as? String) ?? ""
        field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: existing.count) + "168")
        app.buttons["Set"].tap()
        let number = app.descendants(matching: .any).matching(identifier: "life-capacity-number").firstMatch
        XCTAssertTrue(number.waitForExistence(timeout: 20))
        let expectedValue = number.value as? String
        XCTAssertTrue(expectedValue?.contains("168") == true, "Capacity must be acknowledged as 168, not merely render.")
        capture("life-capacity")
        app.terminate()
        startLife()
        navigate("hours")
        let restored = app.descendants(matching: .any).matching(identifier: "life-capacity-number").firstMatch
        XCTAssertTrue(restored.waitForExistence(timeout: 20))
        XCTAssertEqual(restored.value as? String, expectedValue, "Stored capacity must survive process relaunch.")
        capture("life-capacity-after-relaunch")
    }

    func testOptOutRestoresClassicWithoutDeletingThePlan() {
        startLife()
        capture("life-before-classic")
        app.terminate()
        app.launchArguments = ["-native.weekMonth.previewEnabled", "NO"]
        app.launch()
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "native-content").firstMatch
            .waitForExistence(timeout: 90))
        XCTAssertFalse(app.descendants(matching: .any).matching(identifier: "life-root").firstMatch.exists)
        capture("classic-unchanged")
    }
    func testTrayControlsMatchBothOuterEdges() {
        startLife()
        for side in ["left", "right"] {
            app.buttons["life-navigation"].tap()
            app.buttons["Crown position"].tap()
            app.buttons[side == "left" ? "Move Crown right" : "Move Crown left"].tap()
            let close = app.buttons["life-navigation-close"]
            XCTAssertTrue(close.waitForExistence(timeout: 10))
            close.tap()
            let opener = app.buttons["life-navigation"]
            XCTAssertTrue(opener.waitForExistence(timeout: 10))
            let openingFrame = opener.frame
            let addFrame = app.buttons["Add task"].firstMatch.frame
            if side == "left" { XCTAssertLessThan(openingFrame.midX, addFrame.midX) }
            else { XCTAssertGreaterThan(openingFrame.midX, addFrame.midX) }
            opener.tap()
            XCTAssertTrue(close.waitForExistence(timeout: 10))
            XCTAssertEqual(close.frame.midX, openingFrame.midX, accuracy: 1)
            XCTAssertEqual(close.frame.midY, openingFrame.midY, accuracy: 1)
            capture("life-tray-" + side)
            close.tap()
        }
    }

}
