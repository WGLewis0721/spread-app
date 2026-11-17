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
                    metric("\(SpreadHours.text(planned))h", "planned across \(snapshot.roles.count) Life areas")
                    metric("\(SpreadHours.text(placed))h", "placed on days")
                    metric("\(completed)", completed == 1 ? "completed task" : "completed tasks")
                    Text("Planned time is not measured time spent.")
                        .font(Spread.footnote).foregroundStyle(Spread.secondary)
                    if snapshot.roles.isEmpty {
                        ContentUnavailableView("Nothing to review yet", systemImage: "calendar",
                                               description: Text("Add a Life area and plan a week first."))
                    }
                }
                .padding(Spread.space5)
            }
            .navigationTitle("Week in Review")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
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
        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
    }
}

/// The weekly ritual is intentionally separate from Planner. Planner continues to own repeating schedules.
struct LifeWeekAheadSheet: View {
    let snapshot: PlannerSnapshot
    @Environment(\.dismiss) private var dismiss
    @State private var roleIndex = 0
    @State private var reviewed = Set<String>()

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
                    if let role = currentRole {
                        VStack(alignment: .leading, spacing: Spread.space3) {
                            HStack {
                                Circle().fill(Color(hex: role.color)).frame(width: 12, height: 12)
                                Text(role.name).font(.title2.bold())
                                Spacer()
                                Text("\(roleIndex + 1) of \(snapshot.roles.count)")
                                    .font(Spread.footnote).foregroundStyle(Spread.secondary)
                            }
                            Text("\(SpreadHours.text(role.hours)) hours this week")
                                .font(.title3.weight(.semibold))
                            Text("Review hours, days, and tasks for this Life area. Use Week to make changes.")
                                .font(Spread.callout).foregroundStyle(Spread.secondary)
                            Button("Mark reviewed") {
                                reviewed.insert(role.id)
                                if roleIndex < snapshot.roles.count - 1 { roleIndex += 1 }
                            }
                            .buttonStyle(.borderedProminent)
                            .frame(maxWidth: .infinity, minHeight: Spread.minimumTarget)
                            .accessibilityIdentifier("week-ahead-review-role")
                        }
                        .padding(Spread.space4)
                        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
                    } else {
                        ContentUnavailableView("No Life areas to plan", systemImage: "calendar.badge.plus",
                                               description: Text("Add a Life area first."))
                    }
                    if !snapshot.roles.isEmpty && reviewed.count == snapshot.roles.count {
                        Label("Week reviewed", systemImage: "checkmark.circle.fill")
                            .font(.title3.bold()).foregroundStyle(Spread.accent)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(Spread.space4)
                            .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
                    }
                }
                .padding(Spread.space5)
            }
            .navigationTitle("Week Ahead")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
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
                    Text("Your current planning history starts with this week.")
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
                        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
                    }
                    if snapshot.roles.isEmpty {
                        ContentUnavailableView("Your Journey begins here", systemImage: "chart.line.uptrend.xyaxis",
                                               description: Text("Plan a Life area to begin building history."))
                    }
                    Text("These are planning facts, not measured time spent or a productivity score.")
                        .font(Spread.footnote).foregroundStyle(Spread.secondary)
                }
                .padding(Spread.space5)
            }
            .navigationTitle("Your Journey")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
        .presentationDetents([.large])
        .accessibilityIdentifier("your-journey-sheet")
    }
}
#endif
