#if os(iOS)
import SwiftUI

/// Retains the name to keep Classic and Life call sites compatible.
/// Calendar weeks advance with precise taps or accelerating held arrows.
/// Horizontal swipe speed no longer changes weeks.
struct WeekCrownView: View {
    let title: String
    let detail: String?
    var onDetail: (() -> Void)? = nil
    let onMove: (Int) -> Void
    var isMonth = false

    var body: some View {
        SpreadArrowValueControl(
            value: title,
            detail: detail ?? (isMonth ? "Calendar month" : "Calendar week"),
            onValue: onDetail,
            repeatsOnHold: true,
            leftLabel: isMonth ? "Previous month" : "Previous week",
            rightLabel: isMonth ? "Next month" : "Next week",
            onMove: onMove
        )
        .accessibilityHint("Tap to change one period. Hold an arrow to browse faster.")
        .accessibilityIdentifier("calendar-week-navigator")
    }
}
#endif
