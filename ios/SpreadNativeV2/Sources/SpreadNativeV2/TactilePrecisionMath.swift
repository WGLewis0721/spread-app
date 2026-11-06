import Foundation

/// Pure gesture threshold math; no persistence or platform state.
public enum TactilePrecisionMath {
    public static func revealTarget(
        current: Double, translation: Double, projected: Double,
        threshold: Double = 42, stop: Double = 92
    ) -> Double {
        guard current.isFinite, translation.isFinite, projected.isFinite,
              threshold > 0, stop > 0 else { return 0 }
        let actual = current + translation
        let predicted = current + projected
        let momentum = abs(predicted) >= threshold * 1.5 && predicted.sign == actual.sign
        let result = abs(actual) >= threshold ? actual : (momentum ? predicted : 0)
        return result > 0 ? stop : result < 0 ? -stop : 0
    }

    /// +1 is next day, -1 previous day, 0 means another gesture axis.
    public static func daySwipeDirection(
        horizontal: Double, vertical: Double, minimum: Double = 65
    ) -> Int {
        guard horizontal.isFinite, vertical.isFinite, minimum > 0,
              abs(horizontal) >= minimum, abs(horizontal) > abs(vertical) * 1.4 else { return 0 }
        return horizontal < 0 ? 1 : -1
    }
}
