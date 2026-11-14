#if os(iOS)
import SwiftUI

/// Slower first, faster later. Holding is bounded by the gesture lifetime;
/// the arrow never generates an unbounded calendar jump from one tap.
enum SpreadHoldPace {
    static let initialDelayMilliseconds = 440

    static func repeatDelayMilliseconds(afterStep index: Int) -> Int {
        if index < 5 { return 270 }
        if index < 14 { return 165 }
        return 105
    }
}

/// A 44pt accessible arrow used by calendar and budget value controls.
/// A brief touch advances once; optional press-and-hold repeats until release.
/// Default VoiceOver/keyboard button action remains a single step.
struct SpreadArrowButton: View {
    let direction: Int
    let label: String
    var disabled = false
    var repeatsOnHold = false
    let onStep: () -> Void

    @State private var touching = false
    @State private var repeated = false
    @State private var holdTask: Task<Void, Never>?

    var body: some View {
        Button(action: onStep) {
            SpreadIcon(name: direction < 0 ? "lucide-chevron-left" : "lucide-chevron-right", size: 20)
                .font(.body.weight(.semibold))
                .foregroundStyle(disabled ? Spread.secondary : Spread.ink)
                .frame(width: Spread.minimumTarget, height: 52)
                .contentShape(Rectangle())
        }
        .buttonStyle(.spreadPress)
        .disabled(disabled)
        // Touch handling owns the gesture, so releasing after a hold never
        // emits a stray extra week. VoiceOver still activates the real button.
        .highPriorityGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in beginTouch() }
                .onEnded { _ in endTouch() }
        )
        .accessibilityLabel(label)
        .accessibilityHint(repeatsOnHold ? "Touch and hold to move faster" : "Adjust one step")
        .onDisappear { cancelTouch() }
    }

    private func beginTouch() {
        guard !disabled, !touching else { return }
        touching = true
        repeated = false
        guard repeatsOnHold else { return }
        holdTask = Task { @MainActor in
            do {
                try await Task.sleep(for: .milliseconds(SpreadHoldPace.initialDelayMilliseconds))
            } catch { return }
            var index = 0
            while !Task.isCancelled && touching {
                repeated = true
                onStep()
                do {
                    try await Task.sleep(for: .milliseconds(SpreadHoldPace.repeatDelayMilliseconds(afterStep: index)))
                } catch { return }
                index += 1
            }
        }
    }

    private func endTouch() {
        guard touching else { return }
        let wasRepeating = repeated
        cancelTouch()
        if !wasRepeating && !disabled { onStep() }
    }

    private func cancelTouch() {
        touching = false
        holdTask?.cancel()
        holdTask = nil
        repeated = false
    }
}

/// Same left / centered value / right affordance for hours and calendar.
/// The centered value remains an accessible button when it opens direct entry.
struct SpreadArrowValueControl: View {
    let value: String
    var detail: String? = nil
    var onValue: (() -> Void)? = nil
    var valueIdentifier = "arrow-current-value"
    var leftDisabled = false
    var rightDisabled = false
    var repeatsOnHold = false
    var leftLabel = "Decrease"
    var rightLabel = "Increase"
    let onMove: (Int) -> Void

    var body: some View {
        HStack(spacing: 0) {
            SpreadArrowButton(direction: -1, label: leftLabel,
                              disabled: leftDisabled, repeatsOnHold: repeatsOnHold) { onMove(-1) }
            Button { onValue?() } label: {
                VStack(spacing: 2) {
                    Text(value)
                        .font(.subheadline.weight(.semibold))
                        .monospacedDigit()
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                        .foregroundStyle(Spread.ink)
                    if let detail {
                        Text(detail)
                            .font(.caption2)
                            .foregroundStyle(Spread.secondary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                }
                .frame(maxWidth: .infinity, minHeight: 52)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(onValue == nil)
            .accessibilityLabel(value + (detail.map { ", " + $0 } ?? ""))
            .accessibilityIdentifier(valueIdentifier)
            SpreadArrowButton(direction: 1, label: rightLabel,
                              disabled: rightDisabled, repeatsOnHold: repeatsOnHold) { onMove(1) }
        }
        .frame(maxWidth: .infinity, minHeight: 56)
        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusControl))
        .overlay(RoundedRectangle(cornerRadius: Spread.radiusControl)
            .strokeBorder(Spread.line, lineWidth: 1))
        .accessibilityElement(children: .contain)
    }
}
#endif
