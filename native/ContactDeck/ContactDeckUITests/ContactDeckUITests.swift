import XCTest

final class ContactDeckUITests: XCTestCase {
    @MainActor func testOnboardingToUsefulDeckUnder25Seconds() throws {
        let app = XCUIApplication(); app.launchArguments = ["--onboarding"]
        let started = Date(); app.launch()
        let tryDeck = app.buttons["tryDeck"]
        XCTAssertTrue(tryDeck.waitForExistence(timeout: 10)); tryDeck.tap()
        XCTAssertTrue(app.otherElements["focusedCard"].firstMatch.waitForExistence(timeout: 10))
        XCTAssertLessThan(Date().timeIntervalSince(started), 25)
        attach(app, "native-first-interaction")
    }
    @MainActor func testModesBrowseFlipSearchAndNotes() throws {
        let app = XCUIApplication(); app.launchArguments = ["--uitesting"]; app.launch()
        let card = app.otherElements["focusedCard"].firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 10))
        for mode in ["Stack", "Fan", "Flow"] {
            app.segmentedControls.buttons[mode].tap()
            if mode == "Stack" { card.swipeUp() } else { card.swipeLeft() }
            attach(app, "native-" + mode.lowercased())
        }
        app.buttons["search"].tap()
        let field = app.searchFields.firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 5)); field.tap(); field.typeText("Marcus")
        app.buttons.containing(.staticText, identifier: "Marcus Carter").firstMatch.tap()
        XCTAssertTrue(card.waitForExistence(timeout: 5)); card.tap()
        XCTAssertTrue(app.buttons["Flip back"].firstMatch.waitForExistence(timeout: 5))
        app.buttons["Flip back"].firstMatch.tap()
    }
    @MainActor private func attach(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot()); attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
}
