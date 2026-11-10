import XCTest

/// Gate state for launches that do not choose the gate themselves. CI sets
/// TEST_RUNNER_SPREAD_EDITORIAL_ART=1 so a suite runs with the editorial presentation on.
/// Unset means the golden default, so existing suites are unaffected.
enum EditorialArtTestMode {
    static var arguments: [String] {
        ProcessInfo.processInfo.environment["SPREAD_EDITORIAL_ART"] == "1"
            ? ["-native.life.editorialArt.enabled", "YES"]
            : []
    }
}

/// Editorial Life cards behind the reversible presentation gate. The gate is a launch
/// argument, so these tests never change stored planner data.
final class LifeEditorialUITests: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "com.graymatter.spread")

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func startLife(editorialArt: Bool) {
        if app.state != .notRunning { app.terminate() }
        app.launchArguments = [
            "-native.weekMonth.previewEnabled", "YES",
            "-native.life.editorialArt.enabled", editorialArt ? "YES" : "NO",
        ]
        app.launch()
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "life-root").firstMatch
            .waitForExistence(timeout: 90), "The opted-in native Life root did not load.")
    }

    private func labelled(_ fragment: String) -> XCUIElement {
        app.descendants(matching: .any)
            .matching(NSPredicate(format: "label CONTAINS %@", fragment)).firstMatch
    }

    private func capture(_ title: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = title
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    func testEditorialGateSpeaksWeeklyBudgetOnEachCard() {
        startLife(editorialArt: true)
        XCTAssertTrue(labelled("weekly budget").waitForExistence(timeout: 20),
                      "Editorial cards must speak the weekly budget and the assigned hours.")
        capture("life-editorial-on")
    }

    func testSelectingAnEditorialCardListsTheWeekDays() {
        startLife(editorialArt: true)
        let card = labelled("weekly budget")
        XCTAssertTrue(card.waitForExistence(timeout: 20), "No editorial card was found to select.")
        card.tap()
        XCTAssertTrue(app.staticTexts["Days"].waitForExistence(timeout: 10),
                      "The editorial details must list the week's days.")
        capture("life-editorial-selected")
    }

    func testGateOffKeepsTheGoldenCardLabel() {
        startLife(editorialArt: false)
        let card = app.descendants(matching: .any)
            .matching(NSPredicate(format: "identifier BEGINSWITH 'life-card-'")).firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 20), "The golden Life cards did not load.")
        XCTAssertFalse(labelled("weekly budget").exists,
                       "The golden face must keep its original spoken label.")
        capture("life-editorial-off")
    }
}
