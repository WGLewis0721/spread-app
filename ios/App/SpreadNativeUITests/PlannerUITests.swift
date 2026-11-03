import XCTest

final class PlannerUITests: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "com.graymatter.spread")
    override func setUpWithError() throws { continueAfterFailure = false; app.launch() }
    func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
    func tap(_ title: String) {
        if ["Stack", "Fan", "Dial", "Tabs", "Day"].contains(title) {
            let button = app.buttons["layout-" + title.lowercased()]
            XCTAssertTrue(button.waitForExistence(timeout: 30)); button.tap(); return
        }
        let button = title == "Week" ? app.buttons["native-week"] : title == "Spread" ? app.buttons["native-spread"] : app.buttons[title].firstMatch
        XCTAssertTrue(button.waitForExistence(timeout: 30), "Missing button: \(title)")
        button.tap()
    }
    func testRealPlannerJourney() throws {
        XCTAssertTrue(app.buttons["More"].waitForExistence(timeout: 60))
        capture("01-week-before")
        if #available(iOS 17.0, *) { try app.performAccessibilityAudit(for: [.hitRegion, .textClipped, .sufficientElementDescription]) }
        tap("More"); tap("New responsibility")
        let name = app.textFields["Name"]
        XCTAssertTrue(name.waitForExistence(timeout: 10)); name.tap(); name.typeText("Native QA")
        capture("02-create-before")
        tap("Create responsibility")
        tap("Spread")
        capture("03-spread-after-create")
        XCTAssertTrue(app.staticTexts["Responsibilities"].waitForExistence(timeout: 10))
        tap("Manage Native QA")
        XCTAssertTrue(app.buttons["Place 0.5h"].waitForExistence(timeout: 10))
        capture("04-hours-before-placement")
        tap("Place 0.5h")
        let task = app.textFields["New task"]
        if !task.isHittable { app.swipeUp() }
        task.tap(); task.typeText("Verify live task")
        tap("Add task")
        capture("05-task-created")
        tap("Done")
        for mode in ["Fan", "Dial", "Tabs", "Day", "Stack"] {
            let view = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "View,")).firstMatch
            if !view.isHittable { app.swipeDown() }
            XCTAssertTrue(view.waitForExistence(timeout: 10)); view.tap()
            tap(mode); capture("layout-" + mode)
        }
        tap("Week")
        capture("06-week-to-place")
        tap("Native QA · 1 tasks")
        tap("Place")
        let day = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "eligible-day-")).firstMatch
        XCTAssertTrue(day.waitForExistence(timeout: 10)); day.tap()
        capture("07-task-placed")
        tap("Verify live task")
        tap("Notes and attachments"); tap("Notes")
        let notes = app.textViews["Notes"]
        XCTAssertTrue(notes.waitForExistence(timeout: 10)); notes.tap(); notes.typeText("Native note survives the bridge")
        capture("08-notes-before-save"); tap("Save"); tap("Done")
        tap("Complete Verify live task")
        capture("08-task-completed")
        tap("Undo last change")
        capture("09-task-undo")
        tap("Month"); capture("10-month")
        tap("Week")
        app.terminate(); app.launch()
        XCTAssertTrue(app.buttons["More"].waitForExistence(timeout: 60))
        capture("11-relaunch")
    }
    func testCrownHundredDragsWithThirtyReversals() {
        let crown = app.descendants(matching: .any).matching(identifier: "week-crown").firstMatch
        XCTAssertTrue(crown.waitForExistence(timeout: 60))
        let initial = crown.value as? String
        func drag(_ delta: CGFloat) {
            let old = crown.value as? String
            let start = crown.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
            let end = start.withOffset(CGVector(dx: delta, dy: 0))
            start.press(forDuration: 0.05, thenDragTo: end)
            let changed = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in (crown.value as? String) != old }, object: crown)
            XCTAssertEqual(XCTWaiter.wait(for: [changed], timeout: 10), .completed)
        }
        for _ in 0..<30 {
            drag(70); drag(-70)
            XCTAssertEqual(crown.value as? String, initial)
        }
        var values: [String?] = []
        for _ in 0..<20 { values.append(crown.value as? String); drag(70) }
        for value in values.reversed() { drag(-70); XCTAssertEqual(crown.value as? String, value) }
        XCTAssertEqual(crown.value as? String, initial)
        capture("crown-after-100-drags-30-reversals")
    }

    func testCardGesturesStayOnSelectedRole() {
        XCTAssertTrue(app.buttons["More"].waitForExistence(timeout: 60))
        tap("Spread")
        for mode in ["Stack", "Fan"] {
            let view = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "View,")).firstMatch
            XCTAssertTrue(view.waitForExistence(timeout: 10)); view.tap(); tap(mode)
            for _ in 0..<50 {
                let work = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Work")).firstMatch
                XCTAssertTrue(work.waitForExistence(timeout: 10)); work.swipeLeft()
                XCTAssertTrue(app.buttons["Manage Home"].waitForExistence(timeout: 10))
                let home = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Home")).firstMatch
                home.swipeRight()
                XCTAssertTrue(app.buttons["Manage Work"].waitForExistence(timeout: 10))
            }
            capture("100-rapid-gestures-" + mode)
        }
    }

    func testLayout390() throws { try auditLayout(width: 390) }
    func testLayout820() throws { try auditLayout(width: 820) }
    func testLayout1024() throws { try auditLayout(width: 1024) }
    private func auditLayout(width: Int) throws {
        guard app.frame.width >= CGFloat(width) else { throw XCTSkip("Viewport requires the matching iPad destination; verified in the layout matrix.") }
        app.terminate()
        app.launchArguments = ["-SpreadViewportWidth", String(width)]
        app.launch()
        XCTAssertTrue(app.buttons["native-spread"].waitForExistence(timeout: 60))
        let content = app.otherElements["native-content"].firstMatch
        XCTAssertTrue(content.exists)
        XCTAssertEqual(content.frame.width, CGFloat(width), accuracy: 1)
        capture("viewport-\(width)-week")
        if #available(iOS 17.0, *) { try app.performAccessibilityAudit(for: [.hitRegion, .textClipped, .sufficientElementDescription]) }
        tap("Spread")
        for mode in ["Stack", "Fan", "Dial", "Tabs", "Day"] {
            let view = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "View,")).firstMatch
            XCTAssertTrue(view.waitForExistence(timeout: 10)); view.tap(); tap(mode)
            capture("viewport-\(width)-" + mode)
        }
        tap("Week"); tap("Month"); capture("viewport-\(width)-month")
        if #available(iOS 17.0, *) { try app.performAccessibilityAudit(for: [.hitRegion, .textClipped, .sufficientElementDescription]) }
    }

}
