#if os(iOS)
import SwiftUI
import UIKit

/// Spread's native design tokens (docs/design/planner/SPREAD_NATIVE_BRAND_BOARD.md, section 3).
///
/// Premium dark is the primary identity: a calm navy canvas, quiet navy content surfaces, a recessed inset, one
/// functional blue for selection and action, and role colour (always data, from `Responsibility.color`) as bounded
/// edge light on cards. Light mode keeps the same layout and identity on a cream canvas with dark navy ink. Every
/// token follows the device appearance through `UIColor(dynamicProvider:)`; nothing here forces a scheme.
///
/// Scope: the owner-approved native design exception. These values do not touch `src/styles.css` or the React app.
public enum Spread {
    public static let appearancePreferenceKey = "spread.native.appearance"
    // MARK: Surfaces and ink

    /// Calm, nearly black navy ground (dark) / cream (light).
    public static let canvas = dynamic(light: 0xF4F1EA, dark: 0x060B18)
    /// Solid readable content surface.
    public static let elevated = dynamic(light: 0xFFFFFF, dark: 0x101C32)
    /// The canvas as a UIKit colour (dynamic), for the UIKit container behind the SwiftUI root and launch continuity.
    public static let canvasUIColor = UIColor { trait in
        trait.userInterfaceStyle == .dark ? UIColor(hex6: 0x060B18) : UIColor(hex6: 0xF4F1EA)
    }
    /// Recess: the Crown's centre, task rows, the rail's trough.
    public static let inset = dynamic(light: 0xEBE7DD, dark: 0x0A1427)
    public static let ink = dynamic(light: 0x0E1A2E, dark: 0xF7FAFF)
    // Increase Contrast ("stronger separators and ink", docs/design/packs/apple-native-feel.md) swaps in the
    // ink value for secondary text and a stronger alpha for tertiary text and separators. No new hues.
    public static let secondary = adaptive(
        light: (74, 86, 112, 1), dark: (176, 188, 209, 1),
        highLight: (14, 26, 46, 0.92), highDark: (247, 250, 255, 0.92))
    public static let tertiary = adaptive(
        light: (95, 107, 133, 1), dark: (176, 188, 209, 0.80),
        highLight: (74, 86, 112, 1), highDark: (176, 188, 209, 0.92))
    /// Hairline separation instead of chunky outlines (white 10-16% on dark).
    public static let line = adaptive(
        light: (14, 26, 46, 0.12), dark: (255, 255, 255, 0.12),
        highLight: (14, 26, 46, 0.46), highDark: (255, 255, 255, 0.46))
    /// The trough behind a segmented control and quiet chips.
    public static let fill = adaptive(light: (14, 26, 46, 0.07), dark: (255, 255, 255, 0.07))
    public static let segment = Spread.accent

    // MARK: Accent and state

    /// Action blue: current selection, Today, the main actions.
    public static let accent = dynamic(light: 0x0860C8, dark: 0x0A84FF)
    public static let onAccent = Color.white
    public static let danger = dynamic(light: 0xC8281E, dark: 0xFF453A)
    public static let onDanger = Color.white
    public static let caution = dynamic(light: 0x9A3412, dark: 0xFF9F0A)
    public static let scrim = dynamic(lightRGBA: (0, 0, 0, 0.32), darkRGBA: (0, 0, 0, 0.55))
    /// The lit blue of a selected segment or primary button. The specimen's `blueBtn` runs #2F95FF to #0559C7, but white
    /// text on #2F95FF is only 3.06:1; the light end is #0A6FE8 so white text is at least 4.5:1 across the whole gradient.
    public static let accentGradient = LinearGradient(
        colors: [Color(hex6: 0x0A6FE8), Color(hex6: 0x0559C7)], startPoint: .topLeading, endPoint: .bottomTrailing)

    // MARK: Card surface (specimen `navyCard`)

    private static let cardTop = dynamic(light: 0xFFFFFF, dark: 0x152845)
    private static let cardMid = dynamic(light: 0xFFFFFF, dark: 0x0C172A)
    private static let cardBottom = dynamic(light: 0xFAF8F2, dark: 0x0A1223)
    /// Quiet gradient body of a content card: lit from the top-left, settling into the canvas.
    public static let cardFill = LinearGradient(
        stops: [.init(color: cardTop, location: 0), .init(color: cardMid, location: 0.55), .init(color: cardBottom, location: 1)],
        startPoint: .topLeading, endPoint: .bottomTrailing)

    // MARK: Glass (floating dock, tab rail)

    public static let glass = dynamic(lightRGBA: (255, 255, 255, 0.80), darkRGBA: (16, 28, 50, 0.80))
    public static let glassStroke = adaptive(
        light: (14, 26, 46, 0.10), dark: (255, 255, 255, 0.14),
        highLight: (14, 26, 46, 0.46), highDark: (255, 255, 255, 0.50))
    public static let glassLine = adaptive(light: (14, 26, 46, 0.12), dark: (255, 255, 255, 0.14))
    public static let shadow = dynamic(lightRGBA: (14, 26, 46, 0.12), darkRGBA: (0, 0, 0, 0.50))

    // MARK: Crown metal (specimen `metal`: cool steel, bright top edge, recessed centre)

    private static let steel: [Color] = [
        Color(hex6: 0xF3F5FF), Color(hex6: 0xC9D1E2), Color(hex6: 0x606F8B), Color(hex6: 0xDDE2ED),
        Color(hex6: 0x44516C), Color(hex6: 0xECEFF4), Color(hex6: 0x8190AC),
    ]
    public static let crownLight: [Color] = steel
    public static let crownDark: [Color] = steel
    /// The recessed centre that holds the week readout.
    public static let crownRecess = dynamic(light: 0xEEF1F7, dark: 0x081223)
    public static let crownRecessStroke = adaptive(light: (14, 26, 46, 0.30), dark: (213, 220, 232, 0.55))
    public static let toothDarkLight = Color(hex6: 0x44516C), toothMidLight = Color(hex6: 0xC7CFDF)
    public static let toothLightLight = Color.white, toothGapLight = Color(hex6: 0x8190AC)
    public static let toothDarkDark = Color(hex6: 0x111827), toothMidDark = Color(hex6: 0x8190AC)
    public static let toothLightDark = Color(hex6: 0xFAFDFF), toothGapDark = Color(hex6: 0x1B2438)

    // MARK: Shape language (styles.css @theme and tailwind classes in the planner)

    public static let radiusCard: CGFloat = 24      // card corners: 20-28 pt per the brand board
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

    /// Instructions in an empty editable field must stay readable on the native inset surfaces.
    public static func fieldPrompt(_ label: String) -> Text { Text(label).foregroundStyle(secondary) }

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
    /// Directional continuity without moving persistent navigation chrome.
    public static let lifeWeekPage = Animation.timingCurve(0.32, 0.72, 0, 1, duration: 0.26)
    public static let historyEntrance = Animation.timingCurve(0.16, 1, 0.3, 1, duration: 0.20)
    public static let historyExit = Animation.easeIn(duration: 0.16)

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

/// One tactile vocabulary for Classic and Life, without changing their visual tokens.
/// An owner-requested 25% emphasis applies to *settling time and visible displacement*,
/// not to gesture thresholds, raw finger tracking, data writes, or haptic frequency.
public enum SpreadTactile {
    public static let emphasis: Double = 1.25
    /// Owner-requested visible travel: 75% more than ordinary 340–420ms UI movement.
    /// Keep direct finger tracking unanimated, all motions interruptible.
    public static let showTravel: Double = 1.75
    /// Spring response for Wallet focus. Not scaled by showTravel (owner decision 2026-11-11).
    public static let walletFocusDuration = 0.42
    public static let trayDuration = 0.34 * showTravel
    public static let cardDismissDuration = 0.40 * showTravel
    public static let walletFocus = Animation.spring(response: walletFocusDuration, dampingFraction: 0.82)
    public static let traySlide = Animation.timingCurve(0.18, 0.0, 0.2, 1, duration: trayDuration)
    public static let cardDismiss = Animation.timingCurve(0.22, 0.0, 0.4, 1, duration: cardDismissDuration)
    public static let contactDuration = 0.10 * emphasis
    public static let snapResponse = 0.22 * emphasis
    public static let settleResponse = 0.32 * emphasis
    public static let glideResponse = 0.28 * emphasis
    public static let enterDuration = 0.22 * emphasis
    public static let exitDuration = 0.18 * emphasis
    public static let pressScale = 1 - (1 - 0.97) * emphasis
    public static let pressOpacity = 1 - (1 - 0.88) * emphasis
    public static let entranceDistance: CGFloat = CGFloat(10 * emphasis)
    public static let detailDistance: CGFloat = CGFloat(8 * emphasis)
    public static let staggerStep = 0.03 * emphasis
    public static let staggerCap = 0.21 * emphasis

    public static let contact = Animation.easeOut(duration: contactDuration)
    // Preserve damping: stronger observability must not add gratuitous bounce.
    public static let snap = Animation.interactiveSpring(
        response: snapResponse, dampingFraction: 0.91, blendDuration: 0.06 * emphasis)
    public static let settle = Animation.interactiveSpring(
        response: settleResponse, dampingFraction: 0.88, blendDuration: 0.09 * emphasis)
    public static let glide = Animation.interactiveSpring(
        response: glideResponse, dampingFraction: 0.96, blendDuration: 0.07 * emphasis)
    /// Calm ease-out for elements entering from a known trigger; no routine bounce.
    public static let enter = Animation.timingCurve(0.16, 1, 0.3, 1, duration: enterDuration)
    /// Exits remain faster than entrances, with the same 25% duration scaling.
    public static let exit = Animation.easeIn(duration: exitDuration)
    /// Same responsibility appears to grow into a distinct details surface below the face.
    public static var detailReveal: AnyTransition {
        .asymmetric(insertion: .offset(y: detailDistance).combined(with: .opacity), removal: .opacity)
    }
    /// Wallet-style details: sharpen in place under the focused card, with no travel.
    public static var walletDetailReveal: AnyTransition {
        AnyTransition.opacity.combined(with: AnyTransition.modifier(
            active: SpreadBlurEffect(radius: 8), identity: SpreadBlurEffect(radius: 0)))
    }

    public static func resolved(_ animation: Animation, reduceMotion: Bool) -> Animation? {
        reduceMotion ? nil : animation
    }
}

/// Blur used only by the Wallet detail transition.
struct SpreadBlurEffect: ViewModifier {
    let radius: CGFloat
    func body(content: Content) -> some View { content.blur(radius: radius) }
}

/// Per-item presentation state, discarded on profile/role changes. Delays are bounded so a dense plan
/// never leaves tasks waiting offscreen; controls retain hit testing while the short entrance runs.
struct SpreadEntrance: ViewModifier {
    let index: Int
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var visible = false

    func body(content: Content) -> some View {
        content
            .opacity(visible || reduceMotion ? 1 : 0)
            .offset(y: visible || reduceMotion ? 0 : SpreadTactile.entranceDistance)
            .task {
                await Task.yield()
                guard !Task.isCancelled else { return }
                withAnimation(reduceMotion ? nil : SpreadTactile.enter.delay(min(SpreadTactile.staggerCap, SpreadMotion.stagger(index, step: SpreadTactile.staggerStep)))) {
                    visible = true
                }
            }
    }
}

/// Undo window. The planner's Undo is offered for six seconds after the change (store contract).
public enum SpreadUndo {
    public static let seconds: Double = 6
}

/// One light haptic when a task is completed, after the store has acknowledged the change. iPhone only.
public enum SpreadHaptics {
    /// Retain the existing preference key. One owner for both presentations and all cues.
    @MainActor public static var enabled: Bool {
        (UserDefaults.standard.object(forKey: "native.life.touchFeedback") as? Bool ?? true) &&
            UIApplication.shared.applicationState == .active &&
            UIDevice.current.userInterfaceIdiom == .phone
    }
    @MainActor private static let selectionGenerator = UISelectionFeedbackGenerator()
    @MainActor private static let lightGenerator = UIImpactFeedbackGenerator(style: .light)
    @MainActor private static let warningGenerator = UINotificationFeedbackGenerator()
    @MainActor public static func prepare() {
        guard enabled else { return }
        selectionGenerator.prepare(); lightGenerator.prepare(); warningGenerator.prepare()
    }
    /// Discrete feedback, never tied to repeating glow frames or drag updates.
    /// An iPhone home-screen style touch cue on edit, swipe reveal and commit.
    @MainActor public static func editMode(entering: Bool) {
        guard enabled else { return }
        UIImpactFeedbackGenerator(style: entering ? .rigid : .soft)
            .impactOccurred(intensity: entering ? 0.85 : 0.55)
    }

    @MainActor public static func selection() {
        guard enabled else { return }
        selectionGenerator.selectionChanged()
        selectionGenerator.prepare()
    }

    @MainActor public static func revealed(destructive: Bool) {
        guard enabled else { return }
        UIImpactFeedbackGenerator(style: destructive ? .medium : .light)
            .impactOccurred(intensity: destructive ? 0.9 : 0.65)
    }

    @MainActor public static func destructivePrompt() {
        guard enabled else { return }
        warningGenerator.notificationOccurred(.warning)
    }

    @MainActor public static func success() {
        guard enabled else { return }
        warningGenerator.notificationOccurred(.success)
    }

    @MainActor public static func completed() {
        guard enabled else { return }
        lightGenerator.impactOccurred()
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
                .scaleEffect(configuration.isPressed && !reduceMotion ? CGFloat(SpreadTactile.pressScale) : 1)
                .opacity(configuration.isPressed ? SpreadTactile.pressOpacity : 1)
                // Contact appears at the next render; only the release settles.
                .animation(reduceMotion || configuration.isPressed ? nil : SpreadTactile.snap,
                           value: configuration.isPressed)
        }
    }
}

extension ButtonStyle where Self == SpreadPressStyle {
    static var spreadPress: SpreadPressStyle { SpreadPressStyle() }
}

// MARK: - Shared surfaces

/// A solid content card with an optional, *bounded* role-colour edge (brand board, "four layers": canvas, solid
/// content surface, bounded role edge light, functional chrome). The edge is a hairline, never thicker than 1.5 pt;
/// `active` makes it brighter and adds a soft glow, and every other card stays quiet. Nothing here animates by itself.
struct SpreadCardStyle: ViewModifier {
    var edge: Color?
    var active: Bool
    var radius: CGFloat

    @Environment(\.colorScheme) private var scheme
    @Environment(\.colorSchemeContrast) private var contrast

    private var edgeColor: Color {
        guard let edge else { return Spread.line }
        let strength: Double = active ? 0.95 : (scheme == .dark ? 0.52 : 0.60)
        return edge.opacity(contrast == .increased ? 1 : strength)
    }
    private var edgeWidth: CGFloat { edge == nil ? 0.5 : (active ? 1.5 : 1) }
    private var glowColor: Color {
        guard let edge else { return Spread.shadow }
        let strength: Double = scheme == .dark ? (active ? 0.30 : 0.10) : (active ? 0.18 : 0.06)
        return edge.opacity(strength)
    }

    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        return content
            .background(shape.fill(Spread.cardFill))
            .overlay(shape.strokeBorder(edgeColor, lineWidth: edgeWidth))
            .shadow(color: glowColor, radius: active ? 14 : 8, y: edge == nil ? 4 : 2)
    }
}

extension View {
    /// The shared Spread card: quiet navy surface (cream/white in light), hairline, optional role edge light.
    func spreadCard(edge: Color? = nil, active: Bool = false, radius: CGFloat = Spread.radiusCard) -> some View {
        modifier(SpreadCardStyle(edge: edge, active: active, radius: radius))
    }

    /// A small capsule control: a recessed trough when idle, the lit action blue when selected.
    func spreadChip(selected: Bool) -> some View {
        modifier(SpreadChipStyle(selected: selected))
    }
}

struct SpreadChipStyle: ViewModifier {
    let selected: Bool

    func body(content: Content) -> some View {
        content
            .foregroundStyle(selected ? Spread.onAccent : Spread.ink)
            .background {
                if selected {
                    Capsule().fill(Spread.accentGradient)
                } else {
                    Capsule().fill(Spread.inset)
                }
            }
            .overlay(Capsule().strokeBorder(selected ? Color.clear : Spread.line, lineWidth: 0.5))
    }
}

// MARK: - Sheets

/// Every sheet's container: a navigation stack on the navy canvas with a matching navigation bar, the action blue as
/// its tint, and the drag indicator. Using one container keeps New Spread, the responsibility editor, Open tasks,
/// Profiles, More and the Task sheet looking like one product.
struct SpreadSheetStack<Content: View>: View {
    @ViewBuilder let content: () -> Content

    var body: some View {
        NavigationStack {
            content()
                .background(Spread.canvas.ignoresSafeArea())
                .toolbarBackground(Spread.canvas, for: .navigationBar)
                .toolbarBackground(.visible, for: .navigationBar)
        }
        .tint(Spread.accent)
        .presentationBackground(Spread.canvas)
        .presentationDragIndicator(.visible)
    }
}

extension View {
    /// A `List` or `Form` on the navy canvas instead of the system grouped gray.
    func spreadListSurface() -> some View {
        scrollContentBackground(.hidden).background(Spread.canvas)
    }
}

// MARK: - Appearance

/// This device's own light/dark choice for Spread. "System" follows iOS and is the default; the other two override it
/// for Spread only. It is a presentation preference kept in UserDefaults, like the layout choice: never planner data,
/// never backed up or synced, and it writes nothing to the store.
enum SpreadAppearance: String, CaseIterable, Identifiable, Sendable {
    case system, light, dark
    var id: String { rawValue }
    var title: String {
        switch self {
        case .system: return "System"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }
    var scheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

enum SpreadAppearancePreference {
    static let key = Spread.appearancePreferenceKey
    static func read() -> SpreadAppearance { SpreadAppearance(rawValue: UserDefaults.standard.string(forKey: key) ?? "") ?? .system }
    static func write(_ value: SpreadAppearance) { UserDefaults.standard.set(value.rawValue, forKey: key) }
}
#endif
