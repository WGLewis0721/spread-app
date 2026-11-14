#if os(iOS)
import SwiftUI

/// One weekday a schedule can take. `code` matches PLAN_WEEKDAYS in the planner.
struct LifeWeekday: Identifiable, Equatable {
    let code: String
    let name: String
    var id: String { code }
}

/// Recurring schedules reserve weekly hours, or hours on chosen days. No appointments or tasks are copied.
struct LifeRecurringPlanForm: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    /// When set, the form opens pre-filled with this saved schedule (Edit series).
    var initialPlanId: String? = nil
    /// When set (and no saved schedule is open), the form opens pre-filled from this suggestion and
    /// already reviewed. Nothing is saved until the person confirms.
    var initialPreset: PlanAheadPreset? = nil
    var onBackToPlans: (() -> Void)? = nil
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
    /// The request the current review was run for. A change that leaves the request the same keeps the review.
    @State private var previewedKey: String?
    @State private var checking = false
    @State private var saving = false
    @State private var stopCandidate: NativeRecurringPlan?
    @State private var showStopConfirmation = false
    /// Hours per chosen weekday. Empty means weekly hours only, which the planner places without a set day.
    @State private var dayHours: [String: Double] = [:]
    @State private var dayHoursExpanded = false
    @ScaledMetric(relativeTo: .body) private var dayChipWidth: CGFloat = 64

    static let weekdays: [LifeWeekday] = [
        LifeWeekday(code: "mon", name: "Monday"), LifeWeekday(code: "tue", name: "Tuesday"),
        LifeWeekday(code: "wed", name: "Wednesday"), LifeWeekday(code: "thu", name: "Thursday"),
        LifeWeekday(code: "fri", name: "Friday"), LifeWeekday(code: "sat", name: "Saturday"),
        LifeWeekday(code: "sun", name: "Sunday"),
    ]

    /// "Mon 1h · Fri 1.5h", shared by the review and the plan list.
    static func dayLine(_ days: [NativeDayHours]) -> String {
        days.map { (day: NativeDayHours) -> String in
            let name = Self.weekdays.first(where: { $0.code == day.weekday })?.name ?? day.weekday
            return String(name.prefix(3)) + " " + SpreadHours.text(day.hours) + "h"
        }.joined(separator: " · ")
    }

    /// The first Monday a new schedule can start, as a device-local day for the pickers.
    private var earliest: Date {
        PlannerDates.localDate(PlannerDates.weekISO(base: snapshot.weekKey, offset: 1))
    }
    private func load(_ plan: NativeRecurringPlan) {
        editingPlanId = plan.id
        roleId = plan.roleId
        hours = plan.hours
        dayHours = Dictionary((plan.dayHours ?? []).map { ($0.weekday, $0.hours) },
                              uniquingKeysWith: { first, _ in first })
        everyWeeks = plan.everyWeeks
        startDate = PlannerDates.localDate(plan.startWeek)
        hasEnd = plan.endWeek != nil
        if let end = plan.endWeek { endDate = PlannerDates.localDate(end) }
        editScope = "all"
        editFromDate = earliest
        clearPreview()
    }
    private var selectedRule: NativeRecurringPlan? {
        snapshot.recurringPlans?.first(where: { $0.id == editingPlanId })
    }
    /// Weekly total. With chosen days it is their sum, so the form and the planner cannot disagree.
    private var weeklyHours: Double {
        dayHours.isEmpty ? hours : dayHours.values.reduce(0, +)
    }
    /// Chosen days in week order, for example [["weekday": "mon", "hours": 1.0]].
    private var dayPayload: [[String: Any]] {
        Self.weekdays.compactMap { (day: LifeWeekday) -> [String: Any]? in
            guard let amount = dayHours[day.code] else { return nil }
            return ["weekday": day.code, "hours": amount]
        }
    }
    private func dayToggle(_ code: String) -> Binding<Bool> {
        Binding(
            get: { dayHours[code] != nil },
            set: { isOn in
                if isOn { dayHours[code] = dayHours[code] ?? 1 } else { dayHours[code] = nil }
            }
        )
    }
    private func dayAmount(_ code: String) -> Binding<Double> {
        Binding(
            get: { dayHours[code] ?? 1 },
            set: { dayHours[code] = $0 }
        )
    }
    /// The days this Life area already has this week, the same hours the Life card shows.
    /// They start a new schedule's set days. Nothing is saved until Confirm.
    private func cardDays(for roleId: String) -> [String: Double] {
        // One shared definition with the suggestions, so a suggestion and this form always agree.
        Dictionary(PlanAheadPreset.days(for: roleId, in: snapshot).map { ($0.weekday, $0.hours) },
                   uniquingKeysWith: { first, _ in first })
    }
    /// Starts from a suggestion: its Life area, days or weekly hours, every week, no end date.
    /// The review runs at once so the person lands on Confirm, and can still change anything first.
    private func apply(_ preset: PlanAheadPreset) {
        editingPlanId = nil
        roleId = preset.roleId
        everyWeeks = 1
        hasEnd = false
        dayHours = Dictionary(preset.days.map { ($0.weekday, $0.hours) }, uniquingKeysWith: { first, _ in first })
        if preset.days.isEmpty { hours = preset.weeklyHours }
        clearPreview()
        Task { await review() }
    }
    private var payload: [String: Any] {
        var value: [String: Any] = [
            "roleId": roleId, "hours": weeklyHours, "everyWeeks": everyWeeks,
            "startWeek": selectedRule?.startWeek ?? PlannerDates.planStartWeekKey(localDay: startDate),
        ]
        if !dayHours.isEmpty { value["dayHours"] = dayPayload }
        if hasEnd { value["endWeek"] = PlannerDates.weekKey(localDay: endDate) }
        if let selectedRule {
            value["planId"] = selectedRule.id
            if editScope == "following" {
                value["editFromWeek"] = PlannerDates.weekKey(localDay: editFromDate)
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
        Form {
            if let onBackToPlans {
                Section {
                    Button(action: onBackToPlans) {
                        Label { Text("Your plans") } icon: {
                            SpreadIcon(name: "lucide-chevron-left", size: 18)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .frame(minHeight: 44)
                    }
                    .accessibilityIdentifier("plan-ahead-back-to-plans")
                }
            }
            if let issue = snapshot.recurrenceIssue {
                Section {
                    Label(issue, systemImage: "exclamationmark.triangle")
                        .foregroundStyle(Spread.danger)
                }
            }
            if editingPlanId == nil, snapshot.life?.capacityHours == nil {
                Section {
                    Label("Set this week's weekly hours in Life first. A new schedule uses that total.",
                          systemImage: "info.circle")
                        .font(.subheadline)
                        .foregroundStyle(Spread.secondary)
                }
            }
            if let preset = initialPreset, preset.roleId == roleId, editingPlanId == nil {
                Section {
                    Text("Pre-filled from this week. Change anything before you confirm.")
                        .font(.subheadline)
                        .foregroundStyle(Spread.secondary)
                }
            }
            Section {
                LifeAreaMenuRow(title: "Life area", selection: $roleId, roles: snapshot.roles)
                    .disabled(editingPlanId != nil)
                if dayHours.isEmpty {
                    Stepper(value: $hours, in: 0.5...168, step: 0.5) {
                        Text(SpreadHours.spoken(hours) + " per scheduled week")
                            .font(.body)
                    }
                }
                Picker("Repeat", selection: $everyWeeks) {
                    // Matches the engine limit: intervals of 1 to 12 weeks.
                    ForEach(1...12, id: \.self) { weeks in
                        Text(weeks == 1 ? "Every week" : "Every \(weeks) weeks").tag(weeks)
                    }
                }
                if selectedRule == nil {
                    DatePicker("Starts on", selection: $startDate, in: earliest...,
                               displayedComponents: .date)
                        .environment(\.calendar, PlannerDates.deviceCalendar)
                        .environment(\.timeZone, TimeZone.current)
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
                               in: (selectedRule.map { PlannerDates.localDate($0.startWeek) } ?? startDate)...,
                               displayedComponents: .date)
                        .environment(\.calendar, PlannerDates.deviceCalendar)
                        .environment(\.timeZone, TimeZone.current)
                }
            } header: {
                Text(editingPlanId == nil ? "Repeat weekly hours" : "Edit repeating schedule")
            } footer: {
                Text(dayHours.isEmpty
                     ? "This sets aside weekly hours. It does not choose a day or repeat tasks."
                     : "Hours go on the chosen days in each scheduled week. No tasks are copied.")
            }
            Section {
                // A responsive 4/8pt chip grid replaces seven always-visible
                // switches. Day steppers expand only when someone needs them.
                LazyVGrid(columns: [GridItem(.adaptive(minimum: dayChipWidth), spacing: 8)], spacing: 8) {
                    ForEach(Self.weekdays) { day in
                        let selected = dayHours[day.code] != nil
                        Button {
                            dayToggle(day.code).wrappedValue.toggle()
                        } label: {
                            Text(String(day.name.prefix(3)))
                                .font(.subheadline.weight(.semibold))
                                .frame(maxWidth: .infinity, minHeight: 44)
                                .foregroundStyle(selected ? Spread.onAccent : Spread.ink)
                                .background(selected ? Spread.accent : Spread.canvas,
                                            in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .strokeBorder(Spread.accent.opacity(selected ? 1 : 0.24), lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(day.name)
                        .accessibilityValue(selected ? "Selected" : "Not selected")
                        .accessibilityAddTraits(selected ? .isSelected : [])
                        .accessibilityIdentifier("plan-ahead-day-" + day.code)
                    }
                }
                if !dayHours.isEmpty {
                    Text(Self.weekdays.compactMap { day in
                        dayHours[day.code].map {
                            String(day.name.prefix(3)) + " " + SpreadHours.text($0) + "h"
                        }
                    }.joined(separator: " · "))
                        .font(.subheadline)
                        .foregroundStyle(Spread.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                    DisclosureGroup("Adjust day hours", isExpanded: $dayHoursExpanded) {
                        ForEach(Self.weekdays) { day in
                            if dayHours[day.code] != nil {
                                Stepper(value: dayAmount(day.code), in: 0.5...24, step: 0.5) {
                                    Text(SpreadHours.spoken(dayHours[day.code] ?? 1) + " on " + day.name)
                                        .font(.body)
                                }
                            }
                        }
                    }
                    .accessibilityIdentifier("plan-ahead-adjust-day-hours")
                }
            } header: {
                Text("Fixed days (optional)")
            } footer: {
                Text(dayHours.isEmpty
                     ? "Select days to place fixed hours. Without chosen days, only weekly hours repeat."
                     : "Total " + SpreadHours.spoken(weeklyHours) + " per scheduled week.")
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
                            .environment(\.calendar, PlannerDates.deviceCalendar)
                            .environment(\.timeZone, TimeZone.current)
                    }
                    Button("Make a new plan") {
                        editingPlanId = nil
                        editScope = "all"
                        clearPreview()
                    }
                    Button("Stop repeating") {
                        stopCandidate = selectedRule
                        showStopConfirmation = true
                    }
                    .foregroundStyle(Spread.danger)
                }
            }
            if let preview {
                Section("Preview before confirming") {
                    if preview.eligible {
                        Text(lifeName + " · " + SpreadHours.text(preview.hours) +
                             "h every " + (preview.everyWeeks == 1 ? "week" : "\(preview.everyWeeks) weeks"))
                            .font(.headline)
                        if let days = preview.dayHours, !days.isEmpty {
                            Text(Self.dayLine(days))
                                .font(.subheadline)
                        }
                        PlanAheadDetailRow(
                            title: "Starts",
                            detail: PlannerDates.label(PlannerDates.date(preview.startWeek), pattern: "MMM d, yyyy"))
                        PlanAheadDetailRow(
                            title: "Ends",
                            detail: preview.endWeek.map {
                                PlannerDates.label(PlannerDates.date($0), pattern: "MMM d, yyyy")
                            } ?? "Never")
                        ForEach(preview.nextOccurrences, id: \.self) { week in
                            PlanAheadDetailRow(
                                title: "Week of " + PlannerDates.label(PlannerDates.date(week), pattern: "MMM d"),
                                detail: SpreadHours.text(preview.hours) + "h")
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
        }
        .spreadListSurface()
        .safeAreaInset(edge: .bottom, spacing: 0) {
            Button {
                Task {
                    if preview?.eligible == true { await confirm() }
                    else { await review() }
                }
            } label: {
                Text(saving ? "Saving…" : checking ? "Checking…" :
                     preview?.eligible == true ? "Confirm schedule" : "Preview schedule")
                    .frame(maxWidth: .infinity, minHeight: 50)
            }
            .buttonStyle(.borderedProminent)
            .disabled(saving || checking || planner.busy || roleId.isEmpty)
            .accessibilityIdentifier("plan-ahead-repeat-primary")
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Spread.canvas)
        }
        .onAppear {
            if roleId.isEmpty { roleId = snapshot.roles.first?.id ?? "" }
            startDate = earliest
            editFromDate = earliest
            endDate = PlannerDates.deviceCalendar.date(byAdding: .month, value: 3, to: earliest) ?? earliest
            if let id = initialPlanId,
               let plan = snapshot.recurringPlans?.first(where: { $0.id == id }) {
                load(plan)
            } else if let preset = initialPreset {
                apply(preset)
            } else {
                dayHours = cardDays(for: roleId)
            }
        }
        .onChange(of: roleId) { _, newRole in
            invalidate()
            // A new schedule starts from the days of the Life area it is for.
            if editingPlanId == nil { dayHours = cardDays(for: newRole) }
        }
        .onChange(of: hours) { _, _ in invalidate() }
        .onChange(of: dayHours) { _, _ in invalidate() }
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
                        let next = max(rule.startWeek, PlannerDates.weekKey(localDay: earliest))
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
    /// A stable fingerprint of a request, so the form can tell whether a change altered what would be saved.
    private static func requestKey(_ request: [String: Any]) -> String {
        guard JSONSerialization.isValidJSONObject(request),
              let data = try? JSONSerialization.data(withJSONObject: request, options: [.sortedKeys]),
              let text = String(data: data, encoding: .utf8) else { return UUID().uuidString }
        return text
    }
    /// Called whenever a field changes. The review stays only while the request is exactly the one reviewed.
    private func invalidate() {
        if let key = previewedKey, key == Self.requestKey(payload) { return }
        clearPreview()
    }
    /// Drops the review unconditionally, for example after a refused save or when a suggestion opens.
    private func clearPreview() {
        preview = nil
        previewRevision = nil
        previewedKey = nil
    }
    private func review() async {
        guard !checking && !saving && !roleId.isEmpty else { return }
        checking = true
        let revision = planner.state?.revision
        let request = payload
        let key = Self.requestKey(request)
        let next = await planner.previewRecurringPlan(request)
        preview = next
        previewRevision = next == nil ? nil : revision
        previewedKey = next == nil ? nil : key
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
        else { clearPreview() }
    }
}
#endif
