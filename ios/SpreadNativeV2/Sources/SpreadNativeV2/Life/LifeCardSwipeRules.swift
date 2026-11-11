import Foundation

/// What a finished drag on a Life card means. Pure arithmetic with no view state, so every
/// threshold can be tested. The numbers are the ones PR #158 shipped: Manage settles 92 pt
/// to the left after a 34 pt drag, the card follows the finger no further than 110 pt to
/// the left, and a rightward drag must be deliberate before the Life area is removed.
enum LifeCardSwipeRules {
    /// Where the card settles when Manage is open.
    static let manageStop = 92.0
    /// A leftward drag at least this long opens Manage on release.
    static let manageThreshold = 34.0
    /// The card never follows the finger further left than this.
    static let manageDragLimit = 110.0
    /// A drag counts as sideways only when it is clearly more sideways than vertical.
    static let horizontalDominance = 1.5

    enum Outcome: Equatable {
        /// Not in Edit, or the card is already leaving: the drag means nothing.
        case ignore
        /// A mostly vertical drag: the card returns from the finger, Manage stays as it was.
        case keepReveal
        /// A rightward drag that was not decisive: the card returns to rest, Manage closes.
        case closeReveal
        /// A leftward drag: the card settles at this offset (0 closed, negative open).
        case reveal(Double)
        /// A decisive rightward drag: the card leaves and the Life area is removed, with Undo.
        case dismiss
    }

    static func isHorizontal(horizontal: Double, vertical: Double) -> Bool {
        abs(horizontal) > abs(vertical) * horizontalDominance
    }

    /// Where the card sits under the finger while the drag is still going.
    static func liveOffset(horizontal: Double, exitDistance: Double) -> Double {
        horizontal > 0 ? min(exitDistance, horizontal) : max(-manageDragLimit, horizontal)
    }

    static func outcome(
        editing: Bool, dismissing: Bool, reveal: Double,
        horizontal: Double, vertical: Double, predictedEnd: Double, exitDistance: Double
    ) -> Outcome {
        guard editing, !dismissing else { return .ignore }
        guard isHorizontal(horizontal: horizontal, vertical: vertical) else { return .keepReveal }
        if horizontal > 0 {
            let decisive = TactilePrecisionMath.cardShouldDismissRight(
                traveled: max(0, reveal + horizontal),
                projected: max(0, reveal + predictedEnd),
                exitDistance: exitDistance)
            return decisive ? .dismiss : .closeReveal
        }
        let target = TactilePrecisionMath.revealTarget(
            current: reveal, translation: horizontal, projected: predictedEnd,
            threshold: manageThreshold, stop: manageStop)
        return .reveal(min(0, target))
    }

    /// A tap selects a card only outside Edit. In Edit the card is for swiping.
    static func tapSelects(editing: Bool) -> Bool { !editing }
}
