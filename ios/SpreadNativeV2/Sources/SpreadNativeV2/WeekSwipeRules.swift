import Foundation

/// Week swipe arbitration, lifted directly from `src/spread/gestures/swipe.ts`.
/// A swipe is 64 points of horizontal travel that dominates vertical travel 1.5 to 1, and never starts within
/// 24 points of a screen edge. While the finger is down the visual shift is capped at 72 points.
///
/// This file is portable on purpose (no UIKit), so the arbitration is unit-tested on every platform the package builds on.
enum WeekSwipeRules {
    static let threshold: CGFloat = 64
    static let dominance: CGFloat = 1.5
    static let edgeGuard: CGFloat = 24
    static let maxShift: CGFloat = 72

    /// -1 is the previous week (dragging right), 1 the next (dragging left), nil for no commit.
    static func direction(start: CGPoint, end: CGPoint, width: CGFloat, velocity: CGPoint = .zero) -> Int? {
        guard start.x.isFinite, start.y.isFinite, end.x.isFinite, end.y.isFinite,
              velocity.x.isFinite, velocity.y.isFinite, width.isFinite else { return nil }
        if width > 0, start.x < edgeGuard || start.x > width - edgeGuard { return nil }
        let dx = end.x - start.x
        let dy = end.y - start.y
        if abs(dx) > threshold, abs(dx) > abs(dy) * dominance { return dx < 0 ? 1 : -1 }
        // A short deliberate flick may reach the adjacent week; a reversal or
        // dominant vertical scroll cannot borrow momentum from the other axis.
        if abs(dx) >= 12, abs(dx) > abs(dy) * dominance,
           dx.sign == velocity.x.sign, abs(velocity.x) > abs(velocity.y) * dominance,
           abs(dx + velocity.x * 0.18) >= threshold * 1.5 { return dx < 0 ? 1 : -1 }
        return nil
    }

    static func shift(start: CGPoint, current: CGPoint) -> CGFloat {
        let dx = current.x - start.x
        let dy = current.y - start.y
        if abs(dx) < 8 || abs(dx) < abs(dy) { return 0 }
        return min(maxShift, max(-maxShift, dx))
    }

    /// Whether the horizontal pan may begin, decided where it matters: before the vertical scroll view claims the touch.
    ///
    /// It judges the distance the finger has already travelled. Velocity is only a fallback for the moment no travel
    /// has been reported: a recognizer asked to begin can still report zero velocity (a very fast or synthesized drag),
    /// and a velocity-only test then refuses every such swipe, since 0 is never greater than 0 times the dominance.
    static func shouldBegin(start: CGPoint, translation: CGPoint, velocity: CGPoint, width: CGFloat) -> Bool {
        guard width > 0, start.x >= edgeGuard, start.x <= width - edgeGuard else { return false }
        let travelX = abs(translation.x)
        let travelY = abs(translation.y)
        if travelX > 0 || travelY > 0 { return travelX > travelY * dominance }
        return abs(velocity.x) > abs(velocity.y) * dominance
    }
}
