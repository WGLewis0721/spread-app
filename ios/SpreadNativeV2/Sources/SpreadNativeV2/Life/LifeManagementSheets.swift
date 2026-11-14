#if os(iOS)
import SwiftUI

struct LifeManageSheet: View {
    @ObservedObject var planner: LivePlanner
    let roleId: String
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var color = ""
    @State private var category = ""
    @State private var revision: Int?
    @State private var saving = false
    @State private var savingHours = false
    @State private var budgetHours = 0.0
    @State private var hoursSaved = false

    private var hourRange: ClosedRange<Double> {
        guard let snapshot = planner.snapshot,
              let role = snapshot.roles.first(where: { $0.id == roleId }),
              let capacity = snapshot.life?.capacityHours else { return 0...168 }
        let minimum = snapshot.placedHours(for: roleId)
        let others = snapshot.roles.reduce(0) { $0 + ($1.id == roleId ? 0 : $1.hours) }
        return minimum...max(minimum, role.hours, capacity - others)
    }

    var body: some View {
        SpreadSheetStack {
            Form {
                Section("Life area") {
                    TextField("Name", text: $name).accessibilityIdentifier("life-area-name")
                    Text("Names, colors and symbols apply to all weeks.").font(.subheadline)
                }
                if let snapshot = planner.snapshot,
                   let role = snapshot.roles.first(where: { $0.id == roleId }) {
                    Section("Weekly area hours") {
                        if snapshot.life?.capacityHours != nil {
                            Stepper(value: $budgetHours, in: hourRange, step: 0.5) {
                                Text("\(SpreadHours.text(budgetHours)) h assigned to \(role.name)")
                            }
                            .accessibilityIdentifier("life-manage-hour-stepper")
                            .disabled(saving || savingHours)
                            Text("\(SpreadHours.text(snapshot.placedHours(for: roleId))) h already reserved on days")
                                .font(.subheadline).foregroundStyle(LifePalette.secondary)
                            if hourRange.upperBound <= role.hours {
                                Text("No unassigned hours. Return hours from another area or increase weekly hours to add more.")
                                    .font(.subheadline).foregroundStyle(LifePalette.secondary)
                            }
                            Button("Save area hours") { Task { await saveHours() } }
                                .disabled(saving || savingHours || planner.busy || budgetHours == role.hours)
                                .accessibilityIdentifier("life-manage-save-hours")
                            if hoursSaved { Label { Text("Area hours saved") } icon: { SpreadIcon(name: "lucide-circle-check", size: 18) }
                                .font(.subheadline).foregroundStyle(LifePalette.accent) }
                        } else {
                            Text("Set weekly planning hours in Hours before allocating time to this area.")
                                .font(.subheadline).foregroundStyle(LifePalette.secondary)
                        }
                    }
                }
                Section("Symbol") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 5)) {
                        ForEach(PalettePanel.categories, id: \.id) { item in
                            Button {
                                category = item.id
                                color = PalettePanel.categoryColors[item.id] ?? color
                            } label: {
                                RoleBadge(category: item.id, color: color, size: 30).frame(minWidth: 44, minHeight: 44)
                                    .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(category == item.id ? LifePalette.accent : .clear, lineWidth: 2))
                            }.buttonStyle(.plain).accessibilityLabel(item.label)
                                .accessibilityAddTraits(category == item.id ? .isSelected : [])
                        }
                    }
                }
                Section("Color") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 5)) {
                        ForEach(PalettePanel.colors, id: \.self) { hex in
                            Button { color = hex } label: {
                                Circle().fill(Color(hex: hex)).frame(width: 26, height: 26).frame(minWidth: 44, minHeight: 44)
                                    .overlay(Circle().strokeBorder(color == hex ? LifePalette.ink : .clear, lineWidth: 2))
                            }.buttonStyle(.plain).accessibilityLabel("Color \(hex)")
                                .accessibilityAddTraits(color == hex ? .isSelected : [])
                        }
                    }
                }
                Section {
                    Button("Delete Life area", role: .destructive) {
                        Task { await deleteRole() }
                    }
                    .disabled(saving || savingHours || planner.busy)
                    .accessibilityIdentifier("life-manage-delete")
                    Text("This also removes its tasks and hours across all weeks. Undo is available until another unrelated change.")
                        .font(.subheadline).foregroundStyle(LifePalette.secondary)
                }
                if savingHours { ProgressView("Saving area hours…") }
                if let error = planner.error { Text(error).foregroundStyle(Spread.danger) }
            }.spreadListSurface()
            .navigationTitle("Details").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() }.disabled(saving || savingHours) }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled(saving || savingHours || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
        .task {
            guard let role = planner.snapshot?.roles.first(where: { $0.id == roleId }) else { return }
            name = role.name; color = role.color; category = role.category
            budgetHours = role.hours; revision = planner.state?.revision
        }
        .interactiveDismissDisabled(saving || savingHours)
        .presentationDragIndicator(.visible)
    }
    private func deleteRole() async {
        guard !saving && !savingHours && !planner.busy else { return }
        saving = true
        defer { saving = false }
        if await planner.send(["type": "removeLifeRole", "roleId": roleId]) {
            dismiss()
        }
    }

    private func saveHours() async {
        guard !saving && !savingHours,
              let current = planner.snapshot?.roles.first(where: { $0.id == roleId }),
              hourRange.contains(budgetHours), budgetHours != current.hours else { return }
        savingHours = true
        defer { savingHours = false }
        if await planner.send(["type": "setLifeBudget", "roleId": roleId, "hours": budgetHours],
                              expectedRevision: revision) {
            revision = planner.state?.revision
            hoursSaved = true
        }
    }

    private func save() async {
        guard !saving && !savingHours else { return }
        saving = true
        defer { saving = false }
        if await planner.send(["type": "editLifeRole", "roleId": roleId,
                               "name": name.trimmingCharacters(in: .whitespacesAndNewlines),
                               "color": color, "category": category], expectedRevision: revision) {
            dismiss()
        }
    }
}

struct LifeDeleteSheet: View {
    @ObservedObject var planner: LivePlanner
    let roleId: String
    @Environment(\.dismiss) private var dismiss
    @State private var saving = false
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Delete \(planner.snapshot?.roles.first { $0.id == roleId }?.name ?? "this Life area") from all weeks?")
                    .font(.title2.bold())
                Text("This removes the Life area, its tasks and its hours from all weeks in this profile. Undo is available until another unrelated change.")
                    .font(.body)
                if let error = planner.error { Text(error).foregroundStyle(Spread.danger) }
                Button("Delete from all weeks", role: .destructive) {
                    guard !saving else { return }
                    saving = true
                    Task {
                        if await planner.send(["type": "removeLifeRole", "roleId": roleId]) {
                            dismiss()
                        }
                        saving = false
                    }
                }.frame(minHeight: 44).disabled(saving)
                Button("Cancel") { dismiss() }.frame(minHeight: 44).disabled(saving)
            }.padding(24)
        }.background(Spread.canvas).tint(Spread.accent)
            .presentationBackground(Spread.canvas)
            .presentationDetents([.medium, .large]).presentationDragIndicator(.visible)
    }
}

struct LifeReserveSheet: View {
    @ObservedObject var planner: LivePlanner
    let roleId: String
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        SpreadSheetStack {
            ScrollView {
                if let snapshot = planner.snapshot, let role = snapshot.roles.first(where: { $0.id == roleId }) {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("\(SpreadHours.text(snapshot.remainingHours(for: roleId)))h still to place this week").font(.title2.bold())
                        Text("Reserve time on the days that fit. Move a day's tasks before returning its last reserved hour.")
                            .font(.subheadline).foregroundStyle(LifePalette.secondary)
                        ForEach(0..<7, id: \.self) { position in
                            let day = PlannerOrder.day(weekKey: snapshot.weekKey, displayPosition: position)
                            let allocation = snapshot.allocations.first { $0.roleId == roleId && $0.day == day }
                            ViewThatFits(in: .horizontal) {
                                HStack {
                                    Text(PlannerDates.label(PlannerDates.date(day), pattern: "EEE, MMM d")).font(.body)
                                    Spacer(minLength: 4)
                                    adjustment(role, day: day, allocation: allocation)
                                }
                                VStack(alignment: .leading) {
                                    Text(PlannerDates.label(PlannerDates.date(day), pattern: "EEEE, MMM d")).font(.body)
                                    adjustment(role, day: day, allocation: allocation)
                                }
                            }
                            Divider()
                        }
                        if let undo = planner.undoId {
                            Button("Undo last change") {
                                Task { _ = await planner.send(["type": "undo", "editId": undo]) }
                            }.frame(minHeight: 44)
                        }
                        if let error = planner.error { Text(error).font(.body).foregroundStyle(Spread.danger) }
                    }.padding(20)
                }
            }.spreadListSurface()
            .navigationTitle("Place hours").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }.presentationDragIndicator(.visible)
    }
    private func adjustment(_ role: Responsibility, day: String, allocation: DayAllocation?) -> some View {
        HourStepper(value: allocation?.hours ?? 0, label: "\(role.name) on \(day)", step: 0.5) { value in
            Task {
                let ok: Bool
                if let allocation { ok = await planner.setAllocationHours(allocation, to: value) }
                else { ok = await planner.placeHours(roleId: roleId, day: day, hours: value) }
                _ = ok
            }
        }.disabled(planner.busy)
    }
}

struct LifePrioritySheet: View {
    @ObservedObject var planner: LivePlanner
    let roleId: String
    @Environment(\.dismiss) private var dismiss
    @State private var goal = 2.0
    @State private var day = ""
    @State private var preview: NativeLifePriorityPreview?
    @State private var previewRevision: Int?
    @State private var working = false
    var body: some View {
        SpreadSheetStack {
            Form {
                Section("Prioritize this week") {
                    Text(planner.snapshot?.roles.first { $0.id == roleId }?.name ?? "Life area").font(.headline)
                    Stepper(value: $goal, in: 0.5...168, step: 0.5) {
                        Text("Weekly time goal: \(SpreadHours.text(goal))h")
                    }
                    Picker("Reserve on", selection: $day) {
                        if let snapshot = planner.snapshot {
                            ForEach(0..<7, id: \.self) { position in
                                let iso = PlannerOrder.day(weekKey: snapshot.weekKey, displayPosition: position)
                                Text(PlannerDates.label(PlannerDates.date(iso), pattern: "EEEE, MMM d")).tag(iso)
                            }
                        }
                    }
                    Button("Find time") { Task { await findTime() } }.disabled(working || day.isEmpty)
                    Button("Save weekly goal") { Task { await saveGoal() } }.disabled(working || day.isEmpty)
                }
                if let preview {
                    Section("Time preview") {
                        Text("\(SpreadHours.text(preview.reservedHours))h already reserved")
                        Text("\(SpreadHours.text(preview.bankHours))h available in this area's bank")
                        Text("\(SpreadHours.text(preview.additionalBudgetHours))h needed from unassigned hours")
                        if !preview.eligible {
                            Text("Choose a day in the current week.").foregroundStyle(Spread.caution)
                        } else if preview.shortageHours > 0 {
                            Text("You need \(SpreadHours.text(preview.shortageHours)) more unassigned hours to reach this goal.")
                                .foregroundStyle(Spread.caution)
                        } else {
                            Text("Reserve \(SpreadHours.text(preview.reserveHours))h on \(PlannerDates.label(PlannerDates.date(preview.day), pattern: "EEEE")). Other areas keep their hours.")
                            Button("Apply") { Task { await apply() } }
                                .disabled(working || planner.state?.revision != previewRevision)
                        }
                    }
                }
                if planner.snapshot?.life?.priorityRoleId == roleId {
                    Section {
                        Button("Clear weekly priority") {
                            guard !working else { return }
                            working = true
                            Task {
                                defer { working = false }
                                if await planner.send(["type": "setLifePriority", "priorityRoleId": NSNull()]) {
                                    dismiss()
                                }
                            }
                        }.disabled(working)
                    }
                }
                if let error = planner.error { Text(error).foregroundStyle(Spread.danger) }
            }.spreadListSurface()
            .navigationTitle("Weekly priority").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() }.disabled(working) } }
        }
        .task {
            if let snapshot = planner.snapshot {
                day = snapshot.weekKey
                if snapshot.life?.priorityRoleId == roleId {
                    goal = snapshot.life?.priorityGoalHours ?? 2
                    day = snapshot.life?.priorityDay ?? snapshot.weekKey
                }
            }
        }
        .onChange(of: goal) { _, _ in preview = nil }
        .onChange(of: day) { _, _ in preview = nil }
        .presentationDragIndicator(.visible)
    }
    private func findTime() async {
        guard !working else { return }
        working = true
        defer { working = false }
        let requestedGoal = goal
        let requestedDay = day
        let result = await planner.previewLifePriority(roleId: roleId, goalHours: requestedGoal, day: requestedDay)
        guard goal == requestedGoal, day == requestedDay else { return }
        preview = result
        previewRevision = planner.state?.revision
    }
    private func saveGoal() async {
        guard !working else { return }
        working = true
        defer { working = false }
        if await planner.send(["type": "setLifePriority", "priorityRoleId": roleId, "goalHours": goal, "day": day]) {
            dismiss()
        }
    }
    private func apply() async {
        guard !working, let previewRevision, let preview,
              preview.goalHours == goal, preview.day == day, preview.eligible,
              preview.shortageHours == 0 else { return }
        working = true
        defer { working = false }
        if await planner.send(["type": "applyLifePriority", "roleId": roleId, "goalHours": goal, "day": day],
                              expectedRevision: previewRevision) {
            if LifeFeedback.enabled { SpreadHaptics.completed() }
            dismiss()
        }
    }
}
#endif
