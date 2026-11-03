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
                    .frame(width: 44, height: 72)
            }
            .accessibilityLabel("Previous week")

            wheel

            Button { commit(1) } label: {
                Image(systemName: "chevron.right").font(.headline)
                    .frame(width: 44, height: 72)
            }
            .accessibilityLabel("Next week")
        }
        .foregroundStyle(Chalk.ink)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(LinearGradient(colors: [
                    Color(cssHex: "#242932"), Color(cssHex: "#545961"),
                    Color(cssHex: "#151920")
                ], startPoint: .top, endPoint: .bottom))
        )
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Chalk.ink.opacity(0.27), lineWidth: 0.7))
    }

    private var wheel: some View {
        GeometryReader { geometry in
            ZStack {
                Canvas { context, size in
                    // A periodic knurl texture follows the *actual finger* immediately.
                    let step: CGFloat = 8
                    let offset = currentTranslation.truncatingRemainder(dividingBy: step)
                    let count = Int(size.width / step) + 2
                    for index in 0...count {
                        let x = CGFloat(index) * step + offset
                        var line = Path()
                        line.move(to: CGPoint(x: x, y: 4))
                        line.addLine(to: CGPoint(x: x, y: size.height - 4))
                        context.stroke(line, with: .color(.white.opacity(index.isMultiple(of: 2) ? 0.24 : 0.1)), lineWidth: 2)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .accessibilityHidden(true)

                VStack(spacing: 3) {
                    Text(title).font(.headline).foregroundStyle(Chalk.ink)
                    Text(detail).font(.caption2).foregroundStyle(Chalk.secondary)
                }
                .padding(.horizontal, 8)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(Chalk.canvas.opacity(0.91), in: RoundedRectangle(cornerRadius: 14))
                .allowsHitTesting(false)
            }
            .frame(width: geometry.size.width, height: 72)
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
        .frame(height: 72)
    }

    private func commit(_ count: Int) {
        onMove(count)
        // One tick per *committed detent*, never a timer or animation frame.
        for _ in 0..<abs(count) { UISelectionFeedbackGenerator().selectionChanged() }
    }
}
#endif
