#if os(iOS)
import SwiftUI
import UIKit

/// Life and Classic share one visual vocabulary; their arrangements remain independent.
enum LifePalette {
    static let canvas = Spread.canvas
    static let surface = Spread.elevated
    static let ink = Spread.ink
    static let secondary = Spread.secondary
    static let line = Spread.line
    static let fill = Spread.inset
    static let accent = Spread.accent
}

@MainActor enum LifeFeedback {
    static var enabled: Bool {
        UserDefaults.standard.object(forKey: "native.life.touchFeedback") as? Bool ?? true
    }
    static func selection() { if enabled { SpreadHaptics.selection() } }
    static func edit(_ active: Bool) { if enabled { SpreadHaptics.editMode(entering: active) } }
    static func accepted() { if enabled { SpreadHaptics.completed() } }
    static func boundary() { if enabled { SpreadHaptics.destructivePrompt() } }
    static func reveal(delete: Bool) {
        if enabled { SpreadHaptics.revealed(destructive: delete) }
    }
}
#endif
