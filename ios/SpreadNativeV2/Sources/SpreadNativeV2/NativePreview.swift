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
        let key = PlannerDates.weekISO(base: SpreadV2Fixture.week.weekKey, offset: weekShift)
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
                detail: PlannerDates.weekRange(base: SpreadV2Fixture.week.weekKey, offset: weekShift),
                onMove: { weekShift += $0 },
                onToday: { weekShift = 0 }
            )
        }
    }
}

#endif
