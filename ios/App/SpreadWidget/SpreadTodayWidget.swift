import WidgetKit
import SwiftUI
import Foundation
import ActivityKit

private struct SpreadToday: Decodable {
    let day: String
    let doneTasks: Int
    let totalTasks: Int
    let hoursPlaced: Double
    let writtenAt: Date
}

private struct SpreadTodayEntry: TimelineEntry {
    let date: Date
    let plan: SpreadToday?
}

private struct SpreadTodayProvider: TimelineProvider {
    typealias Entry = SpreadTodayEntry

    func placeholder(in context: Context) -> Entry {
        Entry(date: .now, plan: SpreadToday(
            day: Self.dayKey(Date()), doneTasks: 2, totalTasks: 4,
            hoursPlaced: 3, writtenAt: .now))
    }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: .now, plan: Self.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let now = Date()
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1,
            to: Calendar.current.startOfDay(for: now)) ?? now.addingTimeInterval(86400)
        completion(Timeline(entries: [Entry(date: now, plan: Self.load())], policy: .after(tomorrow)))
    }

    private static func load() -> SpreadToday? {
        guard let data = UserDefaults(suiteName: "group.com.graymatter.spread")?
            .data(forKey: "spread.widget.today.v1"),
              let value = try? JSONDecoder().decode(SpreadToday.self, from: data),
              value.day == dayKey(Date()) else { return nil }
        return value
    }

    private static func dayKey(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}

private struct SpreadTodayView: View {
    let entry: SpreadTodayEntry
    @Environment(\.widgetFamily) private var family
    private var plan: SpreadToday? { entry.plan }

    var body: some View {
        Group {
            if family == .accessoryCircular {
                if let plan {
                    VStack(spacing: 0) {
                        Text("\(plan.doneTasks)")
                            .font(.system(.title3, design: .rounded, weight: .semibold))
                        Text("/ \(plan.totalTasks)")
                            .font(.system(.caption2))
                    }
                    .accessibilityLabel("\(plan.doneTasks) of \(plan.totalTasks) tasks completed")
                } else {
                    Image(systemName: "calendar")
                        .accessibilityLabel("Open Spread to enable Today widget")
                }
            } else if family == .accessoryRectangular {
                if let plan {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Spread · Today").font(.headline)
                        Text("\(plan.doneTasks) of \(plan.totalTasks) done · \(plan.hoursPlaced, specifier: "%.1f")h planned")
                            .font(.caption)
                            .lineLimit(1)
                    }
                    .accessibilityElement(children: .combine)
                } else {
                    VStack(alignment: .leading) {
                        Text("Spread").font(.headline)
                        Text("Enable widget in More").font(.caption)
                    }
                }
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "calendar")
                        Text("Today").font(.headline)
                    }
                    if let plan {
                        Text("\(plan.doneTasks) of \(plan.totalTasks)")
                            .font(.system(.title2, design: .rounded, weight: .semibold))
                            .minimumScaleFactor(0.75)
                        Text("tasks done").font(.caption)
                        Text("\(plan.hoursPlaced, specifier: "%.1f") hours placed today")
                            .font(.subheadline)
                            .lineLimit(2)
                    } else {
                        Text("Open Spread")
                            .font(.subheadline.weight(.semibold))
                        Text("Enable Today's widget in More.")
                            .font(.caption)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .accessibilityElement(children: .combine)
            }
        }
        .containerBackground(.background, for: .widget)
        .widgetURL(URL(string: "spread://today"))
    }
}

struct SpreadTodayWidget: Widget {
    let kind = "SpreadToday"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SpreadTodayProvider()) { entry in
            SpreadTodayView(entry: entry)
        }
        .configurationDisplayName("Today in Spread")
        .description("See your planned hours and task progress without opening the app.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])
    }
}

/// The Lock Screen and Dynamic Island show only a bounded, explicitly enabled session.
private struct SpreadFocusLiveView: View {
    let context: ActivityViewContext<SpreadFocusActivityAttributes>

    @ViewBuilder private var remaining: some View {
        if context.state.phase == "running", let deadline = context.state.deadline {
            Text(timerInterval: Date.now...max(deadline, Date.now), countsDown: true)
                .monospacedDigit()
        } else if context.state.phase == "paused" {
            Text("Paused")
        } else {
            Text("Finished")
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "timer").accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 4) {
                Text(context.attributes.title).font(.headline).lineLimit(1)
                Text(context.state.phase == "paused" ? "Focus paused" : "Focus timer")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            remaining.font(.title3.weight(.semibold))
        }
        .padding()
        .activityBackgroundTint(Color(uiColor: .systemBackground))
        .activitySystemActionForegroundColor(.primary)
        .widgetURL(URL(string: "spread://focus"))
        .accessibilityElement(children: .combine)
    }
}

struct SpreadFocusLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SpreadFocusActivityAttributes.self) { context in
            SpreadFocusLiveView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label("Focus", systemImage: "timer")
                        .font(.subheadline.weight(.semibold))
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if context.state.phase == "running", let deadline = context.state.deadline {
                        Text(timerInterval: Date.now...max(deadline, Date.now), countsDown: true)
                            .monospacedDigit()
                    } else {
                        Text(context.state.phase == "paused" ? "Paused" : "Done")
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.attributes.title)
                        .lineLimit(1)
                }
            } compactLeading: {
                Image(systemName: "timer")
            } compactTrailing: {
                if context.state.phase == "running", let deadline = context.state.deadline {
                    Text(timerInterval: Date.now...max(deadline, Date.now), countsDown: true)
                        .monospacedDigit()
                        .font(.caption2)
                } else {
                    Image(systemName: "pause.fill")
                }
            } minimal: {
                Image(systemName: "timer")
            }
            .widgetURL(URL(string: "spread://focus"))
        }
    }
}

@main
struct SpreadWidgetBundle: WidgetBundle {
    var body: some Widget {
        SpreadTodayWidget()
        SpreadFocusLiveActivityWidget()
    }
}
