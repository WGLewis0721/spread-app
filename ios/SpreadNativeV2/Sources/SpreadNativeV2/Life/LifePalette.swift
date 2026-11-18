#if os(iOS)
import SwiftUI
import UIKit

/// Neutral surfaces for native Life and Week. Global navigation keeps Spread blue.
enum LifePalette {
    static let canvas = adaptive(light: 0xF5F0E6, dark: 0x111418)
    static let surface = adaptive(light: 0xFFFCF6, dark: 0x24282B)
    static let fill = adaptive(light: 0xEEE9DF, dark: 0x1A1D20)
    static let ink = adaptive(light: 0x222421, dark: 0xF6F2EB)
    static let secondary = adaptive(light: 0x575850, dark: 0xC1BFB8,
                                    highLight: 0x222421, highDark: 0xF6F2EB)
    static let line = adaptive(light: 0x222421, dark: 0xF6F2EB, alpha: 0.16, highAlpha: 0.48)
    static let accent = Spread.accent

    private static func adaptive(light: UInt32, dark: UInt32, highLight: UInt32? = nil,
                                 highDark: UInt32? = nil, alpha: CGFloat = 1,
                                 highAlpha: CGFloat? = nil) -> Color {
        Color(uiColor: UIColor { traits in
            let isDark = traits.userInterfaceStyle == .dark
            let highContrast = traits.accessibilityContrast == .high
            let base = isDark ? dark : light
            let hex = highContrast ? ((isDark ? highDark : highLight) ?? base) : base
            return UIColor(
                red: CGFloat((hex >> 16) & 255) / 255,
                green: CGFloat((hex >> 8) & 255) / 255,
                blue: CGFloat(hex & 255) / 255,
                alpha: highContrast ? (highAlpha ?? alpha) : alpha
            )
        })
    }
}

extension View {
    func lifeSurface() -> some View {
        let shape = RoundedRectangle(cornerRadius: Spread.radiusCard, style: .continuous)
        return background(LifePalette.surface, in: shape)
            .overlay { shape.strokeBorder(LifePalette.line, lineWidth: 1).allowsHitTesting(false) }
    }
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
