import XCTest

final class PlannerUITests: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "com.graymatter.spread")
    override func setUpWithError() throws { continueAfterFailure = false; app.launch() }
    func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
    func tap(_ title: String) {
        let button = app.buttons[title].firstMatch
        XCTAssertTrue(button.waitForExistence(timeout: 30), "Missing button: \(title)")
        button.tap()
    }
    func testRealPlannerJourney() throws {
        XCTAssertTrue(app.buttons["More"].waitForExistence(timeout: 60))
        capture("01-week-before")
        tap("More"); tap("New responsibility")
        let name = app.textFields["Name"]
        XCTAssertTrue(name.waitForExistence(timeout: 10)); name.tap(); name.typeText("Native QA")
        capture("02-create-before")
        tap("Create responsibility")
        tap("Spread")
        capture("03-spread-after-create")
        // Stack cards select on first tap and open their real editor on the second.
        let role = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Native QA")).firstMatch
        for _ in 0..<5 { if role.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(role.exists); role.tap(); role.tap()
        XCTAssertTrue(app.buttons["Place 0.5h"].waitForExistence(timeout: 10))
        capture("04-hours-before-placement")
        tap("Place 0.5h")
        let task = app.textFields["New task"]
        if !task.isHittable { app.swipeUp() }
        task.tap(); task.typeText("Verify live task")
        tap("Add task")
        capture("05-task-created")
        tap("Done"); tap("Week")
        capture("06-week-to-place")
        tap("Place")
        let day = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "0.5h")).firstMatch
        XCTAssertTrue(day.waitForExistence(timeout: 10)); day.tap()
        capture("07-task-placed")
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
}
