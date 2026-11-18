#if os(iOS)
import SwiftUI

/// Add Life, or Add responsibility in Classic (`NewSpreadSheet`): one or more named roles, each with its hours and an optional symbol.
/// "Save" adds every named row through the store's `addRole`, one after another.
struct NewSpreadSheet: View {
    @ObservedObject var planner: LivePlanner
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize

    private struct Draft: Identifiable {
        let id: Int
        var name = ""
        var hours = 2.0
        var category: String?
    }

    @State private var drafts = [Draft(id: 1)]
    @State private var nextId = 2
    @State private var saving = false
    /// Shown inside the sheet when a save fails, so the entries stay here and the message is not left behind it.
    @State private var saveFailure: String?
    @State private var pendingWrite: (rowID: Int, roleID: String)?

    private var ready: Bool { drafts.contains { !$0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty } }
    /// OD7: Life says "Life area", Classic says "responsibility". "Spread" is the app name only.
    private var roleWord: String { "Life area" }
    private var roleWords: String { "Life areas" }
    private func fieldName(_ index: Int) -> String { "Life area \(index + 1)" }
    private let quickStarts = ["work", "home", "family", "health", "personal"]
    private var emptyDraftIndex: Int? {
        drafts.firstIndex { $0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && $0.category == nil }
    }

    var body: some View {
        SpreadSheetStack(canvas: LifePalette.canvas) {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("What would you like to make time for?")
                        .font(Spread.callout).foregroundStyle(LifePalette.secondary)
                    VStack(alignment: .leading, spacing: Spread.space2) {
                        Text("Quick start").font(Spread.footnote).foregroundStyle(LifePalette.secondary)
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: typeSize.isAccessibilitySize ? 180 : 96),
                                                      spacing: Spread.space2)], spacing: Spread.space2) {
                            ForEach(quickStarts, id: \.self) { category in
                                let name = PalettePanel.categories.first { $0.id == category }?.label ?? category.capitalized
                                let selected = drafts.contains { $0.category == category }
                                Button { addQuickStart(name: name, category: category) } label: {
                                    HStack(spacing: 4) {
                                        Image(systemName: selected ? "checkmark" : "plus")
                                            .accessibilityHidden(true)
                                        Text(name)
                                            .multilineTextAlignment(.center)
                                    }
                                    .font(.caption.bold())
                                    .frame(maxWidth: .infinity, minHeight: Spread.minimumTarget)
                                }
                                .buttonStyle(.spreadPress)
                                .spreadChip(selected: selected, usesLifePalette: true)
                                .disabled(saving || selected || (drafts.count >= 5 && emptyDraftIndex == nil))
                                .accessibilityAddTraits(selected ? .isSelected : [])
                                .accessibilityIdentifier("quick-life-" + category)
                            }
                        }
                    }
                    if saving {
                        ProgressView("Saving Life areas…")
                    } else {
                        ForEach(drafts) { draft in
                            if let index = drafts.firstIndex(where: { $0.id == draft.id }) {
                                draftCard(index)
                                    .disabled(pendingWrite?.rowID == draft.id)
                            }
                        }
                    }
                    Button {
                        drafts.append(Draft(id: nextId))
                        nextId += 1
                    } label: {
                        HStack(spacing: 6) {
                            SpreadIcon(name: "icon-add", size: 19).font(.system(.subheadline, weight: .bold))
                            Text("Add another \(roleWord)").font(.system(.subheadline, weight: .semibold))
                        }
                        .foregroundStyle(Spread.accent)
                        .frame(maxWidth: .infinity, minHeight: Spread.minimumTarget)
                        .spreadChip(selected: false, usesLifePalette: true)
                    }
                    .buttonStyle(.spreadPress)
                    .disabled(saving)
                    .accessibilityIdentifier("add-another-spread")
                    if let saveFailure = saveFailure {
                        Text(saveFailure)
                            .font(Spread.callout).foregroundStyle(Spread.danger)
                            .fixedSize(horizontal: false, vertical: true)
                            .accessibilityIdentifier("add-life-error")
                    }
                    Button { save() } label: {
                        Text(pendingWrite == nil ? "Save \(roleWords)" : "Retry saving")
                            .font(.system(.body, weight: .semibold)).foregroundStyle(Spread.onAccent)
                            .frame(maxWidth: .infinity, minHeight: 50)
                            .background(Capsule().fill(Spread.accentGradient))
                    }
                    .buttonStyle(.spreadPress)
                    .disabled(!ready || saving)
                    .opacity(ready ? 1 : Spread.disabledOpacity)
                    .accessibilityIdentifier("save-spreads")
                }
                .padding(Spread.space5)
            }
            .navigationTitle("Add Life")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                // Creating drafts discards them on Cancel, so the leading control is Cancel, not Close.
                ToolbarItem(placement: .cancellationAction) {
                    Button { dismiss() } label: { Text("Cancel").tapTarget() }
                        .disabled(saving)
                        .accessibilityIdentifier("add-life-cancel")
                }
            }
        }
        .presentationDetents([.large])
        .interactiveDismissDisabled(saving)
        .presentationDragIndicator(.visible)
    }

    /// One spread being created, previewed as it will look: its tile and Chalkboard drawing take the chosen category's
    /// colour as soon as it is picked.
    private func draftCard(_ index: Int) -> some View {
        let draft = drafts[index]
        let colorHex: String = draft.category.flatMap { PalettePanel.categoryColors[$0] } ?? Spread.roleFallbackHex
        let tint = Color(hex: colorHex)
        return VStack(alignment: .leading, spacing: Spread.space3) {
            HStack(spacing: Spread.space3) {
                RoleBadge(category: draft.category, color: colorHex, size: 48)
                VStack(alignment: .leading, spacing: Spread.space1) {
                    Text(fieldName(index)).font(.system(.footnote)).foregroundStyle(LifePalette.secondary)
                    TextField("Parent, shop, study", text: Binding(get: { drafts[index].name }, set: { drafts[index].name = $0 }), prompt: Text("Parent, shop, study").foregroundStyle(LifePalette.secondary))
                        .font(.system(.body))
                        .padding(.horizontal, Spread.space3).frame(minHeight: Spread.minimumTarget)
                        .background(RoundedRectangle(cornerRadius: Spread.radiusControl, style: .continuous).fill(LifePalette.fill))
                        .overlay(RoundedRectangle(cornerRadius: Spread.radiusControl, style: .continuous).strokeBorder(LifePalette.line, lineWidth: 0.5))
                        .accessibilityLabel("\(fieldName(index)) name")
                        .accessibilityIdentifier("role-name-field")
                }
            }
            HStack {
                Text("Hours each week").font(Spread.callout).foregroundStyle(LifePalette.secondary)
                Spacer()
                HourStepper(value: draft.hours, label: "Hours for Life area \(index + 1)", step: 0.5) { hours in
                    drafts[index].hours = hours
                }
            }
            Text("Symbol" + (draft.category.flatMap { id in PalettePanel.categories.first { $0.id == id }?.label }.map { " · " + $0 } ?? ""))
                .font(Spread.footnote).foregroundStyle(LifePalette.secondary)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: Spread.space1), count: 5), spacing: 6) {
                ForEach(PalettePanel.categories, id: \.id) { item in
                    let selected = draft.category == item.id
                    Button { drafts[index].category = item.id } label: {
                        RoleBadge(category: item.id, color: PalettePanel.categoryColors[item.id] ?? Spread.roleFallbackHex, size: 36)
                            .frame(width: Spread.minimumTarget, height: Spread.minimumTarget)
                            .overlay(RoundedRectangle(cornerRadius: Spread.radiusControl, style: .continuous).strokeBorder(LifePalette.ink, lineWidth: selected ? 2 : 0).frame(width: Spread.minimumTarget, height: Spread.minimumTarget))
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
        .spreadCard(edge: draft.category == nil ? nil : tint, active: draft.category != nil, usesLifePalette: true)
    }

    private func addQuickStart(name: String, category: String) {
        guard !saving, !drafts.contains(where: { $0.category == category }) else { return }
        if let index = emptyDraftIndex {
            drafts[index].name = name
            drafts[index].category = category
        } else if drafts.count < 5 {
            drafts.append(Draft(id: nextId, name: name, category: category))
            nextId += 1
        }
    }

    private func save() {
        let rows = drafts.filter { !$0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        guard !saving, !rows.isEmpty else { return }
        saving = true
        saveFailure = nil
        Task {
            let profile = planner.state?.envelope.profileId
            for row in rows {
                let ok: Bool
                if let pendingWrite, pendingWrite.rowID == row.id,
                   planner.snapshot?.roles.contains(where: { $0.id == pendingWrite.roleID }) == true {
                    // The bridge already created this role in memory. Retry its storage write.
                    if planner.saveFailure == nil { ok = true }
                    else { ok = await planner.send(["type": "retrySave"]) }
                } else {
                    if pendingWrite?.rowID == row.id { pendingWrite = nil }
                    let before = Set(planner.snapshot?.roles.map(\.id) ?? [])
                    ok = await planner.send([
                        "type": "addRole",
                        "name": row.name.trimmingCharacters(in: .whitespacesAndNewlines),
                        "hours": row.hours,
                        "category": row.category ?? "custom",
                    ])
                    if !ok, planner.state?.envelope.profileId == profile, planner.saveFailure != nil,
                       let created = planner.snapshot?.roles.first(where: { !before.contains($0.id) }) {
                        pendingWrite = (row.id, created.id)
                    }
                }
                guard planner.state?.envelope.profileId == profile else { saving = false; return }
                if ok {
                    // A saved row leaves the form, so a retry never adds it twice.
                    drafts.removeAll { $0.id == row.id }
                    if pendingWrite?.rowID == row.id { pendingWrite = nil }
                } else {
                    // Stay open with every unsaved entry. The store's message is shown here, not behind the sheet.
                    saveFailure = planner.error ?? "Couldn't save. Your entries are still here."
                    planner.error = nil
                    break
                }
            }
            saving = false
            if saveFailure == nil { dismiss() }
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
                    Section("Life area") {
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
                        Text("\(SpreadHours.text(snapshot.remainingHours(for: role.id)))h left to place this week")
                            .font(Spread.footnote).foregroundStyle(Spread.secondary)
                            .accessibilityIdentifier("bank-remaining")
                    }
                        .listRowBackground(Spread.elevated)
                    Section("Color and symbol") {
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
                        Button("Remove Life area", role: .destructive) { confirmRemoval = true }
                        .accessibilityIdentifier("delete-role-button")
                    } footer: {
                        Text("The hours and tasks for this Life area leave every week.")
                    }
                        .listRowBackground(Spread.elevated)
                }
                    .spreadListSurface()
                .navigationTitle("Life area")
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
                ContentUnavailableView("This Life area is no longer in the plan.", systemImage: "square.stack")
                    .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .confirmationDialog("Remove \(role?.name ?? "this Life area")?", isPresented: $confirmRemoval, titleVisibility: .visible) {
            Button("Remove Life area", role: .destructive) {
                Task {
                    if await planner.send(["type": "removeRole", "roleId": roleId]) { dismiss() }
                }
            }
            .accessibilityIdentifier("confirm-delete-role")
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("The hours and tasks for this Life area leave every week.")
        }
    }

    private func rename(_ role: Responsibility) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed != role.name else { name = role.name; return }
        Task { await planner.send(["type": "renameRole", "roleId": role.id, "name": trimmed]) }
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
                        HStack(spacing: Spread.space3) {
                            Button {
                                Task { await planner.send(["type": "switchProfile", "profileId": profile.id]) }
                                dismiss()
                            } label: {
                                HStack {
                                    if active { Image(systemName: "checkmark").foregroundStyle(Spread.accent) }
                                    Spacer(minLength: 0)
                                }
                                .frame(width: Spread.minimumTarget, height: Spread.minimumTarget)
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
                                .frame(minHeight: Spread.minimumTarget)
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
                        .frame(minHeight: Spread.minimumTarget)
                        .accessibilityIdentifier("new-profile-field")
                    Button { create() } label: {
                        Text("Create profile").lineLimit(3)
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, minHeight: Spread.minimumTarget, alignment: .leading)
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
    let replayFirstWeek: () -> Void
    @Binding var appearance: SpreadAppearance

    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var showRecentlyDeleted = false
    @State private var showWhatsNew = false
    @State private var showReminders = false
    @State private var showFocusTimer = false
    private struct WeekReview: Identifiable {
        let snapshot: PlannerSnapshot
        var id: String { snapshot.weekKey }
    }

    @State private var weekReview: WeekReview?
    @State private var openAheadAfterReview = false
    @State private var showWeekAhead = false
    @State private var showJourney = false
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
            .foregroundStyle(LifePalette.secondary)
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
                    .frame(minHeight: 26)
                Text(title)
                    .font(.system(.caption, weight: .semibold))
                    .foregroundStyle(LifePalette.ink)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity)
            }
            .frame(maxWidth: .infinity, minHeight: 78)
            .padding(.horizontal, 5)
            .background(RoundedRectangle(cornerRadius: Spread.radiusRow, style: .continuous).fill(LifePalette.surface))
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
        SpreadSheetStack(canvas: LifePalette.canvas) {
            GeometryReader { geometry in
                // Three columns on regular phones. Two columns only when a scene
                // really narrows or Dynamic Type needs more space.
                let count = typeSize.isAccessibilitySize || geometry.size.width < 330 ? 2 : 3
                let columns = Array(repeating: GridItem(.flexible(), spacing: Spread.space2), count: count)

                ScrollView {
                    VStack(alignment: .leading, spacing: Spread.space3) {
                        VStack(alignment: .leading, spacing: 6) {
                            sectionLabel("Planning and reflection")
                            LazyVGrid(columns: columns, spacing: Spread.space2) {
                                tile("Week in Review", symbol: "calendar.badge.checkmark",
                                     id: "more-week-in-review") {
                                    guard let snapshot = planner.snapshot else { return }
                                    weekReview = WeekReview(snapshot: snapshot)
                                }
                                tile("Week Ahead", symbol: "calendar.badge.clock",
                                     id: "more-week-ahead") { showWeekAhead = true }
                                tile("Your Journey", symbol: "chart.line.uptrend.xyaxis",
                                     id: "more-your-journey") { showJourney = true }
                            }
                        }
                        VStack(alignment: .leading, spacing: 6) {
                            sectionLabel("Appearance")
                            appearanceLayout {
                                ForEach(SpreadAppearance.allCases) { item in
                                    Button { appearance = item } label: {
                                        Text(item.title)
                                            .font(.system(.subheadline, weight: .semibold))
                                            .lineLimit(1)
                                            .frame(maxWidth: .infinity, minHeight: Spread.minimumTarget)
                                            .spreadChip(selected: appearance == item, usesLifePalette: true)
                                    }
                                    .buttonStyle(.spreadPress)
                                    .accessibilityAddTraits(appearance == item ? .isSelected : [])
                                    .accessibilityIdentifier("appearance-" + item.rawValue)
                                }
                            }
                            .padding(6)
                            .background(RoundedRectangle(cornerRadius: Spread.radiusRow).fill(LifePalette.surface))
                            .accessibilityElement(children: .contain)
                            .accessibilityIdentifier("appearance-picker")
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            sectionLabel("Focus and reminders")
                            Button { showFocusTimer = true } label: {
                                Label { Text("Focus timer") } icon: { SpreadIcon(name: "lucide-timer", size: 18) }
                                    .font(.subheadline.weight(.semibold))
                                    .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                                    .padding(.horizontal, Spread.space3)
                                    .background(LifePalette.surface, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
                            }
                            .buttonStyle(.spreadPress)
                            .accessibilityIdentifier("more-focus-timer")
                            Button { showReminders = true } label: {
                                Label { Text("Daily planning reminder") } icon: { SpreadIcon(name: "lucide-bell", size: 18) }
                                    .font(.subheadline.weight(.semibold))
                                    .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                                    .padding(.horizontal, Spread.space3)
                                    .background(LifePalette.surface, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
                            }
                            .buttonStyle(.spreadPress)
                            .accessibilityIdentifier("spread-reminder-settings")
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            sectionLabel("Widgets")
                            Toggle("Show Today and Focus timer on widgets", isOn: $todayWidgetsEnabled)
                                .font(.subheadline.weight(.semibold))
                                .padding(.horizontal, Spread.space3)
                                .frame(minHeight: 48)
                                .background(LifePalette.surface, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
                                .accessibilityIdentifier("today-widget-enabled")
                            Text("Turns on the Today and Focus timer widgets. Only task counts, hours placed today and a running focus timer are shared on this device. No task names or accounts.")
                                .font(.footnote)
                                .foregroundStyle(LifePalette.secondary)
                            Toggle("Show Life cards on widgets", isOn: $lifeCardsWidgetsEnabled)
                                .font(.subheadline.weight(.semibold))
                                .padding(.horizontal, Spread.space3)
                                .frame(minHeight: 48)
                                .background(LifePalette.surface, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
                                .accessibilityIdentifier("life-cards-widget-enabled")
                            Text("Life area names, colors and this week's hours appear on your Home Screen. Anyone who can see it can see them. Stays on this device.")
                                .font(.footnote)
                                .foregroundStyle(LifePalette.secondary)
                        }
                        VStack(alignment: .leading, spacing: 6) {
                            sectionLabel("Profiles")
                            HStack(spacing: 10) {
                                Image(systemName: "person.crop.circle")
                                    .foregroundStyle(LifePalette.secondary)
                                    .accessibilityHidden(true)
                                Text(activeProfileName)
                                    .font(.system(.subheadline, weight: .semibold))
                                    .foregroundStyle(LifePalette.ink)
                                    .lineLimit(1)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                Button { showProfiles() } label: {
                                    Text("Manage")
                                        .font(.system(.subheadline, weight: .semibold))
                                        .frame(minWidth: 64, minHeight: Spread.minimumTarget)
                                        .contentShape(Rectangle())
                                }
                                .buttonStyle(.spreadPress)
                                .accessibilityLabel("Manage profiles")
                                    .accessibilityIdentifier("manage-profiles")
                            }
                            .padding(.horizontal, Spread.space3)
                            .frame(minHeight: 48)
                            .background(RoundedRectangle(cornerRadius: Spread.radiusRow).fill(LifePalette.surface))
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            sectionLabel("Share this week")
                            LazyVGrid(columns: columns, spacing: Spread.space2) {
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
                            HStack(spacing: Spread.space2) {
                                Button {
                                    backup()
                                } label: {
                                    Label { Text("Backup and restore") } icon: { SpreadIcon(name: "icon-backup", size: 18) }
                                        .font(.system(.subheadline, weight: .semibold))
                                        .foregroundStyle(LifePalette.ink)
                                        .lineLimit(2)
                                        .frame(maxWidth: .infinity, minHeight: 48)
                                        .padding(.horizontal, Spread.space2)
                                        .background(RoundedRectangle(cornerRadius: Spread.radiusRow).fill(LifePalette.surface))
                                }
                                .buttonStyle(.spreadPress)
                                .accessibilityIdentifier("backup-and-restore")
                                Button { showRecentlyDeleted = true } label: {
                                    Label { Text("Recently Deleted") } icon: { SpreadIcon(name: "icon-trash", size: 18) }
                                        .font(.system(.subheadline, weight: .semibold))
                                        .foregroundStyle(LifePalette.ink)
                                        .lineLimit(2)
                                        .frame(maxWidth: .infinity, minHeight: 48)
                                        .padding(.horizontal, Spread.space2)
                                        .background(RoundedRectangle(cornerRadius: Spread.radiusRow).fill(LifePalette.surface))
                                }
                                .buttonStyle(.spreadPress)
                                .accessibilityIdentifier("more-recently-deleted")
                            }
                        }
                        VStack(alignment: .leading, spacing: 6) {
                            sectionLabel("About Spread")
                            Button(action: replayFirstWeek) {
                                Label("First week guide", systemImage: "questionmark.circle")
                                    .font(.subheadline.weight(.semibold))
                                    .frame(maxWidth: .infinity, minHeight: Spread.minimumTarget, alignment: .leading)
                                    .padding(.horizontal, 14)
                                    .background(LifePalette.surface, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
                            }
                            .buttonStyle(.spreadPress)
                            .accessibilityIdentifier("more-first-week-guide")
                            Button {
                                showWhatsNew = true
                            } label: {
                                HStack(spacing: Spread.space3) {
                                    Image(systemName: "sparkles")
                                        .font(.title3)
                                        .foregroundStyle(Spread.accent)
                                        .frame(minWidth: 32)
                                        .accessibilityHidden(true)
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text("What's New")
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundStyle(LifePalette.ink)
                                        Text("Version " + SpreadReleaseNotes.appVersion)
                                            .font(.caption)
                                            .foregroundStyle(LifePalette.secondary)
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
                                        .foregroundStyle(LifePalette.secondary)
                                        .accessibilityHidden(true)
                                }
                                .padding(.horizontal, 14)
                                .frame(maxWidth: .infinity, minHeight: 54)
                                .background(LifePalette.surface,
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
                    .padding(.horizontal, Spread.space4)
                    .padding(.top, Spread.space2)
                    .padding(.bottom, Spread.space4)
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
            .fullScreenCover(item: $weekReview, onDismiss: {
                if openAheadAfterReview {
                    openAheadAfterReview = false
                    showWeekAhead = true
                }
            }) { review in
                LifeWeekReviewSheet(snapshot: review.snapshot, onWeekAhead: {
                    openAheadAfterReview = true
                    weekReview = nil
                })
            }
            .sheet(isPresented: $showWeekAhead) {
                if planner.snapshot != nil { LifeWeekAheadSheet(planner: planner) }
            }
            .sheet(isPresented: $showJourney) {
                if let snapshot = planner.snapshot { LifeJourneySheet(snapshot: snapshot) }
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
            SpreadFocusPreferences.publishFromApp()
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
