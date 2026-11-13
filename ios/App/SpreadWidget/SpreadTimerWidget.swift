import WidgetKit
import SwiftUI
import Foundation

// The focus timer on the Home Screen. The app's timer stays the only authority: this widget reads a
// mirror the app writes into the shared App Group, and a running session carries an absolute deadline,
// so the digits count down by themselves with no refresh. Tapping opens the Focus Timer.

/// Reads the focus session the app mirrors into the shared App Group.
enum SpreadFocusWidgetStore {
    static func load() -> SpreadFocusWidgetState? {
        guard let data = UserDefaults(suiteName: SpreadWidgetShared.appGroup)?
            .data(forKey: SpreadWidgetShared.focusKey) else { return nil }
        return try? JSONDecoder().decode(SpreadFocusWidgetState.self, from: data)
    }
}

/// The running, paused or finished face of the timer. Shared by the Timer widget and the Today
/// widget's side panel. Widgets are rendered ahead of time, so what to show is decided at the
/// timeline entry's own date, never at "now".
struct SpreadFocusPanel: View {
    let state: SpreadFocusWidgetState
    let date: Date
    /// Smaller digits, for the Today widget's side panel.
    var compact = false

    private var finished: Bool { state.isFinished(at: date) }

    private var digitFont: Font {
        compact ? .system(.title2, design: .rounded, weight: .semibold)
                : .system(.largeTitle, design: .rounded, weight: .semibold)
    }

    private var statusText: String {
        if finished { return "Finished" }
        return state.phase == .paused ? "Paused" : "Focus"
    }

    @ViewBuilder private var digits: some View {
        if finished {
            Text("Done").font(digitFont)
        } else if state.phase == .paused {
            Text(SpreadFocusWidgetState.clockText(state.remaining(at: date)))
                .font(digitFont)
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        } else if let end = state.endAt {
            Text(timerInterval: date...max(end, date), countsDown: true)
                .font(digitFont)
                .monospacedDigit()
                .multilineTextAlignment(.leading)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
    }

    @ViewBuilder private var bar: some View {
        if state.phase == .running, !finished, let end = state.endAt, state.durationSeconds > 0 {
            ProgressView(timerInterval: end.addingTimeInterval(-Double(state.durationSeconds))...end,
                         countsDown: true) {
                EmptyView()
            } currentValueLabel: {
                EmptyView()
            }
        } else {
            ProgressView(value: state.elapsedFraction(at: date))
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: compact ? 4 : 8) {
            Label(statusText, systemImage: finished ? "checkmark.circle" : "timer")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            digits
            bar
            Text(state.title)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}

private struct SpreadTimerEntry: TimelineEntry {
    let date: Date
    let state: SpreadFocusWidgetState?
    let today: SpreadToday?
}

private struct SpreadTimerProvider: TimelineProvider {
    typealias Entry = SpreadTimerEntry

    func placeholder(in context: Context) -> Entry {
        let now = Date()
        let sample = SpreadFocusWidgetState(
            sessionId: "preview", phase: .running, endAt: now.addingTimeInterval(1500),
            pausedSeconds: 1500, durationSeconds: 1500, title: "Focus session", writtenAt: now)
        return Entry(date: now, state: sample, today: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: .now, state: SpreadFocusWidgetStore.load(), today: SpreadTodayStore.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let now = Date()
        let state = SpreadFocusWidgetStore.load()
        let today = SpreadTodayStore.load()
        // One entry now, and one at the deadline so the face flips to "Finished" by itself.
        let entries = (state?.timelineDates(from: now) ?? [now]).map { (date: Date) -> Entry in
            Entry(date: date, state: state, today: today)
        }
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1,
            to: Calendar.current.startOfDay(for: now)) ?? now.addingTimeInterval(86400)
        completion(Timeline(entries: entries, policy: .after(tomorrow)))
    }
}

private struct SpreadTimerView: View {
    let entry: SpreadTimerEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        Group {
            if family == .systemLarge {
                largeBody
            } else {
                smallBody
            }
        }
        .containerBackground(.background, for: .widget)
        .widgetURL(SpreadWidgetLink.focus.url)
    }

    private var idle: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Focus", systemImage: "timer")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            Text("No timer running")
                .font(.system(.title3, design: .rounded, weight: .semibold))
            Text("Tap to start a focus session in Spread.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder private var smallBody: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let state = entry.state {
                SpreadFocusPanel(state: state, date: entry.date)
            } else {
                idle
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    @ViewBuilder private var endsAt: some View {
        if let state = entry.state, state.phase == .running, !state.isFinished(at: entry.date),
           let end = state.endAt {
            HStack(spacing: 4) {
                Text("Ends at")
                Text(end, style: .time)
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
    }

    private var todayRow: some View {
        VStack(alignment: .leading, spacing: 4) {
            Label("Today", systemImage: "calendar")
                .font(.headline)
            if let today = entry.today {
                Text("\(today.doneTasks) of \(today.totalTasks) tasks done")
                    .font(.subheadline)
                Text("\(today.hoursPlaced, specifier: "%.1f") hours placed today")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                Text("Turn on Today on widgets in More to see your day here.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder private var largeBody: some View {
        VStack(alignment: .leading, spacing: 14) {
            if let state = entry.state {
                SpreadFocusPanel(state: state, date: entry.date)
            } else {
                idle
            }
            endsAt
            Divider()
            Link(destination: SpreadWidgetLink.today.url) {
                todayRow
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct SpreadTimerWidget: Widget {
    let kind = SpreadWidgetShared.timerKind
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SpreadTimerProvider()) { entry in
            SpreadTimerView(entry: entry)
        }
        .configurationDisplayName("Focus timer")
        .description("Your running focus session, counting down on your Home Screen.")
        .supportedFamilies([.systemSmall, .systemLarge])
    }
}
