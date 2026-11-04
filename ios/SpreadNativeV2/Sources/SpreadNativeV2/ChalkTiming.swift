import Foundation

/// CSS timing and keyframe sampling from Studio render.css. Translations are percentages of each
/// cutout, and negative animation delays begin partway through the cycle, exactly as CSS does.
enum ChalkTiming {
    static func phase(_ seconds: Double, duration: Double, delay: Double = 0, alternate: Bool = false) -> Double {
        let time = max(0, seconds - delay) / duration
        let cycle = floor(time)
        let fraction = time - cycle
        return alternate && Int(cycle).isMultiple(of: 2) == false ? 1 - fraction : fraction
    }
    static func ease(_ x: Double, out: Bool = false) -> Double {
        let x = min(1, max(0, x))
        let a = out ? 0.0 : 0.42, b = 0.58
        var low = 0.0, high = 1.0
        for _ in 0..<28 {
            let t = (low + high) / 2, u = 1 - t
            let at = 3 * u * u * t * a + 3 * u * t * t * b + t * t * t
            if at < x { low = t } else { high = t }
        }
        let t = (low + high) / 2
        return 3 * (1 - t) * t * t + t * t * t
    }
    static func sample(_ progress: Double, _ frames: [(Double, Double)], out: Bool = false) -> Double {
        guard let first = frames.first, let last = frames.last else { return 0 }
        if progress <= first.0 { return first.1 }
        for index in 1..<frames.count where progress <= frames[index].0 {
            let from = frames[index - 1], to = frames[index]
            let local = ease((progress - from.0) / (to.0 - from.0), out: out)
            return from.1 + (to.1 - from.1) * local
        }
        return last.1
    }
}
