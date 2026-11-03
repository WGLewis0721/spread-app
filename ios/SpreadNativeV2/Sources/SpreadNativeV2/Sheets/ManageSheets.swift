#if os(iOS)
import SwiftUI

/// New Spread (`NewLifeSheet`): one or more named spreads, each with its hours and an optional symbol.
/// "Save spreads" adds every named row through the store's `addRole`, one after another.
struct NewSpreadSheet: View {
    @ObservedObject var planner: LivePlanner
    @Environment(\.dismiss) private var dismiss

    private struct Draft: Identifiable {
        let id: Int
        var name = ""
        var hours = 2.0
        var category: String?
    }

    @State private var drafts = [Draft(id: 1)]
    @State private var nextId = 2
    @State private var saving = false

    private var ready: Bool { drafts.contains { !$0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty } }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Name the spreads you actually live. Add as many as you need.")
                        .font(Spread.callout).foregroundStyle(Spread.secondary)
                    ForEach(drafts.indices, id: \.self) { index in
                        draftCard(index)
                    }
                    Button {
                        drafts.append(Draft(id: nextId))
                        nextId += 1
                    } label: {
                        Text("Add another spread").font(.system(size: 15, weight: .semibold)).foregroundStyle(Spread.accent)
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .accessibilityIdentifier("add-another-spread")
                    Button { save() } label: {
                        Text("Save spreads").font(.system(size: 17, weight: .semibold)).foregroundStyle(Spread.onAccent)
                            .frame(maxWidth: .infinity, minHeight: 50)
                            .background(Spread.accent, in: Capsule())
                    }
                    .disabled(!ready || saving)
                    .opacity(ready ? 1 : 0.4)
                    .accessibilityIdentifier("save-spreads")
                }
                .padding(20)
            }
            .navigationTitle("New Spread")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button { dismiss() } label: { Text("Close").tapTarget() }
                }
            }
        }
        .presentationDetents([.large])
    }

    private func draftCard(_ index: Int) -> some View {
        let draft = drafts[index]
        return VStack(alignment: .leading, spacing: 10) {
            Text("Spread \(index + 1)").font(.system(size: 13)).foregroundStyle(Spread.secondary)
            TextField("Parent, shop, study", text: Binding(get: { drafts[index].name }, set: { drafts[index].name = $0 }))
                .font(.system(size: 17))
                .padding(.horizontal, 14).frame(minHeight: 48)
                .background(Spread.fill, in: RoundedRectangle(cornerRadius: 14))
                .accessibilityLabel("Spread \(index + 1) name")
                .accessibilityIdentifier("role-name-field")
            HStack {
                Text("Hours each week").font(Spread.callout).foregroundStyle(Spread.secondary)
                Spacer()
                HourStepper(value: draft.hours, label: "Hours for spread \(index + 1)") { hours in
                    drafts[index].hours = hours
                }
            }
            Text("Symbol" + (draft.category.flatMap { id in PalettePanel.categories.first { $0.id == id }?.label }.map { " · " + $0 } ?? ""))
                .font(Spread.footnote).foregroundStyle(Spread.secondary)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 5), spacing: 6) {
                ForEach(PalettePanel.categories, id: \.id) { item in
                    let selected = draft.category == item.id
                    Button { drafts[index].category = item.id } label: {
                        RoleBadge(category: item.id, color: "#8E8E93", size: 32)
                            .frame(width: 44, height: 44)
                            .overlay(Circle().stroke(Spread.ink, lineWidth: selected ? 2 : 0).frame(width: 40, height: 40))
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(item.label)
                    .accessibilityAddTraits(selected ? .isSelected : [])
                }
            }
        }
        .padding(14)
        .background(Spread.canvas, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
    }

    private func save() {
        let rows = drafts.filter { !$0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        guard !rows.isEmpty else { return }
        saving = true
        Task {
            for row in rows {
                let ok = await planner.send([
                    "type": "addRole",
                    "name": row.name.trimmingCharacters(in: .whitespacesAndNewlines),
                    "hours": row.hours,
                    "category": row.category ?? "custom",
                ])
                if !ok { break }
            }
            saving = false
            dismiss()
        }
    }
}

/// One responsibility in detail: name, hours, colour and symbol, the days it is placed, its tasks, and Remove.
/// The inline Stack row covers quick edits; this sheet is the full editor (`RoleBlock` plus its dialogs).
struct RoleSheet: View {
    @ObservedObject var planner: LivePlanner
    let roleId: String
    let onOpenTask: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var placeDay = ""
    @State private var placeHours = 1.0

    private var role: Responsibility? { planner.snapshot?.roles.first { $0.id == roleId } }

    var body: some View {
        NavigationStack {
            if let snapshot = planner.snapshot, let role {
                Form {
                    Section {
                        ChalkIllustration(category: role.category, maxWidth: 160, maxHeight: 110)
                            .frame(maxWidth: .infinity)
                    }
                    Section("Responsibility") {
                        TextField("Name", text: $name)
                            .submitLabel(.done)
                            .onSubmit { rename(role) }
                            .accessibilityIdentifier("role-name-field")
                        HStack {
                            Text("Hours each week")
                            Spacer()
                            HourStepper(value: role.hours, label: "\(role.name) hours") { hours in
                                Task { await planner.send(["type": "setHours", "roleId": role.id, "hours": hours]) }
                            }
                        }
                        Text("\(SpreadHours.text(snapshot.remainingHours(for: role.id)))h left in this week’s bank")
                            .font(Spread.footnote).foregroundStyle(Spread.secondary)
                            .accessibilityIdentifier("bank-remaining")
                    }
                    Section("Colour and symbol") {
                        PalettePanel(planner: planner, role: role)
                            .listRowInsets(EdgeInsets())
                    }
                    Section("Placed hours") {
                        let placed = snapshot.allocations.filter { $0.roleId == role.id }.sorted { $0.day < $1.day }
                        if placed.isEmpty {
                            Text("Not placed on any day yet.").foregroundStyle(Spread.secondary)
                        }
                        ForEach(placed) { item in
                            HStack {
                                Text(PlannerDates.label(PlannerDates.date(item.day), pattern: "EEEE"))
                                Spacer()
                                HourStepper(value: item.hours, label: "\(role.name) on \(PlannerDates.label(PlannerDates.date(item.day), pattern: "EEEE"))") { hours in
                                    Task { await planner.send(["type": "allocationHours", "allocationId": item.id, "hours": hours]) }
                                }
                                Button(role: .destructive) {
                                    Task { await planner.send(["type": "removeAllocation", "allocationId": item.id]) }
                                } label: { Image(systemName: "trash").tapTarget() }
                                .accessibilityLabel("Remove hours from \(PlannerDates.label(PlannerDates.date(item.day), pattern: "EEEE"))")
                            }
                        }
                    }
                    Section("Place hours") {
                        Picker("Day", selection: $placeDay) {
                            ForEach(0..<7, id: \.self) { position in
                                let iso = PlannerOrder.day(weekKey: snapshot.weekKey, displayPosition: position)
                                Text(PlannerDates.label(PlannerDates.date(iso), pattern: "EEEE")).tag(iso)
                            }
                        }
                        .accessibilityIdentifier("day-picker")
                        HStack {
                            Text("Hours")
                            Spacer()
                            HourStepper(value: placeHours, label: "Hours to place") { placeHours = $0 }
                        }
                        Button("Place \(SpreadHours.text(placeHours))h") {
                            Task { await planner.send(["type": "allocate", "roleId": role.id, "day": placeDay, "hours": placeHours]) }
                        }
                        .disabled(snapshot.remainingHours(for: role.id) < placeHours || placeDay.isEmpty)
                        .accessibilityIdentifier("place-hours-button")
                    }
                    Section("Tasks") {
                        ForEach(snapshot.tasks(for: role.id)) { task in
                            TaskRow(planner: planner, snapshot: snapshot, task: task, roleId: role.id, onOpen: { onOpenTask(task.id) })
                        }
                        AddTaskRow(placeholder: "Add a task") { text in
                            Task { await planner.send(["type": "addTask", "roleId": role.id, "text": text]) }
                        }
                    }
                    Section {
                        Button("Remove responsibility", role: .destructive) {
                            Task {
                                if await planner.send(["type": "removeRole", "roleId": role.id]) { dismiss() }
                            }
                        }
                        .accessibilityIdentifier("delete-role-button")
                    } footer: {
                        Text("The hours and tasks for this spread leave every week.")
                    }
                }
                .navigationTitle("Responsibility")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button { dismiss() } label: { Text("Done").tapTarget() }
                    }
                }
                .onAppear {
                    name = role.name
                    placeDay = PlannerOrder.day(weekKey: snapshot.weekKey, displayPosition: 0)
                }
            } else {
                ContentUnavailableView("This responsibility is no longer in the plan.", systemImage: "square.stack")
                    .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } } }
            }
        }
        .presentationDetents([.large])
    }

    private func rename(_ role: Responsibility) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed != role.name else { name = role.name; return }
        Task { await planner.send(["type": "renameRole", "roleId": role.id, "name": trimmed]) }
    }
}

/// Open tasks (`CarryOverSheet`): every unfinished task this week, all chosen at first. Untick what stays,
/// then "Move N" carries the chosen tasks to next week through the store's carry-over action.
struct CarryOverSheet: View {
    @ObservedObject var planner: LivePlanner
    @Environment(\.dismiss) private var dismiss
    @State private var unchecked: Set<String> = []
    @State private var status: String?

    private var items: [PlannerTask] { planner.snapshot?.tasks.filter { !$0.done } ?? [] }
    private var chosen: [PlannerTask] { items.filter { !unchecked.contains($0.id) } }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    if items.isEmpty {
                        Text("No open tasks this week.").foregroundStyle(Spread.secondary)
                    }
                    ForEach(items) { task in
                        Button {
                            if unchecked.contains(task.id) { unchecked.remove(task.id) } else { unchecked.insert(task.id) }
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: chosen.contains(where: { $0.id == task.id }) ? "checkmark.circle.fill" : "circle")
                                    .font(.system(size: 22))
                                    .foregroundStyle(chosen.contains(where: { $0.id == task.id }) ? Spread.accent : Spread.tertiary)
                                Text(task.text.isEmpty ? "Untitled task" : task.text).lineLimit(2)
                                Spacer(minLength: 0)
                                Text(planner.snapshot?.roles.first { $0.id == task.roleId }?.name ?? "")
                                    .font(Spread.caption).foregroundStyle(Spread.secondary)
                            }
                            .frame(minHeight: 44)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityAddTraits(chosen.contains(where: { $0.id == task.id }) ? .isSelected : [])
                    }
                } header: {
                    Text("Pick what moves to next week. The rest stays here. Next week’s own tasks and days are not touched.")
                        .textCase(nil)
                }
                if let status {
                    Section { Text(status).foregroundStyle(Spread.secondary) }
                }
            }
            .navigationTitle("Open tasks")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Not now") { dismiss() }.frame(minHeight: 44)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Move \(chosen.count)") { move() }
                        .disabled(chosen.isEmpty)
                        .accessibilityIdentifier("carry-selected")
                }
            }
        }
        .presentationDetents([.large])
    }

    private func move() {
        let picks = chosen.map { ["roleId": $0.roleId, "taskId": $0.id] }
        Task {
            let ok = await planner.send(["type": "carryOver", "picks": picks])
            if ok { dismiss() } else { status = "Nothing to move." }
        }
    }
}

/// Profiles (`ProfilesSection`): switch, rename, remove, and create, up to the ten-profile limit.
/// Each profile keeps its own spreads and weeks.
struct ProfilesSheet: View {
    @ObservedObject var planner: LivePlanner
    @Environment(\.dismiss) private var dismiss
    @State private var newName = ""
    @State private var confirmRemove: NativeProfile?
    @State private var names: [String: String] = [:]

    static let limit = 10

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(planner.profiles) { profile in
                        let active = profile.id == planner.state?.envelope.profileId
                        HStack(spacing: 12) {
                            Button {
                                Task { await planner.send(["type": "switchProfile", "profileId": profile.id]) }
                                dismiss()
                            } label: {
                                HStack {
                                    if active { Image(systemName: "checkmark").foregroundStyle(Spread.accent) }
                                    Spacer(minLength: 0)
                                }
                                .frame(width: 24, height: 44)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Open \(profile.name)")
                            .accessibilityAddTraits(active ? .isSelected : [])
                            .accessibilityIdentifier("profile-\(profile.id)")
                            TextField("Name", text: Binding(get: { names[profile.id] ?? profile.name }, set: { names[profile.id] = $0 }))
                                .submitLabel(.done)
                                .onSubmit { rename(profile) }
                                .accessibilityLabel("Name for \(profile.name)")
                                .accessibilityIdentifier("profile-name-\(profile.id)")
                            Button(role: .destructive) { confirmRemove = profile } label: {
                                Image(systemName: "minus.circle").tapTarget()
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Remove \(profile.name)")
                        }
                    }
                } footer: {
                    Text("Each profile keeps its own spreads and weeks.")
                }
                Section("New profile") {
                    TextField("New profile name", text: $newName)
                        .submitLabel(.done)
                        .onSubmit { create() }
                        .accessibilityIdentifier("new-profile-field")
                    Button("Create profile") { create() }
                        .disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty || planner.profiles.count >= Self.limit)
                        .accessibilityIdentifier("create-profile")
                }
            }
            .navigationTitle("Profiles")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button { dismiss() } label: { Text("Done").tapTarget() }
                }
            }
            .confirmationDialog("Remove this profile and its spreads?", isPresented: Binding(get: { confirmRemove != nil }, set: { if !$0 { confirmRemove = nil } }), titleVisibility: .visible) {
                Button("Remove profile", role: .destructive) {
                    if let profile = confirmRemove {
                        Task { await planner.send(["type": "removeProfile", "profileId": profile.id]) }
                    }
                    confirmRemove = nil
                }
            }
        }
        .presentationDetents([.large])
    }

    private func rename(_ profile: NativeProfile) {
        let value = (names[profile.id] ?? profile.name).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty, value != profile.name else { names[profile.id] = nil; return }
        Task {
            _ = await planner.send(["type": "renameProfile", "profileId": profile.id, "name": value])
            names[profile.id] = nil
        }
    }

    private func create() {
        let value = newName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty, planner.profiles.count < Self.limit else { return }
        Task {
            if await planner.send(["type": "addProfile", "name": value]) { newName = "" }
        }
    }
}

/// More (`MoreSheet`): the profile list, the Spread layout choice, the Week and Open tasks actions, and Backup
/// and restore. Backup and restore open the protected planner recovery surface (see the ledger exception).
struct MoreSheet: View {
    @ObservedObject var planner: LivePlanner
    let recovery: () -> Void
    let showProfiles: () -> Void
    @Binding var layout: SpreadLayout

    @Environment(\.dismiss) private var dismiss
    @State private var newSpread = false
    @State private var openTasks = false

    /// Exports run on the store, then hand the result to the system: print/PDF, the share sheet, or text.
    private func exportWeek(_ format: String) {
        Task {
            guard let exported = await planner.exportWeek(format) else { return }
            switch exported.format {
            case "html":
                WeekExport.printWeek(html: exported.content)
            case "docx":
                if let url = WeekExport.wordFile(base64: exported.content) { WeekExport.share([url]) }
            default:
                WeekExport.share([exported.content])
            }
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Spreads") {
                    Button { newSpread = true } label: { Label("New Spread", systemImage: "plus").frame(minHeight: 44, alignment: .leading) }
                        .accessibilityIdentifier("more-new-spread")
                    Button { openTasks = true } label: { Label("Review open tasks", systemImage: "tray").frame(minHeight: 44, alignment: .leading) }
                    Button {
                        Task { _ = await planner.send(["type": "rollover", "force": false]) }
                    } label: { Label("Rollover to next week", systemImage: "arrow.right.square").frame(minHeight: 44, alignment: .leading) }
                    .accessibilityIdentifier("more-rollover")
                }
                Section("Spread view") {
                    ForEach(SpreadLayout.allCases) { item in
                        Button { layout = item } label: {
                            HStack {
                                Text(item.title)
                                Spacer()
                                if layout == item { Image(systemName: "checkmark").foregroundStyle(Spread.accent) }
                            }
                            .frame(minHeight: 44)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityAddTraits(layout == item ? .isSelected : [])
                        .accessibilityIdentifier("more-layout-\(item.rawValue)")
                    }
                }
                Section("Profiles") {
                    ForEach(planner.profiles) { profile in
                        HStack {
                            Text(profile.name)
                            Spacer()
                            if profile.id == planner.state?.envelope.profileId { Image(systemName: "checkmark").foregroundStyle(Spread.accent) }
                        }
                        .frame(minHeight: 44)
                    }
                    Button("Manage profiles") { dismiss(); showProfiles() }
                        .accessibilityIdentifier("manage-profiles")
                }
                Section("Share this week") {
                    Button { exportWeek("html") } label: { Label("Print or save as PDF", systemImage: "printer").frame(minHeight: 44, alignment: .leading) }
                        .accessibilityIdentifier("export-print")
                    Button { exportWeek("docx") } label: { Label("Word document", systemImage: "doc.richtext").frame(minHeight: 44, alignment: .leading) }
                        .accessibilityIdentifier("export-word")
                    Button { exportWeek("text") } label: { Label("Plain text", systemImage: "text.alignleft").frame(minHeight: 44, alignment: .leading) }
                        .accessibilityIdentifier("export-text")
                }
                Section("Data") {
                    Button { dismiss(); recovery() } label: { Label("Backup and restore", systemImage: "externaldrive").frame(minHeight: 44, alignment: .leading) }
                        .accessibilityIdentifier("backup-and-restore")
                }
            }
            .navigationTitle("More")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button { dismiss() } label: { Text("Done").tapTarget() }
                }
            }
            .sheet(isPresented: $newSpread) { NewSpreadSheet(planner: planner) }
            .sheet(isPresented: $openTasks) { CarryOverSheet(planner: planner) }
        }
        .presentationDetents([.large])
    }
}
#endif
