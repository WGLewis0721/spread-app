import WidgetKit
import SwiftUI
import AppIntents
import Foundation

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

/// The app's card face without artwork: the area's color fading to deep green-black, with the same
/// legibility shading. The app draws exactly this when a category has no artwork.
private struct SpreadLifeCardBackground: View {
    let colorHex: String

    var body: some View {
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
}

private struct SpreadLifeCardFace: View {
    let card: SpreadLifeCardWidgetCard
    let position: (index: Int, count: Int)
    let large: Bool

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
            HStack(spacing: 0) {
                stepButton(.previous, symbol: "chevron.left", label: "Previous Life card")
                Text("\(position.index) of \(position.count)")
                    .font(.caption2.weight(.semibold))
                    .monospacedDigit()
                stepButton(.next, symbol: "chevron.right", label: "Next Life card")
            }
        }
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
                .font(.system(size: 9, weight: .semibold))
                .tracking(1.4)
        }
    }

    @ViewBuilder private var summary: some View {
        if remaining >= 0 {
            Text(hoursText(card.placedHours) + " h assigned · " + hoursText(remaining) + " h unassigned")
                .font(.caption2)
        } else {
            Text(hoursText(-remaining) + " h over budget")
                .font(.caption.weight(.bold))
        }
    }

    private func pill(_ index: Int) -> some View {
        let value = index < card.days.count ? card.days[index] : 0
        return VStack(spacing: 2) {
            Text(large ? Self.longDays[index] : Self.shortDays[index])
                .font(.system(size: 9, weight: .semibold))
            Text(hoursText(value) + (large ? "h" : ""))
                .font(.system(size: large ? 11 : 10, weight: .bold))
                .monospacedDigit()
        }
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .frame(maxWidth: .infinity)
        .padding(.vertical, large ? 7 : 4)
        .background(value > 0 ? Color.white.opacity(0.91) : Color.black.opacity(0.28),
                    in: RoundedRectangle(cornerRadius: 7, style: .continuous))
        .foregroundStyle(value > 0 ? Color.black.opacity(0.9) : Color.white)
    }

    private var strip: some View {
        HStack(spacing: 3) {
            ForEach(0..<7, id: \.self) { index in
                pill(index)
            }
        }
    }

    private var dots: some View {
        HStack(spacing: 5) {
            ForEach(0..<min(position.count, 12), id: \.self) { index in
                Circle()
                    .fill(Color.white.opacity(index == position.index - 1 ? 0.95 : 0.35))
                    .frame(width: 5, height: 5)
            }
        }
    }

    private var mediumBody: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 0) {
                title(size: 24)
                Spacer(minLength: 4)
                nav
            }
            .frame(height: 44)
            budgetLine(size: 18)
            strip
        }
    }

    private var largeBody: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 0) {
                Text("SPREAD")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .tracking(2.2)
                Spacer(minLength: 4)
                nav
            }
            .frame(height: 44)
            title(size: 34)
            budgetLine(size: 28)
            summary
            ProgressView(value: min(card.placedHours, max(card.budgetHours, 0.5)),
                         total: max(card.budgetHours, 0.5))
                .tint(.white)
            strip
            dots
            Spacer(minLength: 0)
        }
    }

    var body: some View {
        Group {
            if large { largeBody } else { mediumBody }
        }
        .foregroundStyle(Color.white)
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

    var body: some View {
        if let snapshot = entry.snapshot,
           let card = SpreadLifeCardsNav.resolved(selectedId: entry.selectedId, in: snapshot.cards) {
            SpreadLifeCardFace(
                card: card,
                position: SpreadLifeCardsNav.position(of: card.id, in: snapshot.cards),
                large: family == .systemLarge)
            .containerBackground(for: .widget) {
                SpreadLifeCardBackground(colorHex: card.colorHex)
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
        .description("Flip through your Life cards. Tap one to open it in Spread.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}
