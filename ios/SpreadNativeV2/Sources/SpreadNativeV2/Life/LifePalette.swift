#if os(iOS)
import SwiftUI
import UIKit

/// Approved Life surfaces only; Classic and More keep their existing tokens.
enum LifePalette {
    static let canvas = color(0xF2F2F7, 0x000000)
    static let surface = color(0xFFFFFF, 0x1C1C1E)
    static let ink = color(0x1D1D1F, 0xF5F5F7)
    static let secondary = Color(uiColor: UIColor { traits in
        traits.accessibilityContrast == .high ? .label : .secondaryLabel
    })
    static let line = Color(uiColor: .separator)
    static let fill = color(0xE9E9EF, 0x2C2C2E)
    static let accent = color(0x007AFF, 0x0A84FF)
    private static func color(_ light: UInt32, _ dark: UInt32) -> Color {
        Color(uiColor: UIColor { traits in
            let value = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(red: CGFloat((value >> 16) & 255) / 255,
                           green: CGFloat((value >> 8) & 255) / 255,
                           blue: CGFloat(value & 255) / 255, alpha: 1)
        })
    }
}

@MainActor enum LifeFeedback {
    static var enabled: Bool {
        UserDefaults.standard.object(forKey: "native.life.touchFeedback") as? Bool ?? true
    }
    static func selection() { if enabled { SpreadHaptics.selection() } }
    static func edit(_ active: Bool) { if enabled { SpreadHaptics.editMode(entering: active) } }
    static func accepted() { if enabled { UIImpactFeedbackGenerator(style: .light).impactOccurred() } }
    static func reveal(delete: Bool) {
        if enabled { UIImpactFeedbackGenerator(style: delete ? .medium : .light).impactOccurred() }
    }
}
#endif
