import WidgetKit
import SwiftUI
import AppIntents
import Foundation

// The focus timer on the Home Screen and the Dynamic Island. The app's timer stays the only source of truth:
// the widgets and the island read the record the app and the intents keep in the shared App Group. A running
// stretch carries an absolute deadline, so the digits count down by themselves with no refresh. A stretch that
// ran out shows as waiting for a tap, and nothing starts on its own. Each size shows more of the same controls:
// the small widget one, the medium two, and the large every control that applies right now.

/// Reads the focus mirror the app writes into the shared App Group.
enum SpreadFocusWidgetStore {
    static func load() -> SpreadFocusWidgetState? {
        guard let data = UserDefaults(suiteName: SpreadWidgetShared.appGroup)?
            .data(forKey: SpreadWidgetShared.focusKey) else { return nil }
        return try? JSONDecoder().decode(SpreadFocusWidgetState.self, from: data)
    }

    /// The "Show Today on widgets" switch as the app last wrote it. False until the app has written it.
    static func timerEnabled() -> Bool {
        UserDefaults(suiteName: SpreadWidgetShared.appGroup)?
            .bool(forKey: SpreadWidgetShared.timerEnabledMirrorKey) ?? false
    }
}

/// What the timer face says, from the mirror and the moment it is drawn.
struct SpreadFocusFace {
    let state: SpreadFocusWidgetState
    let date: Date

    var finished: Bool { state.isFinished(at: date) }
    var isBreak: Bool { state.kind == "rest" }
    /// A stretch that ended with something to start next.
    var waiting: Bool { finished && state.nextLabel != nil }

    var statusText: String {
        if finished {
            if state.nextLabel == nil { return "Done" }
            if state.stoppedEarly == true { return "Stopped" }
            return isBreak ? "Break over" : "Focus done"
        }
        if state.phase == .paused { return "Paused" }
        return isBreak ? "Break" : "Focus"
    }

    var symbol: String {
        if finished { return "checkmark.circle" }
        return isBreak ? "cup.and.saucer.fill" : "timer"
    }

    var roundText: String? {
        guard let round = state.round, let rounds = state.rounds, rounds > 1 else { return nil }
        return "Round \(round) of \(rounds)"
    }
}

/// The running, paused or waiting face of the timer. Shared by the Timer widget and the Today widget's panel.
/// Widgets are drawn ahead of time, so what to show is decided at the timeline entry's own date, never at "now".
struct SpreadFocusPanel: View {
    let state: SpreadFocusWidgetState
    let date: Date
    /// Smaller digits, for the Today widget's side panel.
    var compact = false

    private var face: SpreadFocusFace { SpreadFocusFace(state: state, date: date) }

    private var digitFont: Font {
        compact ? .system(.title2, design: .rounded, weight: .semibold)
                : .system(.largeTitle, design: .rounded, weight: .semibold)
    }

    @ViewBuilder private var digits: some View {
        if face.finished {
            Text(face.waiting ? "Next" : "Done").font(digitFont)
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
        if state.phase == .running, !face.finished, let end = state.endAt, state.durationSeconds > 0 {
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
            Label(face.statusText, systemImage: face.symbol)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            if let round = face.roundText {
                Text(round)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
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

/// One focus control as a button. The Timer widget and the Dynamic Island both use it, so a control looks and acts
/// the same on every surface.
struct SpreadFocusControlButton: View {
    let control: SpreadFocusControl
    /// The words for Forward, such as "Start break".
    let nextLabel: String?
    /// Icon only, for the Lock Screen banner and the island, where a text label wraps mid-word. The name stays
    /// as the accessibility label, so VoiceOver still reads "Pause", "Forward" and so on.
    var iconOnly = false

    var body: some View {
        Group {
            if iconOnly {
                controlButton
                    .labelStyle(.iconOnly)
                    .font(.title3.weight(.semibold))
            } else {
                controlButton
            }
        }
    }

    @ViewBuilder private var controlButton: some View {
        switch control {
        case .pause:
            Button(intent: PauseSpreadFocusIntent()) {
                Label("Pause", systemImage: "pause.fill")
            }
        case .resume:
            Button(intent: ResumeSpreadFocusIntent()) {
                Label("Resume", systemImage: "play.fill")
            }
        case .forward:
            Button(intent: ForwardSpreadFocusIntent()) {
                Label(nextLabel ?? "Forward", systemImage: "forward.fill")
            }
        case .stop:
            Button(intent: StopSpreadFocusIntent()) {
                Label("Stop", systemImage: "stop.fill")
            }
        case .cancel:
            Button(intent: CancelSpreadFocusIntent()) {
                Label("Cancel", systemImage: "xmark")
            }
        case .startBlock, .startFocus, .openSpread:
            EmptyView()
        }
    }
}

/// One control for the focus session, for the Today widget's panel. The Timer widget lays out every control itself.
struct SpreadFocusActionButton: View {
    let running: Bool
    let paused: Bool
    let nextLabel: String?

    var body: some View {
        if running {
            Button(intent: PauseSpreadFocusIntent()) {
                Label("Pause", systemImage: "pause.fill")
            }
        } else if paused {
            Button(intent: ResumeSpreadFocusIntent()) {
                Label("Resume", systemImage: "play.fill")
            }
        } else if let nextLabel {
            Button(intent: ForwardSpreadFocusIntent()) {
                Label(nextLabel, systemImage: "forward.fill")
            }
        } else {
            EmptyView()
        }
    }
}

/// What the Dynamic Island shows for the current stretch. The stale flag matters: a running stretch goes stale at
/// its deadline, so the island reads "done, waiting for a tap" with no app running.
struct SpreadFocusLiveStatus {
    let state: SpreadFocusActivityAttributes.ContentState
    let isStale: Bool

    var isBreak: Bool { state.kind == "rest" }
    var isPaused: Bool { state.phase == "paused" }
    /// Ticking: a running stretch that has not reached its deadline.
    var isRunning: Bool { state.phase == "running" && !isStale }
    /// Stopped at the end of a stretch, with a next step waiting for a tap.
    var isWaiting: Bool {
        guard state.nextLabel != nil else { return false }
        return state.phase == "finished" || (state.phase == "running" && isStale)
    }
    var symbol: String { isBreak ? "cup.and.saucer.fill" : "timer" }
    var headline: String { isBreak ? "Break" : "Focus" }

    var caption: String {
        if isPaused { return "Paused" }
        if isWaiting && state.stoppedEarly == true { return "Stopped" }
        if isWaiting { return isBreak ? "Break over" : "Focus done" }
        if !isRunning { return "Done" }
        if let round = state.round, let rounds = state.rounds, rounds > 1 {
            return "\(headline) · round \(round) of \(rounds)"
        }
        return headline
    }

    var pausedText: String {
        let clamped = max(0, state.remainingSeconds)
        return String(format: "%02d:%02d", clamped / 60, clamped % 60)
    }
}

/// The remaining time while a stretch runs. Otherwise a word, so nothing ticks at zero.
struct SpreadFocusTimeText: View {
    let status: SpreadFocusLiveStatus
    let deadline: Date?

    var body: some View {
        if status.isRunning, let deadline {
            Text(timerInterval: Date.now...max(deadline, Date.now), countsDown: true)
                .monospacedDigit()
        } else if status.isPaused {
            Text(status.pausedText).monospacedDigit()
        } else {
            Text(status.isWaiting ? "Next" : "Done")
        }
    }
}

/// The compact trailing side of the island. Glyph and short countdown only: there is no control in compact.
struct SpreadFocusCompactTrailing: View {
    let status: SpreadFocusLiveStatus
    let deadline: Date?

    var body: some View {
        if status.isRunning, let deadline {
            Text(timerInterval: Date.now...max(deadline, Date.now), countsDown: true)
                .monospacedDigit()
                .font(.caption2)
                .minimumScaleFactor(0.5)
                .frame(maxWidth: 40)
        } else {
            Image(systemName: status.isPaused ? "pause.fill" : (status.isWaiting ? "bell.fill" : "checkmark"))
                .font(.caption2)
        }
    }
}

/// The minimal island view. It keeps the glyph and the countdown, the one value that matters at a glance.
struct SpreadFocusMinimal: View {
    let status: SpreadFocusLiveStatus
    let deadline: Date?

    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: status.symbol)
            if status.isRunning, let deadline {
                Text(timerInterval: Date.now...max(deadline, Date.now), countsDown: true)
                    .monospacedDigit()
                    .font(.caption2)
                    .minimumScaleFactor(0.5)
            }
        }
    }
}

private struct SpreadTimerEntry: TimelineEntry {
    let date: Date
    let state: SpreadFocusWidgetState?
    let today: SpreadToday?
    /// True when nothing is running and the last plan may start from here.
    let canStart: Bool
    /// The focus length of the last plan, for the Start label.
    let startMinutes: Int?
    /// Today's next planned block, when one is on offer.
    let block: SpreadOfferedBlock?
    /// How today's planned blocks are going, when today has a plan for the profile on screen.
    let progress: SpreadDayProgress?
    /// Whether "Show Today on widgets" is on. When it is off, the widget says so instead of a plain "no timer".
    let enabled: Bool
}

private struct SpreadTimerProvider: TimelineProvider {
    typealias Entry = SpreadTimerEntry

    private func entry(at date: Date, state: SpreadFocusWidgetState?) -> Entry {
        Entry(date: date, state: state, today: SpreadTodayStore.load(),
              canStart: SpreadFocusStore.canStartFromWidget(now: date),
              startMinutes: SpreadFocusStore.loadChoice()?.plan.focusMinutes,
              block: SpreadDayPlanStore.nextBlock(now: date),
              progress: SpreadDayPlanStore.progress(now: date),
              enabled: SpreadFocusWidgetStore.timerEnabled())
    }

    func placeholder(in context: Context) -> Entry {
        let now = Date()
        let sample = SpreadFocusWidgetState(
            sessionId: "preview", phase: .running, endAt: now.addingTimeInterval(1500),
            pausedSeconds: 1500, durationSeconds: 1500, title: "Focus session", writtenAt: now,
            kind: "focus", round: 1, rounds: 4, nextLabel: "Start break")
        return entry(at: now, state: sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(entry(at: .now, state: SpreadFocusWidgetStore.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let now = Date()
        let state = SpreadFocusWidgetStore.load()
        // One entry now, and one at the deadline so a running face flips to "Next" or "Done" by itself.
        let entries = (state?.timelineDates(from: now) ?? [now]).map { entry(at: $0, state: state) }
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1,
            to: Calendar.current.startOfDay(for: now)) ?? now.addingTimeInterval(86400)
        completion(Timeline(entries: entries, policy: .after(tomorrow)))
    }
}

private struct SpreadTimerView: View {
    let entry: SpreadTimerEntry
    @Environment(\.widgetFamily) private var family

    private var size: SpreadFocusControlRules.Size {
        switch family {
        case .systemLarge: return .large
        case .systemMedium: return .medium
        default: return .small
        }
    }

    var body: some View {
        Group {
            switch family {
            case .systemLarge: largeBody
            case .systemMedium: mediumBody
            default: smallBody
            }
        }
        .containerBackground(.background, for: .widget)
        .widgetURL(SpreadWidgetLink.focus.url)
    }

    /// The face: the running, paused or waiting timer, or the idle words.
    @ViewBuilder private var face: some View {
        if let state = entry.state {
            SpreadFocusPanel(state: state, date: entry.date)
        } else {
            idle
        }
    }

    private var idle: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Focus", systemImage: "timer")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            Text("No timer running")
                .font(.system(.title3, design: .rounded, weight: .semibold))
            Text(idleDetail)
                .font(.caption)
                .foregroundStyle(.secondary)
            // While a block is still on offer, say how far through today's blocks the person is. Counts only.
            if entry.enabled, let progress = entry.progress, !progress.allDone {
                Text(SpreadBlockText.progress(progress))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    private var idleDetail: String {
        if !entry.enabled { return "Turn on Show Today on widgets in More to see your timer here." }
        if let offered = entry.block { return SpreadBlockText.summary(offered.entry.plan) }
        if let progress = entry.progress, progress.allDone { return SpreadBlockText.progress(progress) }
        return entry.canStart ? "Start your last plan here." : "Choose a plan in Spread to start."
    }

    /// The controls that apply right now, cut down to this widget's size. Each size shows more of them.
    private var controls: [SpreadFocusControl] {
        let available: [SpreadFocusControl]
        if let state = entry.state {
            let face = SpreadFocusFace(state: state, date: entry.date)
            available = SpreadFocusControlRules.all(
                running: !face.finished && state.phase == .running,
                paused: state.phase == .paused,
                waiting: face.finished,
                hasNext: state.nextLabel != nil,
                hasBlock: false, canStart: false)
        } else {
            available = SpreadFocusControlRules.all(
                running: false, paused: false, waiting: false, hasNext: false,
                hasBlock: entry.block != nil, canStart: entry.canStart)
        }
        return SpreadFocusControlRules.shown(available, size: size)
    }

    @ViewBuilder private func control(_ kind: SpreadFocusControl) -> some View {
        switch kind {
        case .startBlock:
            if let offered = entry.block {
                Button(intent: StartSpreadBlockIntent()) {
                    Label("Start \(offered.entry.label) · \(SpreadBlockText.hours(offered.entry.hours))",
                          systemImage: "play.fill")
                }
            }
        case .startFocus:
            Button(intent: StartSpreadFocusIntent()) {
                Label(entry.startMinutes.map { "Start \($0) min focus" } ?? "Start focus", systemImage: "play.fill")
            }
        case .openSpread:
            Link(destination: SpreadWidgetLink.focus.url) {
                Label("Open Spread", systemImage: "arrow.up.forward.app")
            }
        case .pause, .resume, .forward, .stop, .cancel:
            SpreadFocusControlButton(control: kind, nextLabel: entry.state?.nextLabel)
        }
    }

    private var controlRow: some View {
        HStack(spacing: 8) {
            ForEach(Array(controls.enumerated()), id: \.offset) { _, kind in
                control(kind)
            }
        }
        .buttonStyle(.bordered)
        .controlSize(.small)
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

    @ViewBuilder private var smallBody: some View {
        VStack(alignment: .leading, spacing: 8) {
            face
            controlRow
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    @ViewBuilder private var mediumBody: some View {
        VStack(alignment: .leading, spacing: 10) {
            face
            endsAt
            controlRow
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    @ViewBuilder private var largeBody: some View {
        VStack(alignment: .leading, spacing: 12) {
            face
            endsAt
            controlRow
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
        .description("Your focus session and its controls, counting down on your Home Screen. Small shows one control, medium two, and large every control.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
