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
        app.launchArguments = ["-native.weekMonth.previewEnabled", "YES"] + EditorialArtTestMode.arguments
        app.launch()
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "life-root").firstMatch
            .waitForExistence(timeout: 90), "The opted-in native Life root did not load.")
    }

    private func navigate(_ page: String) {
        if page == "hours" {
            let toggle = app.buttons["life-budget-toggle"]
            XCTAssertTrue(toggle.waitForExistence(timeout: 20))
            toggle.tap()
            return
        }
        let direct = app.buttons["life-nav-" + page]
        if direct.exists && direct.isHittable { direct.tap(); return }
        let rail = app.buttons["planner-nav-" + page]
        if rail.exists && rail.isHittable { rail.tap(); return }
        XCTFail("No active navigation control for " + page)
    }

    private func capture(_ title: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = title
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    func testLifeStorageBudgetSummaryShowsHoursAndOpensAllocator() {
        startLife()
        let toggle = app.buttons["life-budget-toggle"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 20))
        capture("life-storage-weekly-time-budget")
        toggle.tap()
        XCTAssertTrue(app.descendants(matching: .any)
            .matching(identifier: "life-budget-editor").firstMatch.waitForExistence(timeout: 20))
        XCTAssertTrue(app.textFields["life-budget-capacity-input"].exists)
        XCTAssertTrue(app.buttons["life-budget-save-capacity"].exists)
        app.buttons["life-budget-done"].tap()
        XCTAssertFalse(app.descendants(matching: .any)
            .matching(identifier: "life-budget-editor").firstMatch.exists)
    }
    func testLifeTimeBudgetSharesTitleRowOnStandardIPhone() {
        startLife()
        let title = app.staticTexts["life-page-title"]
        let summary = app.descendants(matching: .any)
            .matching(identifier: "life-weekly-time-summary").firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 20))
        XCTAssertTrue(summary.waitForExistence(timeout: 20))
        if app.windows.firstMatch.frame.width >= 375 {
            XCTAssertGreaterThan(summary.frame.minX, title.frame.maxX)
            XCTAssertLessThan(summary.frame.minY, title.frame.maxY)
        }
        XCTAssertGreaterThanOrEqual(summary.frame.height, 44)
        capture("life-inline-weekly-budget")
    }
    func testInlineBudgetAndTaskPriorityAreAccessible() {
        startLife()
        let bar = app.descendants(matching: .any)
            .matching(identifier: "life-budget-segments").firstMatch
        XCTAssertTrue(bar.waitForExistence(timeout: 20))
        XCTAssertTrue(app.buttons["life-budget-toggle"].exists)
        app.buttons["life-budget-toggle"].tap()
        XCTAssertTrue(app.descendants(matching: .any)
            .matching(identifier: "life-budget-editor").firstMatch.waitForExistence(timeout: 20))
        capture("life-expanded-weekly-hours")
    }
    func testFocusedLifeDetailsAndTasksAreContextual() {
        startLife()
        let card = app.descendants(matching: .any)
            .matching(NSPredicate(format: "identifier BEGINSWITH 'life-card-'")).firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 20))
        XCTAssertFalse(app.buttons["life-edit"].exists)
        XCTAssertFalse(app.buttons["life-details-button"].exists)
        XCTAssertFalse(app.buttons["life-tasks-button"].exists)

        // Long-press does not enter a hidden edit mode.
        let strip = card.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25))
        strip.press(forDuration: 0.7)
        XCTAssertFalse(app.buttons["life-details-button"].exists)
        strip.tap()

        let details = app.buttons["life-details-button"]
        let tasks = app.buttons["life-tasks-button"]
        XCTAssertTrue(details.waitForExistence(timeout: 10))
        XCTAssertTrue(tasks.waitForExistence(timeout: 10))
        let notebook = app.descendants(matching: .any).matching(identifier: "life-task-notebook").firstMatch
        XCTAssertFalse(notebook.exists, "Task notebook starts closed until Tasks is selected")
        tasks.tap()
        XCTAssertTrue(notebook.waitForExistence(timeout: 10))
        XCTAssertEqual(tasks.value as? String, "Open")
        capture("life-focused-tasks-notebook")
        tasks.tap()
        XCTAssertFalse(notebook.exists)

        details.tap()
        XCTAssertTrue(app.navigationBars["Manage Life area"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "life-area-name").firstMatch.exists)
        XCTAssertTrue(app.buttons["life-manage-delete"].exists)
        app.buttons["Cancel"].tap()
        XCTAssertTrue(details.waitForExistence(timeout: 10), "Dismissing Details must preserve card focus")
        capture("life-focused-contextual-details")

        // A second card tap returns to the stack, hiding both actions.
        card.tap()
        XCTAssertFalse(details.exists)
        XCTAssertFalse(tasks.exists)
    }

    func testLifeDeleteThroughDetailsRestoresExactAreaWithUndo() {
        startLife()
        let card = app.descendants(matching: .any)
            .matching(NSPredicate(format: "identifier BEGINSWITH 'life-card-'")).firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 20))
        let id = String(card.identifier.dropFirst("life-card-".count))
        let exact = app.descendants(matching: .any).matching(identifier: "life-card-" + id).firstMatch

        card.swipeLeft()
        XCTAssertTrue(exact.exists, "Browsing gestures must not delete a Life area")
        XCTAssertFalse(app.buttons.matching(NSPredicate(
            format: "identifier BEGINSWITH 'life-reveal-manage-'")).firstMatch.exists)
        if !app.buttons["life-details-button"].exists {
            card.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)).tap()
        }
        XCTAssertTrue(app.buttons["life-details-button"].waitForExistence(timeout: 10))
        app.buttons["life-details-button"].tap()
        let delete = app.buttons["life-manage-delete"]
        XCTAssertTrue(delete.waitForExistence(timeout: 10))
        delete.tap()

        let disappeared = NSPredicate(format: "exists == false")
        expectation(for: disappeared, evaluatedWith: exact)
        waitForExpectations(timeout: 12)
        let undo = app.buttons["life-undo"]
        if !undo.isHittable {
            let opener = app.buttons["life-navigation"]
            if opener.exists { opener.tap() }
        }
        XCTAssertTrue(undo.waitForExistence(timeout: 10), "Delete must preserve the planner's Undo path")
        undo.tap()
        XCTAssertTrue(exact.waitForExistence(timeout: 15), "Undo must restore the exact Life area")
        capture("life-deleted-from-details-and-restored")
        let close = app.buttons["life-navigation-close"]
        if close.exists && close.isHittable { close.tap() }

        navigate("week")
        XCTAssertTrue(app.descendants(matching: .any)
            .matching(identifier: "life-week-page").firstMatch.waitForExistence(timeout: 10))
    }

    func testLifeWeekToggleAndCalendarNavigatorAreReachable() {
        startLife()
        XCTAssertTrue(app.descendants(matching: .any)
            .matching(identifier: "life-week-toggle").firstMatch.waitForExistence(timeout: 20))
        XCTAssertTrue(app.buttons["life-nav-life"].exists)
        XCTAssertTrue(app.buttons["life-nav-week"].exists)
        XCTAssertTrue(app.descendants(matching: .any)
            .matching(identifier: "calendar-week-navigator").firstMatch.exists)
        navigate("week")
        XCTAssertTrue(app.buttons["life-plan-ahead-open"].waitForExistence(timeout: 20))
        app.buttons["life-plan-ahead-open"].tap()
        XCTAssertTrue(app.buttons["plan-ahead-preview"].waitForExistence(timeout: 20))
        capture("life-plan-ahead-intentional")
    }
    func testLifeWeekAndMoreReachability() {
        startLife()
        XCTAssertTrue(app.descendants(matching: .any)
            .matching(identifier: "life-page").firstMatch.waitForExistence(timeout: 30))
        navigate("week")
        XCTAssertTrue(app.descendants(matching: .any)
            .matching(identifier: "life-week-page").firstMatch.waitForExistence(timeout: 20))
        let inbox = app.buttons["life-to-place-inbox"]
        XCTAssertTrue(inbox.waitForExistence(timeout: 20))
        inbox.tap()
        XCTAssertEqual(inbox.value as? String, "Expanded")
        let morph = app.descendants(matching: .any)
            .matching(identifier: "life-week-month-toggle").firstMatch
        XCTAssertTrue(morph.exists)
        morph.tap()
        capture("life-month")
        app.buttons["life-more"].tap()
        XCTAssertTrue(app.descendants(matching: .any)
            .matching(identifier: "more-overview").firstMatch.waitForExistence(timeout: 20))
        XCTAssertFalse(app.buttons["more-new-spread"].exists)
        XCTAssertFalse(app.buttons["more-review-tasks"].exists)
        XCTAssertFalse(app.buttons["more-rollover"].exists)
        capture("life-more")
    }
    func testCapacityUsesRealStoreAndSurvivesRelaunch() {
        startLife()
        let toggle = app.buttons["life-budget-toggle"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 20))
        toggle.tap()
        let field = app.textFields["life-budget-capacity-input"]
        XCTAssertTrue(field.waitForExistence(timeout: 10))
        field.tap()
        let existing = (field.value as? String) ?? ""
        field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: existing.count) + "168")
        app.buttons["life-budget-save-capacity"].tap()
        let number = app.descendants(matching: .any)
            .matching(identifier: "life-budget-segments").firstMatch
        XCTAssertTrue(number.waitForExistence(timeout: 20))
        capture("life-capacity")
        app.terminate()
        startLife()
        app.buttons["life-budget-toggle"].tap()
        let restored = app.textFields["life-budget-capacity-input"]
        XCTAssertTrue(restored.waitForExistence(timeout: 20))
        XCTAssertTrue(((restored.value as? String) ?? "").contains("168"),
                      "Acknowledged capacity should survive process relaunch")
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
    func testNavigationHasNoMetallicCrownOrRedundantPlus() {
        startLife()
        XCTAssertTrue(app.descendants(matching: .any)
            .matching(identifier: "calendar-week-navigator").firstMatch.waitForExistence(timeout: 20))
        XCTAssertFalse(app.buttons["Add task"].exists)
        XCTAssertFalse(app.buttons["Crown position"].exists)
        capture("life-new-calendar-navigation")
    }
    func testClassicDetailsTaskAcknowledgementAndLifePersistence() throws {
        launch(["-native.weekMonth.previewEnabled", "NO", "-native.life.touchFeedback", "NO"])
        let tag = "Tactile " + String(UUID().uuidString.prefix(6))
        tapID("open-more"); tapID("more-new-spread")
        typeInto("role-name-field", tag); tapID("save-spreads")
        closeNativeSheets(); openWalletCard(tag)
        let selector = try XCTUnwrap(elements(prefix: "select-role-").first { $0.label == tag })
        let roleID = String(selector.identifier.dropFirst("select-role-".count))
        let face = el("role-block-" + roleID), details = el("classic-task-details-" + roleID)
        XCTAssertTrue(details.waitForExistence(timeout: 10))
        XCTAssertGreaterThanOrEqual(details.frame.minY, face.frame.maxY - 1)
        let faceWidth = face.frame.width
        typeInto("new-task-field", tag + " task\n")
        let task = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'task-row-' AND label == %@", tag + " task")).firstMatch
        XCTAssertTrue(task.waitForExistence(timeout: 20))
        let taskID = String(task.identifier.dropFirst("task-row-".count))
        tapID("task-check-" + taskID)
        XCTAssertTrue(eventually { (self.el("task-check-" + taskID).value as? String) == "Completed" })
        XCTAssertEqual(face.frame.width, faceWidth, accuracy: 1)
        capture("tactile-classic-separate-details-completed")

        // Relaunch the same installed binary and data, enabling the existing Life choice.
        app.terminate()
        app.launchArguments = ["-native.weekMonth.previewEnabled", "YES", "-native.life.touchFeedback", "NO"] + EditorialArtTestMode.arguments
        app.launch()
        XCTAssertTrue(el("life-root").waitForExistence(timeout: 90))
        let card = el("life-card-" + roleID)
        scrollIntoView(card); card.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)).tap()
        XCTAssertTrue(el("life-task-details").waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts[tag + " task"].firstMatch.waitForExistence(timeout: 10))
        capture("tactile-life-same-task-after-relaunch")
        tapID("life-change-area-hours")
        XCTAssertTrue(el("life-budget-editor").waitForExistence(timeout: 10))
        XCTAssertTrue(el("life-budget-role-controls").exists,
                      "Inline weekly hours must open with the selected Life area")
        capture("life-existing-area-hours-selected")

        app.terminate()
        launch(["-native.weekMonth.previewEnabled", "NO"])
        openWalletCard(tag)
        XCTAssertEqual(el("task-check-" + taskID).value as? String, "Completed")
        capture("tactile-classic-restored-data")
    }

    func testAdaptiveNavigationPreservesSelectionAndCrown() throws {
        launch(["-native.weekMonth.previewEnabled", "NO"])
        let before = crownValue
        tapID("classic-navigation")
        tapID("planner-nav-hours")
        XCTAssertTrue(el("weekly-hours-details").waitForExistence(timeout: 10))
        XCTAssertEqual(crownValue, before)
        capture("tactile-classic-hours-navigation")
        tapID("classic-navigation")
        tapID("planner-nav-week")
        XCTAssertTrue(el("week-surface").waitForExistence(timeout: 20))
        XCTAssertEqual(crownValue, before)
        tapID("crown-next")
        XCTAssertTrue(eventually { self.crownValue != before })
        let advanced = crownValue
        tapID("classic-navigation")
        tapID("planner-nav-spread")
        XCTAssertEqual(crownValue, advanced)
        capture("tactile-classic-crown-and-navigation")
    }
}
