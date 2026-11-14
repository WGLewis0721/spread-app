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

/// Life's haptic policy (owner decision OD31). Every cue is iPhone only, and `SpreadHaptics` checks
/// the iPhone idiom and the in-app setting. UIKit also silences these when System Haptics is off.
/// - Discrete ticks on steppers, week steps and destination changes (`selection`).
/// - Entering and leaving Edit (`edit`) and the snap to a reveal (`reveal`).
/// - One rate-limited warning at a boundary, or before a destructive confirm (`boundary`).
/// - No success cue. Completing a task is the only success haptic (OD2), and the planner fires it
///   through `completionHaptic`. Removing or deleting a Life area relies on the visible change and Undo.
@MainActor enum LifeFeedback {
    static var enabled: Bool {
        UserDefaults.standard.object(forKey: "native.life.touchFeedback") as? Bool ?? true
    }
    static func prepare() { if enabled { SpreadHaptics.prepare() } }
    static func selection() { if enabled { SpreadHaptics.selection() } }
    static func edit(_ active: Bool) { if enabled { SpreadHaptics.editMode(entering: active) } }
    static func boundary() { if enabled { SpreadHaptics.destructivePrompt() } }
    static func reveal(delete: Bool) {
        if enabled { SpreadHaptics.revealed(destructive: delete) }
    }
}
#endif
