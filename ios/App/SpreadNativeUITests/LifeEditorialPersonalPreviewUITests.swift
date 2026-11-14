import XCTest

/// Actual-app acceptance for the six approved editorial artworks.
/// Uses a read-only DEBUG fixture. It never seeds or modifies the planner store.
/// Targeted workflow: native-ui-dispatch, width 390 or 1024, tests
/// LifeEditorialPersonalPreviewUITests (1024pt viewport yields the 700pt card cap).
final class LifeEditorialPersonalPreviewUITests: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "com.graymatter.spread")

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func launch(category: String? = nil, editorial: Bool = true, extraArgs: [String] = []) {
        if app.state != .notRunning { app.terminate() }
        var args = [
            "-native.weekMonth.previewEnabled", "YES",
            "-native.life.editorialArt.enabled", editorial ? "YES" : "NO",
            "-SpreadPersonalPreviewFixture",
        ]
        if let category {
            args += ["-SpreadEditorialPreviewCategory", category]
        }
        args += ["-native.whatsNew.lastSeenRelease", "2026-11-11-life-week"]
        args += extraArgs
        app.launchArguments = args
        app.launch()
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "life-root").firstMatch
            .waitForExistence(timeout: 90), "The actual native Life view did not load")
    }

    private func card(for name: String) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", name + ",")).firstMatch
    }

    private func element(_ identifier: String) -> XCUIElement {
        app.descendants(matching: .any).matching(identifier: identifier).firstMatch
    }

    /// Top edge of the persistent dock controls. Content whose bottom edge sits above
    /// this line is not covered by the dock.
    private func dockTopY() -> CGFloat {
        let controls = [element("life-week-navigator"), element("life-week-toggle")]
        return controls.filter { $0.exists }.map { $0.frame.minY }.min() ?? app.frame.maxY
    }

    /// Bottom edge of the header. Content above this line sits under the header.
    private func headerBottomY() -> CGFloat {
        let more = element("life-more")
        return more.exists ? more.frame.maxY : app.frame.minY
    }

    /// Hittable and fully inside the scroll area, between the header and the dock.
    private func isClearOfChrome(_ target: XCUIElement) -> Bool {
        target.exists && target.isHittable
            && target.frame.minY >= headerBottomY()
            && target.frame.maxY <= dockTopY()
    }

    /// Swipes the Life page until the target is clear of the header and the dock.
    private func scrollUntilClearOfChrome(_ target: XCUIElement, maxSwipes: Int = 6) -> Bool {
        for _ in 0..<maxSwipes {
            if isClearOfChrome(target) { return true }
            app.scrollViews.firstMatch.swipeUp(velocity: .slow)
        }
        return isClearOfChrome(target)
    }

    /// Waits until the card's frame is unchanged across reads and it is hittable.
    /// On cold CI launches the card can exist while the wallet is still laying out.
    /// This only delays the tap. The real tap and the Focused assertion are unchanged.
    private func waitForStableFrame(_ target: XCUIElement, timeout: TimeInterval = 15) {
        let deadline = Date().addingTimeInterval(timeout)
        var previous = target.frame
        while Date() < deadline {
            RunLoop.current.run(until: Date().addingTimeInterval(0.3))
            let current = target.frame
            if current == previous && target.isHittable { return }
            previous = current
        }
    }

    private func capture(_ name: String) {
        RunLoop.current.run(until: Date().addingTimeInterval(0.8))
        let image = XCTAttachment(screenshot: app.screenshot())
        image.name = name
        image.lifetime = .keepAlways
        add(image)
    }

    private func verify(_ name: String, category: String, budget: Int, assigned: Int) {
        launch(category: category)
        let face = card(for: name)
        XCTAssertTrue(face.waitForExistence(timeout: 20), "The \(name) artwork card was not rendered")
        XCTAssertTrue(face.label.contains("\(budget) hours weekly budget"),
                      "\(name) must display the live role hours")
        XCTAssertTrue(face.label.contains("\(assigned) hours assigned"),
                      "\(name) must display the live allocations")
        capture("editorial-\(category)-collapsed")

        // Use the real card tap, not a test-only selection override. Settle the frame
        // first so the tap does not land on a card that is still laying out.
        waitForStableFrame(face)
        face.tap()
        capture("editorial-\(category)-after-tap")

        // Focus must be real. Capturing after tap is not itself proof that it opened.
        guard (face.value as? String) == "Focused" else {
            // Diagnostic only, on the failure path. Shows whether the value changes after the tap settles.
            var timeline: [String] = []
            for _ in 0..<8 {
                RunLoop.current.run(until: Date().addingTimeInterval(0.4))
                timeline.append(String(describing: face.value))
            }
            print("EDITORIAL_VALUE_TIMELINE category=\(category) after-failure=\(timeline)")
            print("EDITORIAL_INTERACTION_FAILURE category=\(category) value=\(String(describing: face.value)) frame=\(face.frame)")
            XCTFail("Tap did not focus the \(name) card")
            return
        }
        let days = app.staticTexts["Days"]
        if !days.exists {
            app.scrollViews.firstMatch.swipeUp()
        }
        XCTAssertTrue(days.waitForExistence(timeout: 10),
                      "\(name) expanded face did not expose the Days distribution")
        capture("editorial-\(category)-expanded")
    }

    func test01WorkArtwork() {
        verify("Work", category: "work", budget: 8, assigned: 5)
    }

    func test02FamilyArtwork() {
        verify("Family", category: "family", budget: 7, assigned: 4)
    }

    func test03FitnessArtwork() {
        verify("Fitness", category: "fitness", budget: 5, assigned: 3)
    }

    func test04SchoolArtwork() {
        verify("School", category: "school", budget: 10, assigned: 5)
    }

    func test05HomeArtwork() {
        verify("Home", category: "home", budget: 6, assigned: 3)
    }

    func test06PersonalArtwork() {
        verify("Personal", category: "personal", budget: 6, assigned: 4)
    }

    func test07FullSixCardStack() {
        launch()
        for category in ["work", "family", "fitness", "school", "home", "personal"] {
            let name = category.prefix(1).uppercased() + category.dropFirst()
            XCTAssertTrue(card(for: name).exists, "Missing \(name) in full Wallet fixture")
        }
        capture("editorial-all-six-stack-top")
        app.scrollViews.firstMatch.swipeUp()
        capture("editorial-all-six-stack-scrolled")
    }

    func test08GoldenPresentationStillAvailable() {
        launch(category: "personal", editorial: false)
        let personal = card(for: "Personal")
        XCTAssertTrue(personal.waitForExistence(timeout: 20))
        // Golden baseline is main head (bffb8ba). Its spoken description carries the
        // weekly budget and assigned hours, which the gate-off card must keep.
        XCTAssertTrue(personal.label.contains("6 hours weekly budget"),
                      "Gate-off must keep main's weekly budget description")
        XCTAssertTrue(personal.label.contains("4 hours assigned"),
                      "Gate-off must keep main's assigned-hours description")
        capture("editorial-gate-off-personal-golden")
    }

    /// Expansion must reveal Days above the dock with no manual scroll, and every
    /// detail row and action must scroll to a position clear of the dock.
    func test09ExpandedDaysClearOfDockWithoutManualScroll() {
        launch(category: "work")
        let face = card(for: "Work")
        XCTAssertTrue(face.waitForExistence(timeout: 20), "The Work card was not rendered")
        face.tap()
        XCTAssertEqual(face.value as? String, "Focused", "Tap must expand the Work card")

        let days = app.buttons["life-place-hours"]
        XCTAssertTrue(days.waitForExistence(timeout: 10), "Expanded details must expose the Plan days action")
        // Let the wallet expansion and the focus scroll settle. No swipe is performed here.
        RunLoop.current.run(until: Date().addingTimeInterval(1.5))
        XCTAssertTrue(isClearOfChrome(days),
                      "Days must be visible above the dock without manual scrolling: frame=\(days.frame) header=\(headerBottomY()) dock=\(dockTopY())")
        capture("editorial-work-days-visible-after-expansion")

        // Weekday rows are matched by their visible names. The collapsed card's seven-day
        // strip is a combined element, so these static texts belong to the day list.
        let weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        let firstRow = app.staticTexts.matching(NSPredicate(format: "label IN %@", weekdayNames)).firstMatch
        if firstRow.exists {
            XCTAssertTrue(scrollUntilClearOfChrome(firstRow),
                          "First assigned weekday is not clear of the dock")
        }

        let adjust = app.buttons["life-change-area-hours"]
        XCTAssertTrue(scrollUntilClearOfChrome(adjust),
                      "Inline hours action must scroll above the dock")
        capture("editorial-work-details-scrolled-clear")
    }

    /// A horizontal swipe outside Edit must neither select nor reveal Manage, and a
    /// vertical swipe on the same page must still scroll the Life page.
    func test10HorizontalSwipeDoesNotSelectAndVerticalScrollStillWorks() {
        launch()
        let face = card(for: "Work")
        XCTAssertTrue(face.waitForExistence(timeout: 20), "The Work card was not rendered")

        face.swipeLeft()
        XCTAssertEqual(face.value as? String, "Closed", "A horizontal swipe must not select the card")
        let manage = element("life-reveal-manage-work")
        XCTAssertFalse(manage.exists && manage.isHittable,
                       "A horizontal swipe outside Edit must not reveal Manage")

        let before = face.frame.minY
        app.scrollViews.firstMatch.swipeUp(velocity: .slow)
        let after = face.frame.minY
        XCTAssertLessThan(after, before - 40,
                          "A vertical swipe must still scroll the Life page: before=\(before) after=\(after)")
    }

    /// Accessibility text size must reach the editorial card, keep it inside the
    /// screen width, and still expose the expanded Days section above the dock.
    func test11AccessibilityTextSizeKeepsEditorialCardInBounds() {
        launch(category: "work")
        let standard = card(for: "Work")
        XCTAssertTrue(standard.waitForExistence(timeout: 20), "The Work card was not rendered")
        let standardHeight = standard.frame.height

        // DEBUG-only seam in LifeRoot applies the accessibility size from the defaults domain.
        launch(category: "work", extraArgs: ["-SpreadTestDynamicType", "accessibility3"])
        let large = card(for: "Work")
        XCTAssertTrue(large.waitForExistence(timeout: 20),
                      "The Work card did not render at accessibility text size")
        XCTAssertGreaterThan(large.frame.height, standardHeight + 20,
                             "Accessibility text size did not reach the card: standard=\(standardHeight) accessibility=\(large.frame.height)")
        XCTAssertGreaterThanOrEqual(large.frame.minX, app.frame.minX - 1, "The card leaves the left screen edge")
        XCTAssertLessThanOrEqual(large.frame.maxX, app.frame.maxX + 1, "The card leaves the right screen edge")
        capture("editorial-work-accessibility-text-collapsed")

        large.tap()
        XCTAssertEqual(large.value as? String, "Focused", "Tap must expand the card at accessibility text size")
        let days = app.staticTexts["Days"]
        XCTAssertTrue(days.waitForExistence(timeout: 10),
                      "Expanded details did not expose Days at accessibility text size")
        XCTAssertTrue(scrollUntilClearOfChrome(days, maxSwipes: 8),
                      "Days must be reachable above the dock at accessibility text size: frame=\(days.frame) dock=\(dockTopY())")
        capture("editorial-work-accessibility-text-expanded")
    }

    /// A second tap on the expanded card collapses it and removes the Days section.
    func test12TapAgainCollapsesEditorialCard() {
        launch(category: "work")
        let face = card(for: "Work")
        XCTAssertTrue(face.waitForExistence(timeout: 20), "The Work card was not rendered")
        face.tap()
        XCTAssertEqual(face.value as? String, "Focused", "Tap must expand the Work card")
        let days = app.staticTexts["Days"]
        XCTAssertTrue(days.waitForExistence(timeout: 10), "Expanded details did not expose Days")

        // The focus scroll can move the card header above the viewport. Bring it back to collapse.
        var attempts = 0
        while !(face.isHittable && face.frame.minY >= headerBottomY()) && attempts < 6 {
            app.scrollViews.firstMatch.swipeDown(velocity: .slow)
            attempts += 1
        }
        face.tap()
        XCTAssertEqual(face.value as? String, "Closed", "A second tap must collapse the Work card")
        XCTAssertTrue(days.waitForNonExistence(timeout: 5),
                      "Collapsing must remove the expanded Days section")
    }

    /// The personal preview fixture is read-only. Verify contextual affordances without
    /// writing planner data, and keep horizontal browsing free of destructive actions.
    func test13FocusedDetailsAndTasksReplaceEditSwipe() {
        launch(category: "work")
        let face = card(for: "Work")
        XCTAssertTrue(face.waitForExistence(timeout: 20))
        face.swipeLeft()
        XCTAssertEqual(face.value as? String, "Closed", "Browsing must not trigger edit or focus")
        XCTAssertFalse(element("life-reveal-manage-work").exists)
        XCTAssertFalse(element("life-details-button").exists)
        XCTAssertFalse(element("life-tasks-button").exists)

        waitForStableFrame(face)
        face.tap()
        XCTAssertEqual(face.value as? String, "Focused")
        let details = element("life-details-button"), tasks = element("life-tasks-button")
        XCTAssertTrue(details.waitForExistence(timeout: 10))
        XCTAssertTrue(tasks.waitForExistence(timeout: 10))

        tasks.tap()
        XCTAssertTrue(element("life-task-notebook").waitForExistence(timeout: 10))
        capture("editorial-focused-tasks")
        tasks.tap()
        XCTAssertFalse(element("life-task-notebook").exists)

        details.tap()
        XCTAssertTrue(app.navigationBars["Details"].waitForExistence(timeout: 10))
        app.buttons["Cancel"].tap()
        XCTAssertTrue(details.waitForExistence(timeout: 10))
    }

}
