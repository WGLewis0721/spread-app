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
    @State private var appearance: SpreadAppearance = SpreadAppearancePreference.read()
    @State private var selectedRole: String?
    @State private var focusDay: String?
    @State private var sheet: LiveSheet?
    @State private var editing = false
    @State private var gearTurn = false
    @State private var dismissedNotice: String?
    @State private var loadedProfile: String?
    /// Counts week moves the store has acknowledged. The selection haptic listens to it, so it never fires at launch.
    @State private var weekTick = 0

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dynamicTypeSize) private var typeSize

    public init(planner: LivePlanner, recovery: @escaping () -> Void) {
        self.planner = planner
        self.recovery = recovery
    }

    // The body is split into three short layers. One long modifier chain with closures in it exceeds the Swift
    // type-checker's budget ("unable to type-check this expression in reasonable time").
    public var body: some View { presented }

    /// The planner layers and the standing accessibility identity.
    private var layers: some View {
        ZStack {
            Spread.canvas.ignoresSafeArea()
            VStack(spacing: 0) {
                if let snapshot = planner.snapshot {
                    content(snapshot)
                } else {
                    opening
                }
                dock
            }
        }
        .foregroundStyle(Spread.ink)
        .tint(Spread.accent)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("native-content")
        .modifier(PlannerAccessibilityState())
    }

    /// Everything that reacts to the planner or the system: refresh, the Undo window, profile and view memory.
    private var observed: some View {
        layers
            .task { await planner.refresh() }
            .task(id: planner.undoId) { await expireUndo() }
            .onChange(of: scenePhase) { _, phase in refreshWhenActive(phase) }
            .onChange(of: planner.state?.envelope.profileId) { _, profile in openProfile(profile) }
            .onChange(of: destination) { _, _ in persistView() }
            .onChange(of: monthPlane) { _, _ in persistView() }
            .onChange(of: layout) { _, value in SpreadLayoutPreference.write(value) }
            .onChange(of: appearance) { _, value in SpreadAppearancePreference.write(value) }
            .onChange(of: planner.snapshot?.weekKey) { _, _ in weekChanged() }
    }

    /// Sheets, the error alert, the week tick and the keyboard/first-touch hooks.
    private var presented: some View {
        observed
            .preferredColorScheme(appearance.scheme)
            .sheet(item: $sheet) { current in sheetContent(current) }
            .alert("Spread", isPresented: errorShown) { errorActions } message: { Text(planner.error ?? "") }
            // A light tick for an accepted week change only: not at launch, and not when a profile opens on its own week.
            .sensoryFeedback(.selection, trigger: weekTick)
            .onKeyPress(.leftArrow) { keyWeek(-1) }
            .onKeyPress(.rightArrow) { keyWeek(1) }
    }

    private var errorShown: Binding<Bool> {
        Binding(get: { planner.error != nil }, set: { if !$0 { planner.error = nil } })
    }

    @ViewBuilder private var errorActions: some View {
        Button("OK") { planner.error = nil }
        if planner.errorOffersRetry {
            Button("Retry saving") { Task { planner.error = nil; await planner.send(["type": "retrySave"]) } }
        }
        if planner.errorOffersBackup {
            Button("Backup and restore") { recovery() }
        }
    }

    /// The Undo notice is offered for six seconds (the store keeps its own rule for what can be undone).
    private func expireUndo() async {
        guard planner.undoId != nil else { return }
        try? await Task.sleep(nanoseconds: UInt64(SpreadUndo.seconds * 1_000_000_000))
        if !Task.isCancelled { planner.undoId = nil }
    }

    private func refreshWhenActive(_ phase: ScenePhase) {
        if phase == .active { Task { await planner.refresh() } }
    }

    /// Each profile opens where its own person left off, and nothing from the last profile carries over.
    private func openProfile(_ profile: String?) {
        let remembered = SpreadViewMemory.read(profileId: profile)
        destination = remembered.destination
        monthPlane = remembered.monthPlane
        selectedRole = nil
        focusDay = nil
        editing = false
        sheet = nil
        loadedProfile = profile
    }

    // MARK: Opening and engine state

    private var opening: some View {
        VStack(spacing: 16) {
            SpreadBrandMark(size: 56)
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
                            onReview: { sheet = .review },
                            onSwipeWeek: { goWeek($0) }
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
                    .id(planner.state?.envelope.profileId)
                    .transition(.opacity)
                }
                Color.clear.frame(height: 16)
            }
            // iPhone keeps a 640 pt reading column; iPad (regular width) opens up so it is not a narrow strip.
            .frame(maxWidth: destination == .spread ? 720 : 1120)
            .frame(maxWidth: .infinity)
            // Without this the week's slide transition never plays: a changed week would just swap in place.
            .animation(reduceMotion ? nil : SpreadMotion.weekSlide, value: snapshot.weekKey)
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

    /// An illustrated empty state: the notebook drawing, one sentence, one lit action.
    private var emptyPlan: some View {
        VStack(spacing: 14) {
            ChalkIllustration(category: "custom", maxWidth: 230, maxHeight: 160)
            Text("Make room for what matters")
                .font(.system(.title2, weight: .bold)).multilineTextAlignment(.center)
            Text("Name a responsibility, give it hours, then place those hours in your week.")
                .font(.system(.subheadline)).foregroundStyle(Spread.secondary).multilineTextAlignment(.center)
            Button { sheet = .newRole } label: {
                Text("Create responsibility")
                    .font(.system(.headline, weight: .semibold)).foregroundStyle(Spread.onAccent)
                    .padding(.horizontal, 28).frame(minHeight: 50)
                    .background(Capsule().fill(Spread.accentGradient))
            }
            .buttonStyle(.spreadPress)
            .padding(.top, 6)
            .accessibilityIdentifier("create-first-spread")
        }
        .padding(.horizontal, 32)
        .padding(.top, 28)
        .frame(maxWidth: .infinity)
    }

    // MARK: Header

    /// Compact and stable: the brand and the one Spread/Week switch share a row, the metal Crown sits below, and
    /// nothing in here changes size after launch. When large text no longer fits one row, the switch drops below.
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
        return VStack(spacing: 10) {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 12) {
                    brandButton
                    Spacer(minLength: 8)
                    destinationRail
                }
                VStack(spacing: 8) {
                    HStack { brandButton; Spacer(minLength: 0) }
                    destinationRail
                }
            }
            WeekCrownView(title: title, detail: detail, onDetail: detailAction, onMove: move)
        }
        .padding(.horizontal, 16)
        .padding(.top, 6)
        .padding(.bottom, 6)
        .background(reduceTransparency ? Spread.canvas : Spread.canvas.opacity(0.94))
    }

    private var activeProfileName: String? {
        planner.profiles.first(where: { $0.id == planner.state?.envelope.profileId })?.name
    }

    /// The brand: the folded-card blue icon and "Spread" in the system face. With more than one profile the open
    /// profile's name sits under it, and the whole block returns home. It is the same on every screen.
    private var brandButton: some View {
        Button { goHome() } label: {
            HStack(spacing: 10) {
                SpreadBrandMark(size: 36)
                VStack(alignment: .leading, spacing: 0) {
                    Text("Spread")
                        .font(.system(.headline, weight: .semibold))
                        .foregroundStyle(Spread.ink)
                    if planner.profiles.count > 1, let active = activeProfileName {
                        Text(active)
                            .font(.system(.caption))
                            .foregroundStyle(Spread.secondary)
                            .lineLimit(typeSize.isAccessibilitySize ? nil : 2)
                            .frame(maxWidth: 160, alignment: .leading)
                            .fixedSize(horizontal: false, vertical: true)
                            .accessibilityIdentifier("active-profile-name")
                    }
                }
            }
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.spreadPress)
        .accessibilityLabel(planner.profiles.count > 1 ? "Spread, home. Profile \(activeProfileName ?? "")" : "Spread, home")
        .accessibilityIdentifier("brand-home")
    }

    /// The Spread/Week switch: a recessed trough with one lit segment. Month is a mode inside Week, so there are
    /// two segments only, and both always show their label (an icon alone is not a destination).
    private var destinationRail: some View {
        let arrangement = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(spacing: 2)) : AnyLayout(HStackLayout(spacing: 2))
        return arrangement {
            ForEach(SpreadDestination.allCases) { item in
                let selected = destination == item
                Button {
                    guard destination != item else { return }
                    if item == .spread { monthPlane = false }
                    editing = false
                    withAnimation(reduceMotion ? nil : SpreadMotion.curve) { destination = item }
                } label: {
                    HStack(spacing: 6) {
                        SpreadIcon(name: item.iconName, size: 20)
                        Text(item.label).font(.system(.subheadline, weight: .semibold))
                    }
                    .foregroundStyle(selected ? Spread.onAccent : Spread.secondary)
                    .padding(.horizontal, 14)
                    .frame(minHeight: 44)
                    .background {
                        if selected { Capsule().fill(Spread.accentGradient) }
                    }
                    .contentShape(Capsule())
                }
                .buttonStyle(.spreadPress)
                .accessibilityLabel(item.label)
                .accessibilityAddTraits(selected ? .isSelected : [])
                .accessibilityIdentifier(item == .week ? "native-week" : "native-spread")
            }
        }
        .padding(3)
        .background(Capsule().fill(Spread.inset))
        .overlay(Capsule().strokeBorder(Spread.line, lineWidth: 0.5))
        .fixedSize(horizontal: !typeSize.isAccessibilitySize, vertical: false)
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

    /// The floating chrome: one capsule holding Done / Edit, the Week-Month morph and Settings. It never carries a
    /// second copy of a command that is already on screen, and Done is the only lit control in it.
    private var dock: some View {
        VStack(spacing: 8) {
            if let undo = planner.undoId {
                undoNotice(undo)
            }
            HStack(spacing: 0) {
                if destination == .week && !monthPlane && selectedRole != nil {
                    doneButton { selectedRole = nil }
                        .padding(.trailing, 4)
                    dockDivider
                }
                if destination == .week {
                    Button {
                        if monthPlane { closeMonth() } else { openMonth() }
                    } label: {
                        ViewMorphIcon(boxes: !monthPlane, size: 24).frame(width: 44, height: 44).contentShape(Rectangle())
                    }
                    .buttonStyle(.spreadPress)
                    .accessibilityLabel(monthPlane ? "Week" : "Month")
                    .accessibilityIdentifier("week-month-toggle")
                    .accessibilityValue(monthPlane ? "Month" : "Week")
                    dockDivider
                }
                if destination == .spread {
                    if editing {
                        doneButton { editing = false }
                    } else {
                        Button { editing = true } label: {
                            HStack(spacing: 6) {
                                SpreadIcon(name: "icon-edit", size: 22)
                                Text("Edit").font(.system(.subheadline, weight: .semibold))
                            }
                            .foregroundStyle(Spread.accent)
                            .padding(.horizontal, 14).frame(minHeight: 44)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.spreadPress)
                        .accessibilityIdentifier("edit-spreads")
                    }
                }
                if !(destination == .spread && editing) {
                    Button { openSettingsFromDock() } label: {
                        SettingsGears(turn: gearTurn, size: 30).frame(width: 44, height: 44).contentShape(Rectangle())
                    }
                    .buttonStyle(.spreadPress)
                    .accessibilityLabel("Settings")
                    .accessibilityIdentifier("open-more")
                }
            }
            .padding(6)
            .background {
                // Reduce Transparency means opaque surfaces: the dock drops its material for the plain elevated surface.
                if reduceTransparency {
                    Capsule().fill(Spread.elevated)
                } else {
                    Capsule().fill(.ultraThinMaterial)
                    Capsule().fill(Spread.glass)
                }
            }
            .overlay(Capsule().strokeBorder(Spread.glassStroke, lineWidth: reduceTransparency ? 1 : 0.5))
            .shadow(color: Spread.shadow, radius: 14, y: 6)
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
    }

    /// The one lit control in the dock.
    private func doneButton(_ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text("Done").font(.system(.subheadline, weight: .semibold)).foregroundStyle(Spread.onAccent)
                .padding(.horizontal, 20).frame(minHeight: 44)
                .background(Capsule().fill(Spread.accentGradient))
        }
        .buttonStyle(.spreadPress)
        .accessibilityIdentifier("dock-done")
    }

    private var dockDivider: some View {
        Rectangle().fill(Spread.glassLine).frame(width: 1, height: 24).padding(.horizontal, 4)
    }

    /// Quiet Undo: one line, the last change, dismissed after six seconds.
    private func undoNotice(_ editId: String) -> some View {
        Button { Task { await planner.send(["type": "undo", "editId": editId]) } } label: {
            HStack(spacing: 8) {
                Image(systemName: "arrow.uturn.backward").font(.system(.footnote, weight: .bold))
                Text("Undo last change").font(.system(.subheadline, weight: .semibold))
            }
            .foregroundStyle(Spread.accent)
            .padding(.horizontal, 18).frame(minHeight: 44)
            .background(Capsule().fill(Spread.elevated))
            .overlay(Capsule().strokeBorder(Spread.line, lineWidth: 0.5))
            .shadow(color: Spread.shadow, radius: 10, y: 4)
        }
        .buttonStyle(.spreadPress)
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
        Task { if await planner.send(["type": "changeWeek", "direction": delta]) { weekTick += 1 } }
    }

    private func moveToToday() async {
        weekDirection = 0
        if await planner.send(["type": "changeWeek", "direction": "today"]) { weekTick += 1 }
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
            MoreSheet(planner: planner, recovery: recovery, showProfiles: { sheet = .profiles }, layout: $layout, appearance: $appearance)
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
        .presentationDragIndicator(.visible)
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
        .presentationDragIndicator(.visible)
    }
}
/// Reports the environment inside the appearance override, so acceptance tests verify what rendered.
private struct PlannerAccessibilityState: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorScheme) private var scheme

    func body(content: Content) -> some View {
        content.accessibilityValue("\(reduceMotion ? "reduce-motion" : "motion");\(scheme == .dark ? "dark" : "light")")
    }
}
#endif
