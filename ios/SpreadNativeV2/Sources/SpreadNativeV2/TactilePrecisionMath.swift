import Foundation

/// Pure gesture threshold math; no persistence or platform state.
public enum TactilePrecisionMath {
    public static func revealTarget(
        current: Double, translation: Double, projected: Double,
        threshold: Double = 42, stop: Double = 92
    ) -> Double {
        guard current.isFinite, translation.isFinite, projected.isFinite,
              threshold.isFinite, stop.isFinite, threshold > 0, stop > 0 else { return 0 }
        let actual = current + translation
        let predicted = current + projected
        // Momentum may extend the actual release direction, never undo a reversal.
        let momentum = abs(translation) >= 12 && abs(predicted) >= threshold * 1.5 &&
            predicted.sign == actual.sign && projected.sign == translation.sign
        let result = abs(actual) >= threshold ? actual : (momentum ? predicted : 0)
        return result > 0 ? stop : result < 0 ? -stop : 0
    }

    /// +1 is next day, -1 previous day, 0 means another gesture axis.
    public static func daySwipeDirection(
        horizontal: Double, vertical: Double, projected: Double? = nil, minimum: Double = 65
    ) -> Int {
        guard horizontal.isFinite, vertical.isFinite, minimum.isFinite, minimum > 0,
              abs(horizontal) >= 12, abs(horizontal) > abs(vertical) * 1.5 else { return 0 }
        let prediction = projected ?? horizontal
        guard prediction.isFinite else { return 0 }
        let momentum = prediction.sign == horizontal.sign && abs(prediction) >= minimum * 1.5
        guard abs(horizontal) >= minimum || momentum else { return 0 }
        return horizontal < 0 ? 1 : -1
    }

    /// A draft detent is bounded and rounded before it can reach the planner.
    public static func hours(origin: Double, translation: Double, step: Double,
                             pointsPerStep: Double = 24) -> Double {
        guard origin.isFinite, translation.isFinite, step.isFinite, pointsPerStep.isFinite,
              step > 0, pointsPerStep > 0 else { return origin }
        let detents = (translation / pointsPerStep).rounded(.towardZero)
        return min(168, max(0, origin + detents * step))
    }
}

/// Deterministic tick/boundary ownership, independent of UIKit and wall-clock changes.
public struct TactileCueGate: Sendable {
    private var lastTick: Double = -.infinity
    private var warned = false
    public init() {}
    public mutating func tick(at now: Double, enabled: Bool = true) -> Bool {
        guard enabled, now.isFinite, now - lastTick >= 0.075 else { return false }
        lastTick = now
        return true
    }
    public mutating func boundary(enabled: Bool = true) -> Bool {
        guard enabled, !warned else { return false }
        warned = true
        return true
    }
    public mutating func reset() { lastTick = -.infinity; warned = false }
}
