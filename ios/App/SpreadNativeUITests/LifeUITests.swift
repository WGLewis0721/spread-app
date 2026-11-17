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
            if id == "more-week-in-review" {
                let close = app.buttons["week-review-close"]
                XCTAssertTrue(close.waitForExistence(timeout: 5))
                close.tap()
            } else {
                let destination = app.navigationBars[title]
                XCTAssertTrue(destination.waitForExistence(timeout: 5))
                destination.buttons["Done"].tap()
            }
        }
        capture("life-more")
    }
    func testWeekReviewHoldResumesAndHandoffNeedsAnExplicitTap() throws {
        startLife()
        app.buttons["life-more"].tap()
        app.buttons["more-week-in-review"].tap()
        let heading = app.staticTexts["week-review-story-heading"]
        XCTAssertTrue(heading.waitForExistence(timeout: 5))
        let playback = app.buttons["week-review-playback"]
        guard playback.label == "Pause stories" else {
            throw XCTSkip("Run with default Dynamic Type, VoiceOver off and Reduce Motion off for autoplay.")
        }

        XCTAssertEqual(heading.label, "A week of your life.")
        let storyEdge = app.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5))
        storyEdge.press(forDuration: 6.5)
        XCTAssertEqual(heading.label, "A week of your life.", "Holding past the deadline must pause the story.")
        capture("review-opening")
        expectation(for: NSPredicate(format: "label == %@", "You made room for"), evaluatedWith: heading)
        waitForExpectations(timeout: 8)

        playback.tap()
        let next = app.buttons["week-review-continue"]
        let back = app.buttons["week-review-back"]
        let handoff = app.buttons["week-review-plan-next"]
        next.tap()
        let firstArea = heading.label
        XCTAssertFalse(firstArea.isEmpty)
        capture("review-first-life-area")
        back.tap()
        XCTAssertEqual(heading.label, "You made room for")
        next.tap()
        XCTAssertEqual(heading.label, firstArea)
        let deadline = Date().addingTimeInterval(60)
        while next.exists && Date() < deadline { next.tap() }
        XCTAssertTrue(handoff.exists)
        capture("review-highlight")
        XCTAssertFalse(app.navigationBars["Week Ahead"].exists)
        handoff.tap()
        XCTAssertTrue(app.navigationBars["Week Ahead"].waitForExistence(timeout: 10))
        capture("ahead-week-choice")
    }

    func testWeekAheadKeepsExistingPlanAndPersistsAnExplicitTask() {
        startLife()
        app.buttons["life-more"].tap()
        app.buttons["more-week-ahead"].tap()
        app.buttons["week-ahead-plan-selected"].tap()
        let capacity = app.textFields["week-ahead-capacity"]
        if capacity.exists {
            capacity.tap()
            capacity.typeText("168")
            app.buttons["week-ahead-save-capacity"].tap()
        }

        let next = app.buttons["week-ahead-next"]
        XCTAssertTrue(next.waitForExistence(timeout: 15))
        let currentBudget = next.label
        XCTAssertTrue(currentBudget.hasPrefix("Keep "))
        capture("ahead-hours")
        next.tap()
        capture("ahead-days")
        app.buttons["Back"].tap()
        XCTAssertEqual(next.label, currentBudget)
        next.tap()
        next.tap()

        let task = app.textFields["week-ahead-task-name"]
        XCTAssertTrue(task.waitForExistence(timeout: 10))
        capture("ahead-tasks")
        let name = "Ritual QA " + String(UUID().uuidString.prefix(8))
        if !task.isHittable { app.scrollViews.firstMatch.swipeUp() }
        task.tap()
        task.typeText(name + "\n")
        XCTAssertTrue(app.staticTexts[name].waitForExistence(timeout: 10), "The task should appear after an ACK.")

        startLife()
        app.buttons["life-more"].tap()
        app.buttons["more-week-ahead"].tap()
        app.buttons["week-ahead-plan-selected"].tap()
        XCTAssertTrue(next.waitForExistence(timeout: 15))
        XCTAssertEqual(next.label, currentBudget)
        next.tap()
        next.tap()
        XCTAssertTrue(app.staticTexts[name].waitForExistence(timeout: 10), "The task should survive relaunch.")
        let skip = app.buttons["week-ahead-skip-area"]
        let done = app.buttons["week-ahead-finish"]
        let deadline = Date().addingTimeInterval(60)
        while skip.exists && Date() < deadline { skip.tap() }
        XCTAssertTrue(done.exists)
        capture("ahead-finish")
        done.tap()

        app.buttons["more-your-journey"].tap()
        let savedWeeks = app.descendants(matching: .any).matching(identifier: "journey-weeks").firstMatch
        XCTAssertTrue(savedWeeks.waitForExistence(timeout: 10))
        XCTAssertTrue(savedWeeks.label.contains("Saved weeks"))
        capture("journey-totals")
        let history = app.staticTexts["Week by week"]
        for _ in 0..<25 {
            if history.exists && history.isHittable { break }
            app.scrollViews.firstMatch.swipeUp()
        }
        XCTAssertTrue(history.isHittable)
        capture("journey-history")
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
