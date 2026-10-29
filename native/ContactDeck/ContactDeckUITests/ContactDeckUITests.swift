import XCTest

final class ContactDeckUITests: XCTestCase {
    @MainActor func testOnboardingToUsefulDeckUnder25Seconds() throws {
        let app = XCUIApplication(); app.launchArguments = ["--onboarding"]
        app.launch()
        let tryDeck = app.buttons["tryDeck"]
        XCTAssertTrue(tryDeck.waitForExistence(timeout: 10))
        // Measure the visible onboarding journey; XCTest/debugger launch time is separate.
        let started = Date(); tryDeck.tap()
        XCTAssertTrue(app.otherElements["focusedCard"].firstMatch.waitForExistence(timeout: 10))
        XCTAssertLessThan(Date().timeIntervalSince(started), 25)
        attach(app, "native-first-interaction")
    }
    @MainActor func testModesBrowseFlipSearchNotesAndGrouping() throws {
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
        app.buttons["Edit personal note"].tap()
        let note = app.textViews["Personal note"]
        XCTAssertTrue(note.waitForExistence(timeout: 5)); note.tap(); note.typeText("Ask about the workshop")
        app.buttons["Save"].tap()
        XCTAssertTrue(app.staticTexts["Ask about the workshop"].waitForExistence(timeout: 5))
        app.buttons["Flip back"].firstMatch.tap()
        app.buttons["Deck options"].tap()
        app.buttons["Select focused card"].tap()
        app.buttons["Group"].tap()
        let deckName = app.textFields["Deck name"]
        XCTAssertTrue(deckName.waitForExistence(timeout: 5)); deckName.tap(); deckName.typeText("Test crew")
        app.buttons["Create deck"].tap()
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Test crew")).firstMatch.waitForExistence(timeout: 5))
        attach(app, "native-grouped-deck")
    }
    @MainActor private func attach(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot()); attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
}
