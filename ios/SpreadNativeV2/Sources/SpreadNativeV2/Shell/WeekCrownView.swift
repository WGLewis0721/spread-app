#if os(iOS)
import SwiftUI

/// The original Spread Crown: a horizontal knurled metal wheel (`week-crown.tsx`, `.crown-wheel`), not a dial.
/// Every 64 points of finger travel is one week. The ridges follow the finger continuously, a reversal
/// cancels rather than committing twice (`CrownTravel`), and each accepted detent is one `onMove` call.
/// Edge caps are real 44 pt buttons; VoiceOver and the keyboard use the same move path.
struct WeekCrownView: View {
    let title: String
    /// Readout detail. When `onDetail` is set it is a tappable accent button ("Back to this week").
    let detail: String?
    var onDetail: (() -> Void)? = nil
    /// Negative = previous week, positive = next week. The caller commits the change through the store.
    let onMove: (Int) -> Void

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var travel = CrownTravel()
    @State private var translation: CGFloat = 0
    @State private var live = false
    /// True while a finger is on the wheel. A `GestureState` resets on cancel as well as on end, so a drag that the
    /// system interrupts (an alert, an edge gesture) can never leave the reducer holding detents for the next drag.
    @GestureState private var gestureActive = false
    @State private var hintVisible = !UserDefaults.standard.bool(forKey: SpreadViewMemory.crownUsedKey)

    /// 3.85rem, growing with Dynamic Type so the recessed readout never clips its text.
    @ScaledMetric(relativeTo: .callout) private var height: CGFloat = 62
    private let radius: CGFloat = 18.4   // 1.15rem
    private let knurlPeriod: CGFloat = 22
    @Environment(\.displayScale) private var displayScale

    var body: some View {
        VStack(spacing: 8) {
            wheel
            if hintVisible {
                Text("Drag the Crown to change weeks.")
                    .font(Spread.footnote)
                    .foregroundStyle(Spread.secondary)
                    .accessibilityAddTraits(.updatesFrequently)
            }
        }
    }

    private var wheel: some View {
        ZStack {
            // Knurl and ridges. The pattern shifts by the finger's residual so the ridges move with the hand.
            Canvas { context, size in
                let shift = reduceMotion ? 0 : translation.truncatingRemainder(dividingBy: knurlPeriod)
                let gap = colorScheme == .dark ? Spread.toothGapDark : Spread.toothGapLight
                context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(gap))
                let dark = colorScheme == .dark ? Spread.toothDarkDark : Spread.toothDarkLight
                let mid = colorScheme == .dark ? Spread.toothMidDark : Spread.toothMidLight
                let light = colorScheme == .dark ? Spread.toothLightDark : Spread.toothLightLight
                var x = -knurlPeriod + shift
                while x < size.width + knurlPeriod {
                    let alignedX = ((x + 1) * displayScale).rounded() / displayScale
                    let rect = CGRect(x: alignedX, y: 0, width: 20, height: size.height)
                    let gradient = Gradient(stops: [
                        .init(color: dark.opacity(0.25), location: 0), .init(color: mid.opacity(0.35), location: 0.38),
                        .init(color: light.opacity(0.38), location: 0.5), .init(color: mid.opacity(0.35), location: 0.64),
                        .init(color: dark.opacity(0.25), location: 1),
                    ])
                    context.fill(
                        Path(roundedRect: rect, cornerRadius: 2.2),
                        with: .linearGradient(gradient, startPoint: CGPoint(x: rect.minX, y: 0), endPoint: CGPoint(x: rect.maxX, y: 0))
                    )
                    x += knurlPeriod
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .background(metal, in: RoundedRectangle(cornerRadius: radius, style: .continuous))

            // Sheen: a thin highlight on top and a shadowed lower edge, like the CSS `.crown-sheen`.
            LinearGradient(
                stops: [
                    .init(color: .white.opacity(0.85), location: 0), .init(color: .white.opacity(0.22), location: 0.02),
                    .init(color: .clear, location: 0.34), .init(color: .clear, location: 0.62),
                    .init(color: .black.opacity(0.22), location: 0.86), .init(color: .white.opacity(0.28), location: 1),
                ],
                startPoint: .top, endPoint: .bottom
            )
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .allowsHitTesting(false)

            readout

            HStack(spacing: 0) {
                cap(label: "Previous week", direction: -1, leading: true)
                Spacer(minLength: 0)
                cap(label: "Next week", direction: 1, leading: false)
            }
        }
        .frame(height: height)
        .contentShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
        .gesture(dragGesture)
        .onChange(of: gestureActive) { _, active in
            guard !active else { return }
            travel.release()
            live = false
            withAnimation(reduceMotion ? nil : SpreadMotion.press) { translation = 0 }
        }
        .shadow(color: Spread.shadow, radius: 8, y: 4)
        .onKeyPress(.leftArrow) { move(-1); return .handled }
        .onKeyPress(.rightArrow) { move(1); return .handled }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(title). Adjust to change weeks.")
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: move(1)
            case .decrement: move(-1)
            @unknown default: break
            }
        }
        .accessibilityValue(title + (detail.map { ", " + $0 } ?? ""))
        .accessibilityIdentifier("week-crown")
    }

    private var metal: LinearGradient {
        let stops = colorScheme == .dark ? Spread.crownDark : Spread.crownLight
        let count = Double(stops.count - 1)
        return LinearGradient(
            stops: stops.enumerated().map { index, color in .init(color: color, location: Double(index) / count) },
            startPoint: .top, endPoint: .bottom
        )
    }

    private var readout: some View {
        HStack(spacing: 0) {
            Color.clear.frame(width: 44).allowsHitTesting(false).accessibilityHidden(true)
            if let onDetail {
                Button(action: onDetail) { readoutLabels.contentShape(Rectangle()) }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("week-crown-detail")
            } else {
                readoutLabels.accessibilityHidden(true)
            }
            Color.clear.frame(width: 44).allowsHitTesting(false).accessibilityHidden(true)
        }
        .padding(.vertical, 2)
        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Spread.crownRecess))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Spread.crownRecessStroke, lineWidth: 1))
        .padding(.horizontal, 50)
        .padding(.vertical, 7)
    }

    /// The whole central readout is a 44pt action when returning to this week. Giving that action both
    /// lines avoids an undersized detail target without growing the Crown or shifting the page header.
    private var readoutLabels: some View {
        VStack(spacing: 1) {
            Text(title)
                .font(.system(.callout, weight: .semibold))
                .foregroundStyle(Spread.ink)
                .lineLimit(2).minimumScaleFactor(0.8)
            if let detail {
                Text(detail).font(.system(.caption, weight: .medium))
                    .foregroundStyle(onDetail == nil ? Spread.secondary : Spread.accent)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 44)
    }

    /// Metal caps: a narrow shaded edge drawn over a 44 pt hit region that moves one week.
    private func cap(label: String, direction: Int, leading: Bool) -> some View {
        Button { move(direction) } label: {
            ZStack(alignment: leading ? .leading : .trailing) {
                Color.clear
                Rectangle()
                    .fill(LinearGradient(
                        colors: leading
                            ? [.black.opacity(0.38), .white.opacity(0.38), .clear]
                            : [.clear, .white.opacity(0.38), .black.opacity(0.38)],
                        startPoint: leading ? .leading : .trailing, endPoint: leading ? .trailing : .leading))
                    .frame(width: 11.5)
                    .allowsHitTesting(false)
                // The chevron sits inside the recess, at its end, as in the specimen (it never touches the date). The
                // whole 94 pt zone (ribbed shoulder plus the chevron) is one 44 pt-tall button, so what you see is what you hit.
                Image(systemName: leading ? "chevron.left" : "chevron.right")
                    .font(.system(.body, weight: .bold))
                    .foregroundStyle(Spread.ink.opacity(0.92))
                    .frame(width: 44)
                    .padding(leading ? .leading : .trailing, 50)
                    .allowsHitTesting(false)
            }
            .frame(width: 94, height: height)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityIdentifier(leading ? "crown-previous" : "crown-next")
    }

    /// Finger tracking. A 64 point crossing commits one week; the ridges keep moving with the finger.
    private var dragGesture: some Gesture {
        DragGesture(minimumDistance: 0)
            .updating($gestureActive) { _, state, _ in state = true }
            .onChanged { value in
                live = true
                translation = value.translation.width
                // Dragging right (positive) is the previous week, exactly as the React Crown.
                let delta = travel.update(translation: Double(value.translation.width))
                for _ in 0..<abs(delta) { step(delta > 0 ? -1 : 1) }
            }
    }

    /// Keyboard, caps and VoiceOver: one committed week per call.
    private func move(_ direction: Int) {
        guard direction != 0 else { return }
        step(direction > 0 ? 1 : -1)
    }

    private func step(_ direction: Int) {
        if hintVisible {
            hintVisible = false
            UserDefaults.standard.set(true, forKey: SpreadViewMemory.crownUsedKey)
        }
        onMove(direction)
    }
}
#endif
