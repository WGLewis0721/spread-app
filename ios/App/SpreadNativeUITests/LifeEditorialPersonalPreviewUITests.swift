import XCTest

/// Actual-app screenshot acceptance for the six approved editorial artworks.
/// Uses a read-only DEBUG fixture. It never seeds or modifies the planner store.
/// Targeted workflow: native-ui-dispatch, width 390 or 1024, tests
/// LifeEditorialPersonalPreviewUITests (1024pt viewport yields the 700pt card cap).
final class LifeEditorialPersonalPreviewUITests: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "com.graymatter.spread")

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func launch(category: String? = nil, editorial: Bool = true) {
        if app.state != .notRunning { app.terminate() }
        var args = [
            "-native.weekMonth.previewEnabled", "YES",
            "-native.life.editorialArt.enabled", editorial ? "YES" : "NO",
            "-SpreadPersonalPreviewFixture",
        ]
        if let category {
            args += ["-SpreadEditorialPreviewCategory", category]
        }
        app.launchArguments = args
        app.launch()
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "life-root").firstMatch
            .waitForExistence(timeout: 90), "The actual native Life view did not load")
    }

    private func card(for name: String) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", name + ",")).firstMatch
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

        // Use the real card tap, not a test-only selection override.
        face.tap()
        capture("editorial-\(category)-after-tap")

        // Focus must be real. Capturing after tap is not itself proof that it opened.
        guard (face.value as? String) == "Focused" else {
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
        XCTAssertFalse(personal.label.contains("weekly budget"),
                       "Gate-off must preserve the original golden card description")
        capture("editorial-gate-off-personal-golden")
    }
}
