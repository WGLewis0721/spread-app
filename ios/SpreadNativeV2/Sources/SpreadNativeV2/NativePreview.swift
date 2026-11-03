#if os(iOS)
import SwiftUI

/// Debug-only native experience slice. All planning data is a fixture:
/// this preview does not load, modify, back up or sync a person's plans.
public struct SpreadNativeV2Preview: View {
    @State private var selection = 0
    @State private var weekShift = 0
    @State private var mode = SpreadLayout.stack
    @State private var selectedRole = "work"

    public init() {}

    private var source: PlannerSnapshot {
        let key = PreviewDates.weekISO(base: SpreadV2Fixture.week.weekKey, offset: weekShift)
        if weekShift == 0 { return SpreadV2Fixture.week }
        return PlannerSnapshot(weekKey: key, roles: SpreadV2Fixture.week.roles,
                               allocations: [], tasks: [])
    }

    public var body: some View {
        VStack(spacing: 0) {
            header
                .padding(.horizontal, 20)
                .padding(.bottom, 8)
            TabView(selection: $selection) {
                NavigationStack {
                    WeekPreviewView(snapshot: source)
                }
                .tabItem { Label("Week", systemImage: "calendar") }
                .tag(0)

                NavigationStack {
                    SpreadLayoutsView(snapshot: source, mode: $mode, selectedId: $selectedRole)
                }
                .tabItem { Label("Spread", systemImage: "square.stack") }
                .tag(1)
            }
            .tint(Chalk.yellow)
        }
        .background(Chalk.canvas.ignoresSafeArea())
        .preferredColorScheme(.dark)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text("Spread").font(.system(size: 32, weight: .semibold, design: .serif))
                    .foregroundStyle(Chalk.ink)
                Spacer()
                Text("NATIVE PREVIEW").font(.caption2.weight(.bold))
                    .tracking(1).foregroundStyle(Chalk.yellow)
            }
            WeekCrownView(
                title: weekShift == 0 ? "This week" : "Week \(weekShift > 0 ? "+" : "")\(weekShift)",
                detail: PreviewDates.weekRange(base: SpreadV2Fixture.week.weekKey, offset: weekShift),
                onMove: { weekShift += $0 },
                onToday: { weekShift = 0 }
            )
        }
    }
}

enum PreviewDates {
    static let formatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(secondsFromGMT: 0)
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    static func date(_ iso: String) -> Date {
        formatter.date(from: iso) ?? Date(timeIntervalSince1970: 0)
    }

    static func weekISO(base: String, offset: Int) -> String {
        let shifted = Calendar(identifier: .gregorian).date(byAdding: .day, value: offset * 7, to: date(base)) ?? date(base)
        return formatter.string(from: shifted)
    }

    static func dayISO(weekKey: String, index: Int) -> String {
        let day = Calendar(identifier: .gregorian).date(byAdding: .day, value: index, to: date(weekKey)) ?? date(weekKey)
        return formatter.string(from: day)
    }

    static func weekday(weekKey: String, index: Int) -> String {
        let d = date(dayISO(weekKey: weekKey, index: index))
        return d.formatted(.dateTime.weekday(.abbreviated))
    }

    static func dayNumber(weekKey: String, index: Int) -> String {
        String(Calendar(identifier: .gregorian).component(.day, from: date(dayISO(weekKey: weekKey, index: index))))
    }

    static func weekRange(base: String, offset: Int) -> String {
        let monday = date(weekISO(base: base, offset: offset))
        let sunday = Calendar(identifier: .gregorian).date(byAdding: .day, value: 6, to: monday) ?? monday
        return "\(monday.formatted(.dateTime.month(.abbreviated).day())) – \(sunday.formatted(.dateTime.month(.abbreviated).day()))"
    }
}
#endif
