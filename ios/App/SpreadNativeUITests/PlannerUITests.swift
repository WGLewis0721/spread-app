import XCTest
import UIKit

// MARK: - Shared harness

/// Every helper waits for the real accessibility element, and a failing test attaches the whole
/// hierarchy and a screenshot, so a CI failure explains itself without a rerun.
class NativeUITestCase: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "com.graymatter.spread")

    override func setUpWithError() throws { continueAfterFailure = false }

    override func tearDownWithError() throws {
        // `hasSucceeded` is not final inside tearDown, so count the recorded failures instead.
        guard let run = testRun, run.totalFailureCount > 0, app.state != .notRunning else { return }
        attach(app.debugDescription, "hierarchy-at-failure")
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = "screen-at-failure"; shot.lifetime = .keepAlways; add(shot)
    }

    // MARK: launching and evidence

    func launch(_ arguments: [String] = []) {
        if app.state != .notRunning { app.terminate() }
        app.launchArguments = arguments
        app.launch()
        XCTAssertTrue(app.buttons["native-spread"].waitForExistence(timeout: 90), "The native planner never appeared")
    }
    func relaunch() { launch(app.launchArguments) }

    func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
    func attach(_ text: String, _ name: String) {
        let attachment = XCTAttachment(string: text)
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }

    // MARK: finding and tapping

    func el(_ id: String) -> XCUIElement { app.descendants(matching: .any).matching(identifier: id).firstMatch }
    func elements(prefix: String) -> [XCUIElement] {
        app.descendants(matching: .any).matching(NSPredicate(format: "identifier BEGINSWITH %@", prefix)).allElementsBoundByIndex
    }
    /// Elements whose identifier starts with `prefix`, once at least `minimum` exist (a sheet may still be opening).
    func waitElements(prefix: String, minimum: Int = 1, timeout: TimeInterval = 20) -> [XCUIElement] {
        _ = eventually(timeout) { self.elements(prefix: prefix).count >= minimum }
        return elements(prefix: prefix)
    }
    func eventually(_ timeout: TimeInterval = 20, _ condition: () -> Bool) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if condition() { return true }
            RunLoop.current.run(until: Date().addingTimeInterval(0.25))
        }
        return condition()
    }
    /// Scrolls up through a list or sheet until the element can be hit. Never swipes down, which
    /// would dismiss a sheet that is already at its top.
    func scrollIntoView(_ element: XCUIElement, maxSwipes: Int = 8) {
        var swipes = 0
        while element.exists && !element.isHittable && swipes < maxSwipes { app.swipeUp(); swipes += 1 }
    }
    @discardableResult func tapID(_ id: String, timeout: TimeInterval = 30, file: StaticString = #filePath, line: UInt = #line) -> XCUIElement {
        let element = el(id)
        XCTAssertTrue(element.waitForExistence(timeout: timeout), "Missing element with identifier \(id)", file: file, line: line)
        scrollIntoView(element)
        element.tap()
        return element
    }
    @discardableResult func tapButton(_ label: String, timeout: TimeInterval = 30, file: StaticString = #filePath, line: UInt = #line) -> XCUIElement {
        let element = app.buttons[label].firstMatch
        XCTAssertTrue(element.waitForExistence(timeout: timeout), "Missing button \(label)", file: file, line: line)
        scrollIntoView(element)
        element.tap()
        return element
    }
    func typeInto(_ id: String, _ text: String, file: StaticString = #filePath, line: UInt = #line) {
        let field = el(id)
        XCTAssertTrue(field.waitForExistence(timeout: 30), "Missing field \(id)", file: file, line: line)
        scrollIntoView(field)
        field.tap()
        field.typeText(text)
    }
    func fieldText(_ id: String) -> String { (el(id).value as? String) ?? "" }
    /// A Form row's switch sits at the trailing edge; tapping the row centre can miss it.
    func flip(_ id: String, file: StaticString = #filePath, line: UInt = #line) {
        let toggle = el(id)
        XCTAssertTrue(toggle.waitForExistence(timeout: 20), "Missing switch \(id)", file: file, line: line)
        toggle.coordinate(withNormalizedOffset: CGVector(dx: 0.92, dy: 0.5)).tap()
    }

    // MARK: navigation

    func goWeek() { tapID("native-week") }
    func goSpread() { tapID("native-spread") }
    func chooseMode(_ mode: String) {
        let button = el("layout-" + mode.lowercased())
        if !button.isHittable {
            let rail = el("view-mode-button")
            for _ in 0..<5 where !button.isHittable { mode == "Stack" ? rail.swipeRight() : rail.swipeLeft() }
        }
        tapID("layout-" + mode.lowercased())
    }
    /// Reveals a tab in the horizontally scrolling row (offscreen tabs are not reachable until scrolled).
    func revealTab(_ name: String) {
        let tab = app.buttons[name].firstMatch
        var swipes = 0
        while (!tab.exists || !tab.isHittable) && swipes < 8 {
            el("role-tabs").swipeLeft(); swipes += 1
        }
    }
    func closeNativeSheets() {
        for _ in 0..<4 {
            let button = ["Done", "Close", "Cancel"].map { app.buttons[$0].firstMatch }.first { $0.exists && $0.isHittable }
            guard let button else { return }
            button.tap()
        }
    }
    func selectRole(_ name: String) {
        closeNativeSheets()
        goSpread(); chooseMode("Tabs")
        revealTab(name)
        tapButton(name)
        XCTAssertTrue(eventually { self.el("manage-selected").label == "Manage \(name)" }, "Responsibility \(name) did not become the selection")
    }
    var crownValue: String { (el("week-crown").value as? String) ?? "" }
    var selectedRoleLabel: String { el("manage-selected").label }

    // MARK: dates (the planner keeps date-only UTC weeks that start on Monday)

    var utc: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(secondsFromGMT: 0)!; return c }
    func iso(_ date: Date) -> String {
        let f = DateFormatter(); f.calendar = utc; f.timeZone = utc.timeZone; f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }
    func monday(of date: Date) -> Date {
        let weekday = utc.component(.weekday, from: date)
        return utc.date(byAdding: .day, value: -((weekday + 5) % 7), to: utc.startOfDay(for: date))!
    }
    func addDays(_ date: Date, _ days: Int) -> Date { utc.date(byAdding: .day, value: days, to: date)! }
    func rangeLabel(monday: Date) -> String {
        let f = DateFormatter(); f.calendar = utc; f.timeZone = utc.timeZone; f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "MMM d"
        return "\(f.string(from: monday)) – \(f.string(from: addDays(monday, 6)))"
    }
    /// The planner derives "this week" from the device's local calendar day, so take today's
    /// year-month-day locally and treat it as a date-only UTC value like the planner's week keys.
    var thisMonday: Date {
        let local = Calendar.current.dateComponents([.year, .month, .day], from: Date())
        return monday(of: utc.date(from: local)!)
    }

    // MARK: accessibility audits (never ignore an issue: the handler only records it)

    static let requiredAudits: XCUIAccessibilityAuditType = [.hitRegion, .textClipped, .sufficientElementDescription]
    static let extendedAudits: XCUIAccessibilityAuditType = [.contrast, .dynamicType, .trait]

    /// Audits what is on screen now. Every issue still fails the test; the handler adds the element.
    func audit(_ screen: String, types: XCUIAccessibilityAuditType = NativeUITestCase.requiredAudits) throws {
        guard #available(iOS 17.0, *) else { throw XCTSkip("Accessibility audits need iOS 17") }
        let previous = continueAfterFailure
        continueAfterFailure = true
        defer { continueAfterFailure = previous }
        var found: [String] = []
        try app.performAccessibilityAudit(for: types) { issue in
            let element = issue.element
            found.append("[\(screen)] \(issue.compactDescription): \(issue.detailedDescription) | element id=\(element?.identifier ?? "?") label=\(element?.label ?? "?") frame=\(String(describing: element?.frame))")
            return false
        }
        if !found.isEmpty { attach(found.joined(separator: "\n"), "audit-issues-" + screen) }
    }
    /// Audits the top of a scrolling screen and then what is revealed by scrolling.
    func auditScrolled(_ screen: String, types: XCUIAccessibilityAuditType = NativeUITestCase.requiredAudits) throws {
        try audit(screen + "-top", types: types)
        app.swipeUp()
        try audit(screen + "-scrolled", types: types)
        app.swipeDown()
    }

    /// Every visible button must offer at least 44 x 44 points (system bars and keyboards excluded).
    func assertTargets(_ screen: String, file: StaticString = #filePath, line: UInt = #line) {
        let system = Set(app.navigationBars.descendants(matching: .button).allElementsBoundByIndex.map { $0.label })
        var offenders: [String] = []
        for button in app.buttons.allElementsBoundByIndex where button.exists && button.isHittable {
            if system.contains(button.label) { continue }
            let frame = button.frame
            if frame.width < 43.5 || frame.height < 43.5 {
                offenders.append("\(button.label.isEmpty ? button.identifier : button.label) \(Int(frame.width))x\(Int(frame.height))")
            }
        }
        if !offenders.isEmpty { attach(offenders.joined(separator: "\n"), "targets-under-44-" + screen) }
        XCTAssertTrue(offenders.isEmpty, "[\(screen)] controls smaller than 44x44 pt: \(offenders)", file: file, line: line)
    }
}

// MARK: - One real dataset shared by the numbered journeys

enum Dataset {
    static var tag = ""
    static var role: String { "QA " + tag }
    static var taskA: String { "Alpha " + tag }   // placed, content, completed
    static var taskB: String { "Bravo " + tag }   // carried to next week
    static var taskC: String { "Charlie " + tag } // stays
    static var note: String { "Note " + tag }
    static var outline: String { "Outline " + tag }
    static var cell: String { "Cell " + tag }
    static var allocationIds: [String] = []       // identifiers "allocation-<id>", Monday then Wednesday
    static var taskIds: [String: String] = [:]    // task text -> id
    static func reset() {
        tag = String(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(6))
        allocationIds = []; taskIds = [:]
    }
}

// MARK: - F1 to F10 against one dataset

/// Numbered so XCTest runs them in order. Each step relaunches the app, which also proves the
/// previous step was persisted. Audits are separate tests, so a clipped label never hides function.
final class JourneyUITests: NativeUITestCase {
    func requireDataset() throws {
        if Dataset.tag.isEmpty { throw XCTSkip("F01 has not created the dataset in this run") }
    }
    private func taskRow(_ text: String) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'task-row-' AND label == %@", text)).firstMatch
    }
    private func taskId(_ text: String) -> String {
        let row = taskRow(text)
        XCTAssertTrue(row.waitForExistence(timeout: 20), "Missing task \(text)")
        return String(row.identifier.dropFirst("task-row-".count))
    }
    private func openTask(_ text: String) {
        selectRole(Dataset.role)
        let row = taskRow(text)
        XCTAssertTrue(row.waitForExistence(timeout: 20)); scrollIntoView(row); row.tap()
        XCTAssertTrue(el("task-editor").waitForExistence(timeout: 20))
    }
    private func chooseDay(_ label: String) {
        tapID("day-picker")
        let option = app.buttons[label].firstMatch
        if option.waitForExistence(timeout: 3) { option.tap() }
        else { app.menuItems[label].firstMatch.tap() }
    }
    private func showTasks(on day: String) {
        let card = el("day-card-" + day)
        XCTAssertTrue(card.waitForExistence(timeout: 20)); scrollIntoView(card)
        for toggle in card.descendants(matching: .button).matching(NSPredicate(format: "identifier BEGINSWITH 'allocation-toggle-'")).allElementsBoundByIndex
            where (toggle.value as? String) == "Tasks folded" { toggle.tap() }
    }
    private func revealTray() {
        for group in elements(prefix: "tray-role-") where group.label.hasPrefix(Dataset.role) && (group.value as? String) == "Collapsed" {
            scrollIntoView(group); group.tap()
        }
    }

    func testF01_Onboarding() throws {
        Dataset.reset(); launch()
        tapID("open-more"); tapID("more-new-spread")
        typeInto("role-name-field", Dataset.role)
        capture("F01-new-spread"); tapID("save-spreads")
        selectRole(Dataset.role)
        XCTAssertEqual(selectedRoleLabel, "Manage " + Dataset.role)
        capture("F01-created")
    }

    func testF02_BudgetAndDays() throws {
        try requireDataset(); launch(); selectRole(Dataset.role); tapID("manage-selected")
        XCTAssertTrue(el("bank-remaining").waitForExistence(timeout: 15))
        XCTAssertEqual(el("bank-remaining").label, "2h left in this week’s bank")
        tapButton("Increase \(Dataset.role) hours by half an hour")
        XCTAssertTrue(eventually { self.el("bank-remaining").label == "2.5h left in this week’s bank" })
        tapButton("Increase \(Dataset.role) hours by half an hour")
        XCTAssertTrue(eventually { self.el("bank-remaining").label == "3h left in this week’s bank" })
        chooseDay("Monday"); tapID("place-hours-button")
        XCTAssertTrue(eventually { self.el("bank-remaining").label == "2h left in this week’s bank" })
        chooseDay("Wednesday"); tapID("place-hours-button")
        XCTAssertTrue(eventually { self.el("bank-remaining").label == "1h left in this week’s bank" })
        tapButton("Done"); goWeek()
        let allocations = elements(prefix: "allocation-").filter { $0.label == "Move " + Dataset.role }
        XCTAssertEqual(allocations.count, 2)
        Dataset.allocationIds = allocations.map(\.identifier)
        capture("F02-budget-and-two-days")
    }

    func testF03_TasksAndRichContent() throws {
        try requireDataset(); launch(); selectRole(Dataset.role)
        for text in [Dataset.taskA, Dataset.taskB, Dataset.taskC] {
            typeInto("new-task-field", text); tapID("add-task-button")
            XCTAssertTrue(taskRow(text).waitForExistence(timeout: 20))
            Dataset.taskIds[text] = taskId(text)
        }
        openTask(Dataset.taskA)
        tapID("format-notes"); typeInto("content-notes", Dataset.note)
        tapID("add-block"); tapID("format-outline"); typeInto("content-outline-0", Dataset.outline)
        tapID("add-block"); tapID("format-table"); typeInto("content-cell-0-0", Dataset.cell)
        capture("F03-rich-content"); tapID("task-sheet-done")
        relaunch(); openTask(Dataset.taskA)
        XCTAssertTrue(eventually { self.fieldText("content-notes") == Dataset.note })
        XCTAssertEqual(fieldText("content-outline-0"), Dataset.outline)
        XCTAssertEqual(fieldText("content-cell-0-0"), Dataset.cell)
        capture("F03-persisted-content")
    }

    func testF04_PlaceAndMove() throws {
        try requireDataset(); launch(); goWeek(); revealTray()
        let id = try XCTUnwrap(Dataset.taskIds[Dataset.taskA])
        let monday = iso(thisMonday), wednesday = iso(addDays(thisMonday, 2))
        tapID("task-move-" + id)
        let days = waitElements(prefix: "eligible-day-", minimum: 2)
        XCTAssertEqual(days.count, 2, "Only this responsibility’s allocated days are eligible")
        tapID("eligible-day-" + monday)
        showTasks(on: monday)
        XCTAssertTrue(taskRow(Dataset.taskA).waitForExistence(timeout: 20))
        tapID("task-move-" + id); tapID("eligible-day-" + wednesday)
        showTasks(on: wednesday)
        XCTAssertTrue(el("day-card-" + wednesday).descendants(matching: .any).matching(identifier: "task-row-" + id).firstMatch.exists)
        tapID("undo-last-change"); showTasks(on: monday)
        XCTAssertTrue(el("day-card-" + monday).descendants(matching: .any).matching(identifier: "task-row-" + id).firstMatch.exists)
        capture("F04-move-and-undo")
    }

    func testF05_CompleteAndUndo() throws {
        try requireDataset(); launch(); selectRole(Dataset.role)
        let id = try XCTUnwrap(Dataset.taskIds[Dataset.taskA])
        tapID("task-check-" + id)
        XCTAssertTrue(eventually { self.el("task-check-" + id).label == "Mark not done: " + Dataset.taskA })
        tapID("undo-last-change")
        XCTAssertTrue(eventually { self.el("task-check-" + id).label == "Mark done: " + Dataset.taskA })
        tapID("task-check-" + id)
        capture("F05-complete-and-undo")
    }

    func testF06_CrownWeeks() throws {
        try requireDataset(); launch(); goWeek()
        let initial = crownValue
        tapID("crown-next")
        XCTAssertTrue(eventually { self.crownValue != initial })
        tapID("crown-previous")
        XCTAssertTrue(eventually { self.crownValue == initial })
        let from = el("week-crown").coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        from.press(forDuration: 0.05, thenDragTo: from.withOffset(CGVector(dx: -70, dy: 0)))
        XCTAssertTrue(eventually { self.crownValue != initial })
        tapID("week-crown-detail")
        XCTAssertTrue(eventually { self.crownValue == initial })
    }

    func testF07_LayoutsKeepSelectionAndData() throws {
        try requireDataset(); launch(); selectRole(Dataset.role)
        for mode in ["Fan", "Dial", "Tabs", "Day", "Stack"] {
            chooseMode(mode)
            if mode == "Tabs" { tapButton(Dataset.role) }
            XCTAssertEqual(selectedRoleLabel, "Manage " + Dataset.role)
            capture("F07-" + mode.lowercased())
        }
    }

    func testF08_Month() throws {
        try requireDataset(); launch(); goWeek(); tapID("week-month-toggle")
        XCTAssertTrue(el("month").waitForExistence(timeout: 20))
        tapID("month-day-" + iso(addDays(thisMonday, 2)))
        XCTAssertTrue(el("week-surface").waitForExistence(timeout: 20))
        XCTAssertEqual(el("week-month-toggle").value as? String, "Week")
        XCTAssertTrue(el("day-card-" + iso(addDays(thisMonday, 2))).exists)
        capture("F08-month-to-week")
    }

    func testF09_CarryUnfinishedWork() throws {
        try requireDataset(); launch(); selectRole(Dataset.role)
        tapID("review-unfinished")
        // Keep every unrelated task and Charlie in this week; carry only Bravo.
        for toggle in elements(prefix: "carry-") {
            let desired = toggle.identifier == "carry-" + (Dataset.taskIds[Dataset.taskB] ?? "")
            let selected = toggle.isSelected
            if selected != desired { scrollIntoView(toggle); toggle.tap() }
        }
        tapID("carry-selected"); closeNativeSheets(); goWeek(); tapID("crown-next")
        selectRole(Dataset.role)
        XCTAssertTrue(taskRow(Dataset.taskB).waitForExistence(timeout: 20))
        XCTAssertFalse(taskRow(Dataset.taskA).exists)
        tapID("crown-previous"); selectRole(Dataset.role)
        XCTAssertTrue(taskRow(Dataset.taskC).waitForExistence(timeout: 20))
        XCTAssertFalse(taskRow(Dataset.taskB).exists)
        capture("F09-carry-keeps-history")
    }

    func testF10_1_RelaunchKeepsEverything() throws {
        try requireDataset(); launch(); selectRole(Dataset.role)
        XCTAssertTrue(taskRow(Dataset.taskA).waitForExistence(timeout: 20))
        XCTAssertTrue(taskRow(Dataset.taskC).exists)
        XCTAssertEqual(el("task-check-" + (Dataset.taskIds[Dataset.taskA] ?? "")).label, "Mark not done: " + Dataset.taskA)
        openTask(Dataset.taskA)
        XCTAssertTrue(eventually { self.fieldText("content-notes") == Dataset.note })
        XCTAssertEqual(fieldText("content-outline-0"), Dataset.outline)
        XCTAssertEqual(fieldText("content-cell-0-0"), Dataset.cell)
        closeNativeSheets(); goWeek()
        for id in Dataset.allocationIds { XCTAssertTrue(el(id).exists, "Missing persisted allocation " + id) }
        capture("F10-persisted-plan")
    }

    func testF10_2_ProfilesAreIsolated() throws {
        try requireDataset(); launch()
        tapID("open-more"); tapID("manage-profiles")
        let profiles = elements(prefix: "profile-")
        let original = try XCTUnwrap(profiles.first { ($0.value as? String) == "Current profile" } ?? profiles.first)
        let originalId = original.identifier
        let other = "Isolation " + Dataset.tag
        typeInto("new-profile-field", other); tapID("create-profile")
        closeNativeSheets(); goSpread(); chooseMode("Tabs")
        XCTAssertFalse(app.buttons[Dataset.role].exists, "The new profile contains another profile’s responsibility")
        tapID("open-more"); tapID("manage-profiles"); tapID(originalId)
        closeNativeSheets(); selectRole(Dataset.role)
        XCTAssertTrue(taskRow(Dataset.taskA).waitForExistence(timeout: 20))
        capture("F10-profiles-isolated")
    }

    func testF10_3_BackupInterfaceAndReturn() throws {
        try requireDataset(); launch(); tapID("open-more"); tapID("backup-and-restore")
        XCTAssertTrue(app.buttons["Return to native Spread"].waitForExistence(timeout: 30))
        XCTAssertFalse(app.buttons["native-spread"].exists)
        capture("F10-protected-recovery")
        tapButton("Return to native Spread"); selectRole(Dataset.role)
        XCTAssertTrue(taskRow(Dataset.taskA).waitForExistence(timeout: 20))
    }

    func testF10_4_FailedSaveThenRetry() throws {
        try requireDataset(); let marker = "FAILSAVE-" + Dataset.tag
        launch(["-SpreadFailSaveMarker", marker]); selectRole(Dataset.role)
        typeInto("new-task-field", marker); tapID("add-task-button")
        XCTAssertTrue(el("save-failure-banner").waitForExistence(timeout: 20) || app.alerts.firstMatch.exists)
        if app.alerts.firstMatch.exists { app.alerts.buttons["Retry saving"].tap() }
        else { tapID("retry-saving") }
        XCTAssertTrue(eventually { !self.el("save-failure-banner").exists })
        launch(); selectRole(Dataset.role)
        XCTAssertTrue(taskRow(marker).waitForExistence(timeout: 20), "Retried task was not persisted")
    }

    func testF11_AuditWeekAndMonth() throws {
        try requireDataset(); launch(); goWeek(); try auditScrolled("journey-week")
        tapID("week-month-toggle"); try audit("journey-month")
    }
    func testF11_AuditSheets() throws {
        try requireDataset(); launch(); selectRole(Dataset.role); tapID("manage-selected")
        try auditScrolled("role-sheet"); closeNativeSheets(); openTask(Dataset.taskA)
        try auditScrolled("task-sheet"); closeNativeSheets(); tapID("open-more")
        try auditScrolled("more-sheet"); tapID("manage-profiles"); try auditScrolled("profiles-sheet")
    }
}

// MARK: - Planner screens: Crown, layouts, gestures, audits

final class PlannerUITests: NativeUITestCase {
    override func setUpWithError() throws {
        try super.setUpWithError()
        launch()
    }

    // MARK: Crown (unchanged semantics: 100 real drags including 30 reversals)

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

    // MARK: Stack and Fan: 100 rapid swipes each, correct selection after every one

    /// Responsibility names in display order, read from the Tabs row.
    func roleNames() -> [String] {
        goSpread(); chooseMode("Tabs")
        var names: [String] = []
        for _ in 0..<8 {
            let before = names.count
            for label in elements(prefix: "role-tab-").filter({ $0.identifier != "role-tab-all" }).map({ $0.label }) where !names.contains(label) { names.append(label) }
            if names.count == before { break }
            el("role-tabs").swipeLeft()
        }
        for _ in 0..<8 { el("role-tabs").swipeRight() }
        return names
    }

    private func rapidSwipes(mode: String, container: String, steps: Int = 100) {
        let names = roleNames()
        XCTAssertGreaterThanOrEqual(names.count, 2, "Need two responsibilities to swipe between")
        tapButton(names[0])
        chooseMode(mode)
        XCTAssertEqual(selectedRoleLabel, "Manage \(names[0])")
        var index = 0
        for step in 0..<steps {
            // Walk both ways so reversals and both ends are exercised.
            let forward = index == 0 ? true : (index == names.count - 1 ? false : step % 3 != 2)
            let area = el(container)
            XCTAssertTrue(area.waitForExistence(timeout: 20), "\(mode) cards are missing at swipe \(step)")
            let from = area.coordinate(withNormalizedOffset: CGVector(dx: forward ? 0.75 : 0.25, dy: 0.12))
            from.press(forDuration: 0.05, thenDragTo: from.withOffset(CGVector(dx: forward ? -160 : 160, dy: 0)))
            index = min(max(0, index + (forward ? 1 : -1)), names.count - 1)
            let expected = "Manage \(names[index])"
            XCTAssertTrue(eventually(6) { self.selectedRoleLabel == expected }, "\(mode) swipe \(step + 1): expected \(expected), found \(self.selectedRoleLabel)")
        }
        capture("\(steps)-rapid-swipes-\(mode.lowercased())")
    }

    func testStackHundredRapidSwipesKeepSelection() { rapidSwipes(mode: "Stack", container: "stack-cards") }
    func testFanHundredRapidSwipesKeepSelection() { rapidSwipes(mode: "Fan", container: "fan-cards") }

    /// Reduce Motion: every gesture still works without animation. The Debug build reports what the
    /// system setting did to the app; if it is not in effect the test is skipped, never passed.
    func testReduceMotionKeepsFunction() throws {
        let state = (app.otherElements["native-content"].firstMatch.value as? String) ?? ""
        guard state.hasPrefix("reduce-motion;") else { throw XCTSkip("Reduce Motion was not in effect in the app (state '\(state)'): not verified") }
        rapidSwipes(mode: "Stack", container: "stack-cards", steps: 20)
        rapidSwipes(mode: "Fan", container: "fan-cards", steps: 20)
        goWeek()
        let before = crownValue
        tapButton("Next week")
        XCTAssertTrue(eventually { self.crownValue != before }, "The Crown arrows must work with Reduce Motion")
        let from = el("week-crown").coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        from.press(forDuration: 0.05, thenDragTo: from.withOffset(CGVector(dx: -70, dy: 0)))
        XCTAssertTrue(eventually { self.crownValue == before }, "A drag must still move one week with Reduce Motion")
        capture("reduce-motion-verified")
    }

    /// A selected responsibility that no longer exists falls back to the first one in every mode.
    func testSelectedRoleFallsBackAfterDeletion() {
        let tag = String(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(5))
        let doomed = "Fallback \(tag)"
        tapID("open-more"); tapID("more-new-spread")
        typeInto("role-name-field", doomed); tapID("save-spreads")
        closeNativeSheets()
        let names = roleNames()
        XCTAssertEqual(names.last, doomed)
        let first = names[0]
        tapButton(doomed)
        tapID("manage-selected")
        tapID("delete-role-button")
        tapID("confirm-delete-role")
        XCTAssertTrue(eventually { !self.app.buttons[doomed].exists }, "The responsibility was not deleted")
        for mode in ["Stack", "Fan", "Dial", "Tabs", "Day"] {
            chooseMode(mode)
            XCTAssertTrue(eventually { self.selectedRoleLabel == "Manage \(first)" }, "\(mode): fell back to \(self.selectedRoleLabel) instead of \(first)")
        }
        capture("selection-fallback")
    }

    /// Many and long tasks must stay inside the Fan: nothing clipped, the rest reachable.
    func testFanKeepsLargeContentInsideItsFrame() {
        let tag = String(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(5))
        let name = "Large \(tag) responsibility with a deliberately long name"
        tapID("open-more"); tapID("more-new-spread")
        typeInto("role-name-field", name); tapID("save-spreads")
        selectRole(name)
        tapID("manage-selected")
        for n in 1...6 {
            typeInto("new-task-field", "Task \(n) \(tag) with enough words to wrap onto a second and third line of the card")
            tapID("add-task-button")
            XCTAssertTrue(eventually { self.app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Task \(n) \(tag)")).firstMatch.exists })
        }
        tapButton("Done")
        selectRole(name); chooseMode("Fan")
        XCTAssertEqual(selectedRoleLabel, "Manage \(name)")
        let fan = el("fan-cards")
        XCTAssertTrue(fan.waitForExistence(timeout: 20))
        let rows = elements(prefix: "task-row-").filter { $0.label.contains(tag) }
        XCTAssertEqual(rows.count, 6, "Fan must keep every task reachable below its card stage")
        for row in rows {
            scrollIntoView(row)
            XCTAssertTrue(row.isHittable, "Task is unreachable: " + row.label)
            XCTAssertGreaterThanOrEqual(row.frame.minX, app.frame.minX)
            XCTAssertLessThanOrEqual(row.frame.maxX, app.frame.maxX + 1)
        }
        capture("fan-large-content")
    }

    // MARK: Layout evidence (screens and Month at the matching width; audits are separate tests)

    func testLayout390() throws { try layout(width: 390) }
    func testLayout820() throws { try layout(width: 820) }
    func testLayout1024() throws { try layout(width: 1024) }

    private func startAtWidth(_ width: Int) throws {
        guard app.frame.width >= CGFloat(width) else { throw XCTSkip("Viewport requires the matching destination; verified in the layout matrix.") }
        launch(["-SpreadViewportWidth", String(width)])
        let content = app.otherElements["native-content"].firstMatch
        XCTAssertTrue(content.waitForExistence(timeout: 30))
        XCTAssertEqual(content.frame.width, CGFloat(width), accuracy: 1)
    }
    private func layout(width: Int) throws {
        try startAtWidth(width)
        capture("viewport-\(width)-week")
        goSpread()
        for mode in ["Stack", "Fan", "Dial", "Tabs", "Day"] { chooseMode(mode); capture("viewport-\(width)-" + mode.lowercased()) }
        goWeek(); el("week-month-toggle").tap()
        XCTAssertTrue(eventually { (self.el("week-month-toggle").value as? String) == "Month" })
        capture("viewport-\(width)-month")
    }

    // MARK: Accessibility audits, one test per width; every screen, scrolled, nothing ignored

    func testAudit390() throws { try auditEverything(width: 390) }
    func testAudit820() throws { try auditEverything(width: 820) }
    func testAudit1024() throws { try auditEverything(width: 1024) }
    private func auditEverything(width: Int, types: XCUIAccessibilityAuditType = NativeUITestCase.requiredAudits, label: String = "") throws {
        try startAtWidth(width)
        let tag = "\(width)\(label)"
        try auditScrolled("\(tag)-week", types: types)
        goSpread()
        for mode in ["Stack", "Fan", "Dial", "Tabs", "Day"] { chooseMode(mode); try auditScrolled("\(tag)-\(mode.lowercased())", types: types) }
        goWeek(); el("week-month-toggle").tap()
        try audit("\(tag)-month", types: types)
    }
    /// Contrast, Dynamic Type and trait audits are reported on their own so they never mask the required three.
    func testAuditExtended390() throws { try auditEverything(width: 390, types: NativeUITestCase.extendedAudits, label: "-extended") }
    func testAuditExtended820() throws { try auditEverything(width: 820, types: NativeUITestCase.extendedAudits, label: "-extended") }

    func testTargets44Everywhere() throws {
        goWeek(); assertTargets("week")
        goSpread()
        for mode in ["Stack", "Fan", "Dial", "Tabs", "Day"] { chooseMode(mode); assertTargets(mode.lowercased()) }
        tapID("manage-selected"); assertTargets("role-editor"); tapButton("Done")
        goWeek(); el("week-month-toggle").tap(); assertTargets("month")
    }

    // MARK: Dynamic Type, long names, Reduce Motion, orientation

    func testDynamicTypeLargestAccessibilitySize() throws {
        launch(["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        capture("dynamic-type-xxxl-week")
        try auditScrolled("xxxl-week")
        goSpread()
        for mode in ["Stack", "Fan", "Dial", "Tabs", "Day"] { chooseMode(mode); capture("dynamic-type-xxxl-\(mode.lowercased())"); try auditScrolled("xxxl-\(mode.lowercased())") }
        goWeek(); el("week-month-toggle").tap(); capture("dynamic-type-xxxl-month"); try audit("xxxl-month")
        // The title and profile name are never truncated: everything is inside the screen.
        let title = app.staticTexts["Spread"].firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 10))
        XCTAssertGreaterThanOrEqual(title.frame.minX, 0)
        XCTAssertLessThanOrEqual(title.frame.maxX, app.frame.maxX)
    }

    func testLongProfileAndResponsibilityNames() throws {
        let tag = String(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(4))
        let profile = "Family and household projects for \(tag)"
        let role = "Quarterly planning and stakeholder updates \(tag)"
        let original = el("active-profile-name").label
        defer {
            // Leave the roster as found so later tests use the original profile.
            if app.state != .notRunning {
                launch()
                tapID("open-more"); tapID("manage-profiles")
                elements(prefix: "profile-").first { $0.label.hasPrefix(original) }?.tap()
            }
        }
        tapID("open-more"); tapID("manage-profiles")
        typeInto("new-profile-field", profile); tapButton("Create profile")
        XCTAssertTrue(eventually { self.el("active-profile-name").label == profile }, "Long profile name was not kept whole: \(el("active-profile-name").label)")
        tapID("open-more"); tapID("more-new-spread")
        typeInto("role-name-field", role); tapID("save-spreads")
        capture("long-names-week")
        try audit("long-names-week")
        selectRole(role)
        for mode in ["Stack", "Fan", "Dial", "Tabs", "Day"] { chooseMode(mode); XCTAssertEqual(selectedRoleLabel, "Manage \(role)"); try audit("long-names-\(mode.lowercased())") }
        capture("long-names-spread")
    }

    /// iPad supports every orientation (Info.plist). The phone build is portrait-only by design.
    func testIPadOrientations() throws {
        defer { XCUIDevice.shared.orientation = .portrait }
        for (name, orientation) in [("landscape-left", UIDeviceOrientation.landscapeLeft), ("landscape-right", .landscapeRight), ("portrait-upside-down", .portraitUpsideDown)] {
            XCUIDevice.shared.orientation = orientation
            XCTAssertTrue(app.buttons["native-spread"].waitForExistence(timeout: 20))
            capture("orientation-\(name)-week")
            try audit("orientation-\(name)-week")
            goSpread(); chooseMode("Fan"); capture("orientation-\(name)-fan")
            goWeek()
        }
    }
}

// MARK: - Visual tour (screenshot evidence for design changes)

/// Real simulator screenshots of every main surface, in dark and light, for before/after comparison. It only
/// records: each step is best effort, so a surface that cannot be reached is noted in an attachment instead of
/// hiding the screens after it. Run on its own with `-only-testing:SpreadNativeUITests/VisualTourUITests`.
final class VisualTourUITests: NativeUITestCase {
    func testTourDark() throws {
        XCUIDevice.shared.appearance = .dark
        defer { XCUIDevice.shared.appearance = .light }
        try tour("dark", arguments: ["-spread.native.appearance", "dark"])
    }
    func testTourLight() throws {
        XCUIDevice.shared.appearance = .light
        try tour("light", arguments: ["-spread.native.appearance", "light"])
    }
    func testTourDarkLargeText() throws {
        XCUIDevice.shared.appearance = .dark
        defer { XCUIDevice.shared.appearance = .light }
        try tour("dark-large-text", arguments: ["-spread.native.appearance", "dark", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityL"], short: true)
    }

    private var notes: [String] = []
    private func note(_ text: String) { notes.append(text) }

    /// Taps `id` if it appears within `timeout`; records a note otherwise.
    @discardableResult private func tryTap(_ id: String, timeout: TimeInterval = 6) -> Bool {
        let element = el(id)
        guard element.waitForExistence(timeout: timeout) else { note("missing: \(id)"); return false }
        scrollIntoView(element)
        element.tap()
        return true
    }

    private func settle(_ seconds: TimeInterval = 0.8) { RunLoop.current.run(until: Date().addingTimeInterval(seconds)) }

    private func tour(_ style: String, arguments: [String], short: Bool = false) throws {
        notes = []
        launch(arguments)
        settle(1.5)
        let expectedAppearance = style.hasPrefix("dark") ? "dark" : "light"
        XCTAssertTrue(eventually { (self.el("native-content").value as? String)?.hasSuffix(";" + expectedAppearance) == true }, "The requested appearance did not render")
        capture("tour-\(style)-01-spread-stack")

        if !short {
            // Give the open card real content so the evidence shows tasks, not an empty list.
            let field = el("new-task-field")
            if field.waitForExistence(timeout: 6) {
                scrollIntoView(field); field.tap(); field.typeText("Plan the week\n")
                settle(0.8)
                field.tap(); field.typeText("Review the budget\n")
                settle(1.0)
                capture("tour-\(style)-02-stack-with-tasks")
            } else { note("missing: new-task-field") }

            // Open a different card: the Stack opens one at a time.
            let blocks = elements(prefix: "role-block-")
            if blocks.count > 1, blocks[1].isHittable { blocks[1].tap(); settle(1.0); capture("tour-\(style)-03-stack-second-card") }
        }

        goSpread()
        for mode in ["Fan", "Dial", "Tabs", "Day"] {
            if tryTap("layout-" + mode.lowercased()) { settle(1.0); capture("tour-\(style)-04-\(mode.lowercased())") }
        }
        if tryTap("layout-stack") { settle(0.6) }

        goWeek(); settle(1.0)
        capture("tour-\(style)-05-week")
        if !short {
            app.swipeUp(); settle(0.6); capture("tour-\(style)-06-week-scrolled"); app.swipeDown()
            if tryTap("week-month-toggle") { settle(1.0); capture("tour-\(style)-07-month"); tryTap("week-month-toggle") }
        }

        if tryTap("open-more") { settle(1.0); capture("tour-\(style)-08-more"); dismissSheet() }
        goSpread(); settle(0.5)
        if !short {
            if let row = elements(prefix: "task-row-").first, row.exists {
                scrollIntoView(row); row.tap(); settle(1.2); capture("tour-\(style)-09-task-sheet"); dismissSheet()
            } else { note("missing: a task row") }
            if tryTap("open-more"), tryTap("more-new-spread") { settle(1.0); capture("tour-\(style)-10-new-spread"); dismissSheet() }
        }
        if !notes.isEmpty { attach(notes.joined(separator: "\n"), "tour-\(style)-notes") }
    }

    /// Closes the open sheet through its own Done/Cancel control, falling back to a downward swipe.
    private func dismissSheet() {
        for label in ["Done", "Cancel", "Close"] {
            let button = app.buttons[label].firstMatch
            if button.exists && button.isHittable { button.tap(); settle(0.6); return }
        }
        app.swipeDown(velocity: .fast); settle(0.6)
    }
}

// MARK: - Flow regression for the redesigned UI

/// End-to-end checks of the redesigned screens through the real app. These are hard assertions (unlike the tour):
/// each flow creates its own uniquely tagged data, so it holds whatever an earlier run left in the simulator.
final class SpreadFlowUITests: NativeUITestCase {
    private func uniqueTag() -> String { String(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(6)) }

    private func closeSheets() {
        for _ in 0..<3 {
            let done = app.buttons["Done"].firstMatch
            if done.exists && done.isHittable { done.tap(); continue }
            let close = app.buttons["Close"].firstMatch
            if close.exists && close.isHittable { close.tap(); continue }
            break
        }
    }

    /// F1: create a spread from More, add a task to its card, complete it, relaunch, and find both again.
    func testFlow1_CreateSpreadAddTaskCompleteAndPersist() throws {
        let tag = uniqueTag(); let name = "QA " + tag; let task = "Task " + tag
        launch(); goSpread(); chooseMode("Stack")
        tapID("open-more"); tapID("more-new-spread")
        typeInto("role-name-field", name)
        tapID("save-spreads")
        XCTAssertTrue(app.staticTexts[name].firstMatch.waitForExistence(timeout: 30) || eventually { self.closeSheets(); return self.app.staticTexts[name].firstMatch.exists },
                      "The new spread \(name) never appeared as a card")
        closeSheets()
        // A tap on a compact card opens it (it does not start a rename).
        selectRole(name)
        typeInto("new-task-field", task + "\n")
        let row = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", task)).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 20), "The task \(task) was not added to the open card")
        let check = app.buttons["Mark done: \(task)"].firstMatch
        XCTAssertTrue(check.waitForExistence(timeout: 10)); scrollIntoView(check); check.tap()
        XCTAssertTrue(app.buttons["Mark not done: \(task)"].firstMatch.waitForExistence(timeout: 20), "Completing the task did not register")
        capture("flow1-before-relaunch")
        relaunch()
        selectRole(name)
        XCTAssertEqual(selectedRoleLabel, "Manage " + name)
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", task)).firstMatch.waitForExistence(timeout: 20), "The task did not survive a relaunch")
        XCTAssertTrue(app.buttons["Mark not done: \(task)"].firstMatch.exists, "The completed state did not survive a relaunch")
    }

    /// The open week is stored data and survives relaunches, so each flow starts from this week.
    private func ensureThisWeek() {
        let back = el("week-crown-detail")
        if back.waitForExistence(timeout: 3) { back.tap() }
        _ = eventually { self.el("week-crown").label.hasPrefix("This week") }
    }

    /// F2: in Week, choose a responsibility, add it to a day, and Undo it.
    /// (Undo, not a count of rows: the store folds hours into an existing allocation of the same responsibility and day.)
    func testFlow2_PlaceHoursOnADayAndUndo() throws {
        launch(); goWeek(); ensureThisWeek()
        let chips = waitElements(prefix: "role-chip-")
        XCTAssertFalse(chips.isEmpty, "Week shows no responsibility chips")
        chips[0].tap()
        guard let add = waitElements(prefix: "add-to-").first else { return XCTFail("No Add button appeared for the chosen responsibility") }
        scrollIntoView(add); add.tap()
        XCTAssertTrue(el("undo-last-change").waitForExistence(timeout: 20), "Adding to a day did not register a change (no Undo offered)")
        capture("flow2-after-add")
        tapID("undo-last-change")
        XCTAssertTrue(eventually(15) { !self.el("undo-last-change").exists }, "Undo was not accepted")
    }

    /// F3: the Crown caps move one week each way, a round trip returns to the same week, and Today comes back.
    func testFlow3_CrownCapsRoundTripAndToday() throws {
        launch(); goWeek(); ensureThisWeek()
        let start = el("week-crown").label
        XCTAssertTrue(start.hasPrefix("This week"), "The Crown does not start on this week: \(start)")
        for _ in 0..<5 { tapID("crown-next") }
        XCTAssertTrue(eventually { self.el("week-crown").label != start }, "Five taps on Next did not move the Crown")
        XCTAssertTrue(el("week-crown-detail").waitForExistence(timeout: 10), "No way back to this week is offered")
        for _ in 0..<5 { tapID("crown-previous") }
        XCTAssertTrue(eventually { self.el("week-crown").label == start }, "Five Next and five Previous did not return to the same week (phantom week)")
        tapID("crown-next"); tapID("week-crown-detail")
        XCTAssertTrue(eventually { self.el("week-crown").label.hasPrefix("This week") }, "Back to this week did not return")
    }

    /// F4: Week to Month and back by picking a day.
    func testFlow4_MonthPickDayReturnsToWeek() throws {
        launch(); goWeek(); ensureThisWeek()
        tapID("week-month-toggle")
        XCTAssertTrue(el("month").waitForExistence(timeout: 15), "Month did not open")
        tapID("month-day-" + iso(thisMonday))
        XCTAssertTrue(el("week-surface").waitForExistence(timeout: 20), "Picking a day did not return to the Week")
        XCTAssertTrue(eventually { (self.el("week-month-toggle").value as? String) == "Week" }, "The toggle did not return to Week")
    }

    /// F5: the Move to sheet offers the eligible day, moves the task there, and Undo is available afterwards.
    func testFlow5_MoveToSheetPlacesATask() throws {
        let tag = uniqueTag(); let task = "Move " + tag
        launch(); tapID("brand-home"); chooseMode("Stack")
        // The first card is open by default: give its responsibility a task.
        typeInto("new-task-field", task + "\n")
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", task)).firstMatch.waitForExistence(timeout: 20))
        goWeek(); ensureThisWeek()
        let chips = waitElements(prefix: "role-chip-")
        XCTAssertFalse(chips.isEmpty); chips[0].tap()
        guard let add = waitElements(prefix: "add-to-").first else { return XCTFail("No Add button for the first responsibility") }
        scrollIntoView(add); add.tap()
        XCTAssertTrue(el("undo-last-change").waitForExistence(timeout: 20), "Placing hours did not register")
        tapID("dock-done")
        // Find this task's own row (the tray group may be folded when many tasks are waiting) and its Place button.
        func row() -> XCUIElement { app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", task)).firstMatch }
        if !row().waitForExistence(timeout: 5) {
            for header in elements(prefix: "tray-role-") where (header.value as? String) == "Collapsed" { scrollIntoView(header); header.tap() }
        }
        XCTAssertTrue(row().waitForExistence(timeout: 20), "The task \(task) is not in the To place tray")
        let taskId = String(row().identifier.dropFirst("task-row-".count))
        tapID("task-move-" + taskId)
        XCTAssertTrue(el("move-to-sheet").waitForExistence(timeout: 15), "The Move to sheet did not open")
        capture("flow5-move-to-sheet")
        let day = waitElements(prefix: "eligible-day-").first
        XCTAssertNotNil(day, "The sheet offered no eligible day for a responsibility that is on a day")
        day?.tap()
        XCTAssertTrue(eventually(20) { !self.el("move-to-sheet").exists }, "The sheet did not close after choosing a day")
    }
}

/// Runs only on the real Duo destination selected by the candidate workflow. Window geometry and the
/// real system appearance drive layout; no fixed screen mock or device-name branch enters the app.
final class DuoUITests: NativeUITestCase {
    func testAppearanceChoiceAndSystemChanges() throws {
        defer { XCUIDevice.shared.appearance = .light }
        launch()
        for style in ["dark", "light", "system"] {
            tapID("open-more")
            tapID("appearance-" + style)
            closeNativeSheets()
            if style != "system" {
                XCTAssertTrue(eventually { (self.el("native-content").value as? String)?.hasSuffix(";" + style) == true }, "Appearance choice did not reach the planner")
            }
        }
        for dark in [true, false] {
            XCUIDevice.shared.appearance = dark ? .dark : .light
            XCTAssertTrue(eventually { (self.el("native-content").value as? String)?.hasSuffix(dark ? ";dark" : ";light") == true }, "System appearance change did not reach the planner")
        }
    }

    func testResizablePlannerInBothAppearancesAndOrientations() throws {
        defer { XCUIDevice.shared.orientation = .portrait; XCUIDevice.shared.appearance = .light }
        for dark in [false, true] {
            XCUIDevice.shared.appearance = dark ? .dark : .light
            for (name, orientation) in [("portrait", UIDeviceOrientation.portrait), ("landscape", .landscapeLeft)] {
                XCUIDevice.shared.orientation = orientation
                launch(["-spread.native.appearance", dark ? "dark" : "light"])
                XCTAssertTrue(eventually { (self.el("native-content").value as? String)?.hasSuffix(dark ? ";dark" : ";light") == true })
                goSpread()
                let bounds = app.frame
                XCTAssertGreaterThan(bounds.width, 0)
                XCTAssertGreaterThan(bounds.height, 0)
                for mode in ["Stack", "Fan", "Dial", "Tabs", "Day"] {
                    chooseMode(mode)
                    capture("duo-\(dark ? "dark" : "light")-\(name)-\(mode.lowercased())")
                    assertTargets("duo-" + name + "-" + mode)
                }
                goWeek(); capture("duo-\(dark ? "dark" : "light")-\(name)-week")
                tapID("week-month-toggle"); capture("duo-\(dark ? "dark" : "light")-\(name)-month")
                XCTAssertTrue(el("month").exists)
                tapID("open-more"); capture("duo-\(dark ? "dark" : "light")-\(name)-more")
                closeNativeSheets()
            }
        }
    }
}
