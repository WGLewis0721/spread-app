import WidgetKit
import SwiftUI
import Foundation
import ActivityKit

/// Internal, not private, so the Timer widget's large size can show the same counters.
struct SpreadToday: Decodable {
    let day: String
    let doneTasks: Int
    let totalTasks: Int
    let hoursPlaced: Double
    let writtenAt: Date
}

/// Reads today's counters from the shared App Group. Anything from an earlier day is ignored.
enum SpreadTodayStore {
    static func load() -> SpreadToday? {
        guard let data = UserDefaults(suiteName: "group.com.graymatter.spread")?
            .data(forKey: "spread.widget.today.v1"),
              let value = try? JSONDecoder().decode(SpreadToday.self, from: data),
              value.day == dayKey(Date()) else { return nil }
        return value
    }

    static func dayKey(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}

private struct SpreadTodayEntry: TimelineEntry {
    let date: Date
    let plan: SpreadToday?
    /// The running or paused focus session, shown beside the counters on the medium widget.
    let focus: SpreadFocusWidgetState?
}

private struct SpreadTodayProvider: TimelineProvider {
    typealias Entry = SpreadTodayEntry

    func placeholder(in context: Context) -> Entry {
        Entry(date: .now, plan: SpreadToday(
            day: SpreadTodayStore.dayKey(Date()), doneTasks: 2, totalTasks: 4,
            hoursPlaced: 3, writtenAt: .now), focus: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: .now, plan: SpreadTodayStore.load(), focus: SpreadFocusWidgetStore.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let now = Date()
        let plan = SpreadTodayStore.load()
        let focus = SpreadFocusWidgetStore.load()
        // With a running timer, add an entry at its deadline so the panel flips to "Finished" by itself.
        let entries = (focus?.timelineDates(from: now) ?? [now]).map { (date: Date) -> Entry in
            Entry(date: date, plan: plan, focus: focus)
        }
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1,
            to: Calendar.current.startOfDay(for: now)) ?? now.addingTimeInterval(86400)
        completion(Timeline(entries: entries, policy: .after(tomorrow)))
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
                homeBody
            }
        }
        .containerBackground(.background, for: .widget)
        .widgetURL(URL(string: "spread://today"))
    }

    /// The counters, with the focus timer beside them on the medium widget while a session exists.
    /// The timer panel opens the Focus Timer; the rest of the widget opens Today.
    @ViewBuilder private var homeBody: some View {
        if family == .systemMedium, let focus = entry.focus {
            HStack(alignment: .top, spacing: 14) {
                todayColumn
                Divider()
                Link(destination: SpreadWidgetLink.focus.url) {
                    SpreadFocusPanel(state: focus, date: entry.date, compact: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        } else {
            todayColumn
        }
    }

    private var todayColumn: some View {
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

/// The controls for one focus stretch, on the Dynamic Island and the Lock Screen banner: Pause or Resume, Forward
/// when a step follows, Stop while it runs, and Cancel. These are the same buttons and the same rules as the Timer
/// widget, so a control on one surface is the control on the other.
private struct SpreadFocusIslandControls: View {
    let status: SpreadFocusLiveStatus

    private var controls: [SpreadFocusControl] {
        SpreadFocusControlRules.all(
            running: status.isRunning,
            paused: status.isPaused,
            waiting: !status.isRunning && !status.isPaused,
            hasNext: status.state.nextLabel != nil,
            hasBlock: false, canStart: false)
            .filter { $0 != .openSpread }
    }

    var body: some View {
        HStack(spacing: 12) {
            ForEach(Array(controls.enumerated()), id: \.offset) { _, kind in
                SpreadFocusControlButton(control: kind, nextLabel: status.state.nextLabel, iconOnly: true)
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
        }
        .buttonStyle(.bordered)
        .controlSize(.regular)
        .frame(maxWidth: .infinity)
    }
}

/// The Lock Screen and the Dynamic Island show one bounded focus session: a countdown while it runs, a waiting
/// state at its end, and the same controls as the Timer widget. The island keeps the same record as the app and
/// the widgets, so a tap here is the same tap there.
private struct SpreadFocusLiveView: View {
    let context: ActivityViewContext<SpreadFocusActivityAttributes>

    var body: some View {
        let status = SpreadFocusLiveActivityWidget.status(context)
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: status.symbol).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 4) {
                    Text(context.attributes.title).font(.headline).lineLimit(1)
                    Text(status.caption).font(.caption).foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
                SpreadFocusTimeText(status: status, deadline: context.state.deadline)
                    .font(.title3.weight(.semibold))
            }
            SpreadFocusIslandControls(status: status)
        }
        .padding()
        .activityBackgroundTint(Color(uiColor: .systemBackground))
        .activitySystemActionForegroundColor(.primary)
        // A session for a planned day opens that day's Week view; a hand-started one opens the timer.
        .widgetURL(URL(string: context.attributes.day == nil ? "spread://focus" : "spread://today"))
        .accessibilityElement(children: .contain)
    }
}

struct SpreadFocusLiveActivityWidget: Widget {
    static func status(_ context: ActivityViewContext<SpreadFocusActivityAttributes>) -> SpreadFocusLiveStatus {
        SpreadFocusLiveStatus(state: context.state, isStale: context.isStale)
    }

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SpreadFocusActivityAttributes.self) { context in
            SpreadFocusLiveView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label(SpreadFocusLiveActivityWidget.status(context).headline,
                          systemImage: SpreadFocusLiveActivityWidget.status(context).symbol)
                        .font(.subheadline.weight(.semibold))
                }
                DynamicIslandExpandedRegion(.trailing) {
                    SpreadFocusTimeText(status: SpreadFocusLiveActivityWidget.status(context),
                                        deadline: context.state.deadline)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 8) {
                        Text(SpreadFocusLiveActivityWidget.status(context).caption)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        SpreadFocusIslandControls(status: SpreadFocusLiveActivityWidget.status(context))
                    }
                }
            } compactLeading: {
                Image(systemName: SpreadFocusLiveActivityWidget.status(context).symbol)
            } compactTrailing: {
                SpreadFocusCompactTrailing(status: SpreadFocusLiveActivityWidget.status(context),
                                           deadline: context.state.deadline)
            } minimal: {
                SpreadFocusMinimal(status: SpreadFocusLiveActivityWidget.status(context),
                                   deadline: context.state.deadline)
            }
            .widgetURL(URL(string: context.attributes.day == nil ? "spread://focus" : "spread://today"))
        }
    }
}

@main
struct SpreadWidgetBundle: WidgetBundle {
    var body: some Widget {
        SpreadTodayWidget()
        SpreadTimerWidget()
        SpreadLifeCardsWidget()
        SpreadFocusLiveActivityWidget()
    }
}
