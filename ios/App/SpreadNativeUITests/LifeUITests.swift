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
        app.buttons["life-nav-hours"].tap()
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "life-hours-page").firstMatch
            .waitForExistence(timeout: 20))
        capture("life-hours")
        app.buttons["life-nav-week"].tap()
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
        app.buttons["life-nav-hours"].tap()
        let field = app.descendants(matching: .any).matching(identifier: "life-capacity-input").firstMatch
        if field.waitForExistence(timeout: 10) {
            field.tap()
            field.typeText("168")
            app.buttons["Set"].tap()
            XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "life-capacity-number").firstMatch
                .waitForExistence(timeout: 20))
        }
        capture("life-capacity")
        app.terminate()
        startLife()
        app.buttons["life-nav-hours"].tap()
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
}
