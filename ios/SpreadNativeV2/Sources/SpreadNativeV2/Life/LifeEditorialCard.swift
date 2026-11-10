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

/// Artwork and legibility masks are contained here. The card's text and values
/// are rendered separately as live SwiftUI content in LifeEditorialFace.
struct LifeEditorialArtwork: View {
    let category: String
    let roleColor: Color

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .trailing) {
                LinearGradient(
                    colors: [roleColor.opacity(0.85), Color(red: 0.10, green: 0.13, blue: 0.15)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                if let image = LifeEditorialArtworkRegistry.image(for: category) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(width: proxy.size.width, height: proxy.size.height)
                        .clipped()
                } else {
                    // Keep the existing original artwork available until a clean
                    // editorial export is supplied for this category.
                    ChalkMotionArt(category: category, size: min(210, proxy.size.width * 0.58))
                        .frame(width: proxy.size.width * 0.58, height: proxy.size.height * 0.73)
                        .padding(.trailing, 12)
                }
                // Keep the title and weekly values readable regardless of art.
                LinearGradient(
                    stops: [
                        .init(color: Color.black.opacity(0.62), location: 0),
                        .init(color: Color.black.opacity(0.44), location: 0.49),
                        .init(color: Color.black.opacity(0.14), location: 1)
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                LinearGradient(
                    colors: [.clear, Color.black.opacity(0.43)],
                    startPoint: .center,
                    endPoint: .bottom
                )
            }
            .frame(width: proxy.size.width, height: proxy.size.height)
            .clipped()
        }
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
    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric(relativeTo: .largeTitle) private var displaySize: CGFloat = 37

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

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(spacing: 7) {
                SpreadBrandMark(size: 16)
                Text("SPREAD")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .tracking(2.2)
                Spacer(minLength: 8)
                Image(systemName: "chevron.down")
                    .font(.subheadline.weight(.semibold))
                    .rotationEffect(.degrees(selected ? 180 : 0))
                    .accessibilityHidden(true)
            }
            Spacer(minLength: 7)
            Text(role.name)
                .font(.system(size: displaySize, weight: .semibold, design: .serif))
                .italic()
                .lineLimit(typeSize.isAccessibilitySize ? nil : 2)
                .minimumScaleFactor(typeSize.isAccessibilitySize ? 1 : 0.8)
                .frame(maxWidth: .infinity, alignment: .leading)
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(SpreadHours.text(role.hours) + " h")
                    .font(.system(size: typeSize.isAccessibilitySize ? 30 : 34,
                                  weight: .semibold, design: .serif))
                    .monospacedDigit()
                Text("THIS WEEK")
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(1.6)
            }
            if remaining >= 0 {
                Text(SpreadHours.text(assigned) + " h assigned · " +
                     SpreadHours.text(remaining) + " h unassigned")
                    .font(.caption2)
                    .lineLimit(typeSize.isAccessibilitySize ? nil : 1)
            } else {
                Text(SpreadHours.text(-remaining) + " h over budget")
                    .font(.caption.weight(.bold))
            }
            Spacer(minLength: 10)
            if typeSize.isAccessibilitySize {
                Text(dayDescription)
                    .font(.caption)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                weekdayStrip
            }
        }
        .foregroundStyle(Color.white)
        .padding(.horizontal, 17)
        // Keep the bottom day strip outside the next face's overlap.
        .padding(.top, 13)
        .padding(.bottom, 28)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(role.name + ", " + SpreadHours.spoken(role.hours) +
            " weekly budget, " + SpreadHours.spoken(assigned) + " assigned, " +
            (remaining >= 0 ? SpreadHours.spoken(remaining) + " unassigned" :
                SpreadHours.spoken(-remaining) + " over budget") +
            ". " + dayDescription)
    }

    private var weekdayStrip: some View {
        HStack(spacing: 4) {
            ForEach(0..<7, id: \.self) { index in
                let value = days[index]
                VStack(spacing: 4) {
                    Text(PlannerDates.weekday(weekKey: snapshot.weekKey, index: index).uppercased())
                        .font(.system(size: 9, weight: .semibold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                    Text(SpreadHours.text(value) + "h")
                        .font(.system(size: 10, weight: .bold))
                        .monospacedDigit()
                        .lineLimit(1)
                        .minimumScaleFactor(0.65)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .background(
                    value > 0 ? Color.white.opacity(0.91) : Color.black.opacity(0.28),
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
