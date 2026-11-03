// Type-check stubs mirroring the XCUITest / UIKit signatures the UI tests use. Not shipped.
import Foundation
import XCTest

public enum UIDeviceOrientation { case portrait, portraitUpsideDown, landscapeLeft, landscapeRight }
public enum UIUserInterfaceIdiom { case phone, pad }
public final class UIDevice { public static let current = UIDevice(); public var userInterfaceIdiom: UIUserInterfaceIdiom { .phone } }
public final class XCUIDevice { public static let shared = XCUIDevice(); public var orientation: UIDeviceOrientation = .portrait }

public final class XCUIScreenshot {}
public struct CGVector { public var dx: CGFloat; public var dy: CGFloat; public init(dx: CGFloat, dy: CGFloat) { self.dx = dx; self.dy = dy } }
public final class XCTAttachment {
    public enum Lifetime { case keepAlways, deleteOnSuccess }
    public var name: String? = nil
    public var lifetime: Lifetime = .deleteOnSuccess
    public init(string: String) {}
    public init(screenshot: XCUIScreenshot) {}
}
extension XCTestCase { public func add(_ attachment: XCTAttachment) {} }

public struct XCUIAccessibilityAuditType: OptionSet {
    public let rawValue: UInt
    public init(rawValue: UInt) { self.rawValue = rawValue }
    public static let contrast = XCUIAccessibilityAuditType(rawValue: 1)
    public static let dynamicType = XCUIAccessibilityAuditType(rawValue: 2)
    public static let hitRegion = XCUIAccessibilityAuditType(rawValue: 4)
    public static let sufficientElementDescription = XCUIAccessibilityAuditType(rawValue: 8)
    public static let textClipped = XCUIAccessibilityAuditType(rawValue: 16)
    public static let trait = XCUIAccessibilityAuditType(rawValue: 32)
    public static let all = XCUIAccessibilityAuditType(rawValue: 63)
}
public struct XCUIAccessibilityAuditIssue {
    public var auditType: XCUIAccessibilityAuditType { .all }
    public var compactDescription: String { "" }
    public var detailedDescription: String { "" }
    public var element: XCUIElement? { nil }
}

public struct XCUICoordinate {
    public func press(forDuration: TimeInterval, thenDragTo: XCUICoordinate) {}
    public func withOffset(_ v: CGVector) -> XCUICoordinate { self }
    public func tap() {}
}

open class XCUIElementQuery {
    public func matching(identifier: String) -> XCUIElementQuery { self }
    public func matching(_ predicate: NSPredicate) -> XCUIElementQuery { self }
    public func descendants(matching: XCUIElement.ElementType) -> XCUIElementQuery { self }
    public var firstMatch: XCUIElement { XCUIElement() }
    public var allElementsBoundByIndex: [XCUIElement] { [] }
    public var count: Int { 0 }
    public func element(boundBy: Int) -> XCUIElement { XCUIElement() }
    public var buttons: XCUIElementQuery { XCUIElementQuery() }
    public subscript(key: String) -> XCUIElement { XCUIElement() }
}

open class XCUIElement {
    public enum ElementType: UInt { case any, button }
    public var firstMatch: XCUIElement { self }
    public var exists: Bool { true }
    public var isHittable: Bool { true }
    public var label: String { "" }
    public var identifier: String { "" }
    public var value: Any? { nil }
    public var frame: CGRect { .zero }
    public var elementType: ElementType { .any }
    public var debugDescription: String { "" }
    public func tap() {}
    public func typeText(_ text: String) {}
    public func swipeUp() {}
    public func swipeDown() {}
    public func swipeLeft() {}
    public func swipeRight() {}
    public func waitForExistence(timeout: TimeInterval) -> Bool { true }
    public func coordinate(withNormalizedOffset: CGVector) -> XCUICoordinate { XCUICoordinate() }
    public func descendants(matching: ElementType) -> XCUIElementQuery { XCUIElementQuery() }
    public var buttons: XCUIElementQuery { XCUIElementQuery() }
    public var steppers: XCUIElementQuery { XCUIElementQuery() }
    public var menuItems: XCUIElementQuery { XCUIElementQuery() }
    public var staticTexts: XCUIElementQuery { XCUIElementQuery() }
    public var alerts: XCUIElementQuery { XCUIElementQuery() }
    public var sheets: XCUIElementQuery { XCUIElementQuery() }
    public var otherElements: XCUIElementQuery { XCUIElementQuery() }
    public var navigationBars: XCUIElementQuery { XCUIElementQuery() }
    public func screenshot() -> XCUIScreenshot { XCUIScreenshot() }
}
extension XCUIElementQuery { }
public enum AppState { case notRunning, runningForeground }
open class XCUIApplication: XCUIElement {
    public enum State { case notRunning, runningBackground, runningForeground }
    public init(bundleIdentifier: String) { super.init() }
    public var launchArguments: [String] = []
    public func launch() {}
    public func terminate() {}
    public var state: State { .notRunning }
    public func performAccessibilityAudit(for auditTypes: XCUIAccessibilityAuditType = .all, _ issueHandler: ((XCUIAccessibilityAuditIssue) -> Bool)? = nil) throws {}
}

public func StubPredicate(format: String, _ args: CVarArg...) -> NSPredicate { NSPredicate(block: { _, _ in true }) }
