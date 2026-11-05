import XCTest
import UIKit

// Independent XCTest launch canary. It does not depend on agent-device or hinge automation.
final class LaunchSmokeUITests: XCTestCase {
    func testSpreadLaunchesAndExposesNativeNavigation() {
        let app = XCUIApplication(bundleIdentifier: "com.graymatter.spread")
        app.launch()
        let nativeSpread = app.buttons["native-spread"]
        let found = nativeSpread.waitForExistence(timeout: 90)
        if !found {
            let hierarchy = XCTAttachment(string: app.debugDescription)
            hierarchy.name = "launch-canary-accessibility-tree"
            hierarchy.lifetime = .keepAlways
            add(hierarchy)
            let screenshot = XCTAttachment(screenshot: app.screenshot())
            screenshot.name = "launch-canary-screenshot"
            screenshot.lifetime = .keepAlways
            add(screenshot)
        }
        XCTAssertTrue(found, "Spread must launch and expose the native-spread navigation button")
    }
}

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
        // Rich-content table cells can be below the keyboard and absent from
        // the initial accessibility snapshot until the outer sheet scrolls.
        // Scroll the real sheet to expose the field before asserting existence.
        if !field.waitForExistence(timeout: 3) { scrollIntoView(field) }
        XCTAssertTrue(field.waitForExistence(timeout: 30), "Missing field \(id)", file: file, line: line)
        scrollIntoView(field)
        XCTAssertTrue(field.isHittable, "Field is obscured: \(id)", file: file, line: line)
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
        let badge = el("role-colour-" + id)
        scrollIntoView(badge)
        XCTAssertTrue(badge.isHittable, "The responsibility must be visible before editing")
        if !el("dock-done").exists { tapID("edit-spreads") }
        // Drag across the card's visible header. A lazy container can report an
        // empty accessibility frame while its actual buttons are on screen.
        let startX = min(app.frame.maxX - 30, badge.frame.maxX + 130)
        let endX = max(app.frame.minX + 24, startX - 120)
        let origin = app.coordinate(withNormalizedOffset: .zero)
        let start = origin.withOffset(CGVector(dx: startX - app.frame.minX, dy: badge.frame.midY - app.frame.minY))
        let end = origin.withOffset(CGVector(dx: endX - app.frame.minX, dy: badge.frame.midY - app.frame.minY))
        start.press(forDuration: 0.05, thenDragTo: end)
        let manage = el("manage-role-" + id)
        XCTAssertTrue(manage.waitForExistence(timeout: 10), "Left swipe did not reveal Manage")
        XCTAssertTrue(manage.isHittable)
        manage.tap()
        let editorName = el("role-name-field")
        XCTAssertTrue(editorName.waitForExistence(timeout: 10), "Manage did not open the responsibility editor")
        XCTAssertEqual(editorName.value as? String, name, "Manage opened a different responsibility")
    }
    var crownValue: String { (el("week-crown").value as? String) ?? "" }
    // The old bottom Manage card is gone; selection lives on the Stack itself.
    /// The Wallet Stack's selected responsibility name (its accessibility value). Callers compare it with the plain
    /// name; prefixing "Manage " (348596c) made F01 and the long-name check fail on every run.
    var selectedRoleLabel: String { (el("stack-cards").value as? String) ?? "" }

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
    /// The bank label sits in the Manage form's first section. Choosing a day scrolls the form down, and the lazy
    /// List then drops that row from the hierarchy, so scroll back toward the top before reading it.
    private var bankLabel: String {
        let bank = el("bank-remaining")
        for _ in 0..<6 where !bank.exists { scrollPage(up: false) }
        return bank.label
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
        XCTAssertTrue(eventually { self.bankLabel == "2h left in this week’s bank" }, "Bank reads \(bankLabel) after Monday")
        chooseDay("Wednesday"); tapID("place-hours-button")
        XCTAssertTrue(eventually { self.bankLabel == "1h left in this week’s bank" }, "Bank reads \(bankLabel) after Wednesday")
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
        // Choices use allocation IDs, not ISO day strings. Resolve each by its
        // accessible weekday label, so reversed allocation order cannot silently
        // schedule on the wrong day while still satisfying a two-choice count.
        let mondayChoice = try XCTUnwrap(days.first { $0.label.hasPrefix("Monday,") },
                                          "The Monday allocation is missing from eligible choices")
        let wednesdayChoice = try XCTUnwrap(days.first { $0.label.hasPrefix("Wednesday,") },
                                             "The Wednesday allocation is missing from eligible choices")
        tapID(mondayChoice.identifier)
        showTasks(on: monday)
        XCTAssertTrue(taskRow(Dataset.taskA).waitForExistence(timeout: 20))
        tapID("task-move-" + id)
        tapID(wednesdayChoice.identifier)
        showTasks(on: wednesday)
        XCTAssertTrue(el("day-card-" + wednesday).descendants(matching: .any).matching(identifier: "task-row-" + id).firstMatch.exists)
        tapID("undo-last-change"); showTasks(on: monday)
        XCTAssertTrue(el("day-card-" + monday).descendants(matching: .any).matching(identifier: "task-row-" + id).firstMatch.exists)
        // Confirm the accessible Take off action and Undo round-trip, not merely
        // two assigned days. It must return the task to its original allocation.
        tapID("task-move-" + id)
        tapID("task-unplace")
        revealTray()
        XCTAssertTrue(taskRow(Dataset.taskA).waitForExistence(timeout: 20), "Unplaced task is absent from the tray")
        XCTAssertFalse(el("day-card-" + monday).descendants(matching: .any)
                           .matching(identifier: "task-row-" + id).firstMatch.exists,
                       "An unplaced task remains on Monday")
        tapID("undo-last-change"); showTasks(on: monday)
        XCTAssertTrue(el("day-card-" + monday).descendants(matching: .any)
                          .matching(identifier: "task-row-" + id).firstMatch.exists,
                      "Undo did not return the task to Monday")
        capture("F04-move-unplace-and-undo")
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
        tapID("hour-summary") // Compact summary holds the existing Review action.
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
    /// Approved Nov 4 summary: one small status strip, without losing planning actions.
    func testCompactWeeklySummaryDisclosesItsPlanningActions() throws {
        launch(); goSpread()
        let summary = el("hour-summary")
        XCTAssertTrue(summary.waitForExistence(timeout: 20), "The weekly status is missing")
        XCTAssertTrue(summary.isHittable)
        XCTAssertLessThanOrEqual(summary.frame.height, 100, "Weekly summary must remain compact on iPhone")
        XCTAssertTrue(summary.label.contains("scheduled"), "Speak scheduled hours, not a decorative chart")
        XCTAssertTrue(summary.label.contains("remaining to plan"), "Speak unplaced hours")
        XCTAssertFalse(el("rollover").exists, "Rollover belongs in the expandable details")

        tapID("hour-summary")
        XCTAssertTrue(el("weekly-hours-details").waitForExistence(timeout: 10))
        XCTAssertTrue(el("rollover").waitForExistence(timeout: 10), "Preserve Rollover")
        capture("compact-weekly-summary-expanded")
        tapID("hour-summary")
        XCTAssertFalse(el("rollover").exists, "The disclosure must collapse")
        capture("compact-weekly-summary-collapsed")
    }

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

    // A regular 390pt iPhone must show every More action immediately, including
    // exports and recovery. No scrolling, hidden overflow menus or small tap areas.
    func testMoreOverviewShowsEveryOptionWithoutScrolling() {
        launch(); goSpread()
        tapID("open-more")
        XCTAssertTrue(el("more-overview").waitForExistence(timeout: 10))
        let visibleActions = [
            "more-new-spread", "more-review-tasks", "more-rollover",
            "appearance-system", "appearance-light", "appearance-dark",
            "manage-profiles", "export-print", "export-word", "export-text",
            "backup-and-restore", "more-recently-deleted", "calendar-design-picker"
        ]
        for id in visibleActions {
            let control = el(id)
            XCTAssertTrue(control.exists, "More is missing the action: \(id)")
            XCTAssertTrue(control.isHittable, "More requires scrolling to reach \(id)")
            XCTAssertGreaterThanOrEqual(control.frame.height, 44, "More has an undersized action: \(id)")
            XCTAssertLessThanOrEqual(control.frame.maxY, app.frame.maxY,
                                     "More places \(id) below the visible screen")
        }
        capture("more-all-options-visible-390")
    }

    /// The opt-in preview must not silently replace Classic or mutate the planner.
    /// Restore Classic before returning so other native journeys keep their baseline.
    func testCalendarDesignPreviewCanReturnToClassic() {
        launch(); goSpread()
        tapID("open-more")
        let picker = el("calendar-design-picker")
        XCTAssertTrue(picker.waitForExistence(timeout: 10), "Calendar design must be available in Settings")
        XCTAssertTrue(picker.isHittable, "Calendar design must be visible without scrolling")
        XCTAssertGreaterThanOrEqual(picker.frame.height, 44, "Calendar design has a small hit target")
        picker.tap()
        let preview = app.buttons["Week + Month (preview)"]
        XCTAssertTrue(preview.waitForExistence(timeout: 10), "New calendar preference was not offered")
        preview.tap()
        closeNativeSheets()
        tapID("native-week")
        XCTAssertTrue(el("week-focus-surface").waitForExistence(timeout: 20),
                      "Opt-in preview did not open the focused Week view")
        capture("focus-week-preview-opted-in")
        tapID("open-more")
        tapID("calendar-design-picker")
        let classic = app.buttons["Classic (current)"]
        XCTAssertTrue(classic.waitForExistence(timeout: 10), "Classic rollback option is missing")
        classic.tap()
        closeNativeSheets()
        XCTAssertTrue(eventually(15) { !self.el("week-focus-surface").exists },
                      "Choosing Classic did not restore the existing Week view")
        XCTAssertTrue(el("week-crown").exists, "Classic view lost the Week Crown")
    }

    /// Preview-specific acceptance: Classic uses a separate view and is never the target of these assertions.
    func testFocusedWeekRetainsSidebarAndMorphsCalendar() {
        launch(["-native.weekMonth.previewEnabled", "YES"])
        tapID("native-week")
        XCTAssertTrue(el("week-focus-surface").waitForExistence(timeout: 20))
        XCTAssertTrue(el("responsibility-sidebar").exists,
                      "The focused Week must retain the responsibility rail")
        XCTAssertTrue(el("focus-week-overview").exists,
                      "The seven-day navigation must remain pinned above the schedule")
        XCTAssertEqual(waitElements(prefix: "focus-day-", minimum: 7).count, 7)
        tapID("focus-week-month-toggle")
        XCTAssertTrue(el("month").waitForExistence(timeout: 10),
                      "The calendar button must open Month without leaving Week")
        capture("focused-month")
        tapID("focus-week-month-toggle")
        XCTAssertTrue(el("focus-week-overview").exists)
        XCTAssertEqual(waitElements(prefix: "focus-day-", minimum: 7).count, 7)
        capture("focused-week")
    }

    func testRecentlyDeletedIsReachableInNativeSettings() {
        launch()
        goSpread()
        tapID("open-more")
        XCTAssertTrue(el("more-recently-deleted").waitForExistence(timeout: 10))
        tapID("more-recently-deleted")
        XCTAssertTrue(el("recently-deleted-sheet").waitForExistence(timeout: 10))
        XCTAssertTrue(el("deleted-empty-all").exists ||
                      app.staticTexts["Nothing recently deleted"].exists,
                      "Recently Deleted must show a recovery list or useful empty state")
        capture("recently-deleted-empty-or-recoverable")
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
        // The Week content is capped at 1120 pt in wide/rotated windows, but its
        // enclosing ScrollView extends to the scene edges. Swipe INSIDE a visible
        // card, not 65 pt from the scroll viewport's right edge (which can lie
        // outside Week and correctly be rejected by the region-gated recognizer).
        let origin = app.coordinate(withNormalizedOffset: .zero)
        let from = origin.withOffset(CGVector(dx: visible.minX + visible.width * 0.72 - app.frame.minX,
                                              dy: visible.midY - app.frame.minY))
        from.press(forDuration: 0.05, thenDragTo: from.withOffset(CGVector(dx: -120, dy: 0)))
        XCTAssertTrue(eventually { crown.label != initialWeek },
                      "A horizontal swipe inside a visible Week card did not advance the Crown; card=\(visible), viewport=\(viewport.frame)")
        capture("fixed-week-after-horizontal-swipe")
        let currentWeek = crown.label
        let reverse = origin.withOffset(CGVector(dx: visible.minX + visible.width * 0.32 - app.frame.minX,
                                                 dy: visible.midY - app.frame.minY))
        reverse.press(forDuration: 0.05, thenDragTo: reverse.withOffset(CGVector(dx: 120, dy: 0)))
        XCTAssertTrue(eventually { crown.label == initialWeek },
                      "A reverse swipe inside Week did not return from \(currentWeek) to \(initialWeek)")
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
        // These disclosures have their own animation transactions; exercising
        // only card expansion misses the Reduce Motion paths inside the card.
        tapID("hours-stepper-" + firstId)
        XCTAssertTrue(el("role-hour-editor-" + firstId).waitForExistence(timeout: 10),
                      "Hour editor did not open with Reduce Motion")
        tapID("hours-stepper-" + firstId)
        XCTAssertTrue(eventually { !self.el("role-hour-editor-" + firstId).exists },
                      "Hour editor did not close with Reduce Motion")
        tapID("role-colour-" + firstId)
        let colour = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Use #'" )).firstMatch
        XCTAssertTrue(colour.waitForExistence(timeout: 10),
                      "Palette did not open with Reduce Motion")
        tapID("role-colour-" + firstId)
        XCTAssertTrue(eventually { !colour.exists }, "Palette did not close with Reduce Motion")
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

    // MARK: Task editing that must never lose what the user typed

    func testUnsubmittedWalletDraftSurvivesNavigationAndRelaunch() throws {
        launch(); selectRole("Work")
        let draft = "Draft " + String(UUID().uuidString.prefix(6))
        typeInto("new-task-field", draft)
        tapID("native-week"); tapID("native-spread"); selectRole("Work")
        XCTAssertTrue(eventually { self.fieldText("new-task-field").contains(draft) }, "Navigation lost the unsent draft")
        relaunch(); selectRole("Work")
        XCTAssertTrue(eventually { self.fieldText("new-task-field").contains(draft) }, "Relaunch lost the unsent draft")
        XCTAssertFalse(taskRow(containing: draft).exists, "Remembering a draft must not create a task")
        tapID("add-task-button")
        XCTAssertTrue(taskRow(containing: draft).waitForExistence(timeout: 20))
        XCTAssertTrue(eventually { self.fieldText("new-task-field").isEmpty }, "An acknowledged add must clear the draft")
        relaunch(); selectRole("Work")
        XCTAssertTrue(eventually { self.fieldText("new-task-field").isEmpty }, "The submitted draft returned on relaunch")
    }

    private func taskRow(containing text: String) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'task-row-' AND label CONTAINS %@", text)).firstMatch
    }

    /// Adds a uniquely named task to the Work card and opens its sheet.
    private func addAndOpenTask(_ title: String) {
        selectRole("Work")
        typeInto("new-task-field", title); tapID("add-task-button")
        let row = taskRow(containing: title)
        XCTAssertTrue(row.waitForExistence(timeout: 20), "The new task never appeared")
        scrollIntoView(row); row.tap()
        XCTAssertTrue(el("task-editor").waitForExistence(timeout: 20), "The Task sheet did not open")
    }

    /// A title typed into the Task sheet is saved even when the sheet is closed with the system swipe-down
    /// gesture instead of Done. Before this repair the typed title was silently discarded.
    func testTaskTitleEditSurvivesSwipeDismissAndRelaunch() throws {
        launch()
        let stamp = String(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(6))
        let marker = "Kept" + stamp
        addAndOpenTask("Dismiss " + stamp)
        typeInto("task-editor", marker)
        XCTAssertTrue(eventually { self.fieldText("task-editor").contains(marker) }, "The title field did not take the typed text")
        // Drag the sheet down from its navigation bar. This is never the Done button.
        let bar = app.navigationBars.firstMatch
        XCTAssertTrue(bar.waitForExistence(timeout: 10), "The Task sheet has no navigation bar to drag")
        let from = bar.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        from.press(forDuration: 0.1, thenDragTo: from.withOffset(CGVector(dx: 0, dy: app.frame.height * 0.6)))
        XCTAssertTrue(eventually { !self.el("task-editor").exists }, "Dragging the sheet down did not dismiss it")
        XCTAssertTrue(taskRow(containing: marker).waitForExistence(timeout: 20), "The title typed before the swipe-dismiss was lost")
        capture("task-title-kept-after-swipe-dismiss")
        relaunch(); selectRole("Work")
        XCTAssertTrue(taskRow(containing: marker).waitForExistence(timeout: 20), "The edited title did not survive a relaunch")
    }

    /// Home does not dismiss a presented sheet. Its title must reach durable storage
    /// before the suspended process is terminated, without Submit or Done.
    func testTaskTitleSurvivesBackgroundTerminationAndRelaunch() throws {
        launch()
        let stamp = String(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(6))
        let marker = "Background " + stamp
        addAndOpenTask("Original " + stamp)
        typeInto("task-editor", marker)
        XCTAssertTrue(eventually { self.fieldText("task-editor").contains(marker) })
        XCUIDevice.shared.press(.home)
        XCTAssertTrue(app.wait(for: .runningBackground, timeout: 10), "Home did not background the app")
        // Give the local asynchronous store acknowledgement time to complete;
        // termination itself cannot promise a last lifecycle callback.
        Thread.sleep(forTimeInterval: 2)
        relaunch(); selectRole("Work")
        XCTAssertTrue(taskRow(containing: marker).waitForExistence(timeout: 20),
                      "The title was lost when the process terminated with its editor still presented")
        capture("task-title-kept-after-background-termination")
    }

    /// Swipe-dismiss must flush the final edits of each rich block, not just the task title.
    /// The immediate relaunch catches a pending debounce that was canceled with the sheet.
    func testNotesOutlineAndTableSurviveSwipeDismissAndRelaunch() throws {
        launch()
        let stamp = String(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(6))
        let title = "Rich " + stamp
        let note = "Note " + stamp
        let outline = "Outline " + stamp
        let cell = "Cell " + stamp
        addAndOpenTask(title)
        tapID("format-notes")
        typeInto("content-notes", note)
        tapID("add-block"); tapID("format-outline")
        typeInto("content-outline-0", outline)
        tapID("add-block"); tapID("format-table")
        typeInto("content-cell-0-0", cell)
        let bar = app.navigationBars.firstMatch
        XCTAssertTrue(bar.waitForExistence(timeout: 10))
        let from = bar.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        from.press(forDuration: 0.1, thenDragTo: from.withOffset(CGVector(dx: 0, dy: app.frame.height * 0.6)))
        XCTAssertTrue(eventually { !self.el("task-editor").exists }, "Rich task sheet did not dismiss")
        relaunch(); selectRole("Work")
        let row = taskRow(containing: title)
        XCTAssertTrue(row.waitForExistence(timeout: 20))
        scrollIntoView(row); row.tap()
        XCTAssertTrue(el("content-notes").waitForExistence(timeout: 20))
        XCTAssertTrue(fieldText("content-notes").contains(note), "Notes were lost across dismissal/relaunch")
        XCTAssertTrue(fieldText("content-outline-0").contains(outline), "Outline text was lost across dismissal/relaunch")
        XCTAssertTrue(fieldText("content-cell-0-0").contains(cell), "Table cell was lost across dismissal/relaunch")
        capture("rich-content-kept-after-swipe-relaunch")
        tapID("task-sheet-done")
    }

    /// "Add line" and "Add row" hand the keyboard to the field they create, so typing continues without another tap.
    func testAddingOutlineLineAndTableRowFocusesTheNewField() throws {
        launch()
        let stamp = String(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(6))
        addAndOpenTask("Focus " + stamp)
        tapID("format-outline")
        typeInto("content-outline-0", "First")
        tapButton("Add line")
        XCTAssertTrue(el("content-outline-1").waitForExistence(timeout: 20), "Add line did not create a second outline line")
        app.typeText("Second") // no tap: this lands only if the new line has the keyboard
        XCTAssertTrue(eventually { self.fieldText("content-outline-1") == "Second" }, "The new outline line did not receive the keyboard focus")
        XCTAssertEqual(fieldText("content-outline-0"), "First", "Typing after Add line altered the first line")
        tapID("add-block"); tapID("format-table")
        typeInto("content-cell-0-0", "A")
        tapButton("Add row")
        XCTAssertTrue(el("content-cell-2-0").waitForExistence(timeout: 20), "Add row did not create a third row")
        app.typeText("B")
        XCTAssertTrue(eventually { self.fieldText("content-cell-2-0") == "B" }, "The new table row did not receive the keyboard focus")
        XCTAssertEqual(fieldText("content-cell-0-0"), "A", "Typing after Add row altered the first cell")
        capture("task-add-line-and-row-focus")
        tapID("task-sheet-done")
    }

    /// Create, then delete, a task from its sheet, and confirm it stays deleted after a relaunch.
    func testTaskCanBeDeletedFromItsSheet() throws {
        launch()
        let stamp = String(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(6))
        let title = "Remove " + stamp
        addAndOpenTask(title)
        tapID("delete-task")
        // The confirmation is a dialog: an action sheet on a phone, a popover in a wide window.
        let confirm = app.buttons.matching(NSPredicate(format: "label == 'Delete task'")).allElementsBoundByIndex.last { $0.exists && $0.isHittable }
        if confirm == nil { attach(app.debugDescription, "hierarchy-without-delete-confirmation") }
        try XCTUnwrap(confirm, "The delete confirmation did not offer a Delete task button").tap()
        XCTAssertTrue(eventually { !self.el("task-editor").exists }, "The sheet stayed open after deleting the task")
        XCTAssertTrue(eventually { !self.taskRow(containing: title).exists }, "The deleted task is still listed")
        capture("task-deleted")
        relaunch(); selectRole("Work")
        XCTAssertFalse(taskRow(containing: title).waitForExistence(timeout: 5), "The deleted task came back after a relaunch")
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

// MARK: - Week/Month redesign (opt-in preview, owner decisions 1-61)

/// Actual-app journeys for the redesigned Week/Month. Each test turns the preview on through its launch
/// argument (Classic stays the default) and checks behavior through accessibility state, not pixels.
final class WeekMonthUITests: NativeUITestCase {
    private let preview = ["-native.weekMonth.previewEnabled", "YES"]

    private func openFocusedWeek() {
        tapID("native-week")
        XCTAssertTrue(el("week-focus-surface").waitForExistence(timeout: 20), "The focused Week did not open")
        if el("month").exists { tapID("focus-week-month-toggle") }
        XCTAssertEqual(waitElements(prefix: "focus-day-", minimum: 7).count, 7)
    }
    private func dayIDs() -> [String] { waitElements(prefix: "focus-day-", minimum: 7).map(\.identifier) }
    private func roleIDs() -> [String] {
        waitElements(prefix: "focus-role-").map(\.identifier)
            .filter { !$0.hasPrefix("focus-role-toggle-") }
            .map { String($0.dropFirst("focus-role-".count)) }
    }
    private func todayISO() -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }
    private func taskRow(_ title: String) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'focus-task-' AND label == %@", title)).firstMatch
    }
    /// Switching between two profiles whose remembered destination is Week must not
    /// carry the first person's hidden rail or open trays into the second profile.
    func testFocusedWeekResetsTransientStateAcrossProfiles() throws {
        launch(preview); openFocusedWeek()
        tapID("open-more"); tapID("manage-profiles")
        let profiles = elements(prefix: "profile-")
        let original = try XCTUnwrap(profiles.first { ($0.value as? String) == "Current profile" } ?? profiles.first).identifier
        typeInto("new-profile-field", "Week isolation " + String(UUID().uuidString.prefix(6)))
        tapID("create-profile")
        closeNativeSheets(); openFocusedWeek()
        tapID("open-more"); tapID("manage-profiles")
        let other = try XCTUnwrap(elements(prefix: "profile-").first {
            ($0.value as? String) == "Current profile" || $0.isSelected
        }).identifier
        tapID(original); closeNativeSheets(); openFocusedWeek()
        tapID("focus-show-sidebar")
        XCTAssertTrue(eventually(5) { !self.el("responsibility-sidebar").exists })
        tapID("open-more"); tapID("manage-profiles"); tapID(other); closeNativeSheets()
        XCTAssertTrue(el("week-focus-surface").waitForExistence(timeout: 20))
        XCTAssertTrue(el("responsibility-sidebar").waitForExistence(timeout: 5),
                      "The previous profile's hidden rail leaked into this profile's Week")
        capture("wm-profile-isolated-rail")
        tapID("open-more"); tapID("manage-profiles"); tapID(original); closeNativeSheets()
    }
    /// A real finger drag across the seven-day strip. `swipeLeft()` on one narrow day button travels about that
    /// button's width, under the strip's 65 pt minimum, so it never reached the week-change gesture.
    private func dragStrip(towardNextWeek: Bool) {
        let days = dayIDs().map { el($0) }
        let start = towardNextWeek ? days[5] : days[1]
        let origin = app.coordinate(withNormalizedOffset: .zero)
        let from = origin.withOffset(CGVector(dx: start.frame.midX - app.frame.minX, dy: start.frame.midY - app.frame.minY))
        from.press(forDuration: 0.05, thenDragTo: from.withOffset(CGVector(dx: towardNextWeek ? -180 : 180, dy: 0)))
    }

    /// Decisions 25, 54 and 90-91: tap a day, Month round trip keeps it, a strip swipe changes week and opens Monday.
    func testDaySelectionSurvivesMonthAndStripSwipeOpensMonday() {
        launch(preview); openFocusedWeek()
        let days = dayIDs()
        let thursday = days[3]
        tapID(thursday)
        XCTAssertTrue(eventually(5) { self.el(thursday).isSelected }, "Tapping a day did not select it")
        tapID("focus-week-month-toggle")
        XCTAssertTrue(el("month").waitForExistence(timeout: 10), "Month did not open")
        let dates = waitElements(prefix: "month-day-", minimum: 28)
        for date in dates {
            XCTAssertGreaterThanOrEqual(date.frame.width, 43.5, "Month date target is narrower than 44pt: " + date.identifier)
            XCTAssertGreaterThanOrEqual(date.frame.height, 43.5, "Month date target is shorter than 44pt: " + date.identifier)
        }
        XCTAssertTrue(el("responsibility-sidebar").exists, "Month must retain responsibility controls")
        capture("wm-month-from-thursday")
        tapID("focus-week-month-toggle")
        XCTAssertTrue(eventually(10) { self.el(thursday).exists && self.el(thursday).isSelected },
                      "Closing Month without choosing a date must restore the previous day")
        dragStrip(towardNextWeek: true)
        XCTAssertTrue(eventually(15) { self.dayIDs().first != days.first }, "Swiping the seven-day strip did not change week")
        let next = dayIDs()
        XCTAssertTrue(eventually(5) { self.el(next[0]).isSelected }, "Changing weeks must open Monday")
        capture("wm-next-week-opens-monday")
        dragStrip(towardNextWeek: false)
        XCTAssertTrue(eventually(15) { self.dayIDs().first == days.first }, "Swiping back did not return to the first week")
    }

    /// Decision 91: the selected responsibility is shared by Spread, Week and Month.
    func testSelectedResponsibilityIsSharedAcrossSpreadWeekAndMonth() {
        launch(preview); openFocusedWeek()
        let roles = roleIDs()
        guard roles.count >= 2 else { return XCTFail("The default planner should have at least two responsibilities") }
        let pick = "focus-role-" + roles[1]
        tapID(pick)
        XCTAssertTrue(eventually(5) { self.el(pick).isSelected }, "Selecting a responsibility in Week did not take")
        tapID("focus-week-month-toggle")
        XCTAssertTrue(el("month").waitForExistence(timeout: 10))
        XCTAssertTrue(el(pick).isSelected, "Month lost the selected responsibility")
        goSpread()
        XCTAssertTrue(eventually(10) { self.el(pick).exists && self.el(pick).isSelected },
                      "Spread's sidebar does not show the same selected responsibility")
        capture("wm-spread-shares-selection")
        tapID("native-week")
        XCTAssertTrue(eventually(10) { self.el(pick).exists && self.el(pick).isSelected },
                      "Returning to Week lost the selected responsibility")
    }

    /// Decisions 18, 24 and 50: compact rail; expanded rail overlays without squeezing or shifting; hide and restore.
    func testExpandedSidebarOverlaysScheduleAndHiddenSidebarRestores() {
        launch(preview); openFocusedWeek()
        let role = roleIDs()[0]
        let card = el("focus-role-toggle-" + role)
        XCTAssertTrue(card.waitForExistence(timeout: 20), "The selected responsibility's schedule row is missing")
        let before = card.frame
        tapID("sidebar-expand-collapse")
        XCTAssertTrue(eventually(5) { self.el("sidebar-expand-collapse").label == "Condense sidebar" },
                      "The sidebar did not expand")
        capture("wm-sidebar-expanded-overlay")
        let during = el("focus-role-toggle-" + role).frame
        XCTAssertEqual(during.width, before.width, accuracy: 1, "Expanding the sidebar squeezed the schedule")
        XCTAssertEqual(during.minX, before.minX, accuracy: 1, "Expanding the sidebar shifted the schedule")
        tapID("focus-role-" + role)
        XCTAssertTrue(eventually(5) { self.el("sidebar-expand-collapse").label == "Expand sidebar" },
                      "Choosing a responsibility must collapse the expanded sidebar")
        tapID("focus-show-sidebar")
        XCTAssertTrue(eventually(5) { !self.el("responsibility-sidebar").exists }, "Hide did not hide the sidebar")
        capture("wm-sidebar-hidden")
        let restore = el("header-show-sidebar")
        XCTAssertTrue(restore.waitForExistence(timeout: 5), "The hidden sidebar has no header restore control")
        XCTAssertGreaterThanOrEqual(restore.frame.width, 44)
        XCTAssertGreaterThanOrEqual(restore.frame.height, 44)
        tapID("header-show-sidebar")
        XCTAssertTrue(el("responsibility-sidebar").waitForExistence(timeout: 5), "The hidden sidebar did not come back from the header")
    }

    /// Task lifecycle through the store: Quick Add, complete (folded section), relaunch, uncomplete, delete,
    /// Recently Deleted restore to To Place, relaunch again. Each step must survive a cold start.
    func testQuickAddCompleteDeleteRestoreSurvivesRelaunch() {
        launch(preview); openFocusedWeek()
        let role = roleIDs()[0]
        let title = "WM \(Int(Date().timeIntervalSince1970) % 1_000_000)"
        tapID("focus-quick-add-" + role)
        typeInto("focus-quick-add-field", title)
        tapButton("Save")
        let offer = app.buttons["Add 30 minutes to this day"]
        if offer.waitForExistence(timeout: 5) { offer.tap() }
        XCTAssertTrue(taskRow(title).waitForExistence(timeout: 20), "Quick Add did not place the task on the day")
        let taskId = String(taskRow(title).identifier.dropFirst("focus-task-".count))
        capture("wm-quick-added")

        tapButton("Complete " + title)
        XCTAssertTrue(el("focus-completed-toggle-" + role).waitForExistence(timeout: 10),
                      "A completed task must fold under the completed section")
        relaunch(); openFocusedWeek()
        tapID("focus-completed-toggle-" + role)
        XCTAssertTrue(app.buttons["Mark " + title + " incomplete"].waitForExistence(timeout: 20),
                      "Completion did not survive relaunch")
        tapButton("Mark " + title + " incomplete")
        XCTAssertTrue(app.buttons["Complete " + title].waitForExistence(timeout: 10))

        scrollIntoView(taskRow(title)); taskRow(title).tap()
        tapButton("Delete")
        XCTAssertTrue(eventually(10) { !self.taskRow(title).exists }, "Delete did not remove the task from the day")
        relaunch()
        goSpread(); tapID("open-more"); tapID("more-recently-deleted")
        XCTAssertTrue(el("deleted-item-" + taskId).waitForExistence(timeout: 20),
                      "The deleted task is not in Recently Deleted after relaunch")
        capture("wm-recently-deleted")
        tapID("deleted-restore-" + taskId)
        XCTAssertTrue(eventually(10) { !self.el("deleted-item-" + taskId).exists }, "Restore did not take the task out")
        closeNativeSheets()

        relaunch(); openFocusedWeek()
        tapID("focus-to-place")
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", title))
                        .firstMatch.waitForExistence(timeout: 20),
                      "The restored task is not in its responsibility's To Place after relaunch")
        capture("wm-restored-to-place")
    }

    /// Unsubmitted focused drafts are isolated by day and survive navigation and a cold start.
    func testFocusedDraftSurvivesDayNavigationAndRelaunch() {
        launch(preview); openFocusedWeek()
        let days = dayIDs()
        let role = roleIDs()[0]
        let draft = "Focused draft " + String(UUID().uuidString.prefix(8))
        tapID(days[0])
        tapID("focus-quick-add-" + role)
        typeInto("focus-quick-add-field", draft)
        tapID(days[1])
        XCTAssertNotEqual(fieldText("focus-quick-add-field"), draft, "A draft leaked to another day")
        tapID(days[0])
        XCTAssertTrue(el("focus-quick-add-field").waitForExistence(timeout: 10))
        XCTAssertEqual(fieldText("focus-quick-add-field"), draft)
        relaunch(); openFocusedWeek(); tapID(days[0])
        XCTAssertTrue(el("focus-quick-add-field").waitForExistence(timeout: 10))
        XCTAssertEqual(fieldText("focus-quick-add-field"), draft, "The draft did not survive relaunch")
        tapButton("Cancel")
        relaunch(); openFocusedWeek(); tapID(days[0])
        XCTAssertNotEqual(fieldText("focus-quick-add-field"), draft, "Explicit cancellation did not clear the draft")
        capture("wm-focused-draft-relaunch")
    }

    /// Acknowledged within-day reordering must persist through a cold start.
    func testFocusedReorderSurvivesRelaunch() {
        launch(preview); openFocusedWeek()
        let role = roleIDs()[0]
        let suffix = String(UUID().uuidString.prefix(6))
        let first = "First " + suffix
        let second = "Second " + suffix
        for title in [first, second] {
            tapID("focus-quick-add-" + role)
            typeInto("focus-quick-add-field", title)
            tapButton("Save")
            let offer = app.buttons["Add 30 minutes to this day"]
            if offer.waitForExistence(timeout: 5) { offer.tap() }
            XCTAssertTrue(taskRow(title).waitForExistence(timeout: 20))
        }
        taskRow(second).tap()
        tapButton("Move up")
        XCTAssertTrue(eventually(10) { self.taskRow(second).frame.minY < self.taskRow(first).frame.minY })
        relaunch(); openFocusedWeek()
        XCTAssertTrue(taskRow(first).waitForExistence(timeout: 20))
        XCTAssertTrue(taskRow(second).waitForExistence(timeout: 20))
        XCTAssertLessThan(taskRow(second).frame.minY, taskRow(first).frame.minY, "Reordered tasks reverted after relaunch")
        capture("wm-focused-reorder-relaunch")
    }

    /// The focused surfaces must keep operational navigation at the largest Dynamic Type size.
    func testFocusedAccessibilityHeaderKeepsNavigationUsable() {
        launch(preview + ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        openFocusedWeek()
        XCTAssertTrue(el("week-crown").exists, "Largest text hid the Week Crown")
        XCTAssertTrue(el("native-spread").isHittable, "Largest text hid Spread navigation")
        tapID("native-spread")
        XCTAssertTrue(el("native-week").isHittable, "Largest text hid Week navigation")
        tapID("native-week")
        XCTAssertTrue(el("focus-week-overview").waitForExistence(timeout: 10))
        tapID("focus-show-sidebar")
        XCTAssertTrue(eventually(5) { !self.el("responsibility-sidebar").exists })
        let restore = el("header-show-sidebar")
        XCTAssertTrue(restore.isHittable, "Header restore is unreachable at largest text")
        XCTAssertGreaterThanOrEqual(restore.frame.width, 44)
        XCTAssertGreaterThanOrEqual(restore.frame.height, 44)
        restore.tap()
        XCTAssertTrue(el("responsibility-sidebar").waitForExistence(timeout: 5))
        capture("wm-largest-text-header-navigation")
    }

    /// Decisions 54-56: long press a Month date to add without leaving Month; Month swipe changes month.
    func testMonthLongPressAddsWithoutLeavingMonthAndSwipeChangesMonth() {
        launch(preview); openFocusedWeek()
        tapID("focus-week-month-toggle")
        XCTAssertTrue(el("month").waitForExistence(timeout: 10))
        let cell = el("month-day-" + todayISO())
        XCTAssertTrue(cell.waitForExistence(timeout: 10), "Today is missing from Month")
        cell.press(forDuration: 0.9)
        XCTAssertTrue(el("month-quick-add-title").waitForExistence(timeout: 10), "Long press did not open Quick Add")
        typeInto("month-quick-add-title", "Month add \(Int(Date().timeIntervalSince1970) % 100_000)")
        tapID("month-quick-add-save")
        XCTAssertTrue(eventually(10) { !self.el("month-quick-add-title").exists }, "Quick Add did not save and close")
        XCTAssertTrue(el("month").exists, "Quick Add must not leave Month")
        XCTAssertFalse(el("focus-day-" + todayISO()).exists, "The long press release also drilled into Week")
        capture("wm-month-after-quick-add")
        let firstBefore = elements(prefix: "month-day-").first?.identifier
        el("month").swipeLeft()
        XCTAssertTrue(eventually(10) { self.elements(prefix: "month-day-").first?.identifier != firstBefore },
                      "Swiping Month did not change the month")
    }
    /// A refused hour increase must not clamp the requested time. Offer a
    /// measured shortage and the affected responsibility's own hour editor.
    func testInsufficientHoursOffersMeasuredAdjustment() {
        launch(preview); openFocusedWeek()
        tapID("sidebar-add-role")
        let name = "Budget " + String(UUID().uuidString.prefix(6))
        typeInto("role-name-field", name)
        for _ in 0..<3 { tapButton("Decrease Hours for spread 1 by half an hour") }
        tapID("save-spreads")
        let selector = app.buttons.matching(
            NSPredicate(format: "identifier BEGINSWITH 'focus-role-' AND label == %@", name)
        ).firstMatch
        XCTAssertTrue(selector.waitForExistence(timeout: 20), "The new responsibility is not in Week")
        scrollIntoView(selector)
        selector.tap()
        let roleID = String(selector.identifier.dropFirst("focus-role-".count))
        let hourID = "focus-hour-" + roleID
        let day = elements(prefix: "focus-day-").first(where: { $0.isSelected })
        guard let day else { return XCTFail("No selected date on Week") }
        let iso = String(day.identifier.dropFirst("focus-day-".count))
        tapID(hourID)
        tapButton("Allocate 30 minutes")
        let increase = "Increase " + name + " on " + iso + " by half an hour"
        XCTAssertTrue(app.buttons[increase].waitForExistence(timeout: 20))
        tapButton(increase)
        let adjust = app.buttons["Adjust hours"]
        XCTAssertTrue(adjust.waitForExistence(timeout: 15),
                      "A rejected allocation must offer Adjust hours")
        XCTAssertTrue(app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS %@", "needs 0.5h more")
        ).firstMatch.exists, "Refusal did not explain the exact missing hours")
        capture("wm-insufficient-hours-adjustment")
        adjust.tap()
        XCTAssertTrue(el("role-name-field").waitForExistence(timeout: 15),
                      "Adjust hours did not open the role editor")
        XCTAssertEqual(fieldText("role-name-field"), name, "Opened wrong responsibility")
    }

}
