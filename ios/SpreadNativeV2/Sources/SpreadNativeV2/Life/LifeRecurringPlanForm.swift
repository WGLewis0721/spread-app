#if os(iOS)
import SwiftUI

/// Recurring schedules reserve WEEKLY hours. No appointments or tasks are copied.
struct LifeRecurringPlanForm: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    @Environment(\.dismiss) private var dismiss
    @State private var roleId = ""
    @State private var hours = 2.0
    @State private var everyWeeks = 2
    @State private var startDate = Date()
    @State private var hasEnd = false
    @State private var endDate = Date()
    @State private var editingPlanId: String?
    @State private var editScope = "all"
    @State private var editFromDate = Date()
    @State private var preview: NativeRecurringPreview?
    @State private var previewRevision: Int?
    @State private var checking = false
    @State private var saving = false
    @State private var stopCandidate: NativeRecurringPlan?
    @State private var showStopConfirmation = false

    private var earliest: Date {
        PlannerDates.calendar.date(byAdding: .weekOfYear, value: 1,
            to: PlannerDates.date(snapshot.weekKey)) ?? Date()
    }
    private var activeRules: [NativeRecurringPlan] {
        (snapshot.recurringPlans ?? []).filter { rule in
            rule.terminatedWeek == nil &&
                (rule.endWeek == nil || rule.endWeek! >= PlannerDates.weekKey(for: earliest))
        }
    }
    private var selectedRule: NativeRecurringPlan? {
        snapshot.recurringPlans?.first(where: { $0.id == editingPlanId })
    }
    private var payload: [String: Any] {
        var value: [String: Any] = [
            "roleId": roleId, "hours": hours, "everyWeeks": everyWeeks,
            "startWeek": selectedRule?.startWeek ?? PlannerDates.weekKey(for: startDate),
        ]
        if hasEnd { value["endWeek"] = PlannerDates.weekKey(for: endDate) }
        if let selectedRule {
            value["planId"] = selectedRule.id
            if editScope == "following" {
                value["editFromWeek"] = PlannerDates.weekKey(for: editFromDate)
            }
        }
        if selectedRule == nil, let capacity = snapshot.life?.capacityHours {
            value["capacityHours"] = capacity
        }
        return value
    }
    private var lifeName: String {
        snapshot.roles.first(where: { $0.id == roleId })?.name ?? "Life area"
    }
    var body: some View {
        Group {
            if let issue = snapshot.recurrenceIssue {
                Section {
                    Label(issue, systemImage: "exclamationmark.triangle")
                        .foregroundStyle(Spread.danger)
                }
            }
            Section {
                Picker("Life area", selection: $roleId) {
                    ForEach(snapshot.roles) { role in
                        Text(role.name).tag(role.id)
                    }
                }
                .disabled(editingPlanId != nil)
                Stepper(value: $hours, in: 0.5...168, step: 0.5) {
                    Text(SpreadHours.text(hours) + " hours per scheduled week")
                        .font(.body)
                }
                Picker("Repeat", selection: $everyWeeks) {
                    Text("Every week").tag(1)
                    Text("Every 2 weeks").tag(2)
                    Text("Every 3 weeks").tag(3)
                    Text("Every 4 weeks").tag(4)
                }
                if selectedRule == nil {
                    DatePicker("Starts week of", selection: $startDate, in: earliest...,
                               displayedComponents: .date)
                } else {
                    HStack {
                        Text("Starts")
                        Spacer()
                        Text(PlannerDates.label(PlannerDates.date(selectedRule!.startWeek), pattern: "MMM d, yyyy"))
                            .foregroundStyle(Spread.secondary)
                    }
                }
                Toggle("End on a date", isOn: $hasEnd)
                if hasEnd {
                    DatePicker("Ends week of", selection: $endDate,
                               in: (selectedRule.map { PlannerDates.date($0.startWeek) } ?? startDate)...,
                               displayedComponents: .date)
                }
            } header: {
                Text(editingPlanId == nil ? "Repeat weekly hours" : "Edit repeating schedule")
            } footer: {
                Text("This sets aside weekly hours. It does not choose a day or repeat tasks.")
            }
            if selectedRule != nil {
                Section("Change") {
                    Picker("Apply changes to", selection: $editScope) {
                        Text("Entire series").tag("all")
                        Text("This and following weeks").tag("following")
                    }
                    if editScope == "following" {
                        DatePicker("Starting week", selection: $editFromDate,
                                   in: earliest..., displayedComponents: .date)
                    }
                    Button("New schedule") {
                        editingPlanId = nil
                        editScope = "all"
                        preview = nil
                    }
                    Button("Stop repeating") {
                        stopCandidate = selectedRule
                        showStopConfirmation = true
                    }
                    .foregroundStyle(Spread.danger)
                }
            }
            if !activeRules.isEmpty {
                Section("Saved repeating schedules") {
                    ForEach(activeRules) { plan in
                        Button {
                            editingPlanId = plan.id
                            roleId = plan.roleId
                            hours = plan.hours
                            everyWeeks = plan.everyWeeks
                            startDate = PlannerDates.date(plan.startWeek)
                            hasEnd = plan.endWeek != nil
                            if let end = plan.endWeek { endDate = PlannerDates.date(end) }
                            editScope = "all"
                            editFromDate = earliest
                            preview = nil
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(snapshot.roles.first(where: { $0.id == plan.roleId })?.name ?? "Life area")
                                        .foregroundStyle(Spread.ink)
                                    Text(SpreadHours.text(plan.hours) + "h every " +
                                        (plan.everyWeeks == 1 ? "week" : "\(plan.everyWeeks) weeks"))
                                        .font(.caption).foregroundStyle(Spread.secondary)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .foregroundStyle(Spread.secondary)
                            }.frame(minHeight: 44)
                        }
                    }
                }
            }
            if let preview {
                Section("Review before confirming") {
                    if preview.eligible {
                        Text(lifeName + " · " + SpreadHours.text(preview.hours) +
                             "h every " + (preview.everyWeeks == 1 ? "week" : "\(preview.everyWeeks) weeks"))
                            .font(.headline)
                        HStack {
                            Text("Starts")
                            Spacer()
                            Text(PlannerDates.label(PlannerDates.date(preview.startWeek), pattern: "MMM d, yyyy"))
                        }
                        HStack {
                            Text("Ends")
                            Spacer()
                            Text(preview.endWeek.map {
                                PlannerDates.label(PlannerDates.date($0), pattern: "MMM d, yyyy")
                            } ?? "Never")
                        }
                        ForEach(preview.nextOccurrences, id: \.self) { week in
                            HStack {
                                Text("Week of " + PlannerDates.label(PlannerDates.date(week), pattern: "MMM d"))
                                Spacer()
                                Text(SpreadHours.text(preview.hours) + "h")
                                    .monospacedDigit()
                            }
                        }
                        if !preview.preservedWeeks.isEmpty {
                            Label("\(preview.preservedWeeks.count) existing weeks will be left unchanged.",
                                  systemImage: "info.circle")
                                .font(.subheadline)
                        }
                        if let managed = preview.managedFromWeek, managed < preview.startWeek {
                            Text("The selected Life area will have 0h in earlier unplanned weeks from " +
                                 PlannerDates.label(PlannerDates.date(managed), pattern: "MMM d") + ".")
                                .font(.caption).foregroundStyle(Spread.secondary)
                        }
                        Text("Existing tasks and day placements will not be duplicated.")
                            .font(.caption).foregroundStyle(Spread.secondary)
                    } else {
                        Label(preview.reason ?? "This schedule cannot be applied.",
                              systemImage: "exclamationmark.circle")
                            .foregroundStyle(Spread.danger)
                    }
                }
            }
            Section {
                Button {
                    Task {
                        if preview?.eligible == true { await confirm() }
                        else { await review() }
                    }
                } label: {
                    Text(saving ? "Saving…" : checking ? "Checking…" :
                         preview?.eligible == true ? "Confirm schedule" : "Review schedule")
                        .frame(maxWidth: .infinity, minHeight: 50)
                }
                .buttonStyle(.borderedProminent)
                .disabled(saving || checking || planner.busy || roleId.isEmpty)
                .accessibilityIdentifier("plan-ahead-repeat-primary")
            }
        }
        .onAppear {
            if roleId.isEmpty { roleId = snapshot.roles.first?.id ?? "" }
            startDate = earliest
            editFromDate = earliest
            endDate = PlannerDates.calendar.date(byAdding: .month, value: 3, to: earliest) ?? earliest
        }
        .onChange(of: roleId) { _, _ in invalidate() }
        .onChange(of: hours) { _, _ in invalidate() }
        .onChange(of: everyWeeks) { _, _ in invalidate() }
        .onChange(of: startDate) { _, _ in invalidate() }
        .onChange(of: hasEnd) { _, _ in invalidate() }
        .onChange(of: endDate) { _, _ in invalidate() }
        .onChange(of: editScope) { _, _ in invalidate() }
        .onChange(of: editFromDate) { _, _ in invalidate() }
        .confirmationDialog("Stop repeating this schedule?",
            isPresented: $showStopConfirmation, titleVisibility: .visible) {
                Button("Stop from next week", role: .destructive) {
                    Task {
                        guard let rule = stopCandidate else { return }
                        let next = max(rule.startWeek, PlannerDates.weekKey(for: earliest))
                        if await planner.send(["type": "stopRecurringPlan", "planId": rule.id, "fromWeek": next]) {
                            stopCandidate = nil
                            editingPlanId = nil
                            preview = nil
                            dismiss()
                        }
                    }
                }
                Button("Cancel", role: .cancel) { stopCandidate = nil }
            } message: {
                Text("Existing tasks and customized weeks are preserved. You can undo the change.")
            }
    }
    private func invalidate() {
        preview = nil
        previewRevision = nil
    }
    private func review() async {
        guard !checking && !saving && !roleId.isEmpty else { return }
        checking = true
        let revision = planner.state?.revision
        let next = await planner.previewRecurringPlan(payload)
        preview = next
        previewRevision = next == nil ? nil : revision
        checking = false
    }
    private func confirm() async {
        guard !saving, preview?.eligible == true, let revision = previewRevision else { return }
        saving = true
        var request = payload
        request["type"] = "saveRecurringPlan"
        let success = await planner.send(request, expectedRevision: revision)
        saving = false
        if success { dismiss() }
        else { invalidate() }
    }
}
#endif
