#if os(iOS)
import SwiftUI

/// Explicit forward planning. The only mutation is a guarded, previewed command
/// to Spread's authoritative local store. No automatic rollover or copy.
struct LifePlanAheadSheet: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    @Environment(\.dismiss) private var dismiss
    @State private var planMode = "plans"
    @State private var formPlanId: String?
    @State private var roleId = ""
    @State private var sourceDay = ""
    @State private var dailyTransfer = false
    @State private var destinationDate = Date()
    @State private var amount = 1.0
    @State private var targetCapacityText = ""
    @State private var preview: NativePlanAheadPreview?
    @State private var previewing = false
    @State private var saving = false

    private var earliestDestination: Date {
        PlannerDates.calendar.date(byAdding: .weekOfYear, value: 1,
                                   to: PlannerDates.date(snapshot.weekKey)) ?? Date()
    }
    private var destinationISO: String {
        PlannerDates.label(destinationDate, pattern: "yyyy-MM-dd")
    }
    private var availableDays: [String] {
        Array(Set(snapshot.allocations.filter { $0.roleId == roleId }.map(\.day))).sorted()
    }
    private var role: Responsibility? { snapshot.roles.first { $0.id == roleId } }
    private var enteredCapacity: Double? {
        let value = targetCapacityText.replacingOccurrences(of: ",", with: ".")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : Double(value)
    }
    private var payload: [String: Any] {
        var result: [String: Any] = [
            "type": "transferPlanAhead", "roleId": roleId,
            "toDay": destinationISO, "hours": amount
        ]
        if dailyTransfer { result["fromDay"] = sourceDay }
        if let enteredCapacity { result["targetCapacityHours"] = enteredCapacity }
        return result
    }

    var body: some View {
        SpreadSheetStack {
            Form {
                if planMode == "plans" {
                    plansSections
                } else {
                    Section {
                        Button {
                            formPlanId = nil
                            preview = nil
                            planMode = "plans"
                        } label: {
                            Label("Your plans", systemImage: "chevron.backward")
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .frame(minHeight: 44)
                        }
                        .accessibilityIdentifier("plan-ahead-back-to-plans")
                    }
                    if planMode == "repeat" {
                        LifeRecurringPlanForm(planner: planner, snapshot: snapshot,
                                              initialPlanId: formPlanId)
                    } else {
                Section {
                    Text("Move time to another week. Nothing moves until you preview and confirm.")
                        .font(.subheadline)
                        .foregroundStyle(Spread.secondary)
                    Picker("Life area", selection: $roleId) {
                        ForEach(snapshot.roles) { role in
                            Text(role.name).tag(role.id)
                        }
                    }
                    Picker("Move", selection: $dailyTransfer) {
                        Text("Weekly hours").tag(false)
                        Text("Hours on a day").tag(true)
                    }
                    .pickerStyle(.segmented)
                    if dailyTransfer {
                        if availableDays.isEmpty {
                            Text("Plan hours on a day first, or switch to Weekly hours.")
                                .font(.callout).foregroundStyle(Spread.secondary)
                        } else {
                            Picker("From day", selection: $sourceDay) {
                                ForEach(availableDays, id: \.self) { iso in
                                    Text(PlannerDates.label(PlannerDates.date(iso), pattern: "EEE, MMM d"))
                                        .tag(iso)
                                }
                            }
                        }
                    }
                } header: { Text("From this week") }

                Section {
                    DatePicker("Move to", selection: $destinationDate,
                               in: earliestDestination..., displayedComponents: .date)
                        .environment(\.calendar, PlannerDates.calendar)
                        .environment(\.timeZone, PlannerDates.calendar.timeZone)
                    Stepper(value: $amount, in: 0.5...168, step: 0.5) {
                        Text(SpreadHours.text(amount) + " hours")
                            .font(.headline).monospacedDigit()
                    }
                    TextField("Target weekly hours (if not set)", text: $targetCapacityText)
                        .keyboardType(.decimalPad)
                        .accessibilityIdentifier("plan-ahead-target-capacity")
                    Text("Enter the destination week's total hours if it has not been set. Existing budgets are preserved.")
                        .font(.caption).foregroundStyle(Spread.secondary)
                } header: { Text("To a future week") }

                Section {
                    Button {
                        Task { await requestPreview() }
                    } label: {
                        Label(previewing ? "Checking…" : "Preview transfer", systemImage: "eye")
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .disabled(previewing || saving || planner.busy ||
                              role == nil || (dailyTransfer && availableDays.isEmpty))
                    .accessibilityIdentifier("plan-ahead-preview")
                    if let preview {
                        if preview.eligible {
                            VStack(alignment: .leading, spacing: 5) {
                                Text(SpreadHours.text(preview.hours) + "h moves to " +
                                    PlannerDates.label(PlannerDates.date(preview.targetWeek), pattern: "MMM d"))
                                    .font(.headline)
                                Text("This week: " + SpreadHours.text(preview.sourceBudgetBefore) +
                                     "h → " + SpreadHours.text(preview.sourceBudgetAfter) + "h")
                                Text("Future week: " + SpreadHours.text(preview.targetBudgetBefore) +
                                     "h → " + SpreadHours.text(preview.targetBudgetAfter) + "h")
                                if preview.movedTasks > 0 {
                                    Text("\(preview.movedTasks) linked tasks move with these hours.")
                                }
                                Text("No automatic rollover. Changes can be undone from Life.")
                                    .font(.caption)
                            }
                            .font(.subheadline)
                            .foregroundStyle(Spread.ink)
                        } else {
                            Label(preview.reason ?? "This transfer is not available.",
                                  systemImage: "exclamationmark.circle")
                                .foregroundStyle(Spread.danger)
                        }
                    }
                    Button {
                        Task { await confirmTransfer() }
                    } label: {
                        Text(saving ? "Saving…" : "Move hours")
                            .frame(maxWidth: .infinity, minHeight: 50)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(saving || planner.busy || preview?.eligible != true)
                    .accessibilityIdentifier("plan-ahead-confirm")
                } header: { Text("Review before moving") }
                    }
                }
            }
            .spreadListSurface()
            .navigationTitle("Plan Ahead")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }.disabled(saving)
                }
            }
        }
        .presentationDetents([.large])
        .onAppear {
            if roleId.isEmpty { roleId = snapshot.roles.first?.id ?? "" }
            destinationDate = earliestDestination
            sourceDay = availableDays.first ?? ""
        }
        .onChange(of: roleId) { _, _ in
            sourceDay = availableDays.first ?? ""
            preview = nil
        }
        .onChange(of: dailyTransfer) { _, _ in preview = nil }
        .onChange(of: sourceDay) { _, _ in preview = nil }
        .onChange(of: amount) { _, _ in preview = nil }
        .onChange(of: destinationDate) { _, _ in preview = nil }
        .onChange(of: targetCapacityText) { _, _ in preview = nil }
        .accessibilityIdentifier("life-plan-ahead-sheet")
    }

    /// Repeating schedules that still apply from next week onward.
    private var activeRules: [NativeRecurringPlan] {
        (snapshot.recurringPlans ?? []).filter { rule in
            rule.terminatedWeek == nil &&
                (rule.endWeek == nil || rule.endWeek! >= PlannerDates.weekKey(for: earliestDestination))
        }
    }

    private func roleName(_ id: String) -> String {
        snapshot.roles.first(where: { $0.id == id })?.name ?? "Life area"
    }

    private func planSummary(_ plan: NativeRecurringPlan) -> String {
        let every = plan.everyWeeks == 1 ? "every week" : "every \(plan.everyWeeks) weeks"
        let start = PlannerDates.label(PlannerDates.date(plan.startWeek), pattern: "MMM d")
        let amount: String
        if let days = plan.dayHours, !days.isEmpty {
            amount = LifeRecurringPlanForm.dayLine(days)
        } else {
            amount = SpreadHours.text(plan.hours) + "h"
        }
        return amount + " " + every + ", from " + start
    }

    private func outlookHoursText(_ week: NativeOutlookWeek) -> String {
        let parts: [String] = week.hours
            .filter { (entry: NativeOutlookHours) -> Bool in entry.hours > 0 }
            .map { (entry: NativeOutlookHours) -> String in
                roleName(entry.roleId) + " " + SpreadHours.text(entry.hours) + "h"
            }
        return parts.isEmpty ? "No hours planned" : parts.joined(separator: ", ")
    }

    private func outlookPlacedText(_ week: NativeOutlookWeek) -> String {
        let parts: [String] = week.placed.map { (placement: NativeOutlookPlacement) -> String in
            let day = PlannerDates.label(PlannerDates.date(placement.day), pattern: "EEE")
            return roleName(placement.roleId) + " " + day + " " + SpreadHours.text(placement.hours) + "h"
        }
        return "Days set: " + parts.joined(separator: ", ")
    }

    /// Next eight weeks, read-only. Built from the same planner state as Life and Week.
    /// Text rows rather than a dot grid, so VoiceOver reads each week in full.
    @ViewBuilder
    private var outlookSection: some View {
        if let weeks = snapshot.outlook, !weeks.isEmpty {
            Section {
                ForEach(weeks) { week in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text("Week of " + PlannerDates.label(PlannerDates.date(week.weekKey), pattern: "MMM d"))
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Spread.ink)
                            Spacer()
                            if week.kept {
                                Text("Kept as set")
                                    .font(.caption)
                                    .foregroundStyle(Spread.secondary)
                            }
                        }
                        Text(outlookHoursText(week))
                            .font(.caption)
                            .foregroundStyle(Spread.secondary)
                        if !week.placed.isEmpty {
                            Text(outlookPlacedText(week))
                                .font(.caption)
                                .foregroundStyle(Spread.secondary)
                        }
                    }
                    .accessibilityElement(children: .combine)
                }
            } header: {
                Text("Next 8 weeks")
            } footer: {
                Text("Read-only. Change a week in Week. A schedule does not change kept weeks.")
            }
        }
    }

    /// Entry screen: shows what is already planned before asking for input.
    /// Reads the store snapshot only; tapping a row opens a form, nothing is sent.
    @ViewBuilder
    private var plansSections: some View {
        Section {
            if activeRules.isEmpty {
                Text("No repeating schedules yet. A schedule sets weekly hours for one Life area.")
                    .font(.subheadline)
                    .foregroundStyle(Spread.secondary)
            } else {
                ForEach(activeRules) { plan in
                    Button {
                        formPlanId = plan.id
                        preview = nil
                        planMode = "repeat"
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(roleName(plan.roleId))
                                    .foregroundStyle(Spread.ink)
                                Text(planSummary(plan))
                                    .font(.caption)
                                    .foregroundStyle(Spread.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundStyle(Spread.secondary)
                        }
                        .frame(minHeight: 44)
                    }
                    .accessibilityIdentifier("plan-ahead-plan-row")
                }
            }
        } header: {
            Text("Your plans")
        }
        outlookSection
        Section {
            Button {
                formPlanId = nil
                preview = nil
                planMode = "repeat"
            } label: {
                Label("New schedule", systemImage: "plus")
                    .frame(minHeight: 44)
            }
            .disabled(snapshot.roles.isEmpty)
            .accessibilityIdentifier("plan-ahead-new-schedule")
        }
        Section {
            Button {
                preview = nil
                planMode = "move"
            } label: {
                Label("Move hours once", systemImage: "arrow.left.arrow.right")
                    .frame(minHeight: 44)
            }
            .accessibilityIdentifier("plan-ahead-move-once")
        } footer: {
            Text("Move time from this week to another week. Nothing moves until you preview and confirm.")
        }
    }

    private func requestPreview() async {
        guard !previewing, !saving, !roleId.isEmpty else { return }
        previewing = true
        preview = await planner.previewPlanAhead(
            roleId: roleId, toDay: destinationISO, hours: amount,
            fromDay: dailyTransfer ? sourceDay : nil,
            targetCapacityHours: enteredCapacity
        )
        previewing = false
    }

    private func confirmTransfer() async {
        guard !saving, preview?.eligible == true else { return }
        saving = true
        let ok = await planner.send(payload)
        saving = false
        if ok {
            LifeFeedback.accepted()
            dismiss()
        } else {
            preview = nil
        }
    }
}
#endif
