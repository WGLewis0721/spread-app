import Foundation

// Plain, local-only models and rules shared by the app and the widget extension.
// Compiled into both from this single file (the same pattern as SpreadFocusActivityAttributes.swift).
// Foundation only, so it also builds and is tested off iOS. Nothing here is a planner authority:
// every value is a disposable projection that the app writes into the shared App Group.

public enum SpreadWidgetShared {
    public static let appGroup = "group.com.graymatter.spread"
    public static let focusKey = "spread.widget.focus.v1"
    public static let lifeCardsKey = "spread.widget.lifecards.v1"
    public static let lifeCardSelectedKey = "spread.widget.lifecards.selected.v1"
    /// The switch in More that turns on Today and the focus timer on widgets. Read by the app and the intents.
    public static let todayEnabledKey = "native.widget.enabled"
    /// The switch's value as the app last wrote it, so a timer widget can say why it shows no timer.
    public static let timerEnabledMirrorKey = "spread.widget.timerEnabled.v1"
    /// The Today counters, written by the app and read by the Today widget. One key, one copy.
    public static let todayKey = "spread.widget.today.v1"
    public static let todayKind = "SpreadToday"
    public static let timerKind = "SpreadTimer"
    public static let lifeCardsKind = "SpreadLifeCards"
}

// MARK: - Focus timer mirror

/// A mirror of the one local focus session, for widgets. The app's timer stays the only authority;
/// this is rewritten whenever it changes. A running session carries an absolute deadline, so a widget
/// counts down by itself with no background refresh. A paused session carries its frozen seconds.
public struct SpreadFocusWidgetState: Codable, Equatable {
    public enum Phase: String, Codable { case running, paused }

    public let sessionId: String
    public let phase: Phase
    /// Absolute end of a running session. Nil while paused.
    public let endAt: Date?
    /// Seconds left while paused.
    public let pausedSeconds: Int
    public let durationSeconds: Int
    /// "Focus session", unless the person allowed the Life area name outside the app.
    public let title: String
    public let writtenAt: Date
    /// "focus" or "rest". Nil for a session saved before rounds existed, which is one focus stretch.
    public let kind: String?
    public let round: Int?
    public let rounds: Int?
    /// What the Continue control starts once this stretch ends, such as "Start break". Nil when nothing follows.
    public let nextLabel: String?
    /// True when the person stopped this stretch before its time ran out. The widget then says "Stopped".
    public let stoppedEarly: Bool?

    public init(sessionId: String, phase: Phase, endAt: Date?, pausedSeconds: Int,
                durationSeconds: Int, title: String, writtenAt: Date,
                kind: String? = nil, round: Int? = nil, rounds: Int? = nil, nextLabel: String? = nil,
                stoppedEarly: Bool? = nil) {
        self.sessionId = sessionId
        self.phase = phase
        self.endAt = endAt
        self.pausedSeconds = pausedSeconds
        self.durationSeconds = durationSeconds
        self.title = title
        self.writtenAt = writtenAt
        self.kind = kind
        self.round = round
        self.rounds = rounds
        self.nextLabel = nextLabel
        self.stoppedEarly = stoppedEarly
    }

    /// Whole seconds left at `now`. A running session counts down to its deadline; a paused one is frozen.
    public func remaining(at now: Date) -> Int {
        switch phase {
        case .running:
            guard let endAt else { return 0 }
            return max(0, Int(ceil(endAt.timeIntervalSince(now))))
        case .paused:
            return max(0, pausedSeconds)
        }
    }

    /// A running session whose deadline has passed. Widgets show "Finished" until the app clears the mirror.
    public func isFinished(at now: Date) -> Bool {
        phase == .running && remaining(at: now) == 0
    }

    /// The share of the session already used, from 0 to 1.
    public func elapsedFraction(at now: Date) -> Double {
        guard durationSeconds > 0 else { return 0 }
        let used = Double(durationSeconds - remaining(at: now)) / Double(durationSeconds)
        return min(1, max(0, used))
    }

    /// The moments a widget timeline needs an entry: now, and the deadline, so the face flips to
    /// "Finished" by itself even if the app never runs again.
    public func timelineDates(from now: Date) -> [Date] {
        guard phase == .running, let endAt, endAt > now else { return [now] }
        return [now, endAt]
    }

    /// "24:59", or "1:05:00" from one hour up.
    public static func clockText(_ seconds: Int) -> String {
        let total = max(0, seconds)
        let hours = total / 3600
        let minutes = (total % 3600) / 60
        let secs = total % 60
        if hours > 0 { return String(format: "%d:%02d:%02d", hours, minutes, secs) }
        return String(format: "%d:%02d", minutes, secs)
    }

    /// For VoiceOver: "24 minutes 59 seconds", "1 hour 5 minutes".
    public static func spokenText(_ seconds: Int) -> String {
        let total = max(0, seconds)
        let hours = total / 3600
        let minutes = (total % 3600) / 60
        let secs = total % 60
        var parts: [String] = []
        if hours > 0 { parts.append("\(hours) \(hours == 1 ? "hour" : "hours")") }
        if minutes > 0 { parts.append("\(minutes) \(minutes == 1 ? "minute" : "minutes")") }
        if hours == 0 && (secs > 0 || parts.isEmpty) { parts.append("\(secs) \(secs == 1 ? "second" : "seconds")") }
        return parts.joined(separator: " ")
    }
}

// MARK: - Focus controls

/// One control on a focus surface. Each one changes the same record as the Dynamic Island.
public enum SpreadFocusControl: Equatable {
    case pause, resume, forward, stop, cancel, startBlock, startFocus, openSpread
}

/// Which controls a focus widget shows. The small size shows one, the medium shows two, and the large shows
/// every control that applies right now. Each size takes the most important controls first, and the link to
/// Spread comes last. Nothing starts without a tap.
public enum SpreadFocusControlRules {
    public enum Size: Equatable { case small, medium, large }

    /// Every control that applies right now, most important first, ending with the link to Spread. A stretch that
    /// runs or is paused offers Pause or Resume, then Forward when a step follows, then Stop and Cancel. A stretch
    /// that is waiting for a tap offers Forward when a step follows, then Cancel. Idle offers the start controls.
    public static func all(running: Bool, paused: Bool, waiting: Bool, hasNext: Bool,
                           hasBlock: Bool, canStart: Bool) -> [SpreadFocusControl] {
        if running || paused {
            let toggle: SpreadFocusControl = running ? .pause : .resume
            let forward: [SpreadFocusControl] = hasNext ? [.forward] : []
            return [toggle] + forward + [.stop, .cancel, .openSpread]
        }
        if waiting {
            let forward: [SpreadFocusControl] = hasNext ? [.forward] : []
            return forward + [.cancel, .openSpread]
        }
        if hasBlock { return [.startBlock, .openSpread] }
        if canStart { return [.startFocus, .openSpread] }
        return [.openSpread]
    }

    /// Three transport controls are visible at every active Timer widget size.
    /// Forward remains present but disabled by the widget view if there is no next stage.
    /// The expanded island still uses `all` to show only actions that apply.
    public static func shown(_ controls: [SpreadFocusControl], size: Size) -> [SpreadFocusControl] {
        if let transport = controls.first(where: { $0 == .pause || $0 == .resume }) {
            let essential: [SpreadFocusControl] = [transport, .forward, .cancel]
            return size == .large
                ? essential + controls.filter { $0 == .stop || $0 == .openSpread }
                : essential
        }
        if controls.contains(.cancel) {
            let essential: [SpreadFocusControl] = [.forward, .cancel]
            return size == .large
                ? essential + controls.filter { $0 == .openSpread }
                : essential
        }
        switch size {
        case .small: return Array(controls.prefix(1))
        case .medium: return Array(controls.prefix(2))
        case .large: return controls
        }
    }
}

// MARK: - Dates

/// Week math that matches the planner: weeks start on Monday, on the device's own calendar day.
public enum SpreadWidgetDates {
    private static func calendar(_ zone: TimeZone) -> Calendar {
        var value = Calendar(identifier: .gregorian)
        value.timeZone = zone
        return value
    }

    /// `YYYY-MM-DD` of `date` on the device's calendar.
    public static func dayISO(_ date: Date, in zone: TimeZone = .current) -> String {
        let parts = calendar(zone).dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 1970, parts.month ?? 1, parts.day ?? 1)
    }

    /// The Monday of the week that contains `date`, as `YYYY-MM-DD`.
    public static func weekKey(for date: Date, in zone: TimeZone = .current) -> String {
        let c = calendar(zone)
        let offset = (c.component(.weekday, from: date) + 5) % 7
        let monday = c.date(byAdding: .day, value: -offset, to: date) ?? date
        return dayISO(monday, in: zone)
    }
}

// MARK: - Life cards

/// One Life card as a widget draws it. Names and weekly hours leave the app only when the person
/// turned Life cards on widgets on.
public struct SpreadLifeCardWidgetCard: Codable, Equatable, Identifiable {
    /// The Life area's id. It is also the deep-link target.
    public let id: String
    public let name: String
    public let category: String
    /// The Life area's own color as stored by the planner, "#RRGGBB".
    public let colorHex: String
    public let budgetHours: Double
    public let placedHours: Double
    /// Hours placed on Monday through Sunday of the week.
    public let days: [Double]

    public init(id: String, name: String, category: String, colorHex: String,
                budgetHours: Double, placedHours: Double, days: [Double]) {
        self.id = id
        self.name = name
        self.category = category
        self.colorHex = colorHex
        self.budgetHours = budgetHours
        self.placedHours = placedHours
        self.days = days
    }
}

public struct SpreadLifeCardsWidgetSnapshot: Codable, Equatable {
    public let weekKey: String
    public let cards: [SpreadLifeCardWidgetCard]
    public let writtenAt: Date

    public init(weekKey: String, cards: [SpreadLifeCardWidgetCard], writtenAt: Date) {
        self.weekKey = weekKey
        self.cards = cards
        self.writtenAt = writtenAt
    }

    /// Cards describe one calendar week. After the week turns, a widget must not pretend to be live.
    public func isCurrent(at date: Date, in zone: TimeZone = .current) -> Bool {
        weekKey == SpreadWidgetDates.weekKey(for: date, in: zone)
    }
}

public enum SpreadLifeCardsNav {
    public enum Step: String, Codable { case previous, next }

    /// The card to show: the stored selection while it still exists, otherwise the first card.
    public static func resolved(selectedId: String?, in cards: [SpreadLifeCardWidgetCard]) -> SpreadLifeCardWidgetCard? {
        cards.first { $0.id == selectedId } ?? cards.first
    }

    /// The id after one step, wrapping at both ends. Nil when there are no cards.
    public static func stepped(_ step: Step, from selectedId: String?,
                               in cards: [SpreadLifeCardWidgetCard]) -> String? {
        guard !cards.isEmpty else { return nil }
        let current = cards.firstIndex { $0.id == selectedId } ?? 0
        let delta = step == .next ? 1 : -1
        return cards[(current + delta + cards.count) % cards.count].id
    }

    /// One-based position and total, for "2 of 5".
    public static func position(of id: String, in cards: [SpreadLifeCardWidgetCard]) -> (index: Int, count: Int) {
        let index = cards.firstIndex { $0.id == id } ?? 0
        return (index + 1, cards.count)
    }
}

public enum SpreadWidgetColor {
    /// Red, green and blue from "#RRGGBB" or "#RGB", each 0 to 1. Nil when the text is not a color.
    public static func rgb(hex: String) -> (red: Double, green: Double, blue: Double)? {
        var text = hex.trimmingCharacters(in: CharacterSet(charactersIn: "# "))
        if text.count == 3 { text = text.map { "\($0)\($0)" }.joined() }
        guard text.count == 6, let raw = UInt32(text, radix: 16) else { return nil }
        return (Double((raw >> 16) & 0xFF) / 255, Double((raw >> 8) & 0xFF) / 255, Double(raw & 0xFF) / 255)
    }
}

// MARK: - Links

/// Where a tap on a widget or the Dynamic Island lands. The extension builds these; the app parses them.
public enum SpreadWidgetLink: Equatable {
    case today
    case focus
    case lifeCard(String)

    public static let scheme = "spread"

    public var url: URL {
        var parts = URLComponents()
        parts.scheme = Self.scheme
        switch self {
        case .today:
            parts.host = "today"
        case .focus:
            parts.host = "focus"
        case .lifeCard(let id):
            parts.host = "life"
            parts.queryItems = [URLQueryItem(name: "card", value: id)]
        }
        return parts.url ?? URL(fileURLWithPath: "/")
    }

    public static func parse(_ url: URL) -> SpreadWidgetLink? {
        guard url.scheme == scheme, let host = url.host else { return nil }
        switch host {
        case "today":
            return .today
        case "focus":
            return .focus
        case "life":
            let id = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                .queryItems?.first { $0.name == "card" }?.value
            guard let id, !id.isEmpty else { return nil }
            return .lifeCard(id)
        default:
            return nil
        }
    }
}
