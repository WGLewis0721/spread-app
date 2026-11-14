import Foundation

/// Presentation-only projection of the currently selected Monday-based week.
/// Never reads another week's allocations or writes planner state.
enum LifeCardWeekDistribution {
    static func hours(for roleId: String, snapshot: PlannerSnapshot) -> [Double] {
        (0..<7).map { index in
            let day = PlannerDates.dayISO(weekKey: snapshot.weekKey, index: index)
            return snapshot.allocations
                .filter { $0.roleId == roleId && $0.day == day }
                .reduce(0) { $0 + $1.hours }
        }
    }

    static func assigned(_ hours: [Double]) -> Double {
        hours.reduce(0, +)
    }

    static func unassigned(budget: Double, hours: [Double]) -> Double {
        // Do not conceal legacy over-allocation: a negative value remains visible.
        budget - assigned(hours)
    }
}

#if os(iOS)
import SwiftUI
import ImageIO

/// Art is a noninteractive, replaceable resource. Add <category>.webp (or .png)
/// to Resources/Editorial to replace the fallback without changing card data,
/// accessibility, gestures, motion or geometry. No remote requests.
enum LifeEditorialArtworkRegistry {
    private static let cache = NSCache<NSString, UIImage>()

    static func image(for rawCategory: String) -> UIImage? {
        let category = ChalkArtwork.category(for: rawCategory)
        let key = category as NSString
        if let cached = cache.object(forKey: key) { return cached }
        for ext in ["webp", "png"] {
            guard let url = Bundle.module.url(
                forResource: category,
                withExtension: ext,
                subdirectory: "Editorial"
            ), let source = CGImageSourceCreateWithURL(url as CFURL, nil),
                let imageRef = CGImageSourceCreateImageAtIndex(source, 0, nil) else { continue }
            let image = UIImage(cgImage: imageRef)
            cache.setObject(image, forKey: key)
            return image
        }
        return nil
    }
}

/// Artwork and legibility masks stay behind live SwiftUI text. The owner
/// retired Chalk/doodle art: missing editorial assets use a calm color gradient.
struct LifeEditorialArtwork: View {
    let category: String
    let roleColor: Color
    var editorial = true

    var body: some View {
        LinearGradient(
            // A fixed dark ground keeps white labels legible in light and dark mode. Art legibility, not a theme token.
            colors: [roleColor.opacity(0.85), Color(red: 0.10, green: 0.13, blue: 0.15)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .overlay {
            if let image = LifeEditorialArtworkRegistry.image(for: category) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .clipped()
            }
        }
        .overlay {
            LinearGradient(
                stops: [
                    .init(color: Color.black.opacity(0.66), location: 0),
                    .init(color: Color.black.opacity(0.40), location: 0.50),
                    .init(color: Color.black.opacity(0.12), location: 1)
                ],
                startPoint: .leading, endPoint: .trailing
            )
        }
        .overlay {
            LinearGradient(colors: [.clear, Color.black.opacity(0.40)],
                           startPoint: .center, endPoint: .bottom)
        }
        .clipped()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

/// The role identity and weekly values are *always live*. Never bake this UI
/// into the image. All gestures, selection, Edit and store writes remain owned
/// by LifeWalletFace / LifeWalletStack.
struct LifeEditorialFace: View {
    let role: Responsibility
    let snapshot: PlannerSnapshot
    let selected: Bool
    let titleSafeWidth: CGFloat
    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric(relativeTo: .largeTitle) private var displaySize: CGFloat = 37
    // Every text size on the face scales with Dynamic Type (defaults match the original fixed sizes).
    @ScaledMetric(relativeTo: .caption2) private var brandSize: CGFloat = 11
    @ScaledMetric(relativeTo: .largeTitle) private var budgetSize: CGFloat = 34
    @ScaledMetric(relativeTo: .caption2) private var labelSize: CGFloat = 10
    @ScaledMetric(relativeTo: .caption2) private var dayLabelSize: CGFloat = 9
    @ScaledMetric(relativeTo: .caption2) private var dayValueSize: CGFloat = 10

    private var days: [Double] {
        LifeCardWeekDistribution.hours(for: role.id, snapshot: snapshot)
    }
    private var assigned: Double { LifeCardWeekDistribution.assigned(days) }
    private var remaining: Double {
        LifeCardWeekDistribution.unassigned(budget: role.hours, hours: days)
    }
    private var dayDescription: String {
        (0..<7).map { i in
            PlannerDates.weekday(weekKey: snapshot.weekKey, index: i) +
            ", " + SpreadHours.spoken(days[i])
        }.joined(separator: "; ")
    }

    // Keep SwiftUI's generic type-checker work bounded: the complete face is
    // composed from small, separately type-checked editorial components.
    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            brandHeader
            Spacer(minLength: 7)
            responsibilityTitle
            weeklyBudget
            assignmentSummary
            Spacer(minLength: 10)
            distributionFooter
        }
        .foregroundStyle(Color.white)
        .padding(.horizontal, 17)
        .padding(.top, 13)
        .padding(.bottom, 28)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(spokenCardLabel)
    }

    private var spokenCardLabel: String {
        let budget = SpreadHours.spoken(role.hours)
        let assignedText = SpreadHours.spoken(assigned)
        let remainingText: String
        if remaining >= 0 {
            remainingText = SpreadHours.spoken(remaining) + " unassigned"
        } else {
            remainingText = SpreadHours.spoken(-remaining) + " over budget"
        }
        return role.name + ", " + budget + " weekly budget, " +
            assignedText + " assigned, " + remainingText + ". " + dayDescription
    }

    private var brandHeader: some View {
        HStack(spacing: 7) {
            SpreadBrandMark(size: 16)
            Text("SPREAD")
                .font(.system(size: brandSize, weight: .bold, design: .rounded))
                .tracking(2.2)
            Spacer(minLength: 8)
            SpreadIcon(name: "lucide-chevron-down", size: 16)
                .rotationEffect(.degrees(selected ? 180 : 0))
        }
    }

    private var responsibilityTitle: some View {
        Text(role.name)
            .font(.system(size: displaySize, weight: .semibold, design: .serif))
            .italic()
            .lineLimit(typeSize.isAccessibilitySize ? nil : 2)
            .minimumScaleFactor(typeSize.isAccessibilitySize ? 1 : 0.8)
            .frame(maxWidth: titleSafeWidth, alignment: .leading)
    }

    private var weeklyBudget: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Text(SpreadHours.text(role.hours) + " h")
                .font(.system(size: budgetSize, weight: .semibold, design: .serif))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .monospacedDigit()
            Text("THIS WEEK")
                .font(.system(size: labelSize, weight: .semibold))
                .tracking(1.6)
        }
        .frame(maxWidth: titleSafeWidth, alignment: .leading)
    }

    @ViewBuilder
    private var assignmentSummary: some View {
        if remaining >= 0 {
            Text(SpreadHours.text(assigned) + " h assigned · " +
                 SpreadHours.text(remaining) + " h unassigned")
                .font(.caption2)
                .frame(maxWidth: titleSafeWidth, alignment: .leading)
                .lineLimit(typeSize.isAccessibilitySize ? nil : 2)
        } else {
            Text(SpreadHours.text(-remaining) + " h over budget")
                .font(.caption.weight(.bold))
        }
    }

    @ViewBuilder
    private var distributionFooter: some View {
        if typeSize.isAccessibilitySize {
            Text(dayDescription)
                .font(.caption)
                .fixedSize(horizontal: false, vertical: true)
        } else {
            weekdayStrip
        }
    }

    private var weekdayStrip: some View {
        HStack(spacing: 4) {
            ForEach(0..<7, id: \.self) { index in
                let value = days[index]
                VStack(spacing: 4) {
                    Text(PlannerDates.weekday(weekKey: snapshot.weekKey, index: index).uppercased())
                        .font(.system(size: dayLabelSize, weight: .semibold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                    Text(SpreadHours.text(value) + "h")
                        .font(.system(size: dayValueSize, weight: .bold))
                        .monospacedDigit()
                        .lineLimit(1)
                        .minimumScaleFactor(0.65)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .background(
                    // OD3: zero-hour days use a 0.6 black well. The owner's spec gives about 5.7:1 for white
                    // labels over bright art (WCAG 1.4.3). Not re-measured on device.
                    value > 0 ? Color.white.opacity(0.91) : Color.black.opacity(0.6),
                    in: RoundedRectangle(cornerRadius: 7, style: .continuous)
                )
                .foregroundStyle(value > 0 ? Color.black.opacity(0.9) : Color.white)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(dayDescription)
        .accessibilityAddTraits(.isStaticText)
    }
}
#endif
