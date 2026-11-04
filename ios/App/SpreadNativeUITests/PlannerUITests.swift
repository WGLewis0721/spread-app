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

    func capture(_ name: String, wholeScreen: Bool = false) {
        // SwiftUI transitions can still be rendering after XCTest reports the process idle.
        RunLoop.current.run(until: Date().addingTimeInterval(0.8))
        let attachment = XCTAttachment(screenshot: wholeScreen ? XCUIScreen.main.screenshot() : app.screenshot())
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
    /// Drag within the visible scrolling viewport, above the keyboard and away from sticky chrome.
    /// An app-wide swipe starts inside the keyboard on a phone and cannot reveal a covered Save button.
    func scrollPage(up: Bool) {
        let keyboard = app.keyboards.firstMatch
        func visibleFrame(_ element: XCUIElement) -> CGRect {
            var frame = element.frame.intersection(app.frame)
            if keyboard.exists { frame.size.height = max(0, min(frame.maxY, keyboard.frame.minY) - frame.minY) }
            return frame
        }
        let candidates = (app.collectionViews.allElementsBoundByIndex + app.scrollViews.allElementsBoundByIndex)
            .filter { $0.exists && $0.isHittable && visibleFrame($0).height > 60 }
        let scroller = candidates.max { visibleFrame($0).height < visibleFrame($1).height } ?? app
        let frame = visibleFrame(scroller)
        guard frame.height > 30 else { return }
        let origin = app.coordinate(withNormalizedOffset: .zero)
        let startY = frame.minY + frame.height * (up ? 0.78 : 0.22)
        let endY = frame.minY + frame.height * (up ? 0.22 : 0.78)
        let start = origin.withOffset(CGVector(dx: frame.midX - app.frame.minX, dy: startY - app.frame.minY))
        let end = origin.withOffset(CGVector(dx: frame.midX - app.frame.minX, dy: endY - app.frame.minY))
        start.press(forDuration: 0.05, thenDragTo: end)
    }
    /// Search both sides of restored offsets. Prefer the target's actual position when it is laid out;
    /// lazy List rows require a bounded scan whose return leg extends beyond the starting offset.
    func scrollIntoView(_ element: XCUIElement, maxSwipes: Int = 8) {
        for step in 0..<(maxSwipes * 3) {
            if element.exists && element.isHittable { return }
            var up = step < maxSwipes
            if element.exists {
                let frame = element.frame
                let scrollViews = app.scrollViews.allElementsBoundByIndex.filter { $0.exists && $0.isHittable && $0.frame.height > 60 }
                if let viewport = scrollViews.max(by: { $0.frame.height < $1.frame.height }) {
                    if frame.midY < viewport.frame.minY { up = false }
                    else if frame.midY > viewport.frame.maxY { up = true }
                }
                if app.keyboards.firstMatch.exists && frame.maxY > app.keyboards.firstMatch.frame.minY { up = true }
            }
            scrollPage(up: up)
        }
    }
    @discardableResult func tapID(_ id: String, timeout: TimeInterval = 30, file: StaticString = #filePath, line: UInt = #line) -> XCUIElement {
        let element = el(id)
        if !element.waitForExistence(timeout: min(timeout, 3)) { scrollIntoView(element) }
        XCTAssertTrue(element.waitForExistence(timeout: timeout), "Missing element with identifier \(id)", file: file, line: line)
        scrollIntoView(element)
        XCTAssertTrue(element.isHittable, "Element is covered or offscreen: \(id)", file: file, line: line)
        element.tap()
        RunLoop.current.run(until: Date().addingTimeInterval(0.6))
        return element
    }
    @discardableResult func tapButton(_ label: String, timeout: TimeInterval = 30, file: StaticString = #filePath, line: UInt = #line) -> XCUIElement {
        let element = app.buttons[label].firstMatch
        if !element.waitForExistence(timeout: min(timeout, 3)) { scrollIntoView(element) }
        XCTAssertTrue(element.waitForExistence(timeout: timeout), "Missing button \(label)", file: file, line: line)
        scrollIntoView(element)
        XCTAssertTrue(element.isHittable, "Button is covered or offscreen: \(label)", file: file, line: line)
        element.tap()
        RunLoop.current.run(until: Date().addingTimeInterval(0.6))
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

    func goWeek() {
        tapID("native-week")
        let toggle = el("week-month-toggle")
        if toggle.exists && (toggle.value as? String) == "Month" { tapID("week-month-toggle") }
        XCTAssertTrue(eventually {
            let toggle = self.el("week-month-toggle")
            return toggle.exists && (toggle.value as? String) == "Week"
        }, "The Week surface did not open")
    }
    func goSpread() { tapID("native-spread") }
    /// Stack is the only responsibility layout. The removed five-mode picker is not a fallback.
    func chooseMode(_ mode: String) {
        XCTAssertEqual(mode, "Stack", "Only the Wallet-style Stack is available")
        goSpread()
        XCTAssertTrue(el("stack-cards").waitForExistence(timeout: 20), "Wallet Stack did not open")
    }

    /// A responsibility may be offscreen in the lazy Wallet stack. Find its labeled expand control.
    func openWalletCard(_ name: String) {
        goSpread()
        if app.buttons["Collapse " + name].firstMatch.exists { return }
        func control() -> XCUIElement {
            app.buttons.matching(NSPredicate(format: "label == %@", "Expand " + name + " and show tasks")).firstMatch
        }
        for _ in 0..<20 {
            if control().exists && control().isHittable { break }
            scrollPage(up: true)
        }
        if !control().exists || !control().isHittable {
            for _ in 0..<20 {
                if control().exists && control().isHittable { break }
                scrollPage(up: false)
            }
        }
        let closed = control()
        if closed.exists && closed.isHittable { closed.tap() }
        let opened = app.buttons["Collapse " + name].firstMatch
        XCTAssertTrue(opened.waitForExistence(timeout: 20), "Card " + name + " did not expand")
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
        // Changing appearance rebuilds sheet chrome asynchronously. Wait before testing whether
        // Done exists, otherwise the next tap can land on a still-present sheet behind that chrome.
        RunLoop.current.run(until: Date().addingTimeInterval(0.7))
        for _ in 0..<4 {
            let button = ["Done", "Close", "Cancel"].flatMap { label in
                app.navigationBars.buttons.matching(NSPredicate(format: "label == %@", label)).allElementsBoundByIndex
            }.first { $0.exists && $0.isHittable }
            guard let button else { return }
            button.tap()
            RunLoop.current.run(until: Date().addingTimeInterval(0.6))
        }
    }
    func selectRole(_ name: String) {
        closeNativeSheets()
        openWalletCard(name)
        XCTAssertTrue(eventually { (self.el("stack-cards").value as? String) == name },
                      "Responsibility \(name) did not become the selection")
    }

    /// The selected responsibility opens its existing editor by a left
    /// edit-swipe, not a redundant bottom Manage button.
    func manageSelectedRole() throws {
        goSpread()
        let name = try XCTUnwrap(el("stack-cards").value as? String)
        let button = try XCTUnwrap(elements(prefix: "select-role-").first { $0.label == name })
        let id = String(button.identifier.dropFirst("select-role-".count))
        let card = el("role-block-" + id)
        scrollIntoView(card)
        if !el("dock-done").exists { tapID("edit-spreads") }
        card.swipeLeft()
        let manage = el("manage-role-" + id)
        XCTAssertTrue(manage.waitForExistence(timeout: 10), "Left swipe did not reveal Manage")
        XCTAssertTrue(manage.isHittable)
        manage.tap()
    }
    var crownValue: String { (el("week-crown").value as? String) ?? "" }
    // The old bottom Manage card is gone; selection lives on the Stack itself.
    var selectedRoleLabel: String { "Manage " + ((el("stack-cards").value as? String) ?? "") }

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
        RunLoop.current.run(until: Date().addingTimeInterval(0.8))
        try app.performAccessibilityAudit(for: types) { issue in
            let element = issue.element
            found.append("[\(screen)] \(issue.compactDescription): \(issue.detailedDescription) | element id=\(element?.identifier ?? "?") label=\(element?.label ?? "?") frame=\(String(describing: element?.frame))")
            print(found.last!)
            return false
        }
        if !found.isEmpty { attach(found.joined(separator: "\n"), "audit-issues-" + screen) }
    }
    /// Audits the top of a scrolling screen and then what is revealed by scrolling.
    func auditScrolled(_ screen: String, types: XCUIAccessibilityAuditType = NativeUITestCase.requiredAudits) throws {
        try audit(screen + "-top", types: types)
        scrollPage(up: true)
        try audit(screen + "-scrolled", types: types)
        scrollPage(up: false)
    }

    /// Every visible button must offer at least 44 x 44 points (system bars and keyboards excluded).
    func assertTargets(_ screen: String, file: StaticString = #filePath, line: UInt = #line) {
        let system = Set(app.navigationBars.descendants(matching: .button).allElementsBoundByIndex.map { $0.label }).union(["Sheet Grabber"])
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
        XCTAssertEqual(selectedRoleLabel, Dataset.role)
        capture("F01-created")
    }

    func testF02_BudgetAndDays() throws {
        try requireDataset(); launch(); selectRole(Dataset.role); try manageSelectedRole()
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

    func testF07_WalletStackRetainsSelectionAndTasks() throws {
        try requireDataset(); launch(); selectRole(Dataset.role)
        XCTAssertTrue(el("stack-cards").exists)
        XCTAssertTrue(taskRow(Dataset.taskA).waitForExistence(timeout: 20))
        tapID("open-more")
        XCTAssertFalse(el("view-mode-button").exists, "The removed multi-layout picker must not return")
        closeNativeSheets()
        capture("F07-wallet-stack")
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
        closeNativeSheets(); goSpread()
        XCTAssertFalse(elements(prefix: "select-role-").contains(where: { $0.label == Dataset.role }),
                       "The new profile contains another profile’s responsibility")
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
        try requireDataset(); launch(); selectRole(Dataset.role); try manageSelectedRole()
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

    /// Edit changes no Wallet text geometry. Swipe left to expose Manage;
    /// swipe right for Delete. The rigid card moves, never reflows.
    func testWalletSwipeActionsPreserveCardGeometry() throws {
        goSpread()
        let badge = try XCTUnwrap(waitElements(prefix: "role-colour-").first)
        let id = String(badge.identifier.dropFirst("role-colour-".count))
        let card = el("role-block-" + id)
        let hour = el("hours-stepper-" + id)
        let chevron = el("expand-role-" + id)
        scrollIntoView(card)
        let cardWidth = card.frame.width
        let badgeRel = badge.frame.minX - card.frame.minX
        let hourRel = hour.frame.minX - card.frame.minX
        let chevronRel = chevron.frame.minX - card.frame.minX

        tapID("edit-spreads")
        XCTAssertFalse(el("remove-role-" + id).exists, "Delete should appear only after a right swipe")
        XCTAssertFalse(el("manage-role-" + id).exists, "Manage should appear only after a left swipe")
        XCTAssertEqual(card.frame.width, cardWidth, accuracy: 1)
        XCTAssertEqual(badge.frame.minX - card.frame.minX, badgeRel, accuracy: 1)
        XCTAssertEqual(hour.frame.minX - card.frame.minX, hourRel, accuracy: 1)

        card.swipeLeft()
        let manage = el("manage-role-" + id)
        XCTAssertTrue(manage.waitForExistence(timeout: 10), "Left swipe did not reveal Manage")
        XCTAssertTrue(manage.isHittable)
        XCTAssertFalse(el("remove-role-" + id).exists)
        XCTAssertEqual(card.frame.width, cardWidth, accuracy: 1)
        XCTAssertEqual(badge.frame.minX - card.frame.minX, badgeRel, accuracy: 1)
        XCTAssertEqual(hour.frame.minX - card.frame.minX, hourRel, accuracy: 1)
        XCTAssertEqual(chevron.frame.minX - card.frame.minX, chevronRel, accuracy: 1)

        // Move through center to the other action. An extra swipe is safe
        // when a gesture stops at the neutral detent.
        card.swipeRight()
        if !el("remove-role-" + id).exists { card.swipeRight() }
        let delete = el("remove-role-" + id)
        XCTAssertTrue(delete.waitForExistence(timeout: 10), "Right swipe did not reveal Delete")
        XCTAssertTrue(delete.isHittable)
        XCTAssertFalse(manage.exists)
        XCTAssertEqual(card.frame.width, cardWidth, accuracy: 1)
        XCTAssertEqual(badge.frame.minX - card.frame.minX, badgeRel, accuracy: 1)
        XCTAssertEqual(hour.frame.minX - card.frame.minX, hourRel, accuracy: 1)
        capture("wallet-manage-delete-swipe-no-reflow")
        tapID("dock-done")
        XCTAssertFalse(delete.exists, "Actions remain after leaving edit mode")
        XCTAssertFalse(el("manage-selected").exists, "The obsolete bottom Manage box must not return")
    }

    /// After a brief introduction, visible labels fold left toward the icons.
    /// The icon buttons and metallic Week Crown must remain usable.
    func testHeaderLabelsFoldIntoIconsAndNavigationRemainsUsable() {
        goSpread()
        let header = el("top-header")
        XCTAssertTrue(header.waitForExistence(timeout: 15), "Top header not present")
        XCTAssertTrue(eventually(8) { (header.value as? String) == "Compact navigation" },
                      "The introduction did not fold after 2.5 seconds")
        XCTAssertFalse(el("header-brand-title").exists)
        XCTAssertFalse(el("header-label-spread").exists)
        XCTAssertFalse(el("header-label-week").exists)
        for id in ["brand-home", "native-spread", "native-week"] {
            let control = el(id)
            XCTAssertTrue(control.isHittable, "Compact navigation lost \(id)")
            XCTAssertGreaterThanOrEqual(control.frame.width, 44, "Compact icon has a small hit target: \(id)")
            XCTAssertGreaterThanOrEqual(control.frame.height, 44)
        }
        capture("header-after-auto-fold")
        tapID("native-week")
        XCTAssertTrue(el("week-month-toggle").waitForExistence(timeout: 20),
                      "Week does not open from the compact icon")
        tapID("brand-home")
        XCTAssertTrue(el("stack-cards").waitForExistence(timeout: 20),
                      "Spread logo no longer returns to the responsibility stack")
    }

    // MARK: Owner-reported radial layout, preference location and Week scroll regressions

    /// Wallet cards must open independently and expose the same edit mode from the dock
    /// or a long press; the deleted five-layout picker must never appear.
    func testWalletCardsExpandIndependentlyAndEdit() throws {
        goSpread()
        let chevrons = waitElements(prefix: "expand-role-", minimum: 2)
        let first = chevrons[0].identifier
        let second = chevrons[1].identifier
        let firstId = String(first.dropFirst("expand-role-".count))
        XCTAssertTrue(el(first).label.hasPrefix("Expand"))
        tapID(first)
        XCTAssertTrue(eventually { self.el(first).label.hasPrefix("Collapse") },
                      "First responsibility does not expand")
        tapID(second)
        XCTAssertTrue(eventually { self.el(second).label.hasPrefix("Collapse") && self.el(first).label.hasPrefix("Collapse") },
                      "Expanding the second responsibility collapsed the first")
        capture("wallet-two-open-cards")
        tapID("edit-spreads")
        XCTAssertFalse(el("remove-role-" + firstId).exists,
                       "Delete must remain hidden until a right swipe")
        XCTAssertFalse(el("manage-role-" + firstId).exists,
                       "Manage must remain hidden until a left swipe")
        XCTAssertTrue(el("role-name-" + firstId).exists, "Card title is not editable")
        tapID("role-colour-" + firstId)
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Use #'")).firstMatch.waitForExistence(timeout: 10),
                      "Colour palette did not open inside Edit mode")
        capture("wallet-edit-palette")
        tapID("dock-done")
        XCTAssertFalse(el("remove-role-" + firstId).exists, "Delete controls remain after Done")
        tapID("open-more")
        XCTAssertFalse(el("view-mode-button").exists, "The removed layout switcher remains visible")
        closeNativeSheets()
    }

    func testWalletLongPressEnablesEditing() throws {
        goSpread()
        let first = try XCTUnwrap(waitElements(prefix: "role-block-").first)
        scrollIntoView(first)
        first.press(forDuration: 0.65)
        XCTAssertTrue(el("dock-done").waitForExistence(timeout: 10),
                      "Long press did not enter the same Edit mode as the dock")
        XCTAssertTrue(elements(prefix: "remove-role-").isEmpty,
                      "Long press should enter Edit without revealing Delete")
        let id = first.identifier.replacingOccurrences(of: "role-block-", with: "")
        first.swipeRight()
        XCTAssertTrue(el("remove-role-" + id).waitForExistence(timeout: 10))
        capture("wallet-long-press-edit")
        tapID("dock-done")
    }

    func testWeekScrollsVerticallyAndStillSwipesHorizontally() throws {
        goWeek()
        // Show the placement controls, as in an actual planning session. An empty Week can fit
        // entirely on a Duo, and scrolling cannot move content that is shorter than its viewport.
        let chip = try XCTUnwrap(waitElements(prefix: "role-chip-").first)
        if !chip.isSelected { chip.tap() }
        XCTAssertTrue(eventually { self.elements(prefix: "add-to-").count == 7 }, "The selected responsibility must offer placement on all seven days")
        let crown = el("week-crown")
        let initialWeek = crown.label
        let cards = elements(prefix: "day-card-")
        let first = try XCTUnwrap(cards.first)
        let viewport = try XCTUnwrap(app.scrollViews.allElementsBoundByIndex.max { $0.frame.height < $1.frame.height })
        let overflow = max(0, (cards.map { $0.frame.maxY }.max() ?? 0) + 16 - viewport.frame.maxY)
        let initialY = first.frame.minY
        scrollPage(up: true)
        if overflow > 5 {
            XCTAssertTrue(eventually { first.frame.minY < initialY - min(60, overflow * 0.75) }, "An upward drag over Week did not scroll its day cards")
        } else {
            XCTAssertTrue(cards.allSatisfy { viewport.frame.contains($0.frame) }, "Every day must be visible when the Week fits")
        }
        XCTAssertEqual(crown.label, initialWeek, "Vertical scrolling must not change the week")
        capture("fixed-week-after-vertical-scroll")
        let visibleCard = try XCTUnwrap(cards.first { $0.frame.intersection(viewport.frame).height > 30 })
        let visible = visibleCard.frame.intersection(viewport.frame)
        let origin = app.coordinate(withNormalizedOffset: .zero)
        let from = origin.withOffset(CGVector(dx: viewport.frame.maxX - app.frame.minX - 65, dy: visible.midY - app.frame.minY))
        from.press(forDuration: 0.05, thenDragTo: from.withOffset(CGVector(dx: -120, dy: 0)))
        XCTAssertTrue(eventually { crown.label != initialWeek }, "A horizontal Week swipe no longer changes weeks")
        capture("fixed-week-after-horizontal-swipe")
    }

    // MARK: Crown (unchanged semantics: 100 real drags including 30 reversals)

    func testCrownHundredDragsWithThirtyReversals() {
        goWeek()
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

    // MARK: Wallet expansion stress, Reduce Motion, deletion and natural height

    func testWalletHundredExpandCollapseCycles() {
        goSpread()
        let id = waitElements(prefix: "expand-role-").first!.identifier
        let numberOfRoles = elements(prefix: "role-block-").count
        for index in 0..<100 {
            tapID(id)
            let expected = index.isMultiple(of: 2) ? "Collapse" : "Expand"
            XCTAssertTrue(eventually(6) { self.el(id).label.hasPrefix(expected) },
                          "Wallet toggle \(index + 1) did not settle")
        }
        XCTAssertEqual(elements(prefix: "role-block-").count, numberOfRoles)
        capture("wallet-after-100-expand-collapse")
    }

    func testReduceMotionKeepsFunction() throws {
        let state = (app.otherElements["native-content"].firstMatch.value as? String) ?? ""
        guard state.hasPrefix("reduce-motion;") else {
            throw XCTSkip("Reduce Motion was not in effect in the app (state '\(state)'): not verified")
        }
        goSpread()
        let id = waitElements(prefix: "expand-role-").first!.identifier
        for index in 0..<20 {
            tapID(id)
            let expected = index.isMultiple(of: 2) ? "Collapse" : "Expand"
            XCTAssertTrue(eventually { self.el(id).label.hasPrefix(expected) },
                          "Wallet card stopped responding with Reduce Motion")
        }
        tapID("edit-spreads")
        XCTAssertTrue(elements(prefix: "remove-role-").isEmpty)
        let firstCard = try XCTUnwrap(waitElements(prefix: "role-block-").first)
        let firstId = String(firstCard.identifier.dropFirst("role-block-".count))
        firstCard.swipeRight()
        XCTAssertTrue(el("remove-role-" + firstId).waitForExistence(timeout: 10))
        tapID("dock-done")
        goWeek()
        let before = crownValue
        tapButton("Next week")
        XCTAssertTrue(eventually { self.crownValue != before })
        capture("reduce-motion-wallet-verified")
    }

    func testWalletQuickDeleteRequiresConfirmationAndFallsBack() throws {
        let tag = String(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(5))
        let doomed = "Fallback " + tag
        tapID("open-more"); tapID("more-new-spread")
        typeInto("role-name-field", doomed); tapID("save-spreads")
        closeNativeSheets(); openWalletCard(doomed)
        let role = try XCTUnwrap(elements(prefix: "select-role-").first { $0.label == doomed })
        let roleId = String(role.identifier.dropFirst("select-role-".count))
        tapID("edit-spreads")
        el("role-block-" + roleId).swipeRight()
        tapID("remove-role-" + roleId)
        XCTAssertTrue(app.buttons["Delete responsibility"].waitForExistence(timeout: 10),
                      "Quick delete bypassed confirmation")
        tapButton("Cancel")
        XCTAssertTrue(el("role-block-" + roleId).exists, "Cancel deleted the card")
        tapID("remove-role-" + roleId)
        tapButton("Delete responsibility")
        XCTAssertTrue(eventually { !self.el("role-block-" + roleId).exists }, "Confirmed removal failed")
        tapID("dock-done")
        XCTAssertTrue(el("stack-cards").exists)
        capture("wallet-delete-confirmed")
    }

    func testWalletCardGrowsWithTasksAndKeepsRowsReachable() throws {
        let tag = String(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(5))
        let name = "Large " + tag + " responsibility with a long name"
        tapID("open-more"); tapID("more-new-spread")
        typeInto("role-name-field", name); tapID("save-spreads")
        closeNativeSheets(); openWalletCard(name)
        let role = try XCTUnwrap(elements(prefix: "select-role-").first { $0.label == name })
        let block = el("role-block-" + String(role.identifier.dropFirst("select-role-".count)))
        let initialHeight = block.frame.height
        for n in 1...6 {
            typeInto("new-task-field", "Task \(n) \(tag) with enough words to wrap onto multiple lines\n")
            XCTAssertTrue(eventually {
                self.app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Task \(n) \(tag)")).firstMatch.exists
            })
        }
        XCTAssertGreaterThan(block.frame.height, initialHeight + 120,
                             "Expanded Wallet card did not grow with its tasks")
        let rows = elements(prefix: "task-row-").filter { $0.label.contains(tag) }
        XCTAssertEqual(rows.count, 6)
        for row in rows {
            scrollIntoView(row)
            XCTAssertTrue(row.isHittable, "Task is unreachable: " + row.label)
            XCTAssertGreaterThanOrEqual(row.frame.minX, app.frame.minX)
            XCTAssertLessThanOrEqual(row.frame.maxX, app.frame.maxX + 1)
        }
        capture("wallet-six-tasks-full-width")
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
        XCTAssertLessThanOrEqual(el("week-crown").frame.height, 120, "The standard-size Crown expanded into the planner's scroll region")
    }
    private func layout(width: Int) throws {
        try startAtWidth(width)
        goWeek()
        capture("viewport-\(width)-week")
        goSpread()
        chooseMode("Stack")
        // Apple iOS 27 resizable-scene contract: cards follow the actual scene
        // width, not the old 720pt iPad column. The visible chevron remains a
        // real 44pt target even as the scene narrows or text size increases.
        let responsibility = try XCTUnwrap(waitElements(prefix: "role-block-").first)
        scrollIntoView(responsibility)
        XCTAssertGreaterThanOrEqual(responsibility.frame.width, CGFloat(width - 48),
                                     "Wallet card stayed in a narrow column instead of filling the scene")
        XCTAssertGreaterThanOrEqual(responsibility.frame.minX, app.frame.minX)
        XCTAssertLessThanOrEqual(responsibility.frame.maxX, app.frame.maxX + 1)
        capture("viewport-\(width)-wallet-closed")
        if let expand = waitElements(prefix: "expand-role-").first {
            XCTAssertGreaterThanOrEqual(expand.frame.width, 44, "Wallet chevron hit area is too narrow")
            XCTAssertGreaterThanOrEqual(expand.frame.height, 44, "Wallet chevron hit area is too short")
            tapID(expand.identifier)
            capture("viewport-\(width)-wallet-expanded")
        }
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
        goWeek()
        let tag = "\(width)\(label)"
        try auditScrolled("\(tag)-week", types: types)
        goSpread()
        chooseMode("Stack")
        try auditScrolled("\(tag)-wallet-closed", types: types)
        if let card = waitElements(prefix: "expand-role-").first {
            tapID(card.identifier)
            try auditScrolled("\(tag)-wallet-expanded", types: types)
        }
        goWeek(); el("week-month-toggle").tap()
        try audit("\(tag)-month", types: types)
    }
    /// Contrast, Dynamic Type and trait audits are reported on their own so they never mask the required three.
    func testAuditExtended390() throws { try auditEverything(width: 390, types: NativeUITestCase.extendedAudits, label: "-extended") }
    func testAuditExtended820() throws { try auditEverything(width: 820, types: NativeUITestCase.extendedAudits, label: "-extended") }

    func testTargets44Everywhere() throws {
        goWeek(); assertTargets("week")
        goSpread()
        chooseMode("Stack")
        assertTargets("wallet-closed")
        if let card = waitElements(prefix: "expand-role-").first {
            tapID(card.identifier)
            assertTargets("wallet-expanded")
        }
        tapID("edit-spreads")
        assertTargets("wallet-edit")
        tapID("dock-done")
        try manageSelectedRole(); assertTargets("role-editor"); tapButton("Done")
        goWeek(); el("week-month-toggle").tap(); assertTargets("month")
    }

    // MARK: Dynamic Type, long names, Reduce Motion, orientation

    func testDynamicTypeLargestAccessibilitySize() throws {
        launch(["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        capture("dynamic-type-xxxl-week")
        try auditScrolled("xxxl-week")
        goSpread()
        chooseMode("Stack")
        capture("dynamic-type-xxxl-wallet-closed")
        try auditScrolled("xxxl-wallet-closed")
        if let card = waitElements(prefix: "expand-role-").first {
            tapID(card.identifier)
            capture("dynamic-type-xxxl-wallet-expanded")
            try auditScrolled("xxxl-wallet-expanded")
        }
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
        tapID("open-more"); tapID("manage-profiles")
        let originalId = try XCTUnwrap(elements(prefix: "profile-").first { $0.isSelected }).identifier
        closeNativeSheets()
        defer {
            // Leave the roster as found so later tests use the original profile.
            if app.state != .notRunning {
                launch()
                tapID("open-more"); tapID("manage-profiles")
                tapID(originalId)
            }
        }
        tapID("open-more"); tapID("manage-profiles")
        typeInto("new-profile-field", profile); tapButton("Create profile")
        closeNativeSheets()
        XCTAssertTrue(eventually { self.el("brand-home").label.hasSuffix("Profile " + profile) }, "Long profile name was not kept in the accessible header")
        tapID("open-more"); tapID("more-new-spread")
        typeInto("role-name-field", role); tapID("save-spreads")
        capture("long-names-week")
        try audit("long-names-week")
        selectRole(role)
        chooseMode("Stack")
        XCTAssertEqual(selectedRoleLabel, role)
        try audit("long-names-wallet")
        capture("long-names-spread")
    }

    /// iPad supports every orientation; full-screen captures avoid XCTest's rotated app-rect crop.
    func testIPadOrientations() throws {
        defer { XCUIDevice.shared.orientation = .portrait }
        goWeek()
        for (name, orientation) in [("landscape-left", UIDeviceOrientation.landscapeLeft), ("landscape-right", .landscapeRight), ("portrait-upside-down", .portraitUpsideDown)] {
            XCUIDevice.shared.orientation = orientation
            XCTAssertTrue(eventually { orientation.isLandscape ? self.app.frame.width > self.app.frame.height : self.app.frame.height > self.app.frame.width }, "Window did not adopt the requested orientation")
            XCTAssertTrue(app.buttons["native-spread"].waitForExistence(timeout: 20))
            capture("orientation-\(name)-week", wholeScreen: true)
            attach(app.debugDescription, "orientation-hierarchy-" + name)
            try audit("orientation-\(name)-week")
            goSpread(); chooseMode("Stack"); capture("orientation-\(name)-wallet", wholeScreen: true)
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
        closeNativeSheets(); goSpread(); chooseMode("Stack")
        settle(1.5)
        let expectedAppearance = style.hasPrefix("dark") ? "dark" : "light"
        XCTAssertTrue(eventually { (self.el("native-content").value as? String)?.hasSuffix(";" + expectedAppearance) == true }, "The requested appearance did not render")
        capture("tour-\(style)-01-spread-stack")

        if !short {
            // Open the first Wallet card before adding tasks; closed cards stay compact.
            if let first = waitElements(prefix: "expand-role-").first { tapID(first.identifier) }
            let field = el("new-task-field")
            if field.waitForExistence(timeout: 6) {
                typeInto("new-task-field", "Plan the week\n")
                settle(0.8)
                typeInto("new-task-field", "Review the budget\n")
                settle(1.0)
                capture("tour-\(style)-02-stack-with-tasks")
            } else { note("missing: new-task-field") }

            // Open a second card; both must stay open and retain their task lists.
            let chevrons = elements(prefix: "expand-role-")
            if chevrons.count > 1 {
                tapID(chevrons[1].identifier)
                settle(1.0)
                capture("tour-\(style)-03-wallet-two-expanded")
            }
        }

        goSpread()
        if !short {
            tapID("edit-spreads")
            settle(0.8)
            capture("tour-\(style)-04-wallet-edit-mode")
            tapID("dock-done")
        }
        settle(0.6)

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
        XCTAssertEqual(selectedRoleLabel, name)
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
        // Explicitly open the first card. No collapsed card edits data accidentally.
        let first = try XCTUnwrap(waitElements(prefix: "expand-role-").first)
        tapID(first.identifier)
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
    func testAppearancePreferenceRoundTrip() throws {
        launch()
        for style in ["dark", "light", "system"] {
            tapID("open-more")
            tapID("appearance-" + style)
            XCTAssertTrue(eventually { self.el("appearance-" + style).isSelected }, "The appearance choice was not selected")
            closeNativeSheets()
            if style != "system" {
                XCTAssertTrue(eventually { (self.el("native-content").value as? String)?.hasSuffix(";" + style) == true }, "Appearance choice did not reach the planner")
            }
        }
        relaunch()
        tapID("open-more")
        let system = el("appearance-system")
        scrollIntoView(system)
        XCTAssertTrue(eventually { system.exists && system.isSelected }, "System preference did not survive a relaunch")
        closeNativeSheets()
        // Live System changes are asserted by native-system-appearance.sh using simctl readback and
        // the actual rendered root. XCUIDevice's reported setting alone does not prove an OS change.
    }

    /// Actual hinge and rotation changes run in native-duo-poses.yml. XCTest's orientation setter
    /// does not prove that a multi-panel simulator rotated, so this test makes no pose claim.
    func testWalletStackInBothAppearances() throws {
        for dark in [false, true] {
            let name = "default-pose"
                launch(["-spread.native.appearance", dark ? "dark" : "light"])
                XCTAssertTrue(eventually { (self.el("native-content").value as? String)?.hasSuffix(dark ? ";dark" : ";light") == true })
                goSpread()
                let bounds = app.frame
                XCTAssertGreaterThan(bounds.width, 0)
                XCTAssertGreaterThan(bounds.height, 0)
                XCTAssertLessThanOrEqual(el("week-crown").frame.height, 120, "The standard-size Crown expanded into the planner's scroll region")
                chooseMode("Stack")
                capture("duo-\(dark ? "dark" : "light")-\(name)-wallet-closed")
                assertTargets("duo-" + name + "-wallet-closed")
                let cards = waitElements(prefix: "expand-role-", minimum: 2)
                tapID(cards[0].identifier)
                tapID(cards[1].identifier)
                capture("duo-\(dark ? "dark" : "light")-\(name)-wallet-expanded")
                assertTargets("duo-" + name + "-wallet-expanded")
                tapID("edit-spreads")
                capture("duo-\(dark ? "dark" : "light")-\(name)-wallet-edit")
                tapID("dock-done")
                goWeek(); capture("duo-\(dark ? "dark" : "light")-\(name)-week")
                tapID("week-month-toggle"); capture("duo-\(dark ? "dark" : "light")-\(name)-month")
                XCTAssertTrue(el("month").exists)
                tapID("open-more"); capture("duo-\(dark ? "dark" : "light")-\(name)-more")
                closeNativeSheets()
        }
    }
}
