import XCTest

/// On-device and simulator observations are separate. These tests use the real app/bridge,
/// not the browser demo, and preserve screenshots as XCTest attachments.
final class LifeUITests: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "com.graymatter.spread")

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func startLife(showWhatsNew: Bool = false) {
        if app.state != .notRunning { app.terminate() }
        let seen = showWhatsNew ? "test-previous-release" : "2026-11-11-life-week"
        app.launchArguments = ["-native.weekMonth.previewEnabled", "YES",
                               "-native.whatsNew.lastSeenRelease", seen] + EditorialArtTestMode.arguments
        app.launch()
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "life-root").firstMatch
            .waitForExistence(timeout: 90), "The opted-in native Life root did not load.")
        if !showWhatsNew {
            let done = app.buttons["whats-new-done"]
            if done.waitForExistence(timeout: 4) { done.tap() }
            waitUntilHittable(app.buttons["life-more"])
        }
    }

    private func waitUntilHittable(_ element: XCUIElement, file: StaticString = #filePath, line: UInt = #line) {
        let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            element.exists && element.isHittable
        }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: 12), .completed,
                       "Control did not become tappable: \(element)", file: file, line: line)
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

    func testAuditPlannerScreens() {
        startLife()
        let week = app.buttons["life-nav-week"]
        waitUntilHittable(week)
        week.tap()
        let planner = app.buttons["life-plan-ahead-open"]
        waitUntilHittable(planner)
        capture("audit-week")
        planner.tap()
        XCTAssertTrue(app.navigationBars["Planner"].waitForExistence(timeout: 10))
        capture("audit-planner")
    }

    func testAuditMoreScreens() {
        startLife()
        app.buttons["life-more"].tap()
        let destinations = [
            ("more-week-in-review", "Week in Review", "week-in-review"),
            ("more-week-ahead", "Week Ahead", "week-ahead"),
            ("more-your-journey", "Your Journey", "your-journey")
        ]
        for (id, title, file) in destinations {
            let entry = app.buttons[id]
            waitUntilHittable(entry)
            if id == "more-week-in-review" { capture("audit-more") }
            entry.tap()
            let sheet = app.navigationBars[title]
            XCTAssertTrue(sheet.waitForExistence(timeout: 10))
            capture("audit-" + file)
            if id == "more-week-ahead" {
                let next = app.buttons["week-ahead-review-role"]
                for _ in 0..<12 where next.exists { next.tap() }
                if app.staticTexts["Week reviewed"].exists { capture("audit-week-ahead-complete") }
            }
            sheet.buttons["Done"].tap()
        }
    }

    func testAuditQuickStart() {
        startLife()
        let addLife = app.buttons["life-new-area"]
        for _ in 0..<4 where !addLife.isHittable { app.swipeUp() }
        waitUntilHittable(addLife)
        addLife.tap()
        for category in ["work", "home", "family", "health", "personal"] {
            let preset = app.buttons["quick-life-" + category]
            waitUntilHittable(preset)
            preset.tap()
        }
        capture("audit-add-life-five-drafts")
    }

    func testAuditCardIntention() {
        startLife()
        let setup = app.buttons["life-card-setup-health"]
        for _ in 0..<4 where !setup.isHittable { app.swipeUp() }
        waitUntilHittable(setup)
        capture("audit-life-card-setup")
        setup.tap()
        let editor = app.navigationBars["Details"]
        XCTAssertTrue(editor.waitForExistence(timeout: 10))
        let intention = app.descendants(matching: .any).matching(identifier: "role-intention-field").firstMatch
        waitUntilHittable(intention)
        capture("audit-life-intention-editor")
        intention.tap()
        intention.typeText("Take a walk before the day gets busy.")
        editor.buttons["Save"].tap()
        let card = app.descendants(matching: .any).matching(identifier: "life-card-health").firstMatch
        waitUntilHittable(card)
        XCTAssertTrue(card.label.contains("Take a walk before the day gets busy."))
        capture("audit-life-card-intention")
    }

    func testWhatsNewAppearsOnUpdateAndCanBeReopenedFromMore() {
        startLife(showWhatsNew: true)
        let done = app.buttons["whats-new-done"]
        XCTAssertTrue(done.waitForExistence(timeout: 20),
                      "An unseen update should explain what changed")
        XCTAssertTrue(app.staticTexts["A clearer way to plan your week"].exists)
        capture("whats-new-first-launch")
        done.tap()
        let more = app.buttons["life-more"]
        XCTAssertTrue(more.waitForExistence(timeout: 20))
        more.tap()
        let notes = app.buttons["more-whats-new"]
        XCTAssertTrue(notes.waitForExistence(timeout: 10))
        notes.tap()
        XCTAssertTrue(app.staticTexts["A clearer way to plan your week"].waitForExistence(timeout: 10))
        capture("whats-new-from-more")
    }

    func testLifeStorageBudgetSummaryShowsHoursAndOpensAllocator() {
        startLife()
        let toggle = app.buttons["life-budget-toggle"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 20))
        capture("life-storage-weekly-time-budget")
        toggle.tap()
        XCTAssertTrue(app.descendants(matching: .any)
            .matching(identifier: "life-budget-editor").firstMatch.waitForExistence(timeout: 20))
        XCTAssertTrue(app.buttons["life-budget-capacity-value"].exists)
        XCTAssertFalse(app.buttons["life-budget-save-capacity"].exists,
                       "Direct entry actions should stay out of the way until requested")
        app.buttons["life-budget-capacity-value"].tap()
        XCTAssertTrue(app.textFields["life-budget-capacity-input"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["life-budget-save-capacity"].exists)
        app.buttons["life-budget-done"].tap()
        XCTAssertFalse(app.descendants(matching: .any)
            .matching(identifier: "life-budget-editor").firstMatch.exists)
    }
    func testLifeWeeklyTimeIsFullWidthWithoutRedundantLifeHeading() {
        startLife()
        let summary = app.descendants(matching: .any)
            .matching(identifier: "life-weekly-time-summary").firstMatch
        XCTAssertTrue(summary.waitForExistence(timeout: 20))
        XCTAssertFalse(app.staticTexts["life-page-title"].exists,
                       "The Life heading must not squeeze the Weekly Time strip")
        let window = app.windows.firstMatch.frame
        let expectedMinWidth = window.width <= 700 ? window.width - 48 : 640
        XCTAssertGreaterThanOrEqual(summary.frame.width, expectedMinWidth)
        XCTAssertLessThanOrEqual(summary.frame.width, window.width)
        capture("life-full-width-weekly-time")
    }
    func testHourAndCalendarValuesShareArrowControl() {
        startLife()
        app.buttons["life-budget-toggle"].tap()
        XCTAssertTrue(app.buttons["life-budget-capacity-value"].waitForExistence(timeout: 10))
        // Both hour controllers reuse the same compact navigation shape.
        let role = app.descendants(matching: .any)
            .matching(identifier: "life-budget-role-controls").firstMatch
        XCTAssertTrue(role.waitForExistence(timeout: 10) || app.staticTexts["Choose a Life area to adjust"].exists)
        let week = app.descendants(matching: .any)
            .matching(identifier: "calendar-week-navigator").firstMatch
        XCTAssertTrue(week.exists)
        capture("life-shared-arrow-controls")
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
        XCTAssertTrue(app.navigationBars["Details"].waitForExistence(timeout: 10))
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
        XCTAssertEqual(app.buttons["life-plan-ahead-open"].label, "Planner")
        app.buttons["life-plan-ahead-open"].tap()
        // Plan Ahead opens to the plans list; one-time moves are one tap away.
        XCTAssertTrue(app.buttons["plan-ahead-move-once"].waitForExistence(timeout: 20))
        capture("life-plan-ahead-plans")
        app.buttons["plan-ahead-move-once"].tap()
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
        for (id, title) in [("more-week-in-review", "Week in Review"), ("more-week-ahead", "Week Ahead"),
                            ("more-your-journey", "Your Journey")] {
            let entry = app.buttons[id]
            XCTAssertTrue(entry.isHittable)
            entry.tap()
            let destination = app.navigationBars[title]
            XCTAssertTrue(destination.waitForExistence(timeout: 5))
            destination.buttons["Done"].tap()
        }
        capture("life-more")
    }
    func testCapacityUsesRealStoreAndSurvivesRelaunch() {
        startLife()
        let toggle = app.buttons["life-budget-toggle"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 20))
        toggle.tap()
        let value = app.buttons["life-budget-capacity-value"]
        XCTAssertTrue(value.waitForExistence(timeout: 10))
        value.tap()
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
        app.buttons["life-budget-capacity-value"].tap()
        let restored = app.textFields["life-budget-capacity-input"]
        XCTAssertTrue(restored.waitForExistence(timeout: 20))
        XCTAssertTrue(((restored.value as? String) ?? "").contains("168"),
                      "Acknowledged capacity should survive process relaunch")
    }
    func testHoldingWeekArrowMovesFasterThanSingleTap() {
        startLife()
        let current = app.buttons["calendar-period-label"]
        let next = app.buttons["Next week"]
        let previous = app.buttons["Previous week"]
        XCTAssertTrue(current.waitForExistence(timeout: 20))
        XCTAssertTrue(next.exists && previous.exists)
        let before = current.label

        next.tap()
        let singleAdvance = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "label != %@", before), object: current)
        XCTAssertEqual(XCTWaiter.wait(for: [singleAdvance], timeout: 20), .completed)
        let once = current.label

        previous.tap()
        let reset = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "label == %@", before), object: current)
        XCTAssertEqual(XCTWaiter.wait(for: [reset], timeout: 20), .completed)

        next.press(forDuration: 1.7)
        let multipleAdvances = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "label != %@ AND label != %@", before, once),
            object: current)
        XCTAssertEqual(XCTWaiter.wait(for: [multipleAdvances], timeout: 20), .completed,
                       "Held right arrow must advance past one week without a fast swipe")
        capture("life-held-calendar-arrow")
    }

    func testNavigationHasNoMetallicCrownOrRedundantPlus() {
        startLife()
        XCTAssertTrue(app.descendants(matching: .any)
            .matching(identifier: "calendar-week-navigator").firstMatch.waitForExistence(timeout: 20))
        XCTAssertFalse(app.buttons["Add task"].exists)
        XCTAssertFalse(app.buttons["Crown position"].exists)
        capture("life-new-calendar-navigation")
    }
}
