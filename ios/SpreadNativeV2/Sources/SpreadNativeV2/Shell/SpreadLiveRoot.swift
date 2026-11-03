#if os(iOS)
import SwiftUI

/// The native planner shell. SwiftUI owns every visible pixel; the WebKit planner stays headless and is the
/// only writer (every change is an awaited intent through `LivePlanner.send`).
///
/// Hierarchy, top to bottom, follows `WeekScreen` in the pre-migration `spread-app.tsx`:
/// brand row (folds to the mark), profile chip, the metal Week Crown, the Spread/Week rail, then the surface.
/// The floating glass dock sits over the bottom edge and holds Done, the Week/Month morph, Edit, and Settings.
public struct SpreadLiveRoot: View {
    @ObservedObject var planner: LivePlanner
    let recovery: () -> Void

    @State private var destination: SpreadDestination = .spread
    @State private var monthPlane = false
    @State private var monthAnchor = PlannerDates.date(PlannerDates.currentWeekKey())
    @State private var weekDirection = 0
    @State private var layout: SpreadLayout = SpreadLayoutPreference.read()
    @State private var selectedRole: String?
    @State private var focusDay: String?
    @State private var sheet: LiveSheet?
    @State private var editing = false
    @State private var brandFolded = false
    @State private var gearTurn = false
    @State private var dismissedNotice: String?
    @State private var loadedProfile: String?

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase

    public init(planner: LivePlanner, recovery: @escaping () -> Void) {
        self.planner = planner
        self.recovery = recovery
    }

    public var body: some View {
        ZStack(alignment: .bottom) {
            Spread.canvas.ignoresSafeArea()
            if let snapshot = planner.snapshot {
                content(snapshot)
            } else {
                opening
            }
            dock
        }
        .foregroundStyle(Spread.ink)
        .tint(Spread.accent)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("native-content")
        .accessibilityValue(reduceMotion ? "reduce-motion" : "motion")
        .task { await planner.refresh() }
        .task(id: planner.undoId) {
            // The Undo notice is offered for six seconds (the store keeps its own rule for what can be undone).
            guard planner.undoId != nil else { return }
            try? await Task.sleep(nanoseconds: UInt64(SpreadUndo.seconds * 1_000_000_000))
            if !Task.isCancelled { planner.undoId = nil }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await planner.refresh() } }
        }
        .onChange(of: planner.state?.envelope.profileId) { _, profile in
            // Each profile opens where its own person left off, and nothing from the last profile carries over.
            let remembered = SpreadViewMemory.read(profileId: profile)
            destination = remembered.destination
            monthPlane = false
            selectedRole = nil
            focusDay = nil
            editing = false
            sheet = nil
            loadedProfile = profile
        }
        .onChange(of: destination) { _, _ in persistView() }
        .onChange(of: monthPlane) { _, _ in persistView() }
        .onChange(of: layout) { _, value in SpreadLayoutPreference.write(value) }
        .onChange(of: planner.snapshot?.weekKey) { _, _ in weekChanged() }
        .sheet(item: $sheet) { current in
            sheetContent(current)
        }
        .alert("Spread", isPresented: Binding(get: { planner.error != nil }, set: { if !$0 { planner.error = nil } })) {
            Button("OK") { planner.error = nil }
            Button("Retry saving") { Task { planner.error = nil; await planner.send(["type": "retrySave"]) } }
            Button("Backup and restore") { recovery() }
        } message: { Text(planner.error ?? "") }
        .sensoryFeedback(.selection, trigger: planner.snapshot?.weekKey)
        .onKeyPress(.leftArrow) { _ in keyWeek(-1) }
        .onKeyPress(.rightArrow) { _ in keyWeek(1) }
        .simultaneousGesture(TapGesture().onEnded { foldBrand() })
        .task {
            // The brand folds to its mark after a short look, as the web planner did (3.5 s or first touch).
            try? await Task.sleep(nanoseconds: 3_500_000_000)
            foldBrand()
        }
    }

    // MARK: Opening and engine state

    private var opening: some View {
        VStack(spacing: 16) {
            ProgressView("Opening your plan…")
            Button { Task { await planner.refresh() } } label: { Text("Try again").tapTarget() }
            Button { recovery() } label: { Text("Open existing planner").tapTarget() }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: Main content

    private func content(_ snapshot: PlannerSnapshot) -> some View {
        let isMonth = destination == .week && monthPlane
        return VStack(spacing: 0) {
            // The header is sticky, as the web header was: it stays put while the surface scrolls under it.
            header(snapshot, isMonth: isMonth)
            ScrollViewReader { proxy in
            ScrollView {
            VStack(spacing: 0) {
                notices
                    .padding(.horizontal, 16)
                if snapshot.roles.isEmpty {
                    emptyPlan
                } else if destination == .week {
                    if isMonth {
                        MonthSurface(planner: planner, snapshot: snapshot, anchor: monthAnchor, onPick: pickDay)
                            .transition(.opacity)
                    } else {
                        WeekSurface(
                            planner: planner,
                            snapshot: snapshot,
                            selectedRole: $selectedRole,
                            focusDay: $focusDay,
                            direction: weekDirection,
                            onOpenRole: { sheet = .role($0) },
                            onOpenTask: { sheet = .task($0, $1) },
                            onReview: { sheet = .review }
                        )
                        .transition(.opacity)
                    }
                } else {
                    SpreadSurface(
                        planner: planner,
                        snapshot: snapshot,
                        layout: $layout,
                        editing: editing,
                        selectedRole: $selectedRole,
                        onOpenRole: { sheet = .role($0) },
                        onOpenTask: { sheet = .task($0, $1) },
                        onNewRole: { sheet = .newRole },
                        onRollover: { Task { await rollover() } },
                        onReview: { sheet = .review }
                    )
                    .transition(.opacity)
                }
                Color.clear.frame(height: 120) // room for the floating dock
            }
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: focusDay) { _, day in
                // Picking a day in Month scrolls its card into view, once.
                guard let day else { return }
                withAnimation(reduceMotion ? nil : SpreadMotion.curve) { proxy.scrollTo(day, anchor: .top) }
                focusDay = nil
            }
            }
        }
    }

    private var emptyPlan: some View {
        ContentUnavailableView {
            Label("Make room for what matters", systemImage: "square.stack")
        } description: {
            Text("Name a responsibility, give it hours, then place those hours in your week.")
        } actions: {
            Button { sheet = .newRole } label: { Text("Create responsibility").tapTarget() }
                .buttonStyle(.borderedProminent)
        }
        .padding(.top, 32)
    }

    // MARK: Header

    private func header(_ snapshot: PlannerSnapshot, isMonth: Bool) -> some View {
        let isCurrent = snapshot.weekKey == PlannerDates.currentWeekKey()
        let now = Date()
        let onThisMonth = Calendar.current.isDate(monthAnchor, equalTo: now, toGranularity: .month)
        let range = PlannerDates.weekRange(base: snapshot.weekKey, offset: 0)
        // The readout's title, detail, and the tap action are chosen once here, so each stays a plain typed value.
        let title: String = isMonth ? PlannerDates.label(monthAnchor, pattern: "MMMM yyyy") : (isCurrent ? "This week" : range)
        let detail: String? = isMonth ? (onThisMonth ? nil : "Back to this month") : (isCurrent ? range : "Back to this week")
        let detailAction: (() -> Void)?
        if isMonth {
            detailAction = onThisMonth ? nil : { jumpMonth(to: now) }
        } else {
            detailAction = isCurrent ? nil : { Task { await moveToToday() } }
        }
        let move: (Int) -> Void = { delta in
            if isMonth { changeMonth(delta) } else { goWeek(delta) }
        }
        return VStack(spacing: 12) {
            HStack(spacing: 12) {
                brandButton
                Spacer(minLength: 8)
                if planner.profiles.count > 1, let active = activeProfileName {
                    Button { sheet = .more } label: {
                        Text(active).font(.system(size: 15)).lineLimit(1)
                            .padding(.horizontal, 12).frame(maxWidth: 200, minHeight: 44)
                            .background(Spread.fill, in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(active), profiles")
                    .accessibilityIdentifier("active-profile-name")
                }
            }
            WeekCrownView(title: title, detail: detail, onDetail: detailAction, onMove: move)
            destinationRail
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 4)
        .background(Spread.canvas.opacity(0.92))
    }

    private var activeProfileName: String? {
        planner.profiles.first(where: { $0.id == planner.state?.envelope.profileId })?.name
    }

    /// The brand row. The word folds into the mark after its first look; the mark stays and returns home.
    private var brandButton: some View {
        Button { goHome() } label: {
            HStack(spacing: 10) {
                SpreadBrandMark(size: 34)
                if !brandFolded {
                    Text("Spread")
                        .font(.system(size: 15, weight: .semibold))
                        .tracking(-0.45)
                        .transition(.opacity.combined(with: .move(edge: .leading)))
                }
            }
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Spread, home")
        .accessibilityIdentifier("brand-home")
    }

    /// The Spread/Week destination rail. Month is a mode inside Week, so this rail has two segments only.
    private var destinationRail: some View {
        HStack(spacing: 2) {
            ForEach(SpreadDestination.allCases) { item in
                let selected = destination == item
                Button {
                    guard destination != item else { return }
                    if item == .spread { monthPlane = false }
                    editing = false
                    withAnimation(reduceMotion ? nil : SpreadMotion.curve) { destination = item }
                } label: {
                    HStack(spacing: 6) {
                        SpreadIcon(name: item.iconName, size: 22)
                            .foregroundStyle(selected ? Spread.accent : Spread.secondary)
                        if !brandFolded {
                            Text(item.label)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(selected ? Spread.ink : Spread.secondary)
                        }
                    }
                    .padding(.horizontal, 16)
                    .frame(minHeight: 44)
                    .background(selected ? Spread.segment : Color.clear, in: Capsule())
                    .shadow(color: selected ? Spread.shadow.opacity(0.6) : .clear, radius: 2, y: 1)
                    .contentShape(Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(item.label)
                .accessibilityAddTraits(selected ? .isSelected : [])
                .accessibilityIdentifier(item == .week ? "native-week" : "native-spread")
            }
        }
        .padding(4)
        .background(Spread.fill, in: Capsule())
        .frame(maxWidth: .infinity)
    }

    // MARK: Notices

    @ViewBuilder private var notices: some View {
        if let notice = planner.recoveryNotice, dismissedNotice != notice {
            VStack(alignment: .leading, spacing: 8) {
                Label(notice, systemImage: "exclamationmark.shield").foregroundStyle(Spread.caution)
                HStack {
                    Button { recovery() } label: { Text("Backup and restore").tapTarget() }
                    Button { dismissedNotice = notice } label: { Text("Got it").tapTarget() }
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
            .padding(.top, 8)
        }
        if let failure = planner.saveFailure {
            VStack(alignment: .leading, spacing: 8) {
                Label(failure == "newer" ? "Update Spread to edit this plan" : "Changes are not saved on this device",
                      systemImage: "exclamationmark.triangle")
                    .font(.headline).foregroundStyle(Spread.danger)
                HStack {
                    if failure != "newer" {
                        Button { Task { planner.error = nil; await planner.send(["type": "retrySave"]) } } label: { Text("Retry saving").tapTarget() }
                            .accessibilityIdentifier("retry-saving")
                    }
                    Button { recovery() } label: { Text("Back up").tapTarget() }
                        .accessibilityIdentifier("back-up")
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
            .padding(.top, 8)
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier("save-failure-banner")
        }
    }

    // MARK: Dock

    private var dock: some View {
        VStack(spacing: 8) {
            if let undo = planner.undoId {
                undoNotice(undo)
            }
            HStack(spacing: 0) {
                if destination == .week && !monthPlane && selectedRole != nil {
                    Button { selectedRole = nil } label: {
                        Text("Done").font(.system(size: 15, weight: .semibold)).foregroundStyle(Spread.onAccent)
                            .padding(.horizontal, 20).frame(minHeight: 44)
                            .background(Spread.accent, in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .padding(.trailing, 4)
                    dockDivider
                }
                if destination == .week {
                    Button {
                        if monthPlane { closeMonth() } else { openMonth() }
                    } label: {
                        ViewMorphIcon(boxes: !monthPlane, size: 24).frame(width: 44, height: 44).contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(monthPlane ? "Week" : "Month")
                    .accessibilityIdentifier("week-month-toggle")
                    .accessibilityValue(monthPlane ? "Month" : "Week")
                    dockDivider
                }
                if destination == .spread {
                    if editing {
                        Button { editing = false } label: {
                            Text("Done").font(.system(size: 15, weight: .semibold)).foregroundStyle(Spread.onAccent)
                                .padding(.horizontal, 20).frame(minHeight: 44)
                                .background(Spread.accent, in: Capsule())
                        }
                        .buttonStyle(.plain)
                    } else {
                        Button { editing = true } label: {
                            HStack(spacing: 6) {
                                SpreadIcon(name: "icon-edit", size: 22)
                                Text("Edit").font(.system(size: 15, weight: .semibold))
                            }
                            .foregroundStyle(Spread.accent)
                            .padding(.horizontal, 14).frame(minHeight: 44)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("edit-spreads")
                    }
                }
                if !(destination == .spread && editing) {
                    Button { openSettingsFromDock() } label: {
                        SettingsGears(turn: gearTurn, size: 30).frame(width: 44, height: 44).contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Settings")
                    .accessibilityIdentifier("open-more")
                }
            }
            .padding(6)
            .background(.ultraThinMaterial, in: Capsule())
            .background(Spread.glass, in: Capsule())
            .overlay(Capsule().stroke(Spread.glassStroke, lineWidth: 0.5))
            .shadow(color: Spread.shadow, radius: 12, y: 6)
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
    }

    private var dockDivider: some View {
        Rectangle().fill(Spread.glassLine).frame(width: 1, height: 24).padding(.horizontal, 4)
    }

    /// Quiet Undo: one line, the last change, dismissed after six seconds.
    private func undoNotice(_ editId: String) -> some View {
        Button { Task { await planner.send(["type": "undo", "editId": editId]) } } label: {
            Text("Undo last change")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Spread.accent)
                .padding(.horizontal, 18).frame(minHeight: 44)
                .background(Spread.elevated, in: Capsule())
                .shadow(color: Spread.shadow, radius: 8, y: 3)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("undo-last-change")
    }

    // MARK: Navigation intents

    private func persistView() {
        SpreadViewMemory.write(.init(destination: destination, monthPlane: monthPlane), profileId: planner.state?.envelope.profileId)
    }

    private func weekChanged() {
        if editing { editing = false }
    }

    private func goHome() {
        editing = false
        selectedRole = nil
        monthPlane = false
        withAnimation(reduceMotion ? nil : SpreadMotion.curve) { destination = .spread }
    }

    private func goWeek(_ delta: Int) {
        weekDirection = delta
        Task { await planner.send(["type": "changeWeek", "direction": delta]) }
    }

    private func moveToToday() async {
        weekDirection = 0
        await planner.send(["type": "changeWeek", "direction": "today"])
    }

    private func keyWeek(_ delta: Int) -> KeyPress.Result {
        guard sheet == nil else { return .ignored }
        if destination == .week && monthPlane { changeMonth(delta) } else if destination == .week { goWeek(delta) } else { return .ignored }
        return .handled
    }

    private func changeMonth(_ delta: Int) {
        monthAnchor = Calendar.current.date(byAdding: .month, value: delta, to: monthAnchor) ?? monthAnchor
    }

    private func jumpMonth(to date: Date) {
        monthAnchor = PlannerDates.calendar.date(from: PlannerDates.calendar.dateComponents([.year, .month], from: date)) ?? date
    }

    private func openMonth() {
        if let snapshot = planner.snapshot {
            monthAnchor = PlannerDates.calendar.date(from: PlannerDates.calendar.dateComponents([.year, .month], from: PlannerDates.date(snapshot.weekKey))) ?? monthAnchor
        }
        withAnimation(reduceMotion ? nil : SpreadMotion.morph) { monthPlane = true }
    }

    private func closeMonth() {
        withAnimation(reduceMotion ? nil : SpreadMotion.morph) { monthPlane = false }
    }

    /// Choosing a day opens its week and returns to the Week surface, as the React month did.
    private func pickDay(_ iso: String) {
        Task {
            let monday = PlannerDates.weekKey(for: PlannerDates.date(iso))
            if await planner.send(["type": "openWeek", "weekKey": monday]) {
                focusDay = iso
                withAnimation(reduceMotion ? nil : SpreadMotion.morph) { monthPlane = false }
            }
        }
    }

    private func rollover() async {
        _ = await planner.send(["type": "rollover", "force": false])
        if planner.rolloverOutcome == "confirm" { sheet = .confirmRollover }
    }

    private func openSettingsFromDock() {
        gearTurn = false
        Task {
            gearTurn = true
            try? await Task.sleep(nanoseconds: 380_000_000)
            gearTurn = false
        }
        sheet = .more
    }

    private func foldBrand() {
        guard !brandFolded else { return }
        withAnimation(reduceMotion ? nil : .timingCurve(0.32, 0.72, 0, 1, duration: 0.78)) { brandFolded = true }
    }

    // MARK: Sheets

    @ViewBuilder private func sheetContent(_ current: LiveSheet) -> some View {
        switch current {
        case .newRole:
            NewSpreadSheet(planner: planner)
        case .role(let roleId):
            RoleSheet(planner: planner, roleId: roleId, onOpenTask: { sheet = .task(roleId, $0) })
        case .task(let roleId, let taskId):
            TaskSheet(planner: planner, roleId: roleId, taskId: taskId)
        case .review:
            CarryOverSheet(planner: planner)
        case .more:
            MoreSheet(planner: planner, recovery: recovery, showProfiles: { sheet = .profiles }, layout: $layout)
        case .profiles:
            ProfilesSheet(planner: planner)
        case .confirmRollover:
            RolloverConfirm(planner: planner)
        case .confirmDeleteRole(let roleId):
            RoleDeleteConfirm(planner: planner, roleId: roleId)
        }
    }
}

// Sheet-level confirmation for "replace next week" (rollover) and role deletion. Kept as small sheets so
// they inherit the same presentation, grabber, and dismissal as every other sheet.
private struct RolloverConfirm: View {
    @ObservedObject var planner: LivePlanner
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 16) {
            Text("Replace next week?").font(Spread.sheetTitle)
            Text("Next week already has tasks or days. Rollover will replace that week. This week stays as it is.")
                .font(Spread.callout).foregroundStyle(Spread.secondary).multilineTextAlignment(.center)
            Button("Replace") {
                Task {
                    _ = await planner.send(["type": "rollover", "force": true])
                    dismiss()
                }
            }
            .buttonStyle(.borderedProminent).tint(Spread.danger)
            .frame(minHeight: 44)
            Button("Cancel") { dismiss() }.frame(minHeight: 44)
        }
        .padding(24)
        .presentationDetents([.medium])
    }
}

private struct RoleDeleteConfirm: View {
    @ObservedObject var planner: LivePlanner
    let roleId: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 16) {
            Text("Remove \(planner.snapshot?.roles.first { $0.id == roleId }?.name ?? "this spread")?").font(Spread.sheetTitle)
            Text("The hours and tasks for this spread leave every week.").font(Spread.callout).foregroundStyle(Spread.secondary)
            Button("Remove", role: .destructive) {
                Task {
                    _ = await planner.send(["type": "removeRole", "roleId": roleId])
                    dismiss()
                }
            }
            .accessibilityIdentifier("confirm-delete-role")
            .frame(minHeight: 44)
            Button("Cancel") { dismiss() }.frame(minHeight: 44)
        }
        .padding(24)
        .presentationDetents([.medium])
    }
}
#endif
