import WidgetKit
import SwiftUI
import AppIntents
import Foundation
import UIKit
import ImageIO

// Life cards on the Home Screen: a clone of the card in the app (the area's color, its serif name, the
// weekly budget and the seven-day strip), drawn from a local snapshot the app writes into the shared
// App Group. Previous and next flip through the cards. Tapping a card opens that card in Spread.
// Nothing here changes a budget or an allocation. Life area names are shown only after the person
// turns Life cards on widgets on in More.

private extension Color {
    init(hex: String) {
        guard let rgb = SpreadWidgetColor.rgb(hex: hex) else {
            self.init(red: 0.28, green: 0.36, blue: 0.31)
            return
        }
        self.init(red: rgb.red, green: rgb.green, blue: rgb.blue)
    }
}

/// Moves the widget to the previous or next Life card. It only stores which card to show, then asks
/// the widget to redraw.
struct SpreadLifeCardStepIntent: AppIntent {
    static var title: LocalizedStringResource = "Show another Life card"

    @Parameter(title: "Direction", default: "next")
    var direction: String

    init() {}

    init(step: SpreadLifeCardsNav.Step) {
        self.direction = step.rawValue
    }

    func perform() async throws -> some IntentResult {
        let defaults = UserDefaults(suiteName: SpreadWidgetShared.appGroup)
        if let data = defaults?.data(forKey: SpreadWidgetShared.lifeCardsKey),
           let snapshot = try? JSONDecoder().decode(SpreadLifeCardsWidgetSnapshot.self, from: data),
           let step = SpreadLifeCardsNav.Step(rawValue: direction),
           let next = SpreadLifeCardsNav.stepped(
               step, from: defaults?.string(forKey: SpreadWidgetShared.lifeCardSelectedKey),
               in: snapshot.cards) {
            defaults?.set(next, forKey: SpreadWidgetShared.lifeCardSelectedKey)
        }
        WidgetCenter.shared.reloadTimelines(ofKind: SpreadWidgetShared.lifeCardsKind)
        return .result()
    }
}

private struct SpreadLifeCardsEntry: TimelineEntry {
    let date: Date
    /// Nil when the widget is off, or the snapshot belongs to an earlier week.
    let snapshot: SpreadLifeCardsWidgetSnapshot?
    let selectedId: String?
}

private struct SpreadLifeCardsProvider: TimelineProvider {
    typealias Entry = SpreadLifeCardsEntry

    func placeholder(in context: Context) -> Entry {
        let sample = SpreadLifeCardWidgetCard(
            id: "preview", name: "Life area", category: "custom", colorHex: "#485B4E",
            budgetHours: 6, placedHours: 4, days: [0, 2, 0, 1, 0, 1, 0])
        return Entry(
            date: .now,
            snapshot: SpreadLifeCardsWidgetSnapshot(
                weekKey: SpreadWidgetDates.weekKey(for: Date()), cards: [sample], writtenAt: .now),
            selectedId: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: .now, snapshot: Self.load(), selectedId: Self.selected()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let now = Date()
        // Refresh at midnight so a snapshot from a finished week stops pretending to be live.
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1,
            to: Calendar.current.startOfDay(for: now)) ?? now.addingTimeInterval(86400)
        completion(Timeline(entries: [Entry(date: now, snapshot: Self.load(), selectedId: Self.selected())],
                            policy: .after(tomorrow)))
    }

    private static func load() -> SpreadLifeCardsWidgetSnapshot? {
        guard let data = UserDefaults(suiteName: SpreadWidgetShared.appGroup)?
            .data(forKey: SpreadWidgetShared.lifeCardsKey),
              let value = try? JSONDecoder().decode(SpreadLifeCardsWidgetSnapshot.self, from: data),
              value.isCurrent(at: Date()), !value.cards.isEmpty else { return nil }
        return value
    }

    private static func selected() -> String? {
        UserDefaults(suiteName: SpreadWidgetShared.appGroup)?
            .string(forKey: SpreadWidgetShared.lifeCardSelectedKey)
    }
}


/// Source art is copied from SpreadNativeV2/Resources/Editorial into the
/// widget extension's own bundle. It is never sent through UserDefaults.
private enum SpreadLifeWidgetArtwork {
    private static let known: Set<String> = ["family", "fitness", "home", "personal", "school", "work"]
    private static let cache = NSCache<NSString, UIImage>()

    static func image(for rawCategory: String) -> UIImage? {
        let category = rawCategory.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard known.contains(category) else { return nil }
        let key = category as NSString
        if let image = cache.object(forKey: key) { return image }
        guard let url = Bundle.main.url(forResource: category,
                                        withExtension: "webp", subdirectory: "Editorial"),
              let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let pixels = CGImageSourceCreateImageAtIndex(source, 0, nil) else { return nil }
        let image = UIImage(cgImage: pixels)
        cache.setObject(image, forKey: key)
        return image
    }
}

/// The card's colors in the system's light or dark appearance. Dark keeps the app's look: the area's
/// color fading to deep green-black, with white text. Light uses the brand cream with a soft wash of
/// the area's color and navy text. Text stays high contrast in both.
private struct SpreadLifeCardPalette {
    let text: Color
    let secondary: Color
    let pillOn: Color
    let pillOnText: Color
    let pillOff: Color
    let pillOffText: Color
    let fill: Color
    let dotOn: Color
    let dotOff: Color

    static func make(_ scheme: ColorScheme) -> SpreadLifeCardPalette {
        // Ink, secondary and canvas come from SpreadWidgetTokens, which mirror the app's SpreadTheme values.
        if scheme == .dark {
            return SpreadLifeCardPalette(
                text: Color(hex: SpreadWidgetTokens.inkDark), secondary: Color(hex: SpreadWidgetTokens.secondaryDark),
                pillOn: Color.white.opacity(0.91), pillOnText: Color.black.opacity(0.9),
                pillOff: Color.black.opacity(0.28), pillOffText: Color.white,
                fill: Color.white, dotOn: Color.white.opacity(0.95), dotOff: Color.white.opacity(0.35))
        }
        let ink = Color(hex: SpreadWidgetTokens.inkLight)
        return SpreadLifeCardPalette(
            text: ink, secondary: Color(hex: SpreadWidgetTokens.secondaryLight),
            pillOn: ink.opacity(0.90), pillOnText: Color(hex: SpreadWidgetTokens.canvasLight),
            pillOff: ink.opacity(0.08), pillOffText: ink,
            fill: ink, dotOn: ink.opacity(0.9), dotOff: ink.opacity(0.25))
    }
}

/// The card's background in the system's appearance. Dark is the app's card face without artwork, which
/// the app draws exactly this way when a category has no artwork. Light is cream with a soft wash of
/// the area's color.
private struct SpreadLifeCardBackground: View {
    let colorHex: String
    let category: String
    let scheme: ColorScheme

    @ViewBuilder var body: some View {
        if let artwork = SpreadLifeWidgetArtwork.image(for: category) {
            Image(uiImage: artwork)
                .resizable()
                .scaledToFill()
                .overlay(
                    LinearGradient(stops: [
                        .init(color: Color.black.opacity(0.76), location: 0),
                        .init(color: Color.black.opacity(0.50), location: 0.52),
                        .init(color: Color.black.opacity(0.18), location: 1)
                    ], startPoint: .leading, endPoint: .trailing))
                .clipped()
        } else if scheme == .dark {
            darkFace
        } else {
            lightFace
        }
    }

    private var darkFace: some View {
        LinearGradient(
            colors: [Color(hex: colorHex).opacity(0.85), Color(red: 0.10, green: 0.13, blue: 0.15)],
            startPoint: .topLeading, endPoint: .bottomTrailing)
        .overlay(
            LinearGradient(
                stops: [
                    .init(color: Color.black.opacity(0.66), location: 0),
                    .init(color: Color.black.opacity(0.40), location: 0.50),
                    .init(color: Color.black.opacity(0.12), location: 1)
                ],
                startPoint: .leading, endPoint: .trailing))
        .overlay(
            LinearGradient(colors: [.clear, Color.black.opacity(0.40)],
                           startPoint: .center, endPoint: .bottom))
    }

    private var lightFace: some View {
        Color(hex: SpreadWidgetTokens.canvasLight)
            .overlay(
                LinearGradient(
                    colors: [Color(hex: colorHex).opacity(0.30), Color(hex: colorHex).opacity(0.06)],
                    startPoint: .topLeading, endPoint: .bottomTrailing))
    }
}

private struct SpreadLifeCardFace: View {
    let card: SpreadLifeCardWidgetCard
    let position: (index: Int, count: Int)
    let large: Bool
    let palette: SpreadLifeCardPalette

    private static let shortDays = ["M", "T", "W", "T", "F", "S", "S"]
    private static let longDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    private static let spokenDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    private func hoursText(_ value: Double) -> String {
        Int(exactly: value) != nil ? String(Int(value)) : String(format: "%.1f", value)
    }

    private func hoursSpoken(_ value: Double) -> String {
        hoursText(value) + (value == 1 ? " hour" : " hours")
    }

    private var remaining: Double { card.budgetHours - card.placedHours }

    private var spokenCard: String {
        let days = (0..<7).map { (index: Int) -> String in
            let value = index < card.days.count ? card.days[index] : 0
            return Self.spokenDays[index] + ", " + hoursSpoken(value)
        }.joined(separator: "; ")
        let balance = remaining >= 0
            ? hoursSpoken(remaining) + " unassigned"
            : hoursSpoken(-remaining) + " over budget"
        return card.name + ", " + hoursSpoken(card.budgetHours) + " weekly budget, "
            + hoursSpoken(card.placedHours) + " assigned, " + balance + ". " + days
    }

    private func stepButton(_ step: SpreadLifeCardsNav.Step, symbol: String, label: String) -> some View {
        Button(intent: SpreadLifeCardStepIntent(step: step)) {
            Image(systemName: symbol)
                .font(.system(size: 14, weight: .bold))
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    @ViewBuilder private var nav: some View {
        if position.count > 1 {
            // Home Screen widgets don't accept drag gestures. The arrows are
            // genuine AppIntent controls, and the dots show position.
            HStack(spacing: 0) {
                stepButton(.previous, symbol: "chevron.up", label: "Previous Life card")
                VStack(spacing: 3) {
                    Text("\(position.index) of \(position.count)")
                        .font(.caption2.weight(.semibold))
                        .monospacedDigit()
                    dots
                }
                .frame(minWidth: 45)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Life card \(position.index) of \(position.count)")
                stepButton(.next, symbol: "chevron.down", label: "Next Life card")
            }
        }
    }

    private var brand: some View {
        HStack(spacing: 6) {
            Image("SpreadMark")
                .resizable()
                .scaledToFit()
                .frame(width: 20, height: 20)
            Text("SPREAD")
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .tracking(1.4)
        }
        .accessibilityHidden(true)
    }

    private func title(size: CGFloat) -> some View {
        Text(card.name)
            .font(.system(size: size, weight: .semibold, design: .serif))
            .italic()
            .lineLimit(1)
            .minimumScaleFactor(0.6)
    }

    private func budgetLine(size: CGFloat) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(hoursText(card.budgetHours) + " h")
                .font(.system(size: size, weight: .semibold, design: .serif))
                .monospacedDigit()
            Text("THIS WEEK")
                .font(.system(size: 10, weight: .semibold))
                .tracking(1.4)
                .foregroundStyle(palette.secondary)
        }
    }

    @ViewBuilder private var summary: some View {
        if remaining >= 0 {
            Text(hoursText(card.placedHours) + " h assigned · " + hoursText(remaining) + " h unassigned")
                .font(.caption2)
                .foregroundStyle(palette.secondary)
        } else {
            Text(hoursText(-remaining) + " h over budget")
                .font(.caption.weight(.bold))
        }
    }

    private func pill(_ index: Int) -> some View {
        let value = index < card.days.count ? card.days[index] : 0
        return VStack(spacing: 2) {
            Text(large ? Self.longDays[index] : Self.shortDays[index])
                .font(.system(size: 10, weight: .semibold))
            Text(hoursText(value) + (large ? "h" : ""))
                .font(.system(size: large ? 11 : 10, weight: .bold))
                .monospacedDigit()
        }
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .frame(maxWidth: .infinity)
        .padding(.vertical, large ? 7 : 4)
        .background(value > 0 ? palette.pillOn : palette.pillOff,
                    in: RoundedRectangle(cornerRadius: 7, style: .continuous))
        .foregroundStyle(value > 0 ? palette.pillOnText : palette.pillOffText)
    }

    private var strip: some View {
        HStack(spacing: 3) {
            ForEach(0..<7, id: \.self) { index in
                pill(index)
            }
        }
    }

    private var dots: some View {
        let visible = min(position.count, 7)
        let first = min(max(position.index - 4, 0), max(0, position.count - visible))
        return HStack(spacing: 3) {
            ForEach(0..<visible, id: \.self) { offset in
                Circle()
                    .fill(first + offset == position.index - 1 ? palette.dotOn : palette.dotOff)
                    .frame(width: 4, height: 4)
            }
        }
        .accessibilityHidden(true)
    }

    private var mediumBody: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 0) {
                brand
                Spacer(minLength: 3)
                nav
            }
            .frame(height: 44)
            title(size: 20)
            budgetLine(size: 16)
            strip
        }
    }

    private var largeBody: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 0) {
                brand
                Spacer(minLength: 4)
                nav
            }
            .frame(height: 44)
            title(size: 34)
            budgetLine(size: 28)
            summary
            ProgressView(value: min(card.placedHours, max(card.budgetHours, 0.5)),
                         total: max(card.budgetHours, 0.5))
                .tint(palette.fill)
            strip
            Spacer(minLength: 0)
        }
    }

    var body: some View {
        Group {
            if large { largeBody } else { mediumBody }
        }
        .foregroundStyle(palette.text)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(spokenCard)
    }
}

private struct SpreadLifeCardsOff: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Life cards", systemImage: "rectangle.stack")
                .font(.headline)
            Text("Turn on Life cards on widgets in More, then open Spread.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .accessibilityElement(children: .combine)
    }
}

private struct SpreadLifeCardsView: View {
    let entry: SpreadLifeCardsEntry
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        if let snapshot = entry.snapshot,
           let card = SpreadLifeCardsNav.resolved(selectedId: entry.selectedId, in: snapshot.cards) {
            SpreadLifeCardFace(
                card: card,
                position: SpreadLifeCardsNav.position(of: card.id, in: snapshot.cards),
                large: family == .systemLarge,
                palette: SpreadLifeCardPalette.make(
                    SpreadLifeWidgetArtwork.image(for: card.category) == nil ? scheme : .dark))
            .containerBackground(for: .widget) {
                SpreadLifeCardBackground(colorHex: card.colorHex, category: card.category, scheme: scheme)
            }
            .widgetURL(SpreadWidgetLink.lifeCard(card.id).url)
        } else {
            SpreadLifeCardsOff()
                .containerBackground(.background, for: .widget)
                .widgetURL(SpreadWidgetLink.today.url)
        }
    }
}

struct SpreadLifeCardsWidget: Widget {
    let kind = SpreadWidgetShared.lifeCardsKind
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SpreadLifeCardsProvider()) { entry in
            SpreadLifeCardsView(entry: entry)
        }
        .configurationDisplayName("Life cards")
        .description("Browse your illustrated Life cards with Up and Down, see page dots, then tap to open Spread.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}
