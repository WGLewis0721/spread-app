#if os(iOS)
import SwiftUI

/// An ordinary calendar-week navigator; its swipe speed changes the number of
/// weeks moved in a single acknowledged planner action, never repeated timers.
enum WeekSwipeSpeed {
    static func steps(translation: Double, velocity: Double) -> Int {
        guard abs(translation) >= 24 else { return 0 }
        let speed = abs(velocity)
        let amount: Int
        switch speed {
        case 1800...: amount = min(8, max(3, Int((speed / 550).rounded())))
        case 900..<1800: amount = 2
        default: amount = 1
        }
        // Swiping left moves forward in calendar time.
        return translation < 0 ? amount : -amount
    }
}

/// Retains the original SwiftUI component name to avoid changing unrelated
/// callers, but has no metallic, knurled, Crown, or wheel styling.
struct WeekCrownView: View {
    let title: String
    let detail: String?
    var onDetail: (() -> Void)? = nil
    let onMove: (Int) -> Void
    var isMonth = false

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var translation: CGFloat = 0

    var body: some View {
        HStack(spacing: 0) {
            moveButton(-1, icon: "chevron.left", title: "Previous " + period)
            Button {
                onDetail?()
            } label: {
                VStack(spacing: 2) {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .monospacedDigit()
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                        .foregroundStyle(Spread.ink)
                    Text(detail ?? (isMonth ? "Calendar month" : "Calendar week"))
                        .font(.caption2)
                        .foregroundStyle(Spread.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                .frame(maxWidth: .infinity, minHeight: 52)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(onDetail == nil)
            .accessibilityLabel(onDetail == nil ? title : title + ", return to current " + period)
            .accessibilityIdentifier("calendar-period-label")
            moveButton(1, icon: "chevron.right", title: "Next " + period)
        }
        .frame(maxWidth: .infinity, minHeight: 56)
        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusControl, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Spread.radiusControl, style: .continuous)
            .strokeBorder(Spread.line, lineWidth: 1))
        .offset(x: reduceMotion ? 0 : max(-12, min(12, translation * 0.1)))
        .contentShape(RoundedRectangle(cornerRadius: Spread.radiusControl))
        .simultaneousGesture(
            DragGesture(minimumDistance: 12)
                .onChanged { gesture in
                    guard abs(gesture.translation.width) > abs(gesture.translation.height) * 1.4 else { return }
                    translation = gesture.translation.width
                }
                .onEnded { gesture in
                    translation = 0
                    guard abs(gesture.translation.width) > abs(gesture.translation.height) * 1.4 else { return }
                    let steps = WeekSwipeSpeed.steps(translation: Double(gesture.translation.width),
                                                     velocity: Double(gesture.velocity.width))
                    if steps != 0 { onMove(steps) }
                }
        )
        .accessibilityElement(children: .contain)
        .accessibilityHint("Swipe left or right to browse weeks. A faster swipe skips more weeks.")
        .accessibilityIdentifier("calendar-week-navigator")
    }

    private var period: String { isMonth ? "month" : "week" }

    private func moveButton(_ direction: Int, icon: String, title: String) -> some View {
        Button { onMove(direction) } label: {
            Image(systemName: icon)
                .font(.body.weight(.semibold))
                .foregroundStyle(Spread.ink)
                .frame(width: 44, height: 52)
                .contentShape(Rectangle())
        }
        .buttonStyle(.spreadPress)
        .accessibilityLabel(title)
    }
}
#endif
