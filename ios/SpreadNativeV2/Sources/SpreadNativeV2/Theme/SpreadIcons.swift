#if os(iOS)
import SwiftUI

/// An original Spread SVG from `Resources/Icons.xcassets`. The React app tinted most of these with a CSS
/// mask in `currentColor` (`TINTED` in spread-icon.tsx); the asset catalog marks the same set as template
/// images, so `foregroundStyle` supplies the colour exactly as `currentColor` did.
struct SpreadIcon: View {
    let name: String
    var size: CGFloat = 24
    /// Original-colour icons (`icon-new-life`) keep their own colours, as the React `<img>` did.
    var original = false

    var body: some View {
        Image(name, bundle: .module)
            .renderingMode(original ? .original : .template)
            .resizable()
            .scaledToFit()
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }
}

/// The original brand mark, drawn in its own colours (`app-icon-spread-cards.svg` is not tinted).
struct SpreadBrandMark: View {
    var size: CGFloat = 34

    var body: some View {
        Image("app-icon-spread-cards", bundle: .module)
            .renderingMode(.original)
            .resizable()
            .scaledToFit()
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }
}

/// A consistent category glyph on a role-coloured tile. The ten source-matched
/// Lucide outline SVGs live in Icons.xcassets and public/icons; both use a
/// 24-point grid, 2-point round stroke. Colours remain persisted role data.
/// The shared category art is separate from LifeEditorialArtwork backgrounds.
struct RoleBadge: View {
    let category: String?
    let color: String
    var size: CGFloat = 36

    /// Match the React category tile's contrast rule for light user colours.
    /// Using actual relative luminance avoids an unreadable white glyph on
    /// yellow/orange/bright green without changing the role's stored colour.
    private var glyphInk: Color {
        let hex = color.hasPrefix("#") ? String(color.dropFirst()) : color
        guard hex.count == 6, let rgb = Int(hex, radix: 16) else { return .white }
        func linear(_ channel: Int) -> Double {
            let value = Double(channel) / 255
            return value <= 0.04045 ? value / 12.92 : pow((value + 0.055) / 1.055, 2.4)
        }
        let luminance = 0.2126 * linear((rgb >> 16) & 255)
            + 0.7152 * linear((rgb >> 8) & 255)
            + 0.0722 * linear(rgb & 255)
        return luminance > 0.30
            ? Color(red: 22.0 / 255.0, green: 33.0 / 255.0, blue: 42.0 / 255.0)
            : .white
    }

    var body: some View {
        let tint = Color(hex: color)
        let shape = RoundedRectangle(cornerRadius: size * 0.30, style: .continuous)
        ZStack {
            shape.fill(LinearGradient(colors: [tint, tint.opacity(0.78)], startPoint: .top, endPoint: .bottom))
            // A thin top light, so the tile reads as a lit surface and not a flat swatch.
            shape.strokeBorder(LinearGradient(colors: [Color.white.opacity(0.45), Color.white.opacity(0.04)], startPoint: .top, endPoint: .bottom), lineWidth: 1)
            if let category, ChalkArtwork.categoryGlyphNames.contains(category) {
                Image("category-glyph-\(category)", bundle: .module)
                    .renderingMode(.template)
                    .resizable()
                    .scaledToFit()
                    .foregroundStyle(glyphInk)
                    .padding(size * 0.14)
            } else {
                // Unknown/custom categories keep the neutral list mark on their selected colour.
                ListMark().stroke(glyphInk, style: StrokeStyle(lineWidth: size * 0.085, lineCap: .round))
                    .padding(size * 0.28)
            }
        }
        .frame(width: size, height: size)
        .shadow(color: tint.opacity(0.35), radius: size * 0.18, y: 2)
        .accessibilityHidden(true)
    }
}

private struct ListMark: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let x = rect.minX, w = rect.width
        for fraction in [0.2, 0.5, 0.8] {
            let y = rect.minY + rect.height * fraction
            path.move(to: CGPoint(x: x + w * 0.35, y: y))
            path.addLine(to: CGPoint(x: x + w, y: y))
            path.move(to: CGPoint(x: x, y: y))
            path.addLine(to: CGPoint(x: x + w * 0.12, y: y))
        }
        return path
    }
}

/// The two-gear settings control. Drawn from the React `SettingsGears` geometry (24-unit viewBox) and turned
/// when pressed: the large gear clockwise by 45 degrees, the small one counter-clockwise by 60 degrees.
struct SettingsGears: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let turn: Bool
    var size: CGFloat = 36

    var body: some View {
        ZStack {
            gear(cx: 8.2, cy: 8.2, radius: 4.15, teeth: 8, angle: turn && !reduceMotion ? 45 : 0)
            gear(cx: 16.1, cy: 16.1, radius: 3.25, teeth: 6, angle: turn && !reduceMotion ? -60 : 0)
        }
        .frame(width: size, height: size)
        .animation(reduceMotion ? nil : SpreadMotion.gear, value: turn)
        .accessibilityHidden(true)
    }

    private func gear(cx: Double, cy: Double, radius: Double, teeth: Int, angle: Double) -> some View {
        let anchor = UnitPoint(x: cx / 24, y: cy / 24)
        return ZStack {
            GearShape(cx: cx, cy: cy, radius: radius, teeth: teeth, part: .body).fill(Spread.ink)
            // The React `.gear-hole` is filled with the glass colour, so the centre reads as an open ring.
            GearShape(cx: cx, cy: cy, radius: radius, teeth: teeth, part: .hole).fill(Spread.glass)
        }
        .rotationEffect(.degrees(angle), anchor: anchor)
    }
}

private struct GearShape: Shape {
    enum Part { case body, hole }
    let cx: Double
    let cy: Double
    let radius: Double
    let teeth: Int
    let part: Part

    func path(in rect: CGRect) -> Path {
        let scale = rect.width / 24
        var path = Path()
        switch part {
        case .hole:
            let r = radius * 0.38
            path.addEllipse(in: CGRect(x: (cx - r) * scale, y: (cy - r) * scale, width: 2 * r * scale, height: 2 * r * scale))
        case .body:
            let tooth = 1.75
            let center = CGPoint(x: cx * scale, y: cy * scale)
            for index in 0..<teeth {
                let angle = CGFloat(Double(index) / Double(teeth) * 2 * .pi)
                // Tooth sits above the centre (-y), then rotates about it, as the SVG `rotate(...)` did.
                let transform = CGAffineTransform(translationX: center.x, y: center.y)
                    .rotated(by: angle)
                    .translatedBy(x: -CGFloat(tooth / 2) * scale, y: -CGFloat(radius + tooth - 0.45) * scale)
                let toothRect = CGRect(x: 0, y: 0, width: CGFloat(tooth) * scale, height: CGFloat(tooth) * scale)
                path.addRoundedRect(in: toothRect, cornerSize: CGSize(width: 0.35 * scale, height: 0.35 * scale), transform: transform)
            }
            path.addEllipse(in: CGRect(x: (cx - radius) * scale, y: (cy - radius) * scale, width: 2 * radius * scale, height: 2 * radius * scale))
        }
        return path
    }
}

/// The Week/Month morph glyph: four week lines become four month boxes (`ViewMorphIcon` in spread-app.tsx).
/// `progress` is 0 for week lines and 1 for month boxes; the dock animates it with the 420 ms curve.
struct ViewMorphIcon: View {
    let boxes: Bool
    var size: CGFloat = 24

    var body: some View {
        ZStack {
            MorphBars(progress: boxes ? 1 : 0)
                .fill(Spread.accent)
                .opacity(boxes ? 0 : 1)
            MorphBars(progress: boxes ? 1 : 0)
                .stroke(Spread.accent, style: StrokeStyle(lineWidth: 2.4 * (boxes ? 1 : 0), lineJoin: .round))
                .opacity(boxes ? 1 : 0)
        }
        .frame(width: size, height: size)
        .animation(SpreadMotion.morph, value: boxes)
        .accessibilityHidden(true)
    }
}

/// Four rounded rectangles interpolated between the week (bars) and month (squares) geometry.
struct MorphBars: Shape {
    var progress: Double

    var animatableData: Double {
        get { progress }
        set { progress = newValue }
    }

    private static let weekBars: [CGRect] = (0..<4).map { CGRect(x: 3, y: 3 + Double($0) * 5.2, width: 18, height: 2.4) }
    private static let monthBoxes: [CGRect] = (0..<4).map {
        CGRect(x: 3 + Double($0 % 2) * 10.8, y: 3 + Double($0 / 2) * 10.8, width: 7.2, height: 7.2)
    }

    func path(in rect: CGRect) -> Path {
        let scale = rect.width / 24
        var path = Path()
        for index in 0..<4 {
            let from = Self.weekBars[index], to = Self.monthBoxes[index]
            let t = progress
            func lerp(_ a: Double, _ b: Double) -> Double { a + (b - a) * t }
            let x = lerp(from.minX, to.minX), y = lerp(from.minY, to.minY)
            let w = lerp(from.width, to.width), h = lerp(from.height, to.height)
            let radius = lerp(1.2, 1.8)
            path.addRoundedRect(
                in: CGRect(x: x * scale, y: y * scale, width: w * scale, height: h * scale),
                cornerSize: CGSize(width: radius * scale, height: radius * scale)
            )
        }
        return path
    }
}

/// The two planner destinations shown by the Spread/Week rail. Month is a mode inside Week, not a tab.
enum SpreadDestination: String, CaseIterable, Identifiable, Sendable {
    case spread, week
    var id: String { rawValue }
    var label: String { self == .spread ? "Spread" : "Week" }
    /// The original icon for each destination (`icon-spread-list.svg`, `icon-week.svg`).
    var iconName: String { self == .spread ? "icon-spread-list" : "icon-week" }
}
#endif
