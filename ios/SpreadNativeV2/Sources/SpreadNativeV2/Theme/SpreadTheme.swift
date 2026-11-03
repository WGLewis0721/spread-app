#if os(iOS)
import SwiftUI
import UIKit

/// Semantic tokens transcribed from the pre-migration `src/styles.css` `:root` light and dark
/// blocks (commit 35b6652). Every token is system-aware: light and dark follow the device appearance
/// through `UIColor(dynamicProvider:)`. Nothing here forces a scheme. Role colours are data and come
/// from `Responsibility.color`, never from this file.
public enum Spread {
    // MARK: Surfaces and ink

    public static let canvas = dynamic(light: 0xF2F2F7, dark: 0x000000)
    public static let elevated = dynamic(light: 0xFFFFFF, dark: 0x1C1C1E)
    public static let ink = dynamic(light: 0x1D1D1F, dark: 0xF5F5F7)
    // Increase Contrast ("stronger separators and ink", docs/design/packs/apple-native-feel.md) swaps in the
    // ink value for secondary text and a stronger alpha for tertiary text and separators. No new hues.
    public static let secondary = adaptive(
        light: (110, 110, 115, 1), dark: (235, 235, 245, 0.60),
        highLight: (29, 29, 31, 0.86), highDark: (245, 245, 247, 0.88))
    public static let tertiary = adaptive(
        light: (142, 142, 147, 1), dark: (235, 235, 245, 0.38),
        highLight: (110, 110, 115, 1), highDark: (235, 235, 245, 0.72))
    public static let line = adaptive(
        light: (60, 60, 67, 0.14), dark: (84, 84, 88, 0.65),
        highLight: (60, 60, 67, 0.46), highDark: (235, 235, 245, 0.55))
    public static let fill = dynamic(lightRGBA: (120, 120, 128, 0.16), dark: 0x2C2C2E)
    public static let segment = dynamic(light: 0xFFFFFF, dark: 0x3A3A3C)

    // MARK: Accent and state

    public static let accent = dynamic(light: 0x007AFF, dark: 0x0A84FF)
    public static let onAccent = Color.white
    public static let danger = dynamic(light: 0xFF3B30, dark: 0xFF453A)
    public static let onDanger = Color.white
    public static let caution = dynamic(light: 0x9A3412, dark: 0xFF9F0A)
    public static let scrim = dynamic(lightRGBA: (0, 0, 0, 0.32), darkRGBA: (0, 0, 0, 0.50))

    // MARK: Glass (floating dock, tab rail)

    public static let glass = dynamic(lightRGBA: (255, 255, 255, 0.78), darkRGBA: (44, 44, 46, 0.82))
    public static let glassStroke = adaptive(
        light: (0, 0, 0, 0.08), dark: (255, 255, 255, 0.12),
        highLight: (0, 0, 0, 0.38), highDark: (255, 255, 255, 0.50))
    public static let glassLine = dynamic(lightRGBA: (255, 255, 255, 0.90), darkRGBA: (255, 255, 255, 0.16))
    public static let shadow = dynamic(lightRGBA: (0, 0, 0, 0.10), darkRGBA: (0, 0, 0, 0.45))

    // MARK: Crown metal (styles.css `.crown-wheel`, light and dark gradients)

    public static let crownLight: [Color] = [
        Color(hex6: 0xFFFFFF), Color(hex6: 0xF2F2F4), Color(hex6: 0xC8C8CD), Color(hex6: 0x9A9AA0),
        Color(hex6: 0x6D6D72), Color(hex6: 0xB9B9BE), Color(hex6: 0xF7F7F8),
    ]
    public static let crownDark: [Color] = [
        Color(hex6: 0xF5F5F7), Color(hex6: 0xAEAEB2), Color(hex6: 0x636366), Color(hex6: 0x3A3A3C),
        Color(hex6: 0x1C1C1E), Color(hex6: 0x48484A), Color(hex6: 0xD1D1D6),
    ]
    public static let toothDarkLight = Color(hex6: 0x6E6E73), toothMidLight = Color(hex6: 0xD2D2D7)
    public static let toothLightLight = Color.white, toothGapLight = Color(hex6: 0xAEAEB2)
    public static let toothDarkDark = Color(hex6: 0x111113), toothMidDark = Color(hex6: 0x8E8E93)
    public static let toothLightDark = Color(hex6: 0xF5F5F7), toothGapDark = Color(hex6: 0x1C1C1E)

    // MARK: Shape language (styles.css @theme and tailwind classes in the planner)

    public static let radiusCard: CGFloat = 22      // rounded-3xl surfaces (22 pt in the CSS token)
    public static let radiusRow: CGFloat = 16      // rounded-2xl rows
    public static let radiusSheet: CGFloat = 28    // --radius-sheet
    public static let radiusControl: CGFloat = 14  // --radius-control
    /// Interactive targets are never smaller than 44 pt (HIG and the planner's own rule).
    public static let minimumTarget: CGFloat = 44

    /// The signed-width Week/Spread destination rail corresponds to the planner's `bg-fill rounded-full p-1`.
    public static let railPadding: CGFloat = 4

    // MARK: Typography (styles.css: title 2.125rem, sheet 1.375rem, body 1.0625rem, callout, footnote)

    public static let title = Font.system(.largeTitle, weight: .bold)
    public static let sheetTitle = Font.system(.title2, weight: .bold)
    public static let body = Font.system(.body, weight: .regular)
    public static let headline = Font.system(.callout, weight: .semibold)
    public static let callout = Font.system(.subheadline, weight: .regular)
    public static let footnote = Font.system(.footnote, weight: .regular)
    public static let caption = Font.system(.caption, weight: .regular)

    // MARK: Helpers

    typealias RGBA = (Double, Double, Double, Double)

    /// A colour that follows light/dark and, optionally, Increase Contrast (`accessibilityContrast == .high`).
    private static func adaptive(light: RGBA, dark: RGBA, highLight: RGBA? = nil, highDark: RGBA? = nil) -> Color {
        Color(uiColor: UIColor { trait in
            let isDark = trait.userInterfaceStyle == .dark
            let isHigh = trait.accessibilityContrast == .high
            let c: RGBA = isDark ? (isHigh ? (highDark ?? dark) : dark) : (isHigh ? (highLight ?? light) : light)
            return UIColor(red: CGFloat(c.0 / 255), green: CGFloat(c.1 / 255), blue: CGFloat(c.2 / 255), alpha: CGFloat(c.3))
        })
    }

    private static func dynamic(light: UInt32, dark: UInt32) -> Color {
        Color(uiColor: UIColor { trait in
            trait.userInterfaceStyle == .dark ? UIColor(hex6: dark) : UIColor(hex6: light)
        })
    }

    private static func dynamic(lightRGBA light: (Double, Double, Double, Double), darkRGBA dark: (Double, Double, Double, Double)) -> Color {
        Color(uiColor: UIColor { trait in
            let c = trait.userInterfaceStyle == .dark ? dark : light
            return UIColor(red: CGFloat(c.0 / 255), green: CGFloat(c.1 / 255), blue: CGFloat(c.2 / 255), alpha: CGFloat(c.3))
        })
    }

    private static func dynamic(light: UInt32, darkRGBA dark: (Double, Double, Double, Double)) -> Color {
        Color(uiColor: UIColor { trait in
            if trait.userInterfaceStyle == .dark {
                return UIColor(red: CGFloat(dark.0 / 255), green: CGFloat(dark.1 / 255), blue: CGFloat(dark.2 / 255), alpha: CGFloat(dark.3))
            }
            return UIColor(hex6: light)
        })
    }

    private static func dynamic(lightRGBA light: (Double, Double, Double, Double), dark: UInt32) -> Color {
        Color(uiColor: UIColor { trait in
            if trait.userInterfaceStyle == .dark { return UIColor(hex6: dark) }
            return UIColor(red: CGFloat(light.0 / 255), green: CGFloat(light.1 / 255), blue: CGFloat(light.2 / 255), alpha: CGFloat(light.3))
        })
    }
}

/// The Week/Spread/Month motion curve: `cubic-bezier(0.32, 0.72, 0, 1)` used by every planner transition.
public enum SpreadMotion {
    public static let curve = Animation.timingCurve(0.32, 0.72, 0, 1, duration: 0.42)
    public static let cascade = Animation.timingCurve(0.32, 0.72, 0, 1, duration: 0.32)
    public static let descend = Animation.timingCurve(0.32, 0.72, 0, 1, duration: 0.42)
    public static let ascend = Animation.timingCurve(0.32, 0.72, 0, 1, duration: 0.34)
    public static let weekSlide = Animation.timingCurve(0.32, 0.72, 0, 1, duration: 0.34)
    public static let sheetSettle = Animation.timingCurve(0.32, 0.72, 0, 1, duration: 0.46)
    public static let gear = Animation.timingCurve(0.32, 0.72, 0, 1, duration: 0.48)
    public static let morph = Animation.timingCurve(0.32, 0.72, 0, 1, duration: 0.42)
    public static let press = Animation.timingCurve(0.32, 0.72, 0, 1, duration: 0.16)
    public static let fade = Animation.easeInOut(duration: 0.28)

    /// Reduced Motion removes movement: transitions become instant. Opacity-only feedback is kept where
    /// the original used it, so state changes stay visible without sliding or scaling.
    public static func resolved(_ animation: Animation, reduceMotion: Bool) -> Animation? {
        reduceMotion ? nil : animation
    }

    /// Stagger for list items entering together (the planner's `cascade-item` delay, in seconds).
    public static func stagger(_ index: Int, step: Double = 0.045) -> Double {
        Double(max(0, index)) * step
    }
}

/// Undo window. The planner's Undo is offered for six seconds after the change (store contract).
public enum SpreadUndo {
    public static let seconds: Double = 6
}

/// One light haptic when a task is completed, after the store has acknowledged the change. iPhone only.
public enum SpreadHaptics {
    @MainActor public static func completed() {
        guard UIDevice.current.userInterfaceIdiom == .phone else { return }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
}

extension Color {
    /// `#RRGGBB` from the store's `Responsibility.color`. Invalid strings use the planner's neutral grey.
    public init(hex string: String) {
        let cleaned = string.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var value: UInt64 = 0
        guard cleaned.count == 6, Scanner(string: cleaned).scanHexInt64(&value) else {
            self = Color(hex6: 0x8E8E93)
            return
        }
        self = Color(hex6: UInt32(value))
    }

    public init(hex6 value: UInt32) {
        self = Color(
            .sRGB,
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255,
            opacity: 1
        )
    }
}

extension UIColor {
    convenience init(hex6 value: UInt32) {
        self.init(
            red: CGFloat((value >> 16) & 0xFF) / 255,
            green: CGFloat((value >> 8) & 0xFF) / 255,
            blue: CGFloat(value & 0xFF) / 255,
            alpha: 1
        )
    }
}

extension View {
    /// A Button's hit region is its label. Apply the frame and content shape inside the label.
    func tapTarget(minWidth: CGFloat = 44, minHeight: CGFloat = 44, alignment: Alignment = .center) -> some View {
        frame(minWidth: minWidth, minHeight: minHeight, alignment: alignment).contentShape(Rectangle())
    }
}

/// The planner's `button:active` feedback: a small scale and a dip in opacity while pressed. It never delays the
/// action, and Reduce Motion keeps the opacity change but drops the scale.
struct SpreadPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        PressBody(configuration: configuration)
    }

    private struct PressBody: View {
        let configuration: ButtonStyleConfiguration
        @Environment(\.accessibilityReduceMotion) private var reduceMotion

        var body: some View {
            configuration.label
                .scaleEffect(configuration.isPressed && !reduceMotion ? 0.95 : 1)
                .opacity(configuration.isPressed ? 0.72 : 1)
                .animation(reduceMotion ? nil : SpreadMotion.press, value: configuration.isPressed)
        }
    }
}

extension ButtonStyle where Self == SpreadPressStyle {
    static var spreadPress: SpreadPressStyle { SpreadPressStyle() }
}
#endif
