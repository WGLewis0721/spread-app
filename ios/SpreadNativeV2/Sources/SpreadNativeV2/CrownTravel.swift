import Foundation

/// Pure week-detent reducer; the on-screen Crown owns *only* transient gesture state.
/// The real week change must be committed by SpreadPlannerAdapter. A rapid reversal
/// returns the exact signed delta, never an extra change from an in-flight animation.
public struct CrownTravel: Sendable {
    public static let pointsPerWeek = 64.0
    public static let maxDetentsPerGesture = 3

    public private(set) var crossed = 0

    public init() {}

    /// Returns new signed detents crossed since the previous gesture update.
    /// Swift Int conversion truncates toward zero: sub-detent gestures never commit.
    public mutating func update(translation: Double) -> Int {
        guard translation.isFinite else { return 0 }
        let whole = Int((translation / Self.pointsPerWeek).rounded(.towardZero))
        let target = min(Self.maxDetentsPerGesture, max(-Self.maxDetentsPerGesture, whole))
        let delta = target - crossed
        crossed = target
        return delta
    }

    public mutating func release() {
        crossed = 0
    }
}
