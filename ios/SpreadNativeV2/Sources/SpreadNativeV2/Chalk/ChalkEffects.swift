#if os(iOS)
import SwiftUI

/// Original Studio FX geometry in its authored 144×100 SVG coordinate space. One Canvas shares the
/// illustration's clock; nothing receives touches or runs under Reduce Motion / while backgrounded.
struct ChalkEffects: View {
    let category: String
    let elapsed: Double
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        Canvas { context, size in
            context.scaleBy(x: size.width / 144, y: size.height / 100)
            for effect in ChalkFX.table[ChalkArtwork.category(for: category)] ?? [] { draw(effect, in: context) }
        }
        .accessibilityHidden(true)
        .allowsHitTesting(false)
    }

    private func draw(_ fx: ChalkFX, in context: GraphicsContext) {
        let x = fx.x * 1.44, y = fx.y
        let ink = scheme == .dark ? Color(hex: "#F4F7FF") : Spread.secondary
        switch fx.kind {
        case .steam:
            for index in 0..<3 {
                let p = ChalkTiming.phase(elapsed, duration: 2.7, delay: -Double(index) * 0.9)
                var c = context
                c.opacity = ChalkTiming.sample(p, [(0, 0), (0.25, 0.85), (1, 0)], out: true)
                c.translateBy(x: x + Double(index - 1) * fx.w * 1.44 / 3, y: y + 2 - 11 * ChalkTiming.ease(p, out: true))
                var path = Path(); path.move(to: .zero)
                path.addQuadCurve(to: CGPoint(x: 0, y: -8), control: CGPoint(x: -2.6, y: -4))
                path.addQuadCurve(to: CGPoint(x: 0, y: -16), control: CGPoint(x: 2.6, y: -12))
                path.addQuadCurve(to: CGPoint(x: 0, y: -22.8), control: CGPoint(x: -2.2, y: -19.4))
                c.stroke(path, with: .color(ink.opacity(0.22)), style: StrokeStyle(lineWidth: 4.6, lineCap: .round))
                c.stroke(path, with: .color(ink), style: StrokeStyle(lineWidth: 1.9, lineCap: .round))
            }
        case .smoke:
            for index in 0..<3 {
                let p = ChalkTiming.phase(elapsed, duration: 3.3, delay: -Double(index) * 1.1)
                let e = ChalkTiming.ease(p, out: true)
                let radius = (2.4 + Double(index) * 0.6) * (0.6 + 0.9 * e)
                var c = context
                c.opacity = ChalkTiming.sample(p, [(0, 0), (0.25, 0.7), (1, 0)], out: true)
                c.stroke(Path(ellipseIn: CGRect(x: x + 5 * e - radius, y: y - 12 * e - radius, width: radius * 2, height: radius * 2)), with: .color(ink), lineWidth: 1.4)
            }
        case .sparkle:
            let p = ChalkTiming.phase(elapsed, duration: 2.6, delay: fx.delay)
            var c = context
            c.opacity = ChalkTiming.sample(p, [(0, 0), (0.45, 1), (0.7, 0), (1, 0)])
            c.translateBy(x: x, y: y)
            c.rotate(by: .degrees(ChalkTiming.sample(p, [(0, 0), (0.45, 45), (0.7, 90), (1, 0)])))
            let scale = ChalkTiming.sample(p, [(0, 0.2), (0.45, 1), (0.7, 0.3), (1, 0.2)])
            c.scaleBy(x: scale, y: scale)
            let points: [CGPoint] = [.init(x: 0, y: -4), .init(x: 1, y: -1), .init(x: 4, y: 0), .init(x: 1, y: 1), .init(x: 0, y: 4), .init(x: -1, y: 1), .init(x: -4, y: 0), .init(x: -1, y: -1)]
            var path = Path(); path.addLines(points); path.closeSubpath()
            c.fill(path, with: .color(Color(hex: "#FFE066")))
        case .shine:
            guard scheme == .dark, let left = fx.points.map({ $0.x * 1.44 }).min(), let right = fx.points.map({ $0.x * 1.44 }).max() else { return }
            let p = ChalkTiming.phase(elapsed, duration: 6.5)
            var c = context
            c.opacity = ChalkTiming.sample(p, [(0, 0), (0.55, 0), (0.6, 0.5), (0.85, 0.5), (1, 0)])
            var clip = Path(); clip.addLines(fx.points.map { CGPoint(x: $0.x * 1.44, y: $0.y) }); clip.closeSubpath(); c.clip(to: clip)
            let travel = ChalkTiming.sample(p, [(0, 0), (0.55, 0), (1, right - left + 40)])
            let start = left - 20 + travel, skew = tan(-22 * Double.pi / 180) * 100
            var glint = Path(); glint.addLines([.init(x: start, y: 0), .init(x: start + 14, y: 0), .init(x: start + 14 + skew, y: 100), .init(x: start + skew, y: 100)]); glint.closeSubpath()
            c.fill(glint, with: .color(.white))
        case .glow:
            let p = ChalkTiming.phase(elapsed, duration: 2.4)
            let radius = fx.r * ChalkTiming.sample(p, [(0, 0.85), (0.5, 1.1), (1, 0.85)])
            var c = context; c.opacity = ChalkTiming.sample(p, [(0, 0.35), (0.5, 1), (1, 0.35)])
            c.fill(Path(ellipseIn: CGRect(x: x - radius, y: y - radius, width: radius * 2, height: radius * 2)), with: .radialGradient(Gradient(colors: [Color(hex: fx.color).opacity(0.55), .clear]), center: CGPoint(x: x, y: y), startRadius: 0, endRadius: radius))
        case .shimmer:
            guard scheme == .dark else { return }
            let p = ChalkTiming.phase(elapsed, duration: 3.4)
            let travel = (fx.h - 6) * ChalkTiming.ease(p)
            var c = context; c.opacity = ChalkTiming.sample(p, [(0, 0), (0.2, 0.9), (0.8, 0.9), (1, 0)])
            var path = Path(); path.move(to: CGPoint(x: x, y: y + travel)); path.addLine(to: CGPoint(x: x, y: y + travel + 6))
            c.stroke(path, with: .color(.white), style: StrokeStyle(lineWidth: 1.4, lineCap: .round))
        case .speed:
            for index in 0..<3 {
                let p = ChalkTiming.phase(elapsed, duration: 1.4, delay: -Double(index) * 0.25)
                let offset = 4 - 8 * ChalkTiming.ease(p)
                var c = context; c.opacity = ChalkTiming.sample(p, [(0, 0), (0.4, 0.9), (1, 0)])
                var path = Path(); path.move(to: CGPoint(x: x + offset, y: y + Double(index) * 4)); path.addLine(to: CGPoint(x: x + offset + 6 - Double(index), y: y + Double(index) * 4))
                c.stroke(path, with: .color(ink), style: StrokeStyle(lineWidth: 1.5, lineCap: .round))
            }
        }
    }
}

private struct ChalkFX {
    enum Kind { case steam, smoke, sparkle, shine, glow, shimmer, speed }
    let kind: Kind
    var x = 0.0, y = 0.0, w = 0.0, h = 0.0, r = 0.0, delay = 0.0
    var color = "#FFFFFF"
    var points: [CGPoint] = []
    static let table: [String: [ChalkFX]] = [
        "work": [
            .init(kind: .steam, x: 86.5, y: 49, w: 10),
            .init(kind: .shine, points: [CGPoint(x: 22, y: 22), CGPoint(x: 56, y: 20), CGPoint(x: 59, y: 62), CGPoint(x: 25, y: 66)]),
            .init(kind: .sparkle, x: 40, y: 12),
            .init(kind: .sparkle, x: 34, y: 7, delay: -1.2),
        ],
        "health": [
            .init(kind: .sparkle, x: 40, y: 10),
            .init(kind: .sparkle, x: 67, y: 34, delay: -0.8),
            .init(kind: .shimmer, x: 29, y: 40, h: 40),
        ],
        "home": [
            .init(kind: .smoke, x: 67, y: 13),
            .init(kind: .sparkle, x: 45, y: 8, delay: -0.5),
            .init(kind: .sparkle, x: 86, y: 14, delay: -1.6),
        ],
        "personal": [
            .init(kind: .steam, x: 79, y: 31, w: 12),
            .init(kind: .sparkle, x: 90, y: 16, delay: -0.7),
            .init(kind: .sparkle, x: 56, y: 6),
        ],
        "fitness": [
            .init(kind: .speed, x: 3, y: 46),
            .init(kind: .shimmer, x: 80, y: 30, h: 38),
            .init(kind: .sparkle, x: 55, y: 10, delay: -0.9),
        ],
        "family": [
            .init(kind: .sparkle, x: 45, y: 12),
            .init(kind: .sparkle, x: 78, y: 28, delay: -1.1),
        ],
        "school": [
            .init(kind: .sparkle, x: 29, y: 10, delay: -0.6),
            .init(kind: .sparkle, x: 91, y: 46),
        ],
        "project": [
            .init(kind: .glow, x: 61, y: 55, r: 12, color: "#ffd84a"),
            .init(kind: .sparkle, x: 88, y: 12),
            .init(kind: .sparkle, x: 10, y: 10, delay: -1.3),
        ],
        "church": [
            .init(kind: .glow, x: 46, y: 19, r: 9, color: "#ffb35a"),
            .init(kind: .sparkle, x: 37, y: 34, delay: -0.7),
        ],
        "business": [
            .init(kind: .sparkle, x: 66, y: 14),
            .init(kind: .sparkle, x: 10, y: 8, delay: -1.1),
        ],
        "custom": [
            .init(kind: .sparkle, x: 12, y: 14),
            .init(kind: .sparkle, x: 88, y: 10, delay: -0.6),
            .init(kind: .sparkle, x: 86, y: 86, delay: -1.3),
            .init(kind: .sparkle, x: 16, y: 90, delay: -0.9),
            .init(kind: .glow, x: 49, y: 40, r: 16, color: "#ffd84a"),
        ],
    ]
}
#endif
