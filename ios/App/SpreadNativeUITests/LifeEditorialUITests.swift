import XCTest

/// Editorial Life cards behind the reversible presentation gate. The gate is a launch
/// argument, so these tests never change stored planner data. Not yet run on a simulator:
/// the first evidence comes from the native-journeys CI run.
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
