#if os(iOS)
import SwiftUI

/// Explicit forward planning. The only mutations are guarded, previewed commands to Spread's authoritative local
/// store. No automatic rollover: a copy of the week on screen is previewed and confirmed before anything is written.
struct LifePlanAheadSheet: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    @Environment(\.dismiss) private var dismiss
    @State private var planMode = "plans"
    @State private var formPlanId: String?
    /// A suggestion the person opened. It only pre-fills the form; nothing is saved from here.
    @State private var formPreset: PlanAheadPreset?
    @State private var roleId = ""
    @State private var sourceDay = ""
    @State private var dailyTransfer = false
    @State private var destinationDate = Date()
    @State private var amount = 1.0
    @State private var targetCapacityText = ""
    @State private var preview: NativePlanAheadPreview?
    @State private var previewing = false
    @State private var saving = false
    /// Which eight-week batch to copy the week on screen into: 1 is the next eight weeks.
    @State private var copyBatch = 1
    @State private var copyPreview: NativeWeekCopyPreview?
    @State private var copyPreviewing = false
    @State private var copySaving = false

    /// The first Monday a move can land on, as a device-local day for the picker.
    private var earliestDestination: Date {
        PlannerDates.localDate(PlannerDates.weekISO(base: snapshot.weekKey, offset: 1))
    }
    private var destinationISO: String {
        PlannerDates.localISO(destinationDate)
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

    /// A single primary action sits above the safe area, rather than after an
    /// arbitrarily long preview. The repeating editor owns its own Form and footer.
    var body: some View {
        SpreadSheetStack {
            Group {
                if planMode == "repeat" {
                    LifeRecurringPlanForm(
                        planner: planner, snapshot: snapshot,
                        initialPlanId: formPlanId, initialPreset: formPreset,
                        onBackToPlans: {
                            formPlanId = nil
                            formPreset = nil
                            preview = nil
                            planMode = "plans"
                        })
                } else {
                    Form {
                        if planMode == "plans" {
                            plansSections
                        } else if planMode == "copy" {
                            copySections
                        } else {
                            Section {
                                Button {
                                    preview = nil
                                    planMode = "plans"
                                } label: {
                                    Label { Text("Your plans") } icon: {
                                        SpreadIcon(name: "lucide-chevron-left", size: 18)
                                    }
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .frame(minHeight: 44)
                                }
                                .accessibilityIdentifier("plan-ahead-back-to-plans")
                            }
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
                                    .environment(\.calendar, PlannerDates.deviceCalendar)
                                    .environment(\.timeZone, TimeZone.current)
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
                                if let preview {
                                    if preview.eligible {
                                        VStack(alignment: .leading, spacing: 8) {
                                            Text(SpreadHours.text(preview.hours) + "h moves to " +
                                                PlannerDates.label(PlannerDates.date(preview.targetWeek), pattern: "MMM d"))
                                                .font(.headline)
                                            PlanAheadDetailRow(
                                                title: "This week",
                                                detail: SpreadHours.text(preview.sourceBudgetBefore) +
                                                    "h → " + SpreadHours.text(preview.sourceBudgetAfter) + "h")
                                            PlanAheadDetailRow(
                                                title: "Future week",
                                                detail: SpreadHours.text(preview.targetBudgetBefore) +
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
                                } else {
                                    Text("Preview the affected hours before moving them.")
                                        .font(.subheadline)
                                        .foregroundStyle(Spread.secondary)
                                }
                            } header: { Text("Review before moving") }
                        }
                    }
                    .spreadListSurface()
                    .safeAreaInset(edge: .bottom, spacing: 0) {
                        if planMode == "copy" || planMode == "move" {
                            bottomAction
                        }
                    }
                }
            }
            .navigationTitle("Plan Ahead")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    // Closing discards an unconfirmed preview, so this is Cancel, leading (OD6).
                    Button("Cancel") { dismiss() }.disabled(saving || copySaving)
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

    @ViewBuilder private var bottomAction: some View {
        if planMode == "copy" {
            Button {
                Task {
                    if copyPreview?.eligible == true { await confirmCopy() }
                    else { await requestCopyPreview() }
                }
            } label: {
                Group {
                    if copySaving { Text("Copying…") }
                    else if copyPreviewing { Text("Checking…") }
                    else if copyPreview?.eligible == true { Text("Copy to these weeks") }
                    else { Label { Text("Preview copy") } icon: { SpreadIcon(name: "lucide-eye", size: 18) } }
                }
                .frame(maxWidth: .infinity, minHeight: 50)
            }
            .buttonStyle(.borderedProminent)
            .disabled(copySaving || copyPreviewing || planner.busy)
            .accessibilityIdentifier(copyPreview?.eligible == true
                                      ? "plan-ahead-copy-confirm" : "plan-ahead-copy-preview")
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Spread.canvas)
        } else if planMode == "move" {
            Button {
                Task {
                    if preview?.eligible == true { await confirmTransfer() }
                    else { await requestPreview() }
                }
            } label: {
                Group {
                    if saving { Text("Saving…") }
                    else if previewing { Text("Checking…") }
                    else if preview?.eligible == true { Text("Move hours") }
                    else { Label { Text("Preview transfer") } icon: { SpreadIcon(name: "lucide-eye", size: 18) } }
                }
                .frame(maxWidth: .infinity, minHeight: 50)
            }
            .buttonStyle(.borderedProminent)
            .disabled(saving || previewing || planner.busy ||
                      role == nil || (dailyTransfer && availableDays.isEmpty))
            .accessibilityIdentifier(preview?.eligible == true
                                      ? "plan-ahead-confirm" : "plan-ahead-preview")
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Spread.canvas)
        }
    }

    private var activeRules: [NativeRecurringPlan] {
        (snapshot.recurringPlans ?? []).filter { rule in
            rule.terminatedWeek == nil &&
                (rule.endWeek == nil || rule.endWeek! >= PlannerDates.weekKey(localDay: earliestDestination))
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

    /// Suggestions from this week for Life areas that have no schedule yet.
    private var presets: [PlanAheadPreset] {
        PlanAheadPreset.suggestions(for: snapshot, excluding: Set(activeRules.map { $0.roleId }))
    }

    /// What a suggestion would save, in one line: its days (or weekly hours), the cadence and the start.
    private func presetSummary(_ preset: PlanAheadPreset) -> String {
        let amount = preset.days.isEmpty
            ? SpreadHours.text(preset.weeklyHours) + "h a week"
            : LifeRecurringPlanForm.dayLine(preset.days)
        let start = PlannerDates.label(PlannerDates.date(preset.startWeek), pattern: "MMM d")
        return amount + ", every week from " + start
    }

    /// Each suggestion opens the repeat form pre-filled and reviewed, so the person can confirm it
    /// or change anything first. Tapping one saves nothing. Replaces the old read-only 8-week table,
    /// which read as weeks that were already planned.
    @ViewBuilder
    private var presetsSection: some View {
        if !presets.isEmpty {
            Section {
                ForEach(presets) { preset in
                    Button {
                        formPlanId = nil
                        formPreset = preset
                        preview = nil
                        planMode = "repeat"
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(preset.roleName)
                                    .foregroundStyle(Spread.ink)
                                Text(presetSummary(preset))
                                    .font(.caption)
                                    .foregroundStyle(Spread.secondary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            Spacer()
                            SpreadIcon(name: "lucide-chevron-right", size: 18)
                                .foregroundStyle(Spread.secondary)
                        }
                        .frame(minHeight: 44)
                    }
                    .accessibilityIdentifier("plan-ahead-preset-row")
                    .accessibilityHint("Opens the schedule to review. Nothing is saved until you confirm.")
                }
            } header: {
                Text("Suggested plans")
            } footer: {
                Text("Based on this week. Review or edit before confirming.")
            }
        }
    }

    /// Entry screen: shows what is already planned before asking for input.
    /// Reads the store snapshot only; tapping a row opens a form, nothing is sent.
    @ViewBuilder
    private var plansSections: some View {
        Section {
            Button {
                formPlanId = nil
                formPreset = nil
                preview = nil
                planMode = "repeat"
            } label: {
                Label { Text("Make a new plan") } icon: { SpreadIcon(name: "icon-add", size: 18) }
                    .frame(maxWidth: .infinity, minHeight: 50)
            }
            .buttonStyle(.borderedProminent)
            .disabled(snapshot.roles.isEmpty)
            .accessibilityIdentifier("plan-ahead-new-schedule")
        }
        Section {
            if activeRules.isEmpty {
                Text("No repeating schedules yet. A schedule sets weekly hours for one Life area.")
                    .font(.subheadline)
                    .foregroundStyle(Spread.secondary)
            } else {
                ForEach(activeRules) { plan in
                    Button {
                        formPlanId = plan.id
                        formPreset = nil
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
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            Spacer()
                            SpreadIcon(name: "lucide-chevron-right", size: 18)
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
        presetsSection
        copyEntrySection
    }

    /// One primary entry: copy and move are secondary paths.
    private var copyEntrySection: some View {
        Section {
            Button {
                copyPreview = nil
                planMode = "copy"
            } label: {
                Label { Text("Copy this week forward") } icon: { SpreadIcon(name: "lucide-copy", size: 18) }
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            }
            .disabled(snapshot.roles.isEmpty)
            .accessibilityIdentifier("plan-ahead-copy-week")
            Button {
                preview = nil
                planMode = "move"
            } label: {
                Label { Text("Move hours once") } icon: { SpreadIcon(name: "lucide-arrow-left-right", size: 18) }
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            }
            .disabled(snapshot.roles.isEmpty)
            .accessibilityIdentifier("plan-ahead-move-once")
        } header: {
            Text("Other ways to plan")
        } footer: {
            Text("Copy your week forward or transfer hours once. Both require a preview.")
        }
    }

    private var copyFirstWeek: Int { (copyBatch - 1) * 8 + 1 }
    private var copyLastWeek: Int { copyBatch * 8 }

    private var copyBatchBinding: Binding<Int> {
        Binding(get: { copyBatch }, set: { value in
            copyBatch = value
            copyPreview = nil
        })
    }

    /// Copy the week on screen forward. Explicit: it is previewed, then confirmed, and the planner writes only the
    /// weeks the preview marks as empty. Nothing is repeated by rule.
    @ViewBuilder
    private var copySections: some View {
        Section {
            Button {
                planMode = "plans"
                copyPreview = nil
            } label: {
                Label { Text("Your plans") } icon: { SpreadIcon(name: "lucide-chevron-left", size: 18) }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .frame(minHeight: 44)
            }
            .accessibilityIdentifier("plan-ahead-back-to-plans")
        }
        Section {
            Text("Copies the week of \(PlannerDates.label(PlannerDates.date(snapshot.weekKey), pattern: "MMM d")) into the next eight weeks. Nothing changes until you confirm.")
                .font(.subheadline)
                .foregroundStyle(Spread.secondary)
            Stepper(value: copyBatchBinding, in: 1...13) {
                Text("Weeks \(copyFirstWeek) to \(copyLastWeek) ahead")
                    .font(.headline).monospacedDigit()
            }
            .accessibilityIdentifier("plan-ahead-copy-batch")
        } header: {
            Text("Copy this week forward")
        } footer: {
            Text("Each batch covers eight weeks. Copy the next batch later, when you want it.")
        }
        Section {
            if let copyPreview {
                copyPreviewRows(copyPreview)
            } else {
                Text("Preview the affected weeks before copying.")
                    .font(.subheadline)
                    .foregroundStyle(Spread.secondary)
            }
        } header: {
            Text("Review before copying")
        }
    }

    /// The preview, in words: how many weeks fill, what each receives, and each week's status.
    @ViewBuilder
    private func copyPreviewRows(_ preview: NativeWeekCopyPreview) -> some View {
        if preview.eligible {
            VStack(alignment: .leading, spacing: 6) {
                Text("\(preview.fillCount) \(preview.fillCount == 1 ? "week" : "weeks") will be filled. \(preview.skipCount) kept.")
                    .font(.headline)
                Text("Each filled week gets \(SpreadHours.text(preview.hours))h and \(preview.tasks) \(preview.tasks == 1 ? "task" : "tasks"), not done.")
                    .font(.subheadline)
                ForEach(preview.targets, id: \.key) { target in
                    PlanAheadDetailRow(
                        title: "Week of " + PlannerDates.label(PlannerDates.date(target.key), pattern: "MMM d"),
                        detail: target.status == "fill" ? "Will be filled" : "Already planned, kept")
                }
            }
            .foregroundStyle(Spread.ink)
        } else {
            Label(preview.reason ?? "This copy is not available.", systemImage: "exclamationmark.circle")
                .foregroundStyle(Spread.danger)
        }
    }

    private func requestCopyPreview() async {
        guard !copyPreviewing, !copySaving else { return }
        copyPreviewing = true
        copyPreview = await planner.previewWeekCopy(batch: copyBatch)
        copyPreviewing = false
    }

    private func confirmCopy() async {
        guard !copySaving, copyPreview?.eligible == true else { return }
        copySaving = true
        let ok = await planner.send(["type": "copyWeekForward", "batch": copyBatch])
        copySaving = false
        if ok {
            dismiss()
        } else {
            copyPreview = nil
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
            dismiss()
        } else {
            preview = nil
        }
    }
}
    
/// Shared adaptive rows for long names, time values and larger text.
struct PlanAheadDetailRow: View {
    let title: String
    let detail: String

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 8) {
                Text(title)
                    .lineLimit(1)
                    .fixedSize(horizontal: true, vertical: false)
                Spacer(minLength: 8)
                Text(detail)
                    .lineLimit(1)
                    .fixedSize(horizontal: true, vertical: false)
                    .foregroundStyle(Spread.secondary)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                Text(detail)
                    .foregroundStyle(Spread.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .font(.subheadline)
        .accessibilityElement(children: .combine)
    }
}

#endif
