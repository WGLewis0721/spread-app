import Foundation

/// Window-space decisions, independent of device family or orientation. A regular-width phone can be
/// narrower than an iPad window: both retain one column until two complete day cards actually fit.
public enum PlannerLayout {
    public static func dayColumns(availableWidth: Double, accessibilityText: Bool) -> Int {
        !accessibilityText && availableWidth >= 744 ? 2 : 1
    }
}
