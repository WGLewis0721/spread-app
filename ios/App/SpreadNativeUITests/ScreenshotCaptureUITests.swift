import XCTest

/// Automated capture of Spread's current native Life experience for App Store and marketing.
///
/// Every image is `XCUIApplication.screenshot()` from the real installed app. The app reads the
/// DEBUG-only, read-only `PersonalPreviewFixture`; these tests never seed or write planner data.
/// Each state is its own test so one missing screen is reported without hiding the others, and
/// each test captures as its final step, so an attachment exists only when that state was reached.
/// The `spread-ios-screenshots` Codemagic workflow exports the attachments and
/// `scripts/export_screenshots.py` names, validates and packages them.
final class ScreenshotCaptureUITests: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "com.graymatter.spread")

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    // MARK: - Launch and helpers

    private func launch(editorialCategory: String? = nil) {
        if app.state != .notRunning { app.terminate() }
        var args = [
            "-native.weekMonth.previewEnabled", "YES",
            "-native.life.editorialArt.enabled", "YES",
            "-native.life.touchFeedback", "NO",
            "-native.whatsNew.lastSeenRelease", "2026-11-11-life-week",
            "-SpreadPersonalPreviewFixture",
        ]
        if let editorialCategory {
            args += ["-SpreadEditorialPreviewCategory", editorialCategory]
        }
        app.launchArguments = args
        app.launch()
        XCTAssertTrue(element("life-root").waitForExistence(timeout: 90),
                      "The native Life root did not load with the preview fixture.")
    }

    private func element(_ identifier: String) -> XCUIElement {
        app.descendants(matching: .any).matching(identifier: identifier).firstMatch
    }

    /// Waits for a control, taps it, and lets the transition finish.
    private func tapControl(_ identifier: String, file: StaticString = #filePath, line: UInt = #line) {
        let target = element(identifier)
        XCTAssertTrue(target.waitForExistence(timeout: 20), "Missing control \(identifier)", file: file, line: line)
        target.tap()
        settle()
    }

    /// Waits for a screen element to appear, then lets its animation finish.
    private func expect(_ identifier: String, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertTrue(element(identifier).waitForExistence(timeout: 20),
                      "Missing screen marker \(identifier)", file: file, line: line)
        settle()
    }

    private func settle() {
        Thread.sleep(forTimeInterval: 1.0)
    }

    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    // MARK: - Life cards and tasks (01-06)

    func test01LifeWalletStack() {
        launch()
        expect("life-wallet-stack")
        capture("01-life-wallet-stack")
    }

    func test02LifeWeeklyTimeStrip() {
        launch()
        expect("life-weekly-time-summary")
        capture("02-life-weekly-time-strip")
    }

    func test03LifeFocusedCard() {
        launch()
        tapControl("life-card-work")
        expect("life-details-button")
        capture("03-life-focused-card")
    }

    func test04LifeCardDetails() {
        launch()
        tapControl("life-card-work")
        tapControl("life-details-button")
        capture("04-life-card-details")
    }

    func test05LifeCardTasks() {
        launch()
        tapControl("life-card-personal")
        tapControl("life-tasks-button")
        expect("life-task-notebook")
        capture("05-life-card-tasks")
    }

    func test06LifeTaskDetails() {
        launch()
        tapControl("life-card-personal")
        tapControl("life-tasks-button")
        expect("life-task-notebook")
        let task = app.descendants(matching: .any)
            .matching(NSPredicate(format: "label CONTAINS %@", "Read for twenty minutes"))
            .firstMatch
        XCTAssertTrue(task.waitForExistence(timeout: 20), "Missing the fixture task")
        task.tap()
        expect("life-task-details")
        capture("06-life-task-details")
    }

    // MARK: - Hours (07-09)

    func test07HoursWeeklyTimeExpanded() {
        launch()
        tapControl("life-budget-toggle")
        expect("life-budget-editor")
        capture("07-hours-weekly-time-expanded")
    }

    func test08HoursCapacityEntry() {
        launch()
        tapControl("life-budget-toggle")
        tapControl("life-budget-capacity-value")
        expect("life-budget-capacity-input")
        capture("08-hours-capacity-entry")
    }

    func test09HoursPage() {
        launch()
        tapControl("life-nav-hours")
        expect("life-hours-page")
        capture("09-hours-page")
    }

    // MARK: - Week (10-12)

    func test10WeekCalendar() {
        launch()
        tapControl("life-nav-week")
        expect("life-week-page")
        capture("10-week-calendar")
    }

    func test11WeekMonthOverview() {
        launch()
        tapControl("life-nav-week")
        tapControl("life-week-month-toggle")
        expect("life-week-month-toggle")
        capture("11-week-month-overview")
    }

    func test12WeekPlanAheadSheet() {
        launch()
        tapControl("life-nav-week")
        tapControl("life-plan-ahead-open")
        expect("life-plan-ahead-sheet")
        capture("12-week-plan-ahead")
    }

    // MARK: - Navigation and settings (13-18)

    func test13MoreOverview() {
        launch()
        tapControl("life-more")
        expect("more-overview")
        capture("13-more-overview")
    }

    func test14MoreFocusTimer() {
        launch()
        tapControl("life-more")
        tapControl("more-focus-timer")
        expect("focus-start")
        capture("14-focus-timer")
    }

    func test15MoreWhatsNew() {
        launch()
        tapControl("life-more")
        tapControl("more-whats-new")
        expect("whats-new-sheet")
        capture("15-whats-new")
    }

    func test16SettingsAppearance() {
        launch()
        tapControl("life-more")
        tapControl("appearance-picker")
        capture("16-settings-appearance")
    }

    func test17SettingsReminders() {
        launch()
        tapControl("life-more")
        tapControl("spread-reminder-settings")
        expect("daily-reminder-toggle")
        capture("17-settings-reminders")
    }

    func test18SettingsProfiles() {
        launch()
        tapControl("life-more")
        tapControl("manage-profiles")
        expect("active-profile-name")
        capture("18-settings-profiles")
    }

    // MARK: - Editorial Life artwork, one category at a time (19-20)

    func test19EditorialCardFitness() {
        launch(editorialCategory: "fitness")
        settle()
        capture("19-editorial-card-fitness")
    }

    func test20EditorialCardSchool() {
        launch(editorialCategory: "school")
        settle()
        capture("20-editorial-card-school")
    }
}
