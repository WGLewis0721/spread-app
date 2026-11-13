#if os(iOS)
import SwiftUI

enum LifeDestination: String, CaseIterable, Identifiable {
    case life = "Life", hours = "Hours", week = "Week"
    var id: String { rawValue }
    var icon: String { self == .life ? "icon-spread-list" : self == .hours ? "icon-rollover" : "icon-week" }
}
private enum LifeLocalSheet: Identifiable {
    case manage(String), reserve(String), priority(String), addTask, help
    var id: String {
        switch self {
        case .manage(let id): return "manage-" + id
        case .reserve(let id): return "reserve-" + id
        case .priority(let id): return "priority-" + id
        case .addTask: return "add-task"
        case .help: return "help"
        }
    }
}

/// Life owns transient presentation only. Every edit is an awaited planner intent.
struct LifeRoot: View {
    @ObservedObject var planner: LivePlanner
    @ObservedObject var focusTimer: SpreadFocusTimer
    let onMore: () -> Void
    let onOpenRole: (String) -> Void
    let onOpenTask: (String, String) -> Void
    let onNewRole: () -> Void
    let onDeleteRole: (String) -> Void
    @AccessibilityFocusState private var navigationFocused: Bool
    @AccessibilityFocusState private var openerFocused: Bool
    @State private var destination: LifeDestination = .life
    @State private var pageDirection: CGFloat = 1
    @State private var focusedRole: String?
    @State private var hoursSelectedRole: String?
    @State private var weekSelectedRole: String?
    @State private var tasksOpen = false
    @State private var budgetExpanded = false
    @State private var budgetRoleID: String?
    @State private var budgetCapacityText = ""
    @State private var capacityEntryVisible = false
    @FocusState private var capacityInputFocused: Bool
    @State private var pendingWeekMoves = 0
    @State private var weekMoveRunning = false
    @State private var budgetError: String?
    @State private var showPlanAhead = false
    @State private var navigationOpen = false
    @State private var navigationDrag: CGFloat = 0
    @State private var localSheet: LifeLocalSheet?
    @State private var dockControlsHeight: CGFloat = 62
    @State private var dockOpenerCenterY: CGFloat = 31
    @State private var weekTick = 0
    @State private var historyVisible = false
    @State private var showFocusTimer = false
    @State private var preferredFocusRoleId: String?
    @State private var pendingTask: (role: String, task: String)?
    @AppStorage("native.life.crownRight") private var crownRight = true
    @AppStorage("native.life.navigationExpanded") private var navigationExpanded = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                LifePalette.canvas.ignoresSafeArea()
                HStack(spacing: 0) {
                    if geometry.size.width >= 820 {
                        VStack(spacing: 8) {
                            compactRail
                                }
                    }
                    VStack(spacing: 0) {
                    header
                    if let snapshot = planner.snapshot {
                        ScrollViewReader { proxy in
                            ScrollView {
                                VStack(alignment: .leading, spacing: 20) {
                                    Color.clear.frame(height: 0).id("life-top")
                                    if let notice = planner.recoveryNotice {
                                        Text(notice).font(.body)
                                        Button("Backup and restore", action: onMore).frame(minHeight: 44)
                                    }
                                    if planner.saveFailure != nil {
                                        Label("Changes are not saved. Open More to back up your plan.", systemImage: "exclamationmark.triangle")
                                            .font(.body).foregroundStyle(Spread.danger)
                                        Button("More", action: onMore).frame(minHeight: 44)
                                    }
                                    // Animate the page body only. Header, dock and week selector stay fixed.
                                    ZStack(alignment: .topLeading) {
                                        surface(snapshot, viewportHeight: geometry.size.height,
                                                viewportWidth: geometry.size.width)
                                            .id(destination)
                                            .transition(pageTransition)
                                    }
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                }
                                .frame(maxWidth: 700).frame(maxWidth: .infinity)
                                .padding(.horizontal, 16).padding(.top, 8).padding(.bottom, 28)
                            }
                            .scrollDismissesKeyboard(.interactively).scrollIndicators(.hidden)
                            // Cards pass through the shorter scroll area and only
                            // disappear at the actual device/window edge. Without
                            // this the dock boundary prematurely crops full cards.
                            .scrollClipDisabled()
                            .onChange(of: destination) { _, _ in proxy.scrollTo("life-top", anchor: .top) }
                            // Stack, Focus, Stack in one motion. Opening returns the page to its
                            // top so the card lands in a fixed slot. Closing scrolls only as far
                            // as needed to show the closed card's strip in the stack.
                            .onChange(of: focusedRole) { old, new in
                                tasksOpen = false
                                if new != nil { budgetExpanded = false }
                                withAnimation(reduceMotion ? nil : SpreadTactile.walletFocus) {
                                    if new != nil {
                                        proxy.scrollTo("life-top", anchor: .top)
                                    } else if let old {
                                        proxy.scrollTo("life-slot-" + old)
                                    }
                                }
                            }
                        }
                        bottom(snapshot, wide: geometry.size.width >= 820)
                    } else {
                        ProgressView("Opening your plan…").frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                    }
                }
                .accessibilityHidden(navigationOpen && geometry.size.width < 820)
                if geometry.size.width < 820 {
                    // Always mounted. Changing the offset moves the tray both
                    // IN and OUT; removing the view early used to cut exit short.
                    navigation(width: geometry.size.width)
                        .allowsHitTesting(navigationOpen)
                        .accessibilityHidden(!navigationOpen)
                }
            }
            .onChange(of: geometry.size.width) { _, newWidth in
                if newWidth >= 820 { navigationOpen = false }
            }
        }
        .foregroundStyle(LifePalette.ink).tint(LifePalette.accent)
        .task { await planner.refresh() }
        .task(id: planner.snapshot != nil) {
            if planner.snapshot != nil { openTodayFromWidgetIfNeeded() }
        }
        .onReceive(NotificationCenter.default.publisher(for: Notification.Name("SpreadOpenToday"))) { _ in
            openTodayFromWidgetIfNeeded()
        }
        // A deadline, not a background stopwatch, owns elapsed time across suspension.
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                focusTimer.reconcile()
                Task { await planner.refresh() }
            } else { navigationOpen = false }
        }
        // Reset transient UI only on a real profile or week change. The first load
        // (nil to loaded) is not a change, so a selection made before it survives.
        .onChange(of: planner.state?.envelope.profileId) { old, _ in
            guard old != nil else { return }
            focusedRole = nil; tasksOpen = false; budgetExpanded = false; localSheet = nil; pendingTask = nil
            hoursSelectedRole = nil; weekSelectedRole = nil
            if let id = planner.state?.envelope.profileId { focusTimer.pauseForProfileSwitch(to: id) }
        }
        .onChange(of: planner.snapshot?.weekKey) { old, _ in
            guard old != nil else { return }
            focusedRole = nil; tasksOpen = false; budgetExpanded = false; localSheet = nil
        }
        .onChange(of: planner.snapshot?.roles.map(\.id)) { _, roleIDs in
            if let focusedRole, !(roleIDs ?? []).contains(focusedRole) {
                self.focusedRole = nil
                tasksOpen = false
            }
        }
        .onChange(of: navigationOpen) { _, open in
            navigationFocused = open
            if !open { openerFocused = true }
        }
        .onChange(of: weekTick) { _, _ in SpreadHaptics.selection() }
        .sheet(isPresented: $showFocusTimer) {
            if let snapshot = planner.snapshot, let profileId = planner.state?.envelope.profileId {
                SpreadFocusTimerSheet(timer: focusTimer, profileId: profileId,
                                      roles: snapshot.roles, preferredRoleId: preferredFocusRoleId)
                    .preferredColorScheme(colorScheme)
            }
        }
        .sheet(isPresented: $showPlanAhead) {
            if let snapshot = planner.snapshot {
                LifePlanAheadSheet(planner: planner, snapshot: snapshot)
                    // Sheets are separate presentations: match Life’s resolved system/app appearance.
                    .preferredColorScheme(colorScheme)
            }
        }
        .sheet(item: $localSheet, onDismiss: {
            if let pending = pendingTask {
                pendingTask = nil
                onOpenTask(pending.role, pending.task)
            }
        }, content: sheetContent)
        .task(id: planner.state?.revision) {
            guard planner.undoId != nil || planner.redoId != nil else {
                withAnimation(reduceMotion ? .easeOut(duration: 0.12) : SpreadMotion.historyExit) {
                    historyVisible = false
                }
                return
            }
            withAnimation(reduceMotion ? .easeOut(duration: 0.12) : SpreadMotion.historyEntrance) {
                historyVisible = true
            }
            do { try await Task.sleep(for: .seconds(5)) } catch { return }
            withAnimation(reduceMotion ? .easeOut(duration: 0.12) : SpreadMotion.historyExit) {
                historyVisible = false
            }
        }
        // A container identifier on a non-element view is pushed onto every
        // descendant element, replacing ids such as life-navigation and
        // life-more. Making the root a containing element keeps its own id
        // while each child keeps its id, label and VoiceOver order.
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("life-root")
        #if DEBUG
        .modifier(LifeDebugDynamicTypeOverride())
        #endif
    }
    private var pageTransition: AnyTransition {
        if reduceMotion { return .opacity }
        return .asymmetric(
            insertion: .offset(x: pageDirection * 28).combined(with: .opacity),
            removal: .offset(x: -pageDirection * 28).combined(with: .opacity)
        )
    }
    /// True while one Life card is in the Wallet-style focus state.
    private var lifeFocused: Bool { destination == .life && focusedRole != nil }
    private var header: some View {
        HStack(spacing: 8) {
            if lifeFocused {
                Button {
                    withAnimation(reduceMotion ? nil : SpreadTactile.walletFocus) { focusedRole = nil }
                } label: {
                    Image(systemName: "xmark").frame(width: 44, height: 44)
                        .background(LifePalette.surface, in: Circle())
                }.accessibilityLabel("Close Life area").accessibilityIdentifier("life-close-focus")
                    .transition(.opacity)
            } else {
                Button { navigate(.life) } label: {
                    HStack(spacing: 8) { SpreadBrandMark(size: 27); Text("Spread").font(.title3.bold()) }
                        .frame(minHeight: 44)
                }.buttonStyle(.plain).accessibilityLabel("Spread, Life").accessibilityIdentifier("life-home")
                    .transition(.opacity)
            }
            Spacer(minLength: 4)
            Button(action: onMore) {
                Image(systemName: "ellipsis").frame(width: 44, height: 44)
                    .background(LifePalette.surface, in: Circle())
            }.accessibilityLabel("More").accessibilityIdentifier("life-more")
        }.padding(.horizontal, 16).padding(.vertical, 4)
            .background(LifePalette.canvas, ignoresSafeAreaEdges: .top)
            .zIndex(1)
    }
    @ViewBuilder private func surface(_ snapshot: PlannerSnapshot, viewportHeight: CGFloat, viewportWidth: CGFloat) -> some View {
        switch destination {
        case .life: life(snapshot, viewportHeight: viewportHeight, viewportWidth: viewportWidth)
        case .hours:
            LifeHoursView(planner: planner, snapshot: snapshot, onHelp: { localSheet = .help }, selectedRole: $hoursSelectedRole)
        case .week:
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .center, spacing: 12) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Your week").font(.largeTitle.bold()).accessibilityAddTraits(.isHeader)
                        Text("One day at a time.")
                            .font(.subheadline).foregroundStyle(LifePalette.secondary)
                    }
                    Spacer(minLength: 0)
                    Button {
                        showPlanAhead = true
                    } label: {
                        Label("Plan Ahead", systemImage: "calendar.badge.clock")
                            .font(.subheadline.weight(.semibold))
                            .frame(minHeight: 44)
                    }
                    .buttonStyle(.bordered)
                    .accessibilityIdentifier("life-plan-ahead-open")
                }
                LifeWeekView(planner: planner, snapshot: snapshot, onOpenTask: onOpenTask,
                             onReserve: { localSheet = .reserve($0) },
                             onManage: { localSheet = .manage($0) }, onDelete: { _ in },

                             selectedRole: $weekSelectedRole)
            }.accessibilityElement(children: .contain).accessibilityIdentifier("life-week-page")
        }
    }
    private func life(_ snapshot: PlannerSnapshot, viewportHeight: CGFloat, viewportWidth: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            if !lifeFocused {
                lifeOverview(snapshot)
                    .transition(.opacity)
            }
            if snapshot.roles.isEmpty {
                Text("Name the responsibilities you want to plan for.").font(.body)
                newLifeArea
            } else {
                LifeWalletStack(planner: planner, snapshot: snapshot, roles: snapshot.roles,
                                selectedRole: $focusedRole,
                                viewportHeight: viewportHeight, viewportWidth: viewportWidth)
                    .zIndex(2)
            }
            if let id = focusedRole, let role = snapshot.roles.first(where: { $0.id == id }) {
                HStack(spacing: 12) {
                    Button {
                        localSheet = .manage(id)
                    } label: {
                        Label("Details", systemImage: "slider.horizontal.3")
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .buttonStyle(.spreadPress)
                    .foregroundStyle(Spread.ink)
                    .background(Spread.elevated, in: Capsule())
                    .overlay(Capsule().strokeBorder(Spread.line, lineWidth: 1))
                    .accessibilityIdentifier("life-details-button")
                    Button {
                        withAnimation(reduceMotion ? nil : SpreadTactile.snap) {
                            tasksOpen.toggle()
                        }
                    } label: {
                        Label("Tasks", systemImage: "text.book.closed")
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .buttonStyle(.spreadPress)
                    .foregroundStyle(Spread.ink)
                    .background(tasksOpen ? Spread.inset : Spread.elevated, in: Capsule())
                    .overlay(Capsule().strokeBorder(tasksOpen ? Spread.accent : Spread.line, lineWidth: 1))
                    .accessibilityValue(tasksOpen ? "Open" : "Closed")
                    .accessibilityIdentifier("life-tasks-button")
                }
                .padding(.horizontal, 4)
                details(role, snapshot: snapshot)
                    .id(id)
                    // Keep old and new fields visually connected as focus changes.
                    .transition(SpreadTactile.walletDetailReveal)
            } else if !snapshot.roles.isEmpty {
                Text("Tap a card to view its details and tasks.").font(.subheadline).foregroundStyle(LifePalette.secondary)
                    .frame(maxWidth: .infinity).padding(.top, 12)
            }
            if !snapshot.roles.isEmpty && !lifeFocused { newLifeArea }
        }.accessibilityElement(children: .contain).accessibilityIdentifier("life-page")
    }
    private var newLifeArea: some View {
        Button(action: onNewRole) {
            HStack(spacing: 10) {
                Image(systemName: "plus.circle.fill")
                    .font(.title3)
                    .foregroundStyle(Spread.accent)
                Text("Add Life")
                    .font(.headline)
                    .foregroundStyle(Spread.ink)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 16)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
            .overlay(RoundedRectangle(cornerRadius: Spread.radiusRow)
                .strokeBorder(Spread.line, lineWidth: 1))
            .contentShape(Rectangle())
        }
        .buttonStyle(.spreadPress)
        .accessibilityIdentifier("life-new-area")
    }

    /// Weekly Time is now the primary full-width Life control, not a sidebar
    /// alongside a redundant Life heading. The budget editor stays attached.
    private func lifeOverview(_ snapshot: PlannerSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            timeBudgetControl(snapshot, compact: true)
                .frame(maxWidth: .infinity)
            if let issue = snapshot.recurrenceIssue {
                Label(issue, systemImage: "exclamationmark.triangle")
                    .font(.subheadline)
                    .foregroundStyle(Spread.danger)
                    .accessibilityIdentifier("life-recurrence-issue")
            }
            if budgetExpanded {
                budgetEditor(snapshot)
                    .transition(SpreadTactile.walletDetailReveal)
                    .accessibilityIdentifier("life-budget-editor")
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("life-time-overview")
    }

    private func timeBudgetControl(_ snapshot: PlannerSnapshot, compact: Bool) -> some View {
        LifeWeeklyTimeBudget(
            roles: snapshot.roles,
            capacity: snapshot.life?.capacityHours,
            compact: compact,
            expanded: budgetExpanded,
            onToggle: {
                if budgetExpanded {
                    withAnimation(reduceMotion ? nil : SpreadTactile.walletFocus) {
                        budgetExpanded = false
                    }
                } else {
                    openBudget(for: nil)
                }
            },
            onSelectRole: { id in openBudget(for: id) }
        )
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("life-weekly-time-summary")
    }

    private func openBudget(for roleID: String?) {
        budgetRoleID = roleID
        budgetCapacityText = planner.snapshot?.life?.capacityHours.map(SpreadHours.text) ?? ""
        capacityEntryVisible = false
        budgetError = nil
        withAnimation(reduceMotion ? nil : SpreadTactile.walletFocus) {
            focusedRole = nil
            budgetExpanded = true
        }
        LifeFeedback.selection()
    }

    private func budgetEditor(_ snapshot: PlannerSnapshot) -> some View {
        let assigned = LifeBudgetBarMath.assigned(snapshot.roles)
        let capacity = snapshot.life?.capacityHours
        return VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Your weekly hours").font(.headline)
                Spacer()
                Button("Done") {
                    withAnimation(reduceMotion ? nil : SpreadTactile.walletFocus) {
                        budgetExpanded = false
                    }
                }
                .accessibilityIdentifier("life-budget-done")
            }
            if snapshot.recurringPlans?.isEmpty == false {
                Text("Changes here affect only this week. Edit repeating schedules in Plan Ahead.")
                    .font(.caption)
                    .foregroundStyle(Spread.secondary)
            }
            SpreadArrowValueControl(
                value: capacity.map { SpreadHours.text($0) + "h" } ?? "Set hours",
                detail: "Weekly total",
                onValue: {
                    budgetCapacityText = capacity.map(SpreadHours.text) ?? ""
                    capacityEntryVisible = true
                    capacityInputFocused = true
                },
                valueIdentifier: "life-budget-capacity-value",
                leftDisabled: planner.busy || capacity == nil || (capacity ?? 0) - 1 < assigned,
                rightDisabled: planner.busy || (capacity ?? 0) + 1 > 168,
                leftLabel: "Remove one weekly hour",
                rightLabel: "Add one weekly hour",
                onMove: { direction in
                    adjustCapacity(by: Double(direction), snapshot: snapshot)
                }
            )
            .accessibilityIdentifier("life-budget-capacity-controls")
            if capacityEntryVisible {
                HStack(spacing: 10) {
                    TextField("Weekly hours", text: $budgetCapacityText)
                        .keyboardType(.decimalPad)
                        .focused($capacityInputFocused)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(Spread.inset, in: RoundedRectangle(cornerRadius: 12))
                        .accessibilityIdentifier("life-budget-capacity-input")
                        .onAppear { capacityInputFocused = true }
                    Button("Set") {
                        commitBudgetCapacity(snapshot)
                        if budgetError == nil {
                            capacityInputFocused = false
                            capacityEntryVisible = false
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(planner.busy)
                    .frame(minHeight: 44)
                    .accessibilityIdentifier("life-budget-save-capacity")
                    Button("Cancel") {
                        budgetError = nil
                        capacityInputFocused = false
                        capacityEntryVisible = false
                    }
                    .buttonStyle(.bordered)
                    .frame(minHeight: 44)
                }
            }
            HStack {
                Text(SpreadHours.text(assigned) + "h budgeted")
                Spacer()
                Text(capacity.map { SpreadHours.text(max(0, $0 - assigned)) + "h available" }
                     ?? "Set your weekly hours")
            }
            .font(.subheadline)
            .foregroundStyle(Spread.secondary)
            .accessibilityElement(children: .combine)
            if !snapshot.roles.isEmpty {
                Text("Choose a Life area to adjust").font(.subheadline.weight(.semibold))
                ScrollView(.horizontal) {
                    HStack(spacing: 8) {
                        ForEach(snapshot.roles) { role in
                            Button {
                                budgetRoleID = role.id
                                LifeFeedback.selection()
                            } label: {
                                HStack(spacing: 5) {
                                    Circle().fill(Color(hex: role.color)).frame(width: 10, height: 10)
                                    Text(role.name).lineLimit(1)
                                    Text(SpreadHours.text(role.hours) + "h")
                                        .monospacedDigit()
                                }
                                .font(.subheadline)
                                .foregroundStyle(Spread.ink)
                                .padding(.horizontal, 10)
                                .frame(minHeight: 44)
                                .background(budgetRoleID == role.id ? Spread.inset : Spread.elevated,
                                            in: Capsule())
                                .overlay(Capsule().strokeBorder(
                                    budgetRoleID == role.id ? Spread.accent : Spread.line, lineWidth: 1.5))
                            }
                            .buttonStyle(.spreadPress)
                            .accessibilityLabel(role.name + ", " + SpreadHours.text(role.hours) + " hours")
                            .accessibilityAddTraits(budgetRoleID == role.id ? .isSelected : [])
                        }
                    }
                }
                .scrollIndicators(.hidden)
            }
            if let selected = snapshot.roles.first(where: { $0.id == budgetRoleID }) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(selected.name).font(.headline)
                    SpreadArrowValueControl(
                        value: SpreadHours.text(selected.hours) + "h",
                        detail: "This week",
                        valueIdentifier: "life-budget-role-value",
                        leftDisabled: planner.busy ||
                            selected.hours - 0.5 < snapshot.placedHours(for: selected.id),
                        rightDisabled: planner.busy || capacity == nil ||
                            assigned + 0.5 > (capacity ?? 0),
                        leftLabel: "Remove half an hour from " + selected.name,
                        rightLabel: "Add half an hour to " + selected.name,
                        onMove: { direction in
                            adjustRole(selected, by: Double(direction) * 0.5, snapshot: snapshot)
                        }
                    )
                }
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("life-budget-role-controls")
            }
            if let budgetError {
                Text(budgetError).font(.callout).foregroundStyle(Spread.danger)
                    .accessibilityIdentifier("life-budget-error")
            }
        }
        .padding(16)
        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
        .overlay(RoundedRectangle(cornerRadius: Spread.radiusCard)
            .strokeBorder(Spread.line, lineWidth: 1))
        .accessibilityElement(children: .contain)
    }

    private func commitBudgetCapacity(_ snapshot: PlannerSnapshot) {
        let text = budgetCapacityText.replacingOccurrences(of: ",", with: ".")
        guard let value = Double(text), value.isFinite, value >= LifeBudgetBarMath.assigned(snapshot.roles),
              value <= 168, value >= 0, (value * 2).rounded() == value * 2 else {
            budgetError = "Enter a valid weekly total in half-hour steps, no less than the hours already budgeted."
            return
        }
        budgetError = nil
        Task {
            if await planner.send(["type": "setLifeCapacity", "hours": value]) {
                LifeFeedback.accepted()
            }
        }
    }

    private func adjustCapacity(by delta: Double, snapshot: PlannerSnapshot) {
        guard let capacity = snapshot.life?.capacityHours else { return }
        let next = capacity + delta
        guard next >= LifeBudgetBarMath.assigned(snapshot.roles), next <= 168 else { return }
        budgetCapacityText = SpreadHours.text(next)
        commitBudgetCapacity(snapshot)
    }

    private func adjustRole(_ role: Responsibility, by delta: Double, snapshot: PlannerSnapshot) {
        guard let capacity = snapshot.life?.capacityHours else {
            budgetError = "Set weekly hours first."
            return
        }
        let next = role.hours + delta
        let reserved = snapshot.placedHours(for: role.id)
        guard next >= reserved, next >= 0, next <= 168,
              LifeBudgetBarMath.assigned(snapshot.roles) + delta <= capacity else { return }
        budgetError = nil
        Task {
            if await planner.send(["type": "setLifeBudget", "roleId": role.id, "hours": next]) {
                LifeFeedback.accepted()
            }
        }
    }

    /// One obvious planning action, with extra details shown only when needed.
    private func details(_ role: Responsibility, snapshot: PlannerSnapshot) -> some View {
        let weekdayHours = LifeCardWeekDistribution.hours(for: role.id, snapshot: snapshot)
        let placed = LifeCardWeekDistribution.assigned(weekdayHours)
        let remaining = snapshot.remainingHours(for: role.id)
        return VStack(alignment: .leading, spacing: 12) {
            if tasksOpen {
                VStack(alignment: .leading, spacing: 0) {
                    LifeTaskRows(planner: planner, snapshot: snapshot,
                                 tasks: snapshot.tasks(for: role.id), onOpenTask: onOpenTask)
                    LifeQuickAdd(planner: planner, roleId: role.id, onOpenTask: onOpenTask)
                        .padding(.horizontal, 12).padding(.vertical, 6)
                }
                .background(Spread.inset, in: RoundedRectangle(cornerRadius: 18))
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("life-task-notebook")
            }
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(SpreadHours.text(max(0, remaining)) + "h to plan")
                        .font(.headline)
                    Text(role.name + " · " + SpreadHours.text(placed) + "h on days")
                        .font(.subheadline).foregroundStyle(Spread.secondary)
                }
                Spacer(minLength: 0)
                Button("Plan days") { localSheet = .reserve(role.id) }
                    .font(.subheadline.weight(.semibold))
                    .frame(minHeight: 44)
                    .padding(.horizontal, 14)
                    .background(Spread.accent, in: Capsule())
                    .foregroundStyle(Spread.onAccent)
                    .buttonStyle(.spreadPress)
                    .accessibilityIdentifier("life-place-hours")
            }
            Button {
                preferredFocusRoleId = role.id
                showFocusTimer = true
            } label: {
                Label("Focus timer", systemImage: "timer")
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            }
            .foregroundStyle(Spread.accent)
            .buttonStyle(.spreadPress)
            .accessibilityIdentifier("life-focus-timer")
            Button {
                openBudget(for: role.id)
            } label: {
                Label("Adjust weekly hours", systemImage: "slider.horizontal.3")
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            }
            .foregroundStyle(Spread.accent)
            .buttonStyle(.spreadPress)
            .accessibilityIdentifier("life-change-area-hours")
            if placed > 0 {
                DisclosureGroup("Days on your calendar") {
                    VStack(spacing: 6) {
                        ForEach(0..<7, id: \.self) { index in
                            if weekdayHours[index] > 0 {
                                HStack {
                                    Text(PlannerDates.label(
                                        PlannerDates.date(PlannerDates.dayISO(
                                            weekKey: snapshot.weekKey, index: index)),
                                        pattern: "EEEE"))
                                    Spacer()
                                    Text(SpreadHours.text(weekdayHours[index]) + "h")
                                        .monospacedDigit()
                                }
                                .font(.subheadline)
                            }
                        }
                    }
                }
                .tint(Spread.accent)
                .accessibilityIdentifier("life-planned-days")
            }
        }
        .padding(16)
        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
        .overlay(RoundedRectangle(cornerRadius: Spread.radiusCard)
            .strokeBorder(Spread.line, lineWidth: 1))
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("life-task-details")
    }
    private var history: some View {
        HStack {
            Button("Undo") {
                guard let id = planner.undoId else { return }
                Task { if await planner.send(["type": "undo", "editId": id]) { LifeFeedback.accepted() } }
            }.disabled(planner.undoId == nil || planner.busy).accessibilityIdentifier("life-undo")
            Button("Redo") {
                guard let id = planner.redoId else { return }
                Task { if await planner.send(["type": "redo", "editId": id]) { LifeFeedback.accepted() } }
            }.disabled(planner.redoId == nil || planner.busy).accessibilityIdentifier("life-redo")
        }
        .buttonStyle(.bordered)
        .tint(LifePalette.accent)
        .padding(.horizontal, 10).padding(.vertical, 4)
        .background(LifePalette.surface, in: Capsule())
        .overlay(Capsule().strokeBorder(LifePalette.line, lineWidth: 0.5))
        .shadow(color: Spread.shadow, radius: 8, y: 4)
        .transition(reduceMotion ? .opacity : .asymmetric(
            insertion: .offset(y: 16).combined(with: .opacity),
            removal: .offset(y: 12).combined(with: .opacity)
        ))
    }
    private func bottom(_ snapshot: PlannerSnapshot, wide: Bool) -> some View {
        VStack(spacing: 6) {
            if let profileId = planner.state?.envelope.profileId,
               let session = focusTimer.visibleSession(for: profileId), session.phase != .finished {
                Button {
                    preferredFocusRoleId = session.roleId
                    showFocusTimer = true
                } label: {
                    TimelineView(.periodic(from: .now, by: 1)) { context in
                        HStack(spacing: 8) {
                            Image(systemName: "timer")
                            Text(session.roleName).lineLimit(1)
                            Spacer(minLength: 8)
                            Text(SpreadFocusClock.display(session.remaining(at: context.date)))
                                .monospacedDigit()
                            Image(systemName: "chevron.up")
                        }
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Spread.ink)
                        .padding(.horizontal, 14)
                        .frame(minHeight: 44)
                        .background(Spread.elevated, in: Capsule())
                    }
                }
                .buttonStyle(.spreadPress)
                .accessibilityLabel("Focus timer, " + session.roleName)
                .accessibilityIdentifier("spread-focus-mini")
            }
            // Shared anchored feedback: independent of Life/Week page content.
            if historyVisible && (planner.undoId != nil || planner.redoId != nil) { history }
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 8) {
                    lifeWeekToggle
                    crown(snapshot)
                }
                VStack(spacing: 8) {
                    lifeWeekToggle
                    crown(snapshot)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(LifePalette.surface, ignoresSafeAreaEdges: .bottom)
    }

    /// Two destinations, one consistent control. Hours editing now lives on Life.
    private var lifeWeekToggle: some View {
        HStack(spacing: 2) {
            ForEach([LifeDestination.life, LifeDestination.week]) { item in
                Button {
                    navigate(item)
                } label: {
                    VStack(spacing: 2) {
                        if item == .life {
                            SpreadBrandMark(size: 23)
                        } else {
                            Image(systemName: "calendar")
                                .font(.subheadline)
                        }
                        Text(item == .life ? "Life" : "Week")
                            .font(.caption2.weight(.semibold))
                    }
                    .foregroundStyle(destination == item ? Spread.onAccent : Spread.ink)
                    .frame(width: 51).frame(minHeight: 52)
                    .background(destination == item ? Spread.accent : Color.clear,
                                in: RoundedRectangle(cornerRadius: 12))
                    .contentShape(Rectangle())
                }
                .buttonStyle(.spreadPress)
                .accessibilityLabel(item == .life ? "Life" : "Calendar week")
                .accessibilityAddTraits(destination == item ? .isSelected : [])
                .accessibilityIdentifier("life-nav-" + item.rawValue.lowercased())
            }
        }
        .padding(3)
        .background(Spread.inset, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
        .overlay(RoundedRectangle(cornerRadius: Spread.radiusRow)
            .strokeBorder(Spread.line, lineWidth: 1))
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("life-week-toggle")
    }
    private var trayButton: some View {
        Button {
            LifeFeedback.selection()
            navigationDrag = 0
            withAnimation(reduceMotion ? nil : SpreadTactile.traySlide) { navigationOpen = true }
        } label: {
            VStack(spacing: 2) {
                SpreadIcon(name: destination.icon, size: 22)
                Text(destination.rawValue).font(.caption)
            }.frame(minWidth: 44, minHeight: 44)
        }.accessibilityLabel("Open navigation").accessibilityIdentifier("life-navigation")
            .accessibilityFocused($openerFocused)
            .background {
                GeometryReader { geometry in
                    Color.clear.preference(key: LifeDockOpenerCenterKey.self,
                        value: geometry.frame(in: .named("life-dock-controls")).midY)
                }
            }
    }
    private var addTaskButton: some View {
        Button { localSheet = .addTask } label: {
            SpreadIcon(name: "icon-new-life", size: 28, original: true)
                .frame(width: 44, height: 44)
                .background(Spread.elevated, in: RoundedRectangle(cornerRadius: 14))
        }.accessibilityLabel("Add task")
    }
    private func crown(_ snapshot: PlannerSnapshot) -> some View {
        WeekCrownView(title: PlannerDates.label(PlannerDates.date(snapshot.weekKey), pattern: "MMM d"),
                      detail: "Calendar week", onDetail: today, onMove: goWeek)
            .accessibilityIdentifier("life-week-navigator")
    }
    private func navigation(width: CGFloat) -> some View {
        let trayWidth = min(CGFloat(300), max(CGFloat(0), width - CGFloat(32)))
        let dragProgress = min(1.0, Double(abs(navigationDrag) / max(CGFloat(1), trayWidth)))
        return ZStack(alignment: crownRight ? .leading : .trailing) {
            Color.black.opacity(navigationOpen ? 0.35 * (1 - dragProgress) : 0)
                .ignoresSafeArea()
                .onTapGesture { closeNavigation() }.accessibilityHidden(true)
            VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    HStack {
                        SpreadBrandMark(size: 27); Text("Spread").font(.title2.bold()); Spacer()

                    }
                    ForEach(LifeDestination.allCases) { item in
                        Button { navigate(item) } label: {
                            HStack {
                                SpreadIcon(name: item.icon)
                                Text(item.rawValue).font(.headline)
                                Spacer()
                                Image(systemName: destination == item ? "checkmark.circle.fill" : "chevron.right")
                                    .accessibilityHidden(true)
                            }
                            .padding(.horizontal, 12).frame(minHeight: 52)
                            .spreadChip(selected: destination == item)
                        }.buttonStyle(.spreadPress)
                            .accessibilityAddTraits(destination == item ? .isSelected : [])
                            .accessibilityIdentifier("life-nav-\(item.rawValue.lowercased())")
                    }
                    history
                    Menu("Crown position") {
                        Button("Move Crown left") { crownRight = false }
                        Button("Move Crown right") { crownRight = true }
                    }.frame(minHeight: 44)
                    Button("Gesture help") { closeNavigation(); localSheet = .help }.frame(minHeight: 44)
                    Button("More") { closeNavigation(); onMore() }.frame(minHeight: 44)
                }.padding(20)
            }
            HStack {
                if !crownRight { Spacer(minLength: 0) }
                Button {
                    closeNavigation()
                } label: {
                    Image(systemName: "xmark").frame(width: 44, height: 44)
                }
                .accessibilityLabel("Close navigation")
                .accessibilityIdentifier("life-navigation-close")
                .accessibilityFocused($navigationFocused)
                .offset(y: max(0, dockOpenerCenterY - 22))
                if crownRight { Spacer(minLength: 0) }
            }
            .frame(height: dockControlsHeight, alignment: .top)
            .padding(.horizontal, 16).padding(.vertical, 8)
            }
            .frame(width: trayWidth).frame(maxHeight: .infinity)
            .background(LifePalette.surface)
            .shadow(color: .black.opacity(0.3125), radius: 20, x: crownRight ? 8.75 : -8.75)
            .offset(x: navigationDrag + (navigationOpen ? 0 : (crownRight ? -trayWidth : trayWidth)))
            .simultaneousGesture(navigationPan(width: trayWidth))
            .animation(reduceMotion ? nil : SpreadTactile.traySlide, value: navigationOpen)
            // The tray is one modal container. Without its own element the modal trait and
            // escape action were pushed onto every control inside, and Close navigation
            // reported the whole tray as its frame, so tray controls were not hittable.
            .accessibilityElement(children: .contain)
            .accessibilityAddTraits(.isModal)
            .accessibilityAction(.escape) { closeNavigation() }
        }
    }
    private func openTodayFromWidgetIfNeeded() {
        guard UserDefaults.standard.bool(forKey: "native.widget.openToday"),
              planner.snapshot != nil else { return }
        UserDefaults.standard.removeObject(forKey: "native.widget.openToday")
        navigate(.week)
        Task { _ = await planner.send(["type": "openWeek", "weekKey": PlannerDates.currentWeekKey()]) }
    }

    private func navigate(_ value: LifeDestination) {
        if destination != value {
            LifeFeedback.selection()
            pageDirection = value == .week ? 1 : -1
        }
        withAnimation(reduceMotion ? nil : SpreadMotion.lifeWeekPage) {
            destination = value
        }
        withAnimation(reduceMotion ? nil : SpreadTactile.traySlide) {
            navigationOpen = false
        }
    }

    private func closeNavigation() {
        // Keep the finger's last offset during dismissal, so the tray never
        // jumps backward before leaving the screen. The opener resets it.
        withAnimation(reduceMotion ? nil : SpreadTactile.traySlide) {
            navigationOpen = false
        }
    }

    /// A physical drawer tracks the finger toward its owning edge; vertical menu
    /// scrolling keeps precedence. Releasing snaps open or dismisses the tray.
    private func navigationPan(width: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: 12)
            .onChanged { value in
                let horizontal = value.translation.width
                guard abs(horizontal) > abs(value.translation.height) * 1.5 else { return }
                let towardExit = crownRight ? min(0, horizontal) : max(0, horizontal)
                var transaction = Transaction()
                transaction.disablesAnimations = true
                withTransaction(transaction) {
                    navigationDrag = min(width, max(-width, towardExit))
                }
            }
            .onEnded { value in
                if TactilePrecisionMath.drawerShouldClose(
                    horizontal: Double(value.translation.width),
                    vertical: Double(value.translation.height),
                    projected: Double(value.predictedEndTranslation.width),
                    width: Double(width), onLeft: crownRight
                ) {
                    closeNavigation()
                } else {
                    withAnimation(reduceMotion ? nil : SpreadTactile.settle) { navigationDrag = 0 }
                }
            }
    }

    /// Persistent compact navigation only when there is enough actual width.
    /// On narrow phones the existing bottom control opens an overlay instead.
    private var compactRail: some View {
        PlannerNavigationRail(items: LifeDestination.allCases.map {
            PlannerNavigationItem(id: $0.rawValue.lowercased(), title: $0.rawValue, icon: $0.icon)
        }, selected: destination.rawValue.lowercased(), expanded: $navigationExpanded) { id in
            if let item = LifeDestination.allCases.first(where: { $0.rawValue.lowercased() == id }) { navigate(item) }
        }
        .accessibilityIdentifier("life-compact-rail")
    }
    /// Held week arrows may emit several steps before the bridge acknowledges
    /// the previous write. Coalesce them against the latest *acknowledged* week.
    private func goWeek(_ delta: Int) {
        guard delta != 0 else { return }
        pendingWeekMoves += delta
        guard !weekMoveRunning else { return }
        weekMoveRunning = true
        Task {
            defer { weekMoveRunning = false }
            while pendingWeekMoves != 0 {
                let move = pendingWeekMoves
                pendingWeekMoves = 0
                guard let week = planner.snapshot?.weekKey,
                      let target = PlannerDates.calendar.date(byAdding: .weekOfYear,
                                                               value: move, to: PlannerDates.date(week)) else {
                    pendingWeekMoves = 0
                    return
                }
                guard await planner.send(["type": "openWeek", "weekKey": PlannerDates.weekKey(for: target)]) else {
                    pendingWeekMoves = 0
                    return
                }
                weekTick += 1
            }
        }
    }
    private func today() {
        pendingWeekMoves = 0
        Task { if await planner.send(["type": "changeWeek", "direction": "today"]) { weekTick += 1 } }
    }
    @ViewBuilder private func sheetContent(_ item: LifeLocalSheet) -> some View {
        switch item {
        case .manage(let id): LifeManageSheet(planner: planner, roleId: id)
        case .reserve(let id): LifeReserveSheet(planner: planner, roleId: id)
        case .priority(let id): LifePrioritySheet(planner: planner, roleId: id)
        case .help: LifeGestureHelp()
        case .addTask:
            SpreadSheetStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        ForEach(planner.snapshot?.roles ?? []) { role in
                            Text(role.name).font(.headline)
                            LifeQuickAdd(planner: planner, roleId: role.id, onOpenTask: { role, task in
                                pendingTask = (role, task)
                                localSheet = nil
                            })
                        }
                        if planner.snapshot?.roles.isEmpty == true {
                            Button("Add Life") { localSheet = nil; onNewRole() }.frame(minHeight: 44)
                        }
                    }.padding()
                }.navigationTitle("Add task")
            }.presentationDragIndicator(.visible)
        }
    }
}

// Each key has one real source. Sibling views report the default, so the reducers keep
// the largest value: `value = nextValue()` let a later sibling's default replace the
// measured one, and the tray's Close control then sat lower than the dock opener.
private struct LifeDockOpenerCenterKey: PreferenceKey {
    static let defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = max(value, nextValue()) }
}

private struct LifeDockHeightKey: PreferenceKey {
    static let defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = max(value, nextValue()) }
}

private struct LifeGestureHelp: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage("native.life.touchFeedback") private var touchFeedback = true
    @AppStorage("native.life.showTips") private var showTips = true
    var body: some View {
        SpreadSheetStack {
            Form {
                Section("Changing time") {
                    Text("Flick up or down by 1 hour. Hold and drag to change faster.")
                    Text("Choose an area. Turn right to add time. Turn left to return it.")
                    Text("Tap the center number to pause and separate Life areas.")
                }
                Section("Feedback") {
                    Toggle("Touch feedback", isOn: $touchFeedback)
                    Button("Show tips again") { showTips = true }
                }
            }.spreadListSurface()
            .navigationTitle("Gesture help")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }.presentationDetents([.medium, .large])
    }
}

#if DEBUG
/// Test seam for accessibility text size. `-SpreadTestDynamicType accessibility3` applies
/// that size to the Life view. XCUITest launch arguments populate the defaults domain, and
/// the simulator's own content-size launch argument does not reach this SwiftUI tree.
/// Release builds never compile this.
private struct LifeDebugDynamicTypeOverride: ViewModifier {
    func body(content: Content) -> some View {
        if UserDefaults.standard.string(forKey: "SpreadTestDynamicType") == "accessibility3" {
            content.environment(\.dynamicTypeSize, .accessibility3)
        } else {
            content
        }
    }
}
#endif
#endif
