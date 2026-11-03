import Foundation

/// Display order and per-device view memory, mirrored from the pre-migration planner.
///
/// Day order: `weekDays()` in `src/lib/spread/model.ts` lists Sunday first and Monday last, and the React
/// planner shows that order top to bottom. The native week keeps it.
public enum PlannerOrder {
    /// Index offsets from the week's Monday in the order they are shown: Sunday (6) first, Monday (0) last.
    public static let displayOffsets: [Int] = [6, 5, 4, 3, 2, 1, 0]

    /// Two-letter day marks used by the Spread role row (`DAY_MARKS` in spread-app.tsx), Monday first.
    public static let dayMarks: [String] = ["M", "Tu", "W", "Th", "F", "Sa", "Su"]

    /// ISO day for a display position (0 = top row).
    public static func day(weekKey: String, displayPosition: Int) -> String {
        PlannerDates.dayISO(weekKey: weekKey, index: displayOffsets[displayPosition])
    }
}

/// Read-only mirror of `suggestFreeTime` in `src/lib/spread/free-time.ts`. Suggestions never change data:
/// each one becomes a write only when the person taps it, and that write goes through the store.
/// Parity vectors for this mirror belong in the release QA pass (see the implementation ledger).
public enum FreeTimeMirror {
    public struct Suggestion: Equatable, Identifiable, Sendable {
        public let roleId: String
        public let day: String
        public let dayLabel: String
        public let hours: Double
        public var id: String { roleId + ":" + day }
    }

    public static let maxSuggestions = 3

    /// Roles that still have unplaced hours, paired with the lightest day still ahead.
    public static func suggestions(for snapshot: PlannerSnapshot, today: String) -> [Suggestion] {
        let ahead = PlannerOrder.displayOffsets.map { offset in
            PlannerDates.dayISO(weekKey: snapshot.weekKey, index: offset)
        }.filter { $0 >= today }.sorted()
        guard !ahead.isEmpty else { return [] }

        var load: [String: Double] = [:]
        for day in ahead {
            load[day] = snapshot.allocations.filter { $0.day == day }.reduce(0) { $0 + $1.hours }
        }
        let open = snapshot.roles.enumerated().map { index, role in
            (roleId: role.id, index: index, left: snapshot.remainingHours(for: role.id))
        }
        .filter { $0.left > 0 }
        .sorted { $0.left == $1.left ? $0.index < $1.index : $0.left > $1.left }

        var items: [Suggestion] = []
        for role in open.prefix(maxSuggestions) {
            var best = ahead[0]
            for day in ahead where (load[day] ?? 0) < (load[best] ?? 0) { best = day }
            let hours = min(1, role.left)
            items.append(Suggestion(roleId: role.roleId, day: best, dayLabel: PlannerDates.label(PlannerDates.date(best), pattern: "EEEE"), hours: hours))
            load[best, default: 0] += hours
        }
        return items
    }
}

/// Per-device view convenience (where the person was). Not planner data, never backed up or synced.
/// The keys match the React planner's `spread-view.<profile>` and `spread-crown-used`.
enum SpreadViewMemory {
    static let crownUsedKey = "spread-crown-used"
    static let layoutKey = "spread.studio.layout"

    struct Context: Equatable {
        var destination: SpreadDestination
        var monthPlane: Bool
        static let `default` = Context(destination: .spread, monthPlane: false)
    }

    private static func key(_ profileId: String) -> String { "spread-view." + profileId }

    static func read(profileId: String?) -> Context {
        guard let profileId, let raw = UserDefaults.standard.string(forKey: key(profileId)),
              let data = raw.data(using: .utf8),
              let value = try? JSONSerialization.jsonObject(with: data) as? [String: String] else {
            return .default
        }
        return Context(
            destination: value["view"] == "week" ? .week : .spread,
            monthPlane: value["plane"] == "month"
        )
    }

    static func write(_ context: Context, profileId: String?) {
        guard let profileId else { return }
        let value = ["view": context.destination == .week ? "week" : "spread", "plane": context.monthPlane ? "month" : "week"]
        if let data = try? JSONSerialization.data(withJSONObject: value), let text = String(data: data, encoding: .utf8) {
            UserDefaults.standard.set(text, forKey: key(profileId))
        }
    }
}

/// The five Spread layouts from the owner-approved Studio board (`src/lib/spread/studio/layouts.ts`).
/// `SpreadLayout` is kept as the same raw-value enum the earlier native slice used.
public enum SpreadLayoutPreference {
    public static func read() -> SpreadLayout {
        SpreadLayout(rawValue: UserDefaults.standard.string(forKey: SpreadViewMemory.layoutKey) ?? "") ?? .stack
    }

    public static func write(_ layout: SpreadLayout) {
        UserDefaults.standard.set(layout.rawValue, forKey: SpreadViewMemory.layoutKey)
    }
}
