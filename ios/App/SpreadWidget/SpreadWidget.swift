import SwiftUI
import WidgetKit

/// Today's progress. Reads the small snapshot the app writes into the App Group container. With no
/// snapshot (switch off, or never opened) it says how to turn the widget on and shows no data.
struct TodaySnapshot: Codable, Equatable {
    var version: Int
    var date: String
    var done: Int
    var total: Int
    var hours: Double
    var titles: [String]?
}

enum SnapshotStore {
    static let groupID = "group.com.graymatter.spread"
    static let fileName = "widget-snapshot.json"

    static func load() -> TodaySnapshot? {
        guard let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID)?.appendingPathComponent(fileName),
              let data = try? Data(contentsOf: url),
              let snapshot = try? JSONDecoder().decode(TodaySnapshot.self, from: data),
              snapshot.version == 1 else { return nil }
        return snapshot
    }

    /// A snapshot from another day is yesterday's plan; treat it as nothing until the app writes again.
    static func isToday(_ snapshot: TodaySnapshot, now: Date = Date()) -> Bool {
        let f = DateFormatter()
        f.calendar = Calendar.current
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: now) == snapshot.date
    }
}

struct TodayEntry: TimelineEntry {
    let date: Date
    let snapshot: TodaySnapshot?
}

struct TodayProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayEntry {
        TodayEntry(date: Date(), snapshot: TodaySnapshot(version: 1, date: "", done: 3, total: 7, hours: 5, titles: nil))
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : current())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        // The app reloads timelines after each save. Refresh at the next midnight so a stale day clears itself.
        let midnight = Calendar.current.nextDate(after: Date(), matching: DateComponents(hour: 0, minute: 1), matchingPolicy: .nextTime) ?? Date().addingTimeInterval(3600)
        completion(Timeline(entries: [current()], policy: .after(midnight)))
    }

    private func current() -> TodayEntry {
        let loaded = SnapshotStore.load()
        let fresh = loaded.flatMap { SnapshotStore.isToday($0) ? $0 : nil }
        return TodayEntry(date: Date(), snapshot: fresh)
    }
}

struct TodayView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodayEntry

    private var summary: String {
        guard let s = entry.snapshot else { return "Turn on in Spread, More" }
        if s.total == 0 { return "Nothing planned" }
        return "\(s.done) of \(s.total) done"
    }

    private var detail: String? {
        guard let s = entry.snapshot, s.total > 0 else { return nil }
        let h = s.hours == s.hours.rounded() ? String(Int(s.hours)) : String(format: "%.1f", s.hours)
        return "\(h) h planned"
    }

    var body: some View {
        switch family {
        case .accessoryCircular:
            if let s = entry.snapshot, s.total > 0 {
                Gauge(value: Double(s.done), in: 0...Double(max(s.total, 1))) { Text("Today") } currentValueLabel: { Text("\(s.done)") }
                    .gaugeStyle(.accessoryCircularCapacity)
            } else {
                Image(systemName: "calendar")
            }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text("Today").font(.headline)
                Text(summary).font(.subheadline)
                if let detail { Text(detail).font(.caption) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        default:
            VStack(alignment: .leading, spacing: 6) {
                Text("Today").font(.caption).foregroundStyle(.secondary)
                Text(summary).font(.title3.weight(.semibold))
                if let detail { Text(detail).font(.footnote).foregroundStyle(.secondary) }
                if let titles = entry.snapshot?.titles, !titles.isEmpty {
                    ForEach(titles, id: \.self) { Text($0).font(.footnote).lineLimit(1) }
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }
}

struct SpreadTodayWidget: Widget {
    let kind = "SpreadTodayWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
            TodayView(entry: entry)
                .accessibilityElement(children: .combine)
                .containerBackground(.background, for: .widget)
        }
        .configurationDisplayName("Today")
        .description("How much of today's plan is done.")
        .supportedFamilies([.systemSmall, .accessoryRectangular, .accessoryCircular])
    }
}

@main
struct SpreadWidgetBundle: WidgetBundle {
    var body: some Widget { SpreadTodayWidget() }
}
