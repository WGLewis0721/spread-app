import Foundation

/// Window-space decisions, independent of device family or orientation. A regular-width phone can be
/// narrower than an iPad window: both retain one column until two complete day cards actually fit.
public enum PlannerLayout {
    public static func dayColumns(availableWidth: Double, accessibilityText: Bool) -> Int {
        !accessibilityText && availableWidth >= 744 ? 2 : 1
    }
}


/// Two content-fit presentations, never a device/pose-name switch.
/// Widths include a dedicated side Crown rail only in the regular presentation.
public enum SpreadAdaptivePresentation: Equatable {
    case compact
    case regular
}

public struct SpreadAdaptivePlan {
    public let presentation: SpreadAdaptivePresentation
    public let leadingWidth: Double
    public let trailingWidth: Double
    public let separation: Double

    public static let outerPadding: Double = 12
    public static let crownWidth: Double = 56
    public static let crownSpacing: Double = 6
    public static let paneSpacing: Double = 12
    public static let minLeadingWidth: Double = 292
    public static let minTrailingWidth: Double = 308

    /// "Regular" is allowed only when complete Wallet and Week controls fit.
    /// On a partial fold, the two panes occupy their own reserved-region halves.
    /// The Crown lives on the outside edge chosen in Settings.
    public static func fit(
        availableWidth: Double,
        regularSizeClass: Bool,
        accessibilityText: Bool,
        crownOnLeft: Bool,
        verticalDivision: ClosedRange<Double>? = nil
    ) -> SpreadAdaptivePlan {
        let compact = SpreadAdaptivePlan(presentation: .compact, leadingWidth: 0, trailingWidth: 0, separation: 0)
        guard regularSizeClass, !accessibilityText,
              availableWidth.isFinite, availableWidth > 0 else { return compact }

        let leading: Double
        let trailing: Double
        let gap: Double
        let crown = crownWidth + crownSpacing

        if let fold = verticalDivision {
            guard fold.lowerBound >= outerPadding, fold.upperBound <= availableWidth,
                  fold.lowerBound <= fold.upperBound else { return compact }
            // 12pt breathing room on both sides of the physical division.
            let foldClearance = 12.0
            gap = fold.upperBound - fold.lowerBound + 2 * foldClearance
            leading = fold.lowerBound - outerPadding - foldClearance - (crownOnLeft ? crown : 0)
            trailing = availableWidth - fold.upperBound - outerPadding - foldClearance
                - (crownOnLeft ? 0 : crown)
        } else {
            gap = paneSpacing
            let paneSpace = availableWidth - 2 * outerPadding - crown - gap
            leading = min(420, max(minLeadingWidth, paneSpace * 0.42))
            trailing = paneSpace - leading
        }
        guard leading >= minLeadingWidth, trailing >= minTrailingWidth else { return compact }
        return SpreadAdaptivePlan(presentation: .regular, leadingWidth: leading, trailingWidth: trailing, separation: gap)
    }
}
