#if os(iOS)
import SwiftUI

/// Compact keeps WeekCrownView horizontal. An expanded iPhone Duo/iPad scene
/// instead shows the same week actions on an outer side rail, around thumb height.
/// Placement (left/right) is a local UI preference; week changes still go through
/// SpreadLiveRoot -> LivePlanner, and never create a second data writer.
struct VerticalWeekCrownView: View {
    let title: String
    let detail: String?
    let onDetail: (() -> Void)?
    let onMove: (Int) -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorScheme) private var colorScheme
    @GestureState private var gestureActive = false
    @State private var travel = CrownTravel()
    @State private var translation: CGFloat = 0
    @ScaledMetric(relativeTo: .body) private var wheelHeight: CGFloat = 190

    private let ridgePeriod: CGFloat = 22

    var body: some View {
        VStack(spacing: 0) {
            directionButton("Previous week", systemName: "chevron.up", direction: -1)
            wheel
            directionButton("Next week", systemName: "chevron.down", direction: 1)
        }
        .frame(width: SpreadAdaptivePlan.crownWidth)
        .background {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Spread.elevated)
        }
        .overlay {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .strokeBorder(Spread.crownRecessStroke, lineWidth: 1)
                .allowsHitTesting(false)
        }
        .shadow(color: Spread.shadow, radius: 8, y: 4)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Week Crown")
        .accessibilityIdentifier("week-crown")
    }

    private func directionButton(_ label: String, systemName: String, direction: Int) -> some View {
        Button { onMove(direction) } label: {
            Image(systemName: systemName)
                .font(.system(.headline, weight: .bold))
                .foregroundStyle(Spread.ink)
                .frame(maxWidth: .infinity, minHeight: 48)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityIdentifier(direction < 0 ? "crown-previous" : "crown-next")
    }

    private var wheel: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(metal)
            Canvas { context, size in
                let offset = reduceMotion ? 0 : translation.truncatingRemainder(dividingBy: ridgePeriod)
                let gap = colorScheme == .dark ? Spread.toothGapDark : Spread.toothGapLight
                let highlight = colorScheme == .dark ? Spread.toothLightDark : Spread.toothLightLight
                var y = -ridgePeriod + offset
                while y < size.height + ridgePeriod {
                    let ridge = CGRect(x: 0, y: y, width: size.width, height: 17)
                    context.fill(
                        Path(roundedRect: ridge, cornerRadius: 2),
                        with: .linearGradient(
                            Gradient(colors: [gap.opacity(0.5), highlight.opacity(0.44), gap.opacity(0.4)]),
                            startPoint: CGPoint(x: 0, y: ridge.minY),
                            endPoint: CGPoint(x: 0, y: ridge.maxY)
                        )
                    )
                    y += ridgePeriod
                }
            }
            .allowsHitTesting(false)

            // The recessed week readout stays horizontal and legible on a narrow rail.
            Group {
                if let onDetail {
                    Button(action: onDetail) { readout }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("week-crown-detail")
                } else {
                    readout
                }
            }
            .padding(5)
        }
        .frame(width: SpreadAdaptivePlan.crownWidth, height: wheelHeight)
        .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        .contentShape(Rectangle())
        .highPriorityGesture(
            DragGesture(minimumDistance: 8)
                .updating($gestureActive) { _, active, _ in active = true }
                .onChanged { value in
                    translation = value.translation.height
                    // Down moves backward; up moves forward. Each 64pt detent
                    // is exactly one acknowledged planner week/Month navigation.
                    let crossings = travel.update(translation: Double(value.translation.height))
                    for _ in 0..<abs(crossings) {
                        onMove(crossings > 0 ? -1 : 1)
                    }
                }
        )
        .onChange(of: gestureActive) { _, active in
            guard !active else { return }
            travel.release()
            withAnimation(reduceMotion ? nil : SpreadMotion.press) { translation = 0 }
        }
        .focusable()
        .focusEffectDisabled()
        .onKeyPress(.upArrow) { onMove(-1); return .handled }
        .onKeyPress(.downArrow) { onMove(1); return .handled }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Adjust week")
        .accessibilityValue(title)
        .accessibilityHint("Drag up for next week or down for previous week.")
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: onMove(1)
            case .decrement: onMove(-1)
            @unknown default: break
            }
        }
    }

    private var readout: some View {
        VStack(spacing: 4) {
            Text("WEEK")
                .font(.system(.caption2, weight: .bold))
                .foregroundStyle(Spread.secondary)
            Text(title)
                .font(.system(.caption2, weight: .semibold))
                .foregroundStyle(Spread.ink)
                .multilineTextAlignment(.center)
                .lineLimit(4)
                .minimumScaleFactor(0.85)
                .fixedSize(horizontal: false, vertical: true)
            if onDetail != nil {
                Image(systemName: "arrow.uturn.backward")
                    .font(.system(.caption2, weight: .semibold))
                    .foregroundStyle(Spread.accent)
                    .accessibilityLabel(detail ?? "Return to current week")
            }
        }
        .frame(maxWidth: .infinity, minHeight: 68)
        .padding(.vertical, 8)
        .background {
            RoundedRectangle(cornerRadius: 11, style: .continuous)
                .fill(Spread.crownRecess)
        }
        .overlay {
            RoundedRectangle(cornerRadius: 11, style: .continuous)
                .strokeBorder(Spread.crownRecessStroke, lineWidth: 1)
                .allowsHitTesting(false)
        }
        .contentShape(Rectangle())
    }

    private var metal: LinearGradient {
        LinearGradient(
            colors: colorScheme == .dark ? Spread.crownDark : Spread.crownLight,
            startPoint: .leading,
            endPoint: .trailing
        )
    }
}
#endif
