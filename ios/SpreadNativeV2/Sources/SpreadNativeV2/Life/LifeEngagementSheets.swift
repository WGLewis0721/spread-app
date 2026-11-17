#if os(iOS)
import SwiftUI

/// Read-only weekly reflection built only from the live planner projection.
/// Planned hours and completed tasks stay separate so the UI never implies measured time spent.
struct LifeWeekReviewSheet: View {
    let snapshot: PlannerSnapshot
    @Environment(\.dismiss) private var dismiss

    private var planned: Double { snapshot.roles.reduce(0) { $0 + $1.hours } }
    private var completed: Int { snapshot.tasks.filter(\.done).count }
    private var placed: Double { snapshot.allocations.reduce(0) { $0 + $1.hours } }

    var body: some View {
        SpreadSheetStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spread.space4) {
                    Text(PlannerDates.weekRange(base: snapshot.weekKey, offset: 0))
                        .font(Spread.callout).foregroundStyle(Spread.secondary)
                    if snapshot.roles.isEmpty {
                        ContentUnavailableView("Nothing to review yet", systemImage: "calendar",
                                               description: Text("Add a Life area and plan a week first."))
                    } else {
                        metric("\(SpreadHours.text(planned)) h", "Weekly budget")
                        metric("\(SpreadHours.text(placed)) h", "Reserved on days")
                        metric("\(completed)", completed == 1 ? "Task completed" : "Tasks completed")
                    }
                }
                .padding(Spread.space5)
            }
            .navigationTitle("Week in Review")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button { dismiss() } label: { Text("Done").tapTarget() } } }
        }
        .presentationDetents([.large])
        .accessibilityIdentifier("week-in-review-sheet")
    }

    private func metric(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value).font(.system(.largeTitle, weight: .bold)).foregroundStyle(Spread.ink)
            Text(label).font(Spread.callout).foregroundStyle(Spread.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spread.space4)
        .spreadCard()
        .accessibilityElement(children: .combine)
    }
}

/// The weekly ritual is intentionally separate from Planner. Planner continues to own repeating schedules.
struct LifeWeekAheadSheet: View {
    let snapshot: PlannerSnapshot
    @Environment(\.dismiss) private var dismiss
    @State private var roleIndex = 0

    private var currentRole: Responsibility? {
        guard snapshot.roles.indices.contains(roleIndex) else { return nil }
        return snapshot.roles[roleIndex]
    }

    var body: some View {
        SpreadSheetStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spread.space4) {
                    Text(PlannerDates.weekRange(base: snapshot.weekKey, offset: 0))
                        .font(Spread.callout).foregroundStyle(Spread.secondary)
                    if snapshot.roles.isEmpty {
                        ContentUnavailableView("No Life areas to review", systemImage: "calendar.badge.plus",
                                               description: Text("Add a Life area to get started."))
                    } else if let role = currentRole {
                        VStack(alignment: .leading, spacing: Spread.space3) {
                            HStack {
                                Circle().fill(Color(hex: role.color)).frame(width: 12, height: 12)
                                Text(role.name).font(Spread.headline)
                                Spacer()
                                Text("\(roleIndex + 1) of \(snapshot.roles.count)")
                                    .font(Spread.footnote).foregroundStyle(Spread.secondary)
                            }
                            Text("\(SpreadHours.text(role.hours)) h budgeted · \(SpreadHours.text(snapshot.placedHours(for: role.id))) h reserved")
                                .font(Spread.body)
                            Text("Use Week to change the plan.")
                                .font(Spread.callout).foregroundStyle(Spread.secondary)
                            Button {
                                roleIndex += 1
                            } label: {
                                Text("Mark reviewed")
                                    .font(Spread.headline)
                                    .foregroundStyle(Spread.onAccent)
                                    .frame(maxWidth: .infinity, minHeight: Spread.minimumTarget)
                                    .background(Capsule().fill(Spread.accentGradient))
                            }
                            .buttonStyle(.spreadPress)
                            .accessibilityIdentifier("week-ahead-review-role")
                        }
                        .padding(Spread.space4)
                        .spreadCard(edge: Color(hex: role.color))
                    } else {
                        Label("Week reviewed", systemImage: "checkmark.circle.fill")
                            .font(.title3.bold()).foregroundStyle(Spread.accent)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(Spread.space4)
                            .spreadCard()
                            .accessibilityAddTraits(.isHeader)
                    }
                }
                .padding(Spread.space5)
            }
            .navigationTitle("Week Ahead")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button { dismiss() } label: { Text("Done").tapTarget() } } }
        }
        .presentationDetents([.large])
        .accessibilityIdentifier("week-ahead-sheet")
    }
}

/// A truthful first Journey surface. It reports planner facts and never turns them into a productivity score.
struct LifeJourneySheet: View {
    let snapshot: PlannerSnapshot
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        SpreadSheetStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spread.space3) {
                    Text(PlannerDates.weekRange(base: snapshot.weekKey, offset: 0))
                        .font(Spread.callout).foregroundStyle(Spread.secondary)
                    ForEach(snapshot.roles) { role in
                        let placed = snapshot.placedHours(for: role.id)
                        let completed = snapshot.tasks(for: role.id).filter(\.done).count
                        HStack(spacing: Spread.space3) {
                            Circle().fill(Color(hex: role.color)).frame(width: 12, height: 12)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(role.name).font(.headline)
                                Text("\(SpreadHours.text(role.hours))h planned · \(SpreadHours.text(placed))h placed")
                                    .font(Spread.callout).foregroundStyle(Spread.secondary)
                                Text("\(completed) completed " + (completed == 1 ? "task" : "tasks"))
                                    .font(Spread.footnote).foregroundStyle(Spread.secondary)
                            }
                            Spacer(minLength: 0)
                        }
                        .padding(Spread.space4)
                        .spreadCard(edge: Color(hex: role.color), radius: Spread.radiusRow)
                        .accessibilityElement(children: .combine)
                    }
                    if snapshot.roles.isEmpty {
                        ContentUnavailableView("Your Journey begins here", systemImage: "chart.line.uptrend.xyaxis",
                                               description: Text("Plan a Life area to begin building history."))
                    }
                }
                .padding(Spread.space5)
            }
            .navigationTitle("Your Journey")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button { dismiss() } label: { Text("Done").tapTarget() } } }
        }
        .presentationDetents([.large])
        .accessibilityIdentifier("your-journey-sheet")
    }
}
#endif
