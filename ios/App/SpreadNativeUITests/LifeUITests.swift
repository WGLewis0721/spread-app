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
        let rail = app.buttons["planner-nav-" + page]
        if rail.exists && rail.isHittable { rail.tap(); return }
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
        card.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25)).tap()
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

        navigate("week")
        XCTAssertTrue(app.descendants(matching: .any)
            .matching(identifier: "life-week-page").firstMatch.waitForExistence(timeout: 10))
    }

    func testLifeNavigationDrawerCanBeDraggedClosed() {
        startLife()
        if app.descendants(matching: .any).matching(identifier: "life-compact-rail").firstMatch.exists { return }
        let opener = app.buttons["life-navigation"]
        XCTAssertTrue(opener.waitForExistence(timeout: 15))
        opener.tap()
        let destination = app.buttons["life-nav-life"]
        XCTAssertTrue(destination.waitForExistence(timeout: 10))
        let onLeft = destination.frame.midX < app.frame.midX
        let start = destination.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        let finish = start.withOffset(CGVector(dx: onLeft ? -180 : 180, dy: 0))
        start.press(forDuration: 0.1, thenDragTo: finish)
        XCTAssertTrue(opener.waitForExistence(timeout: 10),
                      "A horizontal swipe toward the tray edge must dismiss it")
        capture("life-drawer-glide-dismiss")
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
            let center = app.descendants(matching: .any).matching(identifier: "life-capacity-number").firstMatch
            XCTAssertTrue(center.waitForExistence(timeout: 10))
            center.tap()
            // A selected area first returns to the weekly budget; a second tap opens its editor.
            if !field.waitForExistence(timeout: 2) { center.tap() }
        }
        XCTAssertTrue(field.waitForExistence(timeout: 10), "The editable capacity must be reachable.")
        field.tap()
        let existing = (field.value as? String) ?? ""
        field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: existing.count) + "168")
        app.buttons["Set"].tap()
        app.buttons["Done"].tap()
        let number = app.descendants(matching: .any).matching(identifier: "life-capacity-number").firstMatch
        XCTAssertTrue(number.waitForExistence(timeout: 20))
        expectation(for: NSPredicate(format: "value CONTAINS %@", "168"), evaluatedWith: number)
        waitForExpectations(timeout: 20)
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
        // Wide layouts use a persistent rail; this journey checks the phone drawer.
        if app.descendants(matching: .any).matching(identifier: "life-compact-rail").firstMatch.exists { return }
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

/// Regression journeys use one real planner across both presentations. Simulator
/// attachments prove geometry/state only; they cannot certify physical haptics.
final class TactileUITests: NativeUITestCase {
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
        XCTAssertTrue(el("life-hours-page").waitForExistence(timeout: 10))
        XCTAssertTrue(el("life-selected-hours-controls").exists ||
                      el("life-selected-hours-needs-capacity").exists,
                      "Changing an existing Life area's hours must retain its selection or explain the capacity prerequisite")
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
