#if os(iOS)
import SwiftUI

/// Add Life (`NewSpreadSheet`): one or more named Life areas, each with its hours and an optional symbol.
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
        SpreadSheetStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("What would you like to make time for?")
                        .font(Spread.callout).foregroundStyle(Spread.secondary)
                    ForEach(drafts.indices, id: \.self) { index in
                        draftCard(index)
                    }
                    Button {
                        drafts.append(Draft(id: nextId))
                        nextId += 1
                    } label: {
                        HStack(spacing: 6) {
                            SpreadIcon(name: "icon-add", size: 19).font(.system(.subheadline, weight: .bold))
                            Text("Add another Life area").font(.system(.subheadline, weight: .semibold))
                        }
                        .foregroundStyle(Spread.accent)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .spreadChip(selected: false)
                    }
                    .buttonStyle(.spreadPress)
                    .accessibilityIdentifier("add-another-spread")
                    Button { save() } label: {
                        Text("Save Life areas").font(.system(.body, weight: .semibold)).foregroundStyle(Spread.onAccent)
                            .frame(maxWidth: .infinity, minHeight: 50)
                            .background(Capsule().fill(Spread.accentGradient))
                    }
                    .buttonStyle(.spreadPress)
                    .disabled(!ready || saving)
                    .opacity(ready ? 1 : 0.4)
                    .accessibilityIdentifier("save-spreads")
                }
                .padding(20)
            }
            .navigationTitle("Add Life")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                // Creating drafts discards them on Cancel, so the leading control is Cancel, not Close.
                ToolbarItem(placement: .cancellationAction) {
                    Button { dismiss() } label: { Text("Cancel").tapTarget() }
                        .accessibilityIdentifier("add-life-cancel")
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    /// One spread being created, previewed as it will look: its tile and Chalkboard drawing take the chosen category's
    /// colour as soon as it is picked.
    private func draftCard(_ index: Int) -> some View {
        let draft = drafts[index]
        let colorHex: String = draft.category.flatMap { PalettePanel.categoryColors[$0] } ?? "#8E8E93"
        let tint = Color(hex: colorHex)
        return VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                RoleBadge(category: draft.category, color: colorHex, size: 48)
                VStack(alignment: .leading, spacing: 4) {
                    // A Life draft names a Life area: OD7 keeps "spread" for the app name only.
                    Text("Life area \(index + 1)").font(.system(.footnote)).foregroundStyle(Spread.secondary)
                    TextField("Parent, shop, study", text: Binding(get: { drafts[index].name }, set: { drafts[index].name = $0 }), prompt: Spread.fieldPrompt("Parent, shop, study"))
                        .font(.system(.body))
                        .padding(.horizontal, 12).frame(minHeight: 44)
                        .background(RoundedRectangle(cornerRadius: Spread.radiusControl, style: .continuous).fill(Spread.inset))
                        .overlay(RoundedRectangle(cornerRadius: Spread.radiusControl, style: .continuous).strokeBorder(Spread.line, lineWidth: 0.5))
                        .accessibilityLabel("Life area \(index + 1) name")
                        .accessibilityIdentifier("role-name-field")
                }
            }
            HStack {
                Text("Hours each week").font(Spread.callout).foregroundStyle(Spread.secondary)
                Spacer()
                HourStepper(value: draft.hours, label: "Hours for Life area \(index + 1)", step: 0.5) { hours in
                    drafts[index].hours = hours
                }
            }
            Text("Symbol" + (draft.category.flatMap { id in PalettePanel.categories.first { $0.id == id }?.label }.map { " · " + $0 } ?? ""))
                .font(Spread.footnote).foregroundStyle(Spread.secondary)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 5), spacing: 6) {
                ForEach(PalettePanel.categories, id: \.id) { item in
                    let selected = draft.category == item.id
                    Button { drafts[index].category = item.id } label: {
                        RoleBadge(category: item.id, color: PalettePanel.categoryColors[item.id] ?? "#8E8E93", size: 36)
                            .frame(width: 44, height: 44)
                            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Spread.ink, lineWidth: selected ? 2 : 0).frame(width: 44, height: 44))
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.spreadPress)
                    .accessibilityLabel(item.label)
                    .accessibilityAddTraits(selected ? .isSelected : [])
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .spreadCard(edge: draft.category == nil ? nil : tint, active: draft.category != nil)
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
    @State private var confirmRemoval = false

    private var role: Responsibility? { planner.snapshot?.roles.first { $0.id == roleId } }

    var body: some View {
        SpreadSheetStack {
            if let snapshot = planner.snapshot, let role {
                Form {
                    Section("Responsibility") {
                        TextField("Name", text: $name, prompt: Spread.fieldPrompt("Name"))
                            .submitLabel(.done)
                            .onSubmit { rename(role) }
                            .accessibilityIdentifier("role-name-field")
                        HStack {
                            Text("Hours each week")
                            Spacer()
                            HourStepper(value: role.hours, label: "\(role.name) hours", step: 0.5) { hours in
                                Task { await planner.send(["type": "setHours", "roleId": role.id, "hours": hours]) }
                            }
                        }
                        Text("\(SpreadHours.text(snapshot.remainingHours(for: role.id)))h left in this week’s bank")
                            .font(Spread.footnote).foregroundStyle(Spread.secondary)
                            .accessibilityIdentifier("bank-remaining")
                    }
                        .listRowBackground(Spread.elevated)
                    Section("Colour and symbol") {
                        PalettePanel(planner: planner, role: role)
                            .listRowInsets(EdgeInsets())
                    }
                        .listRowBackground(Spread.elevated)
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
                                } label: { SpreadIcon(name: "icon-trash", size: 20).tapTarget() }
                                .accessibilityLabel("Remove hours from \(PlannerDates.label(PlannerDates.date(item.day), pattern: "EEEE"))")
                            }
                        }
                    }
                        .listRowBackground(Spread.elevated)
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
                            HourStepper(value: placeHours, label: "Hours to place", step: 0.5) { placeHours = $0 }
                        }
                        Button("Place \(SpreadHours.text(placeHours))h") {
                            Task { await planner.send(["type": "allocate", "roleId": role.id, "day": placeDay, "hours": placeHours]) }
                        }
                        .disabled(snapshot.remainingHours(for: role.id) < placeHours || placeDay.isEmpty)
                        .accessibilityIdentifier("place-hours-button")
                    }
                        .listRowBackground(Spread.elevated)
                    Section("Tasks") {
                        ForEach(snapshot.tasks(for: role.id)) { task in
                            TaskRow(planner: planner, snapshot: snapshot, task: task, roleId: role.id, onOpen: { onOpenTask(task.id) })
                        }
                        AddTaskRow(placeholder: "Add a task",
                               draftKey: TaskDraftMemory.key(profileId: planner.state?.envelope.profileId, weekKey: snapshot.weekKey, roleId: role.id)) { text in
                            await planner.send(["type": "addTask", "roleId": role.id, "text": text])
                        }
                    }
                        .listRowBackground(Spread.elevated)
                    Section {
                        Button("Remove responsibility", role: .destructive) { confirmRemoval = true }
                        .accessibilityIdentifier("delete-role-button")
                    } footer: {
                        Text("The hours and tasks for this responsibility leave every week.")
                    }
                        .listRowBackground(Spread.elevated)
                }
                    .spreadListSurface()
                .navigationTitle("Responsibility")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button { dismiss() } label: { Text("Done").tapTarget() }
                    }
                }
                .onAppear {
                    name = role.name
                    placeDay = PlannerOrder.day(weekKey: snapshot.weekKey, displayPosition: 0)
                }
            } else {
                ContentUnavailableView("This responsibility is no longer in the plan.", systemImage: "square.stack")
                    .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .confirmationDialog("Remove \(role?.name ?? "this responsibility")?", isPresented: $confirmRemoval, titleVisibility: .visible) {
            Button("Remove responsibility", role: .destructive) {
                Task {
                    if await planner.send(["type": "removeRole", "roleId": roleId]) { dismiss() }
                }
            }
            .accessibilityIdentifier("confirm-delete-role")
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("The hours and tasks for this responsibility leave every week.")
        }
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
        SpreadSheetStack {
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
                                    .font(.system(.title2))
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
                        .accessibilityIdentifier("carry-\(task.id)")
                    }
                } header: {
                    Text("Pick what moves to next week. The rest stays here. Next week’s own tasks and days are not touched.")
                        .textCase(nil)
                }
                    .listRowBackground(Spread.elevated)
                if let status {
                    Section { Text(status).foregroundStyle(Spread.secondary) }
                        .listRowBackground(Spread.elevated)
                }
            }
                .spreadListSurface()
            .navigationTitle("Open tasks")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Not now") { dismiss() }.frame(minHeight: 44)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(chosen.isEmpty ? "Move" : "Move \(chosen.count)") { move() }
                        .disabled(chosen.isEmpty)
                        .accessibilityIdentifier("carry-selected")
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
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
        SpreadSheetStack {
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
                                .frame(width: 44, height: 44)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Open \(profile.name)")
                            .accessibilityAddTraits(active ? .isSelected : [])
                            .accessibilityIdentifier("profile-\(profile.id)")
                            TextField("Name", text: Binding(get: { names[profile.id] ?? profile.name }, set: { names[profile.id] = $0 }), prompt: Spread.fieldPrompt("Name"), axis: .vertical)
                                .font(.system(.body))
                                .padding(.vertical, 10)
                                .lineLimit(1...3)
                                .frame(minHeight: 44)
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
                    Text("Each profile keeps its own plan and weeks.")
                        .fixedSize(horizontal: false, vertical: true)
                }
                    .listRowBackground(Spread.elevated)
                Section {
                    TextField("New profile name", text: $newName, prompt: Spread.fieldPrompt("New profile name"), axis: .vertical)
                        .submitLabel(.done)
                        .onSubmit { create() }
                        .font(.system(.body))
                        .padding(.vertical, 10)
                        .lineLimit(1...3)
                        .frame(minHeight: 44)
                        .accessibilityIdentifier("new-profile-field")
                    Button { create() } label: {
                        Text("Create profile").lineLimit(3)
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                    }
                        .disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty || planner.profiles.count >= Self.limit)
                        .accessibilityIdentifier("create-profile")
                } header: {
                    Text("New profile").fixedSize(horizontal: false, vertical: true)
                } footer: {
                    // A disabled Create button needs its reason on screen, not only in the disabled state.
                    if planner.profiles.count >= Self.limit {
                        Text("Spread keeps up to \(Self.limit) profiles. Remove one to add another.")
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                    .listRowBackground(Spread.elevated)
            }
                .spreadListSurface()
            .navigationTitle("Profiles")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button { dismiss() } label: { Text("Done").tapTarget() }
                }
            }
            .confirmationDialog("Remove this profile and everything in it?", isPresented: Binding(get: { confirmRemove != nil }, set: { if !$0 { confirmRemove = nil } }), titleVisibility: .visible) {
                Button("Remove profile", role: .destructive) {
                    if let profile = confirmRemove {
                        Task { await planner.send(["type": "removeProfile", "profileId": profile.id]) }
                    }
                    confirmRemove = nil
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
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

/// More: a one-glance control panel, not a long Settings list. On a normal iPhone
/// the existing actions fit without scrolling; small windows and accessibility text
/// keep a scroll fallback instead of clipping or shrinking hit targets.
struct MoreSheet: View {
    @ObservedObject var planner: LivePlanner
    @ObservedObject var focusTimer: SpreadFocusTimer
    let backup: () -> Void
    let showProfiles: () -> Void
    @Binding var appearance: SpreadAppearance
    @Binding var weekFocusEnabled: Bool

    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var showRecentlyDeleted = false
    @State private var showWhatsNew = false
    @State private var showReminders = false
    @State private var showFocusTimer = false
    @AppStorage(SpreadWidgetPublisher.enabledKey) private var todayWidgetsEnabled = false
    @AppStorage(SpreadLifeCardsPublisher.enabledKey) private var lifeCardsWidgetsEnabled = false
    @AppStorage(SpreadReleaseNotes.lastSeenKey) private var lastSeenReleaseID = ""

    private var activeProfileName: String {
        planner.profiles.first(where: { $0.id == planner.state?.envelope.profileId })?.name ?? "Current profile"
    }

    /// The existing store exports and system presentation paths stay untouched.
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

    private func sectionLabel(_ title: String) -> some View {
        Text(title)
            .font(.system(.footnote, weight: .semibold))
            .foregroundStyle(Spread.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityAddTraits(.isHeader)
    }

    /// Compact, uniform tiles. The icon is accent-colored; actual text stays
    /// high-contrast on a solid surface in both dark and light appearance.
    private func tile(
        _ title: String,
        symbol: String,
        id: String,
        accessibilityLabel: String? = nil,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: 5) {
                Image(systemName: symbol)
                    .font(.system(.title3, weight: .medium))
                    .foregroundStyle(Spread.accent)
                    .frame(height: 26)
                Text(title)
                    .font(.system(.caption, weight: .semibold))
                    .foregroundStyle(Spread.ink)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity)
            }
            .frame(maxWidth: .infinity, minHeight: 78)
            .padding(.horizontal, 5)
            .background(RoundedRectangle(cornerRadius: Spread.radiusRow, style: .continuous).fill(Spread.elevated))
            .contentShape(RoundedRectangle(cornerRadius: Spread.radiusRow, style: .continuous))
        }
        // The tappable control, not just its label, owns the full tile bounds.
        // A SwiftUI custom button style can otherwise expose only its inner
        // text frame to accessibility hit-target measurements.
        .frame(maxWidth: .infinity, minHeight: 78)
        .contentShape(RoundedRectangle(cornerRadius: Spread.radiusRow, style: .continuous))
        .buttonStyle(.spreadPress)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityLabel ?? title)
        .accessibilityAddTraits(.isButton)
        .accessibilityIdentifier(id)
    }

    /// The Appearance choices share one row, identical to the previous HStack. At accessibility text sizes a third of
    /// the width cannot hold "System" on one line (the labels are single-line), so the row stacks instead of truncating.
    private var appearanceLayout: AnyLayout {
        typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(spacing: 6)) : AnyLayout(HStackLayout(spacing: 6))
    }

    var body: some View {
        SpreadSheetStack {
            GeometryReader { geometry in
                // Three columns on regular phones. Two columns only when a scene
                // really narrows or Dynamic Type needs more space.
                let count = typeSize.isAccessibilitySize || geometry.size.width < 330 ? 2 : 3
                let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: count)

                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        VStack(alignment: .leading, spacing: 6) {
                            sectionLabel("Appearance")
                            appearanceLayout {
                                ForEach(SpreadAppearance.allCases) { item in
                                    Button { appearance = item } label: {
                                        Text(item.title)
                                            .font(.system(.subheadline, weight: .semibold))
                                            .lineLimit(1)
                                            .frame(maxWidth: .infinity, minHeight: 44)
                                            .spreadChip(selected: appearance == item)
                                    }
                                    .buttonStyle(.spreadPress)
                                    .accessibilityAddTraits(appearance == item ? .isSelected : [])
                                    .accessibilityIdentifier("appearance-" + item.rawValue)
                                }
                                // A native Menu: the system checkmark marks the active design, so no label carries "(current)".
                                Menu {
                                    Section {
                                        Picker("Calendar design", selection: $weekFocusEnabled) {
                                            Text("Life").tag(true)
                                            Text("Classic").tag(false)
                                        }
                                    } header: {
                                        Text("Life uses the same tasks, hours and planning data. Choose Classic anytime to return.")
                                    }
                                } label: {
                                    SpreadIcon(name: "lucide-calendar-days", size: 20)
                                        .font(.system(.body, weight: .semibold))
                                        .foregroundStyle(Spread.accent)
                                        .frame(width: 44, height: 44)
                                        .contentShape(Rectangle())
                                }
                                .accessibilityLabel(weekFocusEnabled ? "Calendar design: Life" : "Calendar design: Classic")
                                .accessibilityIdentifier("calendar-design-picker")
                            }
                            .padding(6)
                            .background(RoundedRectangle(cornerRadius: Spread.radiusRow).fill(Spread.elevated))
                            .accessibilityElement(children: .contain)
                            .accessibilityIdentifier("appearance-picker")
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            sectionLabel("Notifications")
                            Button { showFocusTimer = true } label: {
                                Label { Text("Focus timer") } icon: { SpreadIcon(name: "lucide-timer", size: 18) }
                                    .font(.subheadline.weight(.semibold))
                                    .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                                    .padding(.horizontal, 12)
                                    .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
                            }
                            .buttonStyle(.spreadPress)
                            .accessibilityIdentifier("more-focus-timer")
                            Button { showReminders = true } label: {
                                Label { Text("Daily planning reminder") } icon: { SpreadIcon(name: "lucide-bell", size: 18) }
                                    .font(.subheadline.weight(.semibold))
                                    .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                                    .padding(.horizontal, 12)
                                    .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
                            }
                            .buttonStyle(.spreadPress)
                            .accessibilityIdentifier("spread-reminder-settings")
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            sectionLabel("Widgets")
                            Toggle("Show Today on widgets", isOn: $todayWidgetsEnabled)
                                .font(.subheadline.weight(.semibold))
                                .padding(.horizontal, 12)
                                .frame(minHeight: 48)
                                .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
                                .accessibilityIdentifier("today-widget-enabled")
                            Text("Only task counts, hours placed today and a running focus timer are shared locally. No task names or accounts.")
                                .font(.footnote)
                                .foregroundStyle(Spread.secondary)
                            Toggle("Show Life cards on widgets", isOn: $lifeCardsWidgetsEnabled)
                                .font(.subheadline.weight(.semibold))
                                .padding(.horizontal, 12)
                                .frame(minHeight: 48)
                                .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
                                .accessibilityIdentifier("life-cards-widget-enabled")
                            Text("Life area names, colors and this week's hours appear on your Home Screen. Anyone who can see it can see them. Stays on this device.")
                                .font(.footnote)
                                .foregroundStyle(Spread.secondary)
                        }
                        VStack(alignment: .leading, spacing: 6) {
                            sectionLabel("Profiles")
                            HStack(spacing: 10) {
                                Image(systemName: "person.crop.circle")
                                    .foregroundStyle(Spread.secondary)
                                    .accessibilityHidden(true)
                                Text(activeProfileName)
                                    .font(.system(.subheadline, weight: .semibold))
                                    .foregroundStyle(Spread.ink)
                                    .lineLimit(1)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                Button { showProfiles() } label: {
                                    Text("Manage")
                                        .font(.system(.subheadline, weight: .semibold))
                                        .frame(minWidth: 64, minHeight: 44)
                                        .contentShape(Rectangle())
                                }
                                .buttonStyle(.spreadPress)
                                .accessibilityLabel("Manage profiles")
                                    .accessibilityIdentifier("manage-profiles")
                            }
                            .padding(.horizontal, 12)
                            .frame(minHeight: 48)
                            .background(RoundedRectangle(cornerRadius: Spread.radiusRow).fill(Spread.elevated))
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            sectionLabel("Share this week")
                            LazyVGrid(columns: columns, spacing: 8) {
                                tile("PDF / print", symbol: "printer", id: "export-print",
                                     accessibilityLabel: "Print or save as PDF") {
                                    exportWeek("html")
                                }
                                tile("Word", symbol: "doc.richtext", id: "export-word",
                                     accessibilityLabel: "Word document") {
                                    exportWeek("docx")
                                }
                                tile("Plain text", symbol: "text.alignleft", id: "export-text") {
                                    exportWeek("text")
                                }
                            }
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            sectionLabel("Data")
                            HStack(spacing: 8) {
                                Button {
                                    backup()
                                } label: {
                                    Label { Text("Backup and restore") } icon: { SpreadIcon(name: "icon-backup", size: 18) }
                                        .font(.system(.subheadline, weight: .semibold))
                                        .foregroundStyle(Spread.ink)
                                        .lineLimit(2)
                                        .frame(maxWidth: .infinity, minHeight: 48)
                                        .padding(.horizontal, 8)
                                        .background(RoundedRectangle(cornerRadius: Spread.radiusRow).fill(Spread.elevated))
                                }
                                .buttonStyle(.spreadPress)
                                .accessibilityIdentifier("backup-and-restore")
                                Button { showRecentlyDeleted = true } label: {
                                    Label { Text("Recently Deleted") } icon: { SpreadIcon(name: "icon-trash", size: 18) }
                                        .font(.system(.subheadline, weight: .semibold))
                                        .foregroundStyle(Spread.ink)
                                        .lineLimit(2)
                                        .frame(maxWidth: .infinity, minHeight: 48)
                                        .padding(.horizontal, 8)
                                        .background(RoundedRectangle(cornerRadius: Spread.radiusRow).fill(Spread.elevated))
                                }
                                .buttonStyle(.spreadPress)
                                .accessibilityIdentifier("more-recently-deleted")
                            }
                        }
                        VStack(alignment: .leading, spacing: 6) {
                            sectionLabel("About Spread")
                            Button {
                                showWhatsNew = true
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: "sparkles")
                                        .font(.title3)
                                        .foregroundStyle(Spread.accent)
                                        .frame(width: 32)
                                        .accessibilityHidden(true)
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text("What's New")
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundStyle(Spread.ink)
                                        Text("Version " + SpreadReleaseNotes.appVersion)
                                            .font(.caption)
                                            .foregroundStyle(Spread.secondary)
                                    }
                                    Spacer(minLength: 8)
                                    if SpreadReleaseNotes.shouldPresent(
                                        version: SpreadReleaseNotes.appVersion,
                                        lastSeenID: lastSeenReleaseID) {
                                        Text("New")
                                            .font(.caption.weight(.semibold))
                                            .foregroundStyle(Spread.accent)
                                    }
                                    SpreadIcon(name: "lucide-chevron-right", size: 18)
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(Spread.secondary)
                                        .accessibilityHidden(true)
                                }
                                .padding(.horizontal, 14)
                                .frame(maxWidth: .infinity, minHeight: 54)
                                .background(Spread.elevated,
                                            in: RoundedRectangle(cornerRadius: Spread.radiusRow))
                                .contentShape(RoundedRectangle(cornerRadius: Spread.radiusRow))
                            }
                            .buttonStyle(.spreadPress)
                            .accessibilityLabel("What's New in Spread")
                            .accessibilityHint("Read release notes and earlier updates")
                            .accessibilityIdentifier("more-whats-new")
                        }
                    }
                    .frame(maxWidth: 620)
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 16)
                    .frame(maxWidth: .infinity, alignment: .top)
                }
                .scrollBounceBehavior(.basedOnSize)
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("more-overview")
            }
            .navigationTitle("More")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button { dismiss() } label: { Text("Done").tapTarget() }
                        .accessibilityIdentifier("close-more")
                }
            }
            .sheet(isPresented: $showRecentlyDeleted) { RecentlyDeletedSheet(planner: planner) }
            .sheet(isPresented: $showReminders) { SpreadReminderSettingsSheet() }
            .sheet(isPresented: $showFocusTimer) {
                if let snapshot = planner.snapshot,
                   let profileId = planner.state?.envelope.profileId {
                    SpreadFocusTimerSheet(timer: focusTimer, profileId: profileId,
                                          roles: snapshot.roles, preferredRoleId: nil)
                }
            }
            .sheet(isPresented: $showWhatsNew, onDismiss: {
                if let latest = SpreadReleaseNotes.newest(for: SpreadReleaseNotes.appVersion) {
                    lastSeenReleaseID = latest.id
                }
            }) {
                WhatsNewSheet(showHistory: true)
            }
        }
        // Start fully presented so the entire compact menu is visible immediately.
        // Scrolling is still possible on smaller iPhones, keyboard and large text.
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .onChange(of: todayWidgetsEnabled) { _, enabled in
            if enabled {
                if let snapshot = planner.snapshot {
                    SpreadWidgetPublisher.publish(snapshot: snapshot)
                    // Today's planned block is offered on the widgets now, not at the next planner change.
                    if let profile = planner.state?.envelope.profileId {
                        SpreadDayPlanPublisher.publish(snapshot: snapshot, profileId: profile)
                    }
                }
                // A session that is already running should appear on the widgets right away.
                SpreadFocusWidgetPublisher.republishFromStore()
            } else {
                SpreadWidgetPublisher.revoke()
                SpreadFocusWidgetPublisher.revoke()
                // Off means off: the widgets stop offering today's planned block.
                SpreadDayPlanPublisher.clear()
            }
        }
        .onChange(of: lifeCardsWidgetsEnabled) { _, enabled in
            if enabled {
                if let snapshot = planner.snapshot { SpreadLifeCardsPublisher.publish(snapshot: snapshot) }
            } else {
                SpreadLifeCardsPublisher.revoke()
            }
        }
    }
}
#endif
