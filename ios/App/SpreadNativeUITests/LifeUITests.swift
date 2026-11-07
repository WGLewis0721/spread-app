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
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "life-home").firstMatch
            .waitForExistence(timeout: 90), "The opted-in native Life header did not load.")
    }

    /// Inspect the actual accessible element, not only XCTest's Button classification.
    /// SwiftUI ViewThatFits on hosted iOS simulators can expose controls as Other.
    private func lifeNavigationOpener() -> XCUIElement {
        let opener = app.descendants(matching: .any)
            .matching(identifier: "life-navigation").firstMatch
        if opener.waitForExistence(timeout: 8) { return opener }
        let labeled = app.buttons["Open navigation"]
        if labeled.waitForExistence(timeout: 3) { return labeled }
        capture("life-navigation-unavailable")
        print("Life navigation accessibility tree:\n\(app.debugDescription)")
        XCTFail("Life navigation opener absent from accessible tree after Life root loaded")
        return opener
    }

    private func navigate(_ page: String) {
        let rail = app.descendants(matching: .any)
            .matching(identifier: "planner-nav-" + page).firstMatch
        if rail.exists && rail.isHittable { rail.tap(); return }
        let navigation = lifeNavigationOpener()
        XCTAssertTrue(navigation.isHittable, "Navigation opener exists but is not reachable")
        navigation.tap()
        let destination = app.descendants(matching: .any)
            .matching(identifier: "life-nav-" + page).firstMatch
        XCTAssertTrue(destination.waitForExistence(timeout: 10))
        XCTAssertTrue(destination.isHittable)
        destination.tap()
    }

    private func tapEditInSideTray() {
        let edit = app.buttons["life-edit"]
        if !edit.isHittable {
            let opener = app.buttons["life-navigation"]
            XCTAssertTrue(opener.waitForExistence(timeout: 15),
                          "Edit must be reachable through the compact side tray or wide rail")
            opener.tap()
        }
        XCTAssertTrue(edit.waitForExistence(timeout: 10))
        XCTAssertTrue(edit.isHittable)
        edit.tap()
    }

    private func capture(_ title: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = title
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    func testLifeEditPulseIsVisibleOnlyInEditMode() {
        startLife()
        let card = app.descendants(matching: .any)
            .matching(NSPredicate(format: "identifier BEGINSWITH 'life-card-'")).firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 20))
        capture("life-glow-off")
        tapEditInSideTray()
        XCTAssertTrue(card.exists, "Edit cannot remove or resize the Wallet card")
        capture("life-glow-on-low")
        // Two phases for human visual review; snapshots alone cannot prove
        // perceptual intensity on the Taptic Engine-equipped device.
        Thread.sleep(forTimeInterval: 1.0)
        capture("life-glow-on-pulse")
        tapEditInSideTray()
        XCTAssertTrue(card.exists)
        capture("life-glow-restored")
    }

    func testLifeCardActionsRequireExplicitEditAndSwipe() throws {
        startLife()
        let card = app.descendants(matching: .any)
            .matching(NSPredicate(format: "identifier BEGINSWITH 'life-card-'")).firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 20))
        let id = String(card.identifier.dropFirst("life-card-".count))
        let manage = app.buttons["life-reveal-manage-" + id]

        XCTAssertFalse(manage.exists, "Manage must be hidden before Edit")
        card.press(forDuration: 0.7)
        XCTAssertFalse(manage.exists, "Long press must never expose Manage")
        card.tap()
        XCTAssertFalse(manage.exists, "Normal tap focuses, not edits or deletes")
        capture("life-card-focus-without-actions")

        tapEditInSideTray()
        XCTAssertFalse(manage.exists, "Edit alone does not reveal Manage")
        card.swipeLeft()
        XCTAssertTrue(manage.waitForExistence(timeout: 10),
                      "Only an Edit-mode left swipe reveals Manage")
        capture("life-card-edit-swipe-manage")
        manage.tap()
        XCTAssertTrue(app.navigationBars["Manage Life area"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.descendants(matching: .any)
            .matching(identifier: "life-manage-hour-stepper").firstMatch.exists ||
            app.staticTexts["Set weekly planning hours in Hours before allocating time to this area."].exists,
            "Existing Life areas must remain editable")
        app.buttons["Cancel"].tap()

        // Reset the Manage reveal so the right gesture starts from the neutral
        // card position. No confirmation sheet; one undoable removal follows.
        tapEditInSideTray()
        tapEditInSideTray()
        let from = card.coordinate(withNormalizedOffset: CGVector(dx: 0.15, dy: 0.5))
        let to = from.withOffset(CGVector(dx: max(card.frame.width * 0.90, 340), dy: 0))
        from.press(forDuration: 0.10, thenDragTo: to)
        let disappeared = NSPredicate(format: "exists == false")
        expectation(for: disappeared, evaluatedWith: card)
        waitForExpectations(timeout: 12)
        XCTAssertFalse(app.navigationBars["Delete Life area"].exists,
                       "A rightward offscreen dismissal must not open confirmation")
        capture("life-card-right-offscreen-delete")

        let undo = app.buttons["life-undo"]
        XCTAssertTrue(undo.waitForExistence(timeout: 10),
                      "Undo must restore a removed Life area and its tasks")
        undo.tap()
        XCTAssertTrue(card.waitForExistence(timeout: 15),
                      "The exact Life area must return after Undo")
        capture("life-card-restored-by-undo")
        tapEditInSideTray()
        navigate("week")
        XCTAssertTrue(app.descendants(matching: .any)
            .matching(identifier: "life-week-page").firstMatch.waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons.matching(NSPredicate(
            format: "identifier BEGINSWITH 'life-reveal-'")).firstMatch.exists,
            "Week cards have no Edit mode and must not expose card actions")
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

    func testLifeWeekInboxesAndMonthBrowsingStayInTheActiveLifeExperience() {
        startLife()
        navigate("week")
        let workspace = app.descendants(matching: .any)
            .matching(identifier: "life-week-day-workspace").firstMatch
        XCTAssertTrue(workspace.waitForExistence(timeout: 20))
        let pinned = app.descendants(matching: .any)
            .matching(identifier: "life-calendar-strip").firstMatch
        let dayScroll = app.descendants(matching: .any)
            .matching(identifier: "life-week-day-scroll").firstMatch
        XCTAssertTrue(pinned.waitForExistence(timeout: 10))
        XCTAssertTrue(dayScroll.waitForExistence(timeout: 10))
        let beforeY = pinned.frame.minY
        dayScroll.swipeUp()
        XCTAssertEqual(pinned.frame.minY, beforeY, accuracy: 3,
                       "Day scrolling must not push the seven-day calendar out of view")
        let toPlace = app.buttons["life-to-place"]
        let overdue = app.buttons["life-overdue"]
        XCTAssertTrue(toPlace.waitForExistence(timeout: 10))
        XCTAssertTrue(overdue.exists, "Overdue must be reachable from Life Week")
        capture("life-week-compact-inboxes")
        toPlace.tap()
        XCTAssertTrue(app.descendants(matching: .any)
            .matching(identifier: "life-to-place-sheet").firstMatch.waitForExistence(timeout: 10))
        capture("life-week-role-filtered-to-place")
        app.buttons["Done"].tap()
        XCTAssertTrue(workspace.waitForExistence(timeout: 10))
        overdue.tap()
        XCTAssertTrue(app.descendants(matching: .any)
            .matching(identifier: "life-overdue-sheet").firstMatch.waitForExistence(timeout: 10))
        capture("life-week-overdue")
        app.buttons["Done"].tap()

        let toggle = app.buttons["life-week-month-toggle"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 10))
        toggle.tap()
        XCTAssertTrue(app.descendants(matching: .any)
            .matching(identifier: "life-month-help").firstMatch.waitForExistence(timeout: 10),
            "Month must replace the daily workspace")
        XCTAssertFalse(workspace.exists, "Daily tasks cannot remain behind the expanded Month")
        capture("life-month-without-day-schedule")
        let beforeWeek = pinned.value as? String
        app.buttons["Next month"].tap()
        XCTAssertEqual(pinned.value as? String, beforeWeek,
                       "Browsing Month must not change the planner's active week")
        toggle.tap()
        XCTAssertTrue(workspace.waitForExistence(timeout: 10),
                      "Closing Month must restore the selected Week day")
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
        app.launchArguments = ["-native.weekMonth.previewEnabled", "YES", "-native.life.touchFeedback", "NO"]
        app.launch()
        XCTAssertTrue(el("life-root").waitForExistence(timeout: 90))
        let card = el("life-card-" + roleID)
        scrollIntoView(card); card.tap()
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
