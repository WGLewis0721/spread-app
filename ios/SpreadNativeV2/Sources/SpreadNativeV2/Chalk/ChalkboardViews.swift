#if os(iOS)
import SwiftUI
import ImageIO
import Combine

/// The Chalkboard artwork: the eleven original base illustrations, unchanged, and the Studio motion layers.
/// Images decode through ImageIO so the original WebP strokes are never regenerated.
private enum ChalkImageLoader {
    static let cache = NSCache<NSString, UIImage>()

    static func image(resource: String, subdirectory: String) -> UIImage? {
        let key = (subdirectory + "/" + resource) as NSString
        if let cached = cache.object(forKey: key) { return cached }
        guard let url = Bundle.module.url(forResource: resource, withExtension: "webp", subdirectory: subdirectory),
              let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil) else { return nil }
        let decoded = UIImage(cgImage: cgImage)
        cache.setObject(decoded, forKey: key)
        return decoded
    }
}

/// A base Chalkboard illustration (`Resources/Chalk/<category>.webp`), shown at its original proportions.
struct ChalkIllustration: View {
    let category: String
    var maxWidth: CGFloat = 135
    var maxHeight: CGFloat = 96

    var body: some View {
        Group {
            if let image = ChalkImageLoader.image(resource: ChalkArtwork.category(for: category), subdirectory: "Chalk") {
                Image(uiImage: image).resizable().scaledToFit()
            } else {
                Color.clear
            }
        }
        .frame(maxWidth: maxWidth, maxHeight: maxHeight)
        .accessibilityHidden(true)
    }
}

/// One moving cutout from `doodle-motion.ts`: its art, box and pivot (percent of the cutout), the kind of motion,
/// amplitude, period and delay in seconds. Values are transcribed from the Studio motion specification.
struct ChalkMotionLayer: Identifiable {
    enum Kind { case sway, flutter, beat, bob, drift, spin, rock, grow, nudge }
    let id: String
    let src: String
    let kind: Kind
    let box: (x: Double, y: Double, w: Double, h: Double)
    let origin: (x: Double, y: Double)
    let amp: Double
    let dur: Double
    let delay: Double
}

enum ChalkMotionTable {
    static func layers(for category: String) -> [ChalkMotionLayer] {
        table[ChalkArtwork.category(for: category)] ?? []
    }

    private static func layer(_ id: String, _ kind: ChalkMotionLayer.Kind, _ box: (Double, Double, Double, Double), _ origin: (Double, Double), amp: Double, dur: Double, delay: Double) -> ChalkMotionLayer {
        ChalkMotionLayer(id: id, src: id, kind: kind, box: (box.0, box.1, box.2, box.3), origin: (origin.0, origin.1), amp: amp, dur: dur, delay: delay)
    }

    // swiftlint:disable line_length
    private static let table: [String: [ChalkMotionLayer]] = [
        "work": [
            layer("work-plant-l", .sway, (0.76, 3.66, 26.46, 58.61), (53.8, 99.5), amp: 3.2, dur: 4.6, delay: 0),
            layer("work-plant-r", .sway, (83.97, 4.76, 16.03, 48.35), (50.1, 99.8), amp: 3.8, dur: 3.9, delay: -1.4),
            layer("work-note-1", .flutter, (58.78, 4.76, 12.47, 18.32), (49.9, 6.8), amp: 3, dur: 3.3, delay: -0.6),
            layer("work-note-2", .flutter, (75.83, 6.96, 11.20, 18.32), (46.2, 5.7), amp: 3.5, dur: 2.9, delay: -2.0),
        ],
        "health": [
            layer("health-leaves-l", .sway, (1.78, 32.97, 18.32, 47.25), (61.2, 99.5), amp: 3.5, dur: 4.2, delay: 0),
            layer("health-apple-leaves", .sway, (41.98, 6.96, 28.24, 33.33), (53.2, 99.1), amp: 4, dur: 3.6, delay: -1.1),
            layer("health-leaves-r", .sway, (70.99, 34.80, 23.16, 43.22), (34.6, 97.6), amp: 3.2, dur: 4.8, delay: -2.3),
            layer("health-heart-r", .beat, (71.76, 3.66, 21.37, 29.67), (47.9, 48.3), amp: 0.11, dur: 1.6, delay: 0),
            layer("health-heart-l", .beat, (3.82, 7.69, 11.20, 19.41), (55.2, 42.8), amp: 0.14, dur: 1.6, delay: -0.4),
        ],
        "home": [
            layer("home-sun", .spin, (3.82, 1.83, 29.26, 34.43), (55.3, 49.9), amp: 360, dur: 40, delay: 0),
            layer("home-smoke", .bob, (60.81, 0.00, 17.30, 15.02), (41.5, 93.2), amp: -21.31, dur: 2.8, delay: 0),
            layer("home-tree-r", .sway, (74.81, 25.64, 21.37, 45.42), (33.6, 97.7), amp: 2.6, dur: 4.4, delay: -1),
            layer("home-tree-l", .sway, (3.82, 37.00, 18.32, 35.16), (50.1, 99.5), amp: 2.6, dur: 5, delay: -2.4),
        ],
        "personal": [
            layer("personal-leaves", .sway, (0.00, 8.79, 23.16, 65.57), (73.4, 97.9), amp: 3.4, dur: 4.4, delay: 0),
            layer("personal-heart-o", .beat, (57.00, 11.72, 12.21, 19.41), (49.1, 52.9), amp: 0.13, dur: 1.7, delay: -0.5),
            layer("personal-heart-r", .beat, (69.97, 2.93, 15.27, 22.34), (46.0, 49.5), amp: 0.11, dur: 1.7, delay: 0),
        ],
        "fitness": [
            layer("fitness-sun", .spin, (2.80, 0.73, 28.24, 34.43), (50.3, 50.1), amp: 360, dur: 36, delay: 0),
            layer("fitness-shoes", .bob, (0.00, 30.77, 66.16, 55.31), (49.9, 96.2), amp: -2.89, dur: 1.4, delay: 0),
        ],
        "family": [
            layer("family-sun", .spin, (3.82, 1.83, 28.24, 35.53), (53.8, 48.3), amp: 360, dur: 40, delay: 0),
            layer("family-heart", .beat, (53.94, 4.76, 17.30, 22.34), (46.6, 50.3), amp: 0.12, dur: 1.6, delay: 0),
            layer("family-tree-l", .sway, (0.76, 37.00, 19.34, 54.21), (42.6, 95.9), amp: 2.8, dur: 4.6, delay: -1),
            layer("family-tree-r", .sway, (81.93, 38.83, 15.27, 52.38), (59.4, 95.8), amp: 3, dur: 4.1, delay: -2.6),
        ],
        "school": [
            layer("school-star", .rock, (6.87, 7.69, 16.28, 23.44), (49.9, 48.2), amp: 10, dur: 3.2, delay: 0),
            layer("school-globe", .rock, (63.87, 6.96, 26.21, 38.10), (50.1, 50.0), amp: 6, dur: 5.2, delay: -1),
            layer("school-pencils", .sway, (42.75, 11.72, 18.32, 26.37), (50.5, 99.6), amp: 2.4, dur: 3.4, delay: -0.7),
            layer("school-pencil", .sway, (66.92, 66.67, 18.32, 33.33), (16.8, 94.0), amp: 4, dur: 1.2, delay: 0),
        ],
        "project": [
            layer("project-bulb", .beat, (50.89, 39.93, 19.34, 23.08), (52.3, 69.7), amp: 0.08, dur: 2.2, delay: 0),
            layer("project-leaves", .sway, (6.87, 63.74, 22.14, 29.30), (36.7, 93.0), amp: 3.4, dur: 4.2, delay: -1),
            layer("project-pencil", .sway, (62.85, 48.72, 25.19, 51.28), (8.5, 96.1), amp: 3, dur: 1.3, delay: 0),
            layer("project-note", .flutter, (1.78, 18.68, 21.37, 52.38), (52.5, 4.4), amp: 2.2, dur: 4, delay: -1.6),
        ],
        "church": [
            layer("church-sun", .spin, (54.96, 0.73, 31.04, 40.29), (51.7, 45.3), amp: 360, dur: 40, delay: 0),
            layer("church-cloud-l", .drift, (2.80, 4.76, 30.28, 26.37), (50.2, 50.2), amp: 8.59, dur: 7, delay: 0),
            layer("church-cloud-r", .drift, (70.99, 28.94, 25.19, 20.15), (51.6, 49.9), amp: -9.53, dur: 8, delay: -3),
            layer("church-tree-l", .sway, (1.78, 37.00, 22.39, 62.27), (50.1, 93.1), amp: 2.4, dur: 4.8, delay: -1),
            layer("church-tree-r", .sway, (70.99, 49.82, 25.19, 49.45), (43.7, 91.4), amp: 2.8, dur: 4.2, delay: -2.5),
        ],
        "business": [
            layer("business-plant", .sway, (0.00, 24.91, 17.05, 48.35), (58.7, 99.5), amp: 3.4, dur: 4.4, delay: 0),
            layer("business-arrow", .nudge, (20.87, 18.68, 44.27, 38.46), (50.0, 50.2), amp: 3.16, dur: 2.6, delay: 0),
            layer("business-bars", .grow, (21.88, 38.83, 36.13, 40.29), (50.1, 99.7), amp: 0.16, dur: 2.6, delay: 0),
            layer("business-spark", .beat, (83.97, 34.80, 12.21, 12.45), (49.4, 49.8), amp: 0.25, dur: 1.8, delay: -0.4),
        ],
        "custom": [
            layer("custom-star", .rock, (32.82, 16.85, 32.32, 45.42), (50.1, 51.0), amp: 7, dur: 3.4, delay: 0),
        ],
    ]
    // swiftlint:enable line_length
}

/// The base illustration with its motion layers on top. Each layer runs its own period from the Studio spec.
/// Animates whenever visible in the foreground. Reduce Motion keeps the original still illustration.
struct ChalkMotionArt: View {
    let category: String
    /// The width of the art. Its height keeps the original 393:273 proportion, because every cutout box in the
    /// motion table is a percentage of that landscape frame (the 104 x 160 plant is 26.46% x 58.61% of 393 x 273).
    var size: CGFloat = 96

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    // LazyVStack may retain previously scrolled cards. The illustration remains
    // in the hierarchy, but its display-link should not keep rendering at 30 fps
    // when its card disappears from the viewport.
    @State private var isVisible = false
    // Spread is hosted by a UIKit/Capacitor controller, not a SwiftUI App scene.
    // Environment scenePhase may stay inactive in that host and silently freeze every cutout.
    @State private var appIsActive = UIApplication.shared.applicationState == .active
    @State private var began = Date()

    static let aspect: CGFloat = 273.0 / 393.0

    var body: some View {
        let height = size * Self.aspect
        let animated = isVisible && !reduceMotion && appIsActive
        TimelineView(.animation(minimumInterval: 1.0 / 30, paused: !animated)) { timeline in
            let elapsed = animated ? timeline.date.timeIntervalSince(began) : 0
            ZStack {
                ChalkIllustration(category: category, maxWidth: size, maxHeight: height)
                ForEach(ChalkMotionTable.layers(for: category)) { layer in
                    MotionCutout(layer: layer, width: size, height: height, elapsed: elapsed, animated: animated)
                }
                if animated { ChalkEffects(category: category, elapsed: elapsed) }
            }
            .frame(width: size, height: height)
        }
        .accessibilityHidden(true)
        .allowsHitTesting(false)
        .onAppear {
            isVisible = true
            appIsActive = UIApplication.shared.applicationState == .active
            began = Date()
        }
        .onDisappear { isVisible = false }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
            appIsActive = true
            began = Date()
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.willResignActiveNotification)) { _ in
            appIsActive = false
        }
    }
}

private struct MotionCutout: View {
    let layer: ChalkMotionLayer
    let width: CGFloat
    let height: CGFloat
    let elapsed: Double
    let animated: Bool

    var body: some View {
        let phase = ChalkTiming.phase(elapsed, duration: layer.dur, delay: layer.delay)
        let alternate = ChalkTiming.ease(ChalkTiming.phase(elapsed, duration: layer.dur, delay: layer.delay, alternate: true))
        let frame = CGRect(x: layer.box.x / 100 * width, y: layer.box.y / 100 * height,
                           width: layer.box.w / 100 * width, height: layer.box.h / 100 * height)
        // doodles.tsx uses transformOrigin directly on the cutout image: these percentages are local
        // to its box, not positions in the full illustration (the old conversion orbited distant pivots).
        let pivot = UnitPoint(x: layer.origin.x / 100, y: layer.origin.y / 100)
        var angle = 0.0, sx = 1.0, sy = 1.0, dx = 0.0, dy = 0.0
        if animated {
            switch layer.kind {
            case .sway, .rock: angle = layer.amp * (2 * alternate - 1)
            case .flutter: angle = ChalkTiming.sample(phase, [(0, 0), (0.3, layer.amp), (0.6, -0.6 * layer.amp), (1, 0)])
            case .spin: angle = phase * 360
            case .beat:
                sx = ChalkTiming.sample(phase, [(0, 1), (0.12, 1 + layer.amp), (0.22, 1 + layer.amp * 0.5), (0.32, 1), (1, 1)], out: true)
                sy = sx
            case .bob: dy = alternate * layer.amp * Double(frame.height) / 100
            case .drift: dx = (alternate - 0.5) * layer.amp * Double(frame.width) / 100
            case .grow: sy = 1 - layer.amp + alternate * layer.amp
            case .nudge:
                let push = ChalkTiming.sample(phase, [(0, 0), (0.5, 1), (1, 0)])
                dx = push * layer.amp * Double(frame.width) / 100
                dy = -push * layer.amp * Double(frame.height) / 100
            }
        }
        return ChalkImageFrame(resource: layer.src)
            .frame(width: frame.width, height: frame.height)
            .rotationEffect(.degrees(angle), anchor: pivot)
            .scaleEffect(x: sx, y: sy, anchor: pivot)
            .offset(x: dx, y: dy)
            .position(x: frame.midX, y: frame.midY)
    }
}

private struct ChalkImageFrame: View {
    let resource: String

    var body: some View {
        if let image = ChalkMotionImage.load(resource) {
            Image(uiImage: image).resizable().scaledToFit()
        } else {
            Color.clear
        }
    }
}

enum ChalkMotionImage {
    /// Cached: the cutouts are redrawn every frame, and decoding a WebP per frame would stall the animation.
    static let cache = NSCache<NSString, UIImage>()

    static func load(_ resource: String) -> UIImage? {
        if let cached = cache.object(forKey: resource as NSString) { return cached }
        guard let url = Bundle.module.url(forResource: resource, withExtension: "webp", subdirectory: "Motion"),
              let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil) else { return nil }
        let decoded = UIImage(cgImage: cgImage)
        cache.setObject(decoded, forKey: resource as NSString)
        return decoded
    }
}
#endif
