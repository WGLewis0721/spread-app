import XCTest

/// Targeted capture of the editorial Personal card for the native-editorial-preview workflow.
/// It launches with the DEBUG-only Personal fixture and the editorial gate on, then records
/// the collapsed stack and the expanded Personal card as PNG attachments.
final class LifeEditorialPersonalPreviewUITests: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "com.graymatter.spread")

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testPersonalCardCollapsedAndExpanded() {
        app.launchArguments = [
            "-native.weekMonth.previewEnabled", "YES",
            "-native.life.editorialArt.enabled", "YES",
            "-SpreadPersonalPreviewFixture",
        ]
        app.launch()
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "life-root").firstMatch
            .waitForExistence(timeout: 90), "The Life page did not load.")

        let personal = app.descendants(matching: .any)
            .matching(NSPredicate(format: "label BEGINSWITH %@", "Personal,")).firstMatch
        XCTAssertTrue(personal.waitForExistence(timeout: 20), "The Personal card did not appear.")
        capture("personal-collapsed")

        personal.tap()
        XCTAssertTrue(app.staticTexts["Days"].waitForExistence(timeout: 10),
                      "Expanding the Personal card did not list the week's days.")
        capture("personal-expanded")
    }

    private func capture(_ name: String) {
        RunLoop.current.run(until: Date().addingTimeInterval(1.0))
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
