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
    var body: some View {
        NavigationStack {
            Form {
                Section("Life area") {
                    TextField("Name", text: $name).accessibilityIdentifier("life-area-name")
                    Text("Names, colors and symbols apply to all weeks.").font(.subheadline)
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
                if let error = planner.error { Text(error).foregroundStyle(Spread.danger) }
            }
            .navigationTitle("Manage Life area").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() }.disabled(saving) }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled(saving || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
        .task {
            guard let role = planner.snapshot?.roles.first(where: { $0.id == roleId }) else { return }
            name = role.name; color = role.color; category = role.category; revision = planner.state?.revision
        }
        .interactiveDismissDisabled(saving)
        .presentationDragIndicator(.visible)
    }
    private func save() async {
        guard !saving else { return }
        saving = true
        defer { saving = false }
        if await planner.send(["type": "editLifeRole", "roleId": roleId,
                               "name": name.trimmingCharacters(in: .whitespacesAndNewlines),
                               "color": color, "category": category], expectedRevision: revision) {
            LifeFeedback.accepted(); dismiss()
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
                            LifeFeedback.accepted(); dismiss()
                        }
                        saving = false
                    }
                }.frame(minHeight: 44).disabled(saving)
                Button("Cancel") { dismiss() }.frame(minHeight: 44).disabled(saving)
            }.padding(24)
        }.presentationDetents([.medium, .large]).presentationDragIndicator(.visible)
    }
}

struct LifeReserveSheet: View {
    @ObservedObject var planner: LivePlanner
    let roleId: String
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
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
            }
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
                if ok { LifeFeedback.accepted() }
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
        NavigationStack {
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
                            Task {
                                if await planner.send(["type": "setLifePriority", "priorityRoleId": NSNull()]) {
                                    LifeFeedback.accepted(); dismiss()
                                }
                            }
                        }.disabled(working)
                    }
                }
                if let error = planner.error { Text(error).foregroundStyle(Spread.danger) }
            }
            .navigationTitle("Weekly priority").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() }.disabled(working) } }
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
        preview = await planner.previewLifePriority(roleId: roleId, goalHours: goal, day: day)
        previewRevision = planner.state?.revision
    }
    private func saveGoal() async {
        guard !working else { return }
        working = true
        defer { working = false }
        if await planner.send(["type": "setLifePriority", "priorityRoleId": roleId, "goalHours": goal, "day": day]) {
            LifeFeedback.accepted(); dismiss()
        }
    }
    private func apply() async {
        guard !working, let previewRevision else { return }
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
