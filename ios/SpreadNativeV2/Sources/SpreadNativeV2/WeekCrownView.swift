#if os(iOS)
import SwiftUI
import UIKit

/// The original Spread Crown is a horizontal knurled wheel, not a circular dial.
/// It is an on-screen control: watchOS hardware Digital Crown APIs are not used.
struct WeekCrownView: View {
    let title: String
    let detail: String
    let onMove: (Int) -> Void
    let onToday: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var travel = CrownTravel()
    @State private var currentTranslation: CGFloat = 0

    var body: some View {
        HStack(spacing: 0) {
            Button { commit(-1) } label: {
                Image(systemName: "chevron.left").font(.headline)
                    .frame(width: 44, height: 44).frame(minHeight: 72)
            }
            .foregroundStyle(Chalk.canvas)
            .accessibilityLabel("Previous week")

            wheel

            Button { commit(1) } label: {
                Image(systemName: "chevron.right").font(.headline)
                    .frame(width: 44, height: 44).frame(minHeight: 72)
            }
            .foregroundStyle(Chalk.canvas)
            .accessibilityLabel("Next week")
        }
        .foregroundStyle(Chalk.ink)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(LinearGradient(colors: [
                    Color.white, Color(cssHex: "#F2F2F4"), Color(cssHex: "#C8C8CD"),
                    Color(cssHex: "#9A9AA0"), Color(cssHex: "#6D6D72"),
                    Color(cssHex: "#B9B9BE"), Color(cssHex: "#F7F7F8")
                ], startPoint: .top, endPoint: .bottom))
        )
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Chalk.ink.opacity(0.27), lineWidth: 0.7))
    }

    // The pill sizes itself from its text so larger Dynamic Type grows the Crown instead of
    // clipping the title and dates inside a fixed-height frame.
    private var wheel: some View {
        VStack(spacing: 3) {
            // Neither line has a line limit or a scale factor: at larger Dynamic Type the text wraps and
            // the pill grows, so nothing is ever truncated.
            Text(title).font(.headline).foregroundStyle(Chalk.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text(detail).font(.caption2).foregroundStyle(Chalk.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .multilineTextAlignment(.center)
        .padding(.horizontal, 12).padding(.vertical, 9)
        .frame(maxWidth: .infinity)
        .background(Chalk.canvas.opacity(0.91), in: RoundedRectangle(cornerRadius: 14))
        .accessibilityHidden(true)
        .padding(.horizontal, 36).padding(.vertical, 9)
        .frame(maxWidth: .infinity, minHeight: 72)
        .background(knurl)
        .contentShape(Rectangle())
        .gesture(
            DragGesture(minimumDistance: 2)
                .onChanged { value in
                    currentTranslation = value.translation.width
                    let delta = travel.update(translation: Double(value.translation.width))
                    if delta != 0 { commit(delta) }
                }
                .onEnded { _ in
                    travel.release()
                    if reduceMotion {
                        currentTranslation = 0
                    } else {
                        withAnimation(.snappy(duration: 0.22)) { currentTranslation = 0 }
                    }
                }
        )
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Week navigation Crown")
        .accessibilityIdentifier("week-crown")
        .accessibilityValue("\(title), \(detail)")
        .accessibilityHint("Swipe to adjust the week or use the previous and next buttons")
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: commit(1)
            case .decrement: commit(-1)
            @unknown default: break
            }
        }
        .accessibilityAction(named: "This week") { onToday() }
    }

    private var knurl: some View {
        Canvas { context, size in
            // A periodic knurl texture follows the *actual finger* immediately.
            let step: CGFloat = 8
            let offset = currentTranslation.truncatingRemainder(dividingBy: step)
            let count = Int(size.width / step) + 2
            for index in 0...count {
                let x = CGFloat(index) * step + offset
                let ridge = CGRect(x: x, y: 1, width: step, height: size.height - 2)
                context.fill(Path(ridge), with: .linearGradient(
                    Gradient(colors: [Color(cssHex: "#6E6E73").opacity(0.65),
                        Color(cssHex: "#D2D2D7").opacity(0.3), .white.opacity(0.8),
                        Color(cssHex: "#AEAEB2").opacity(0.45)]),
                    startPoint: CGPoint(x: x, y: 0), endPoint: CGPoint(x: x + step, y: 0)))
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .accessibilityHidden(true)
    }

    private func commit(_ count: Int) {
        onMove(count)
        // The live adapter emits feedback after the store acknowledges the detent.
    }
}
#endif
