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
    let onMore: () -> Void
    let onOpenRole: (String) -> Void
    let onOpenTask: (String, String) -> Void
    let onNewRole: () -> Void
    let onDeleteRole: (String) -> Void
    @AccessibilityFocusState private var navigationFocused: Bool
    @AccessibilityFocusState private var openerFocused: Bool
    @State private var destination: LifeDestination = .life
    @State private var focusedRole: String?
    @State private var hoursSelectedRole: String?
    @State private var weekSelectedRole: String?
    @State private var editing = false
    @State private var navigationOpen = false
    @State private var navigationDrag: CGFloat = 0
    @State private var localSheet: LifeLocalSheet?
    @State private var dockControlsHeight: CGFloat = 62
    @State private var dockOpenerCenterY: CGFloat = 31
    @State private var weekTick = 0
    @State private var historyVisible = false
    @State private var pendingTask: (role: String, task: String)?
    @AppStorage("native.life.crownRight") private var crownRight = true
    @AppStorage(LifeEditorialPresentation.defaultsKey) private var editorialArt = false
    @AppStorage("native.life.navigationExpanded") private var navigationExpanded = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                LifePalette.canvas.ignoresSafeArea()
                HStack(spacing: 0) {
                    if geometry.size.width >= 820 {
                        VStack(spacing: 8) {
                            compactRail
                            if destination == .life { editControl }
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
                                    surface(snapshot, viewportHeight: geometry.size.height,
                                            viewportWidth: geometry.size.width)
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
                            // Editorial expansion moves the details panel to the top of the
                            // scroll area. The scroll area ends above the dock, so the Days
                            // heading and the first weekday read without manual scrolling.
                            // Golden presentation keeps its existing scroll behaviour.
                            .onChange(of: focusedRole) { _, newRole in
                                guard editorialArt, newRole != nil else { return }
                                Task { @MainActor in
                                    // Let the wallet's expansion lay out before scrolling.
                                    try? await Task.sleep(for: .milliseconds(reduceMotion ? 60 : 320))
                                    withAnimation(reduceMotion ? nil : SpreadTactile.walletFocus) {
                                        proxy.scrollTo("life-details-top", anchor: .top)
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
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await planner.refresh() } }
            else { navigationOpen = false }
        }
        .onChange(of: planner.state?.envelope.profileId) { _, _ in
            focusedRole = nil; editing = false; localSheet = nil; pendingTask = nil
            hoursSelectedRole = nil; weekSelectedRole = nil
        }
        .onChange(of: planner.snapshot?.weekKey) { _, _ in focusedRole = nil; editing = false; localSheet = nil }
        .onChange(of: editing) { _, active in LifeFeedback.edit(active) }
        .onChange(of: navigationOpen) { _, open in
            navigationFocused = open
            if !open { openerFocused = true }
        }
        .onChange(of: weekTick) { _, _ in SpreadHaptics.selection() }
        .sheet(item: $localSheet, onDismiss: {
            if let pending = pendingTask {
                pendingTask = nil
                onOpenTask(pending.role, pending.task)
            }
        }, content: sheetContent)
        .task(id: planner.state?.revision) {
            guard planner.undoId != nil || planner.redoId != nil else { historyVisible = false; return }
            historyVisible = true
            do { try await Task.sleep(for: .seconds(5)) } catch { return }
            historyVisible = false
        }
        .accessibilityIdentifier("life-root")
        #if DEBUG
        .modifier(LifeDebugDynamicTypeOverride())
        #endif
    }
    private var header: some View {
        HStack(spacing: 8) {
            Button { navigate(.life) } label: {
                HStack(spacing: 8) { SpreadBrandMark(size: 27); Text("Spread").font(.title3.bold()) }
                    .frame(minHeight: 44)
            }.buttonStyle(.plain).accessibilityLabel("Spread, Life").accessibilityIdentifier("life-home")
            Spacer(minLength: 4)
            Button(action: onMore) {
                Image(systemName: "ellipsis").frame(width: 44, height: 44)
                    .background(LifePalette.surface, in: Circle())
            }.accessibilityLabel("More").accessibilityIdentifier("life-more")
        }.padding(.horizontal, 16).padding(.vertical, 4)
    }
    @ViewBuilder private func surface(_ snapshot: PlannerSnapshot, viewportHeight: CGFloat, viewportWidth: CGFloat) -> some View {
        switch destination {
        case .life: life(snapshot, viewportHeight: viewportHeight, viewportWidth: viewportWidth)
        case .hours:
            LifeHoursView(planner: planner, snapshot: snapshot, onHelp: { localSheet = .help }, selectedRole: $hoursSelectedRole)
        case .week:
            VStack(alignment: .leading, spacing: 16) {
                Text("Your week").font(.largeTitle.bold()).accessibilityAddTraits(.isHeader)
                Text("One day at a time.").font(.subheadline).foregroundStyle(LifePalette.secondary)
                LifeWeekView(planner: planner, snapshot: snapshot, onOpenTask: onOpenTask,
                             onReserve: { localSheet = .reserve($0) },
                             onManage: { localSheet = .manage($0) }, onDelete: { _ in },

                             selectedRole: $weekSelectedRole)
            }.accessibilityIdentifier("life-week-page")
        }
    }
    private func life(_ snapshot: PlannerSnapshot, viewportHeight: CGFloat, viewportWidth: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Life").font(.largeTitle.bold()).accessibilityAddTraits(.isHeader)
                Text("Choose a Life area.").font(.subheadline).foregroundStyle(LifePalette.secondary)
            }.frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 4)
            Button { navigate(.hours) } label: { summary(snapshot) }.buttonStyle(.spreadPress)
                .accessibilityLabel("Adjust weekly planning hours")
            if editing {
                Text("Swipe left to manage. Slide right offscreen to delete. Undo restores.")
                    .font(.subheadline).foregroundStyle(LifePalette.secondary)
                if planner.undoId != nil || planner.redoId != nil { history }
            }
            if snapshot.roles.isEmpty {
                Text("Name the responsibilities you want to plan for.").font(.body)
                newLifeArea
            } else {
                LifeWalletStack(planner: planner, snapshot: snapshot, roles: snapshot.roles,
                                selectedRole: $focusedRole, editing: editing,
                                viewportHeight: viewportHeight,
                                viewportWidth: viewportWidth,
                                onManage: { localSheet = .manage($0) },
                                onDelete: { id in
                                    let ok = await planner.send(["type": "removeLifeRole", "roleId": id])
                                    if ok {
                                        LifeFeedback.accepted()
                                        if focusedRole == id { focusedRole = nil }
                                        historyVisible = true
                                    }
                                    return ok
                                })
                    .zIndex(2)
            }
            if let id = focusedRole, let role = snapshot.roles.first(where: { $0.id == id }) {
                details(role, snapshot: snapshot)
                    .id(id)
                    // Keep old and new fields visually connected as focus changes.
                    .transition(SpreadTactile.detailReveal)
            } else if !editing && !snapshot.roles.isEmpty {
                Text("Tap a card to see its tasks.").font(.subheadline).foregroundStyle(LifePalette.secondary)
                    .frame(maxWidth: .infinity).padding(.top, 12)
            }
            if !snapshot.roles.isEmpty { newLifeArea }
        }.accessibilityIdentifier("life-page")
    }
    private var newLifeArea: some View {
        Button(action: onNewRole) {
            HStack(spacing: 12) {
                SpreadIcon(name: "icon-new-life", size: 32, original: true)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Add a Life area").font(.system(.body, weight: .semibold))
                    Text("Make room for what matters.").font(Spread.footnote)
                        .foregroundStyle(Spread.secondary)
                }
                Spacer(minLength: 0)
                Image(systemName: "plus").font(.subheadline.weight(.semibold))
                    .foregroundStyle(Spread.accent)
            }
            .padding(16)
            .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
            .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
            .contentShape(RoundedRectangle(cornerRadius: Spread.radiusCard))
        }
        .buttonStyle(.spreadPress)
        .accessibilityIdentifier("life-new-area")
    }

    private func summary(_ snapshot: PlannerSnapshot) -> some View {
        let assigned = snapshot.roles.reduce(0) { $0 + $1.hours }
        return HStack(alignment: .center, spacing: 10) {
            Image(systemName: "calendar.badge.clock")
                .font(.system(.title3, weight: .semibold))
                .foregroundStyle(Spread.accent)
                .frame(width: 44, height: 44)
                .background(Spread.accent.opacity(0.12),
                            in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 4) {
                summaryTitle(assigned: assigned)
                Text("Across " + String(snapshot.roles.count) + " Life areas")
                    .font(.caption).foregroundStyle(Spread.secondary)
                capacitySummary(snapshot, assigned: assigned)
                    .font(.caption)
                summaryRoleColors(snapshot, assigned: assigned)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Image(systemName: "chevron.right")
                .font(.system(.subheadline, weight: .bold))
                .foregroundStyle(Spread.ink)
                .frame(width: 20, height: 44)
                .accessibilityHidden(true)
        }
        .padding(.horizontal, 12).padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .spreadCard()
    }

    private func summaryTitle(assigned: Double) -> some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(SpreadHours.text(assigned) + "h")
                    .font(.system(.title2, weight: .bold)).monospacedDigit()
                Text("assigned").font(.system(.subheadline, weight: .medium))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(SpreadHours.text(assigned) + "h")
                    .font(.system(.title2, weight: .bold)).monospacedDigit()
                Text("assigned").font(.system(.subheadline, weight: .medium))
            }
        }
        .foregroundStyle(Spread.ink)
    }

    private func summaryRoleColors(_ snapshot: PlannerSnapshot, assigned: Double) -> some View {
        GeometryReader { geometry in
            let roles = snapshot.roles.filter { $0.hours > 0 }
            let gap: CGFloat = 3
            let usable = max(0, geometry.size.width - CGFloat(max(0, roles.count - 1)) * gap)
            HStack(spacing: gap) {
                ForEach(roles) { role in
                    Capsule().fill(Color(hex: role.color))
                        .frame(width: usable * CGFloat(role.hours / max(assigned, 0.5)), height: 6)
                }
            }
        }
        .frame(maxWidth: 116).frame(height: 6)
        .accessibilityHidden(true)
    }
    @ViewBuilder private func capacitySummary(_ snapshot: PlannerSnapshot, assigned: Double) -> some View {
        if let capacity = snapshot.life?.capacityHours {
            Text("\(SpreadHours.text(capacity - assigned))h unassigned").foregroundStyle(LifePalette.secondary)
        } else {
            Text("Set weekly hours").foregroundStyle(LifePalette.accent)
        }
    }
    private func details(_ role: Responsibility, snapshot: PlannerSnapshot) -> some View {
        let weekdayHours = LifeCardWeekDistribution.hours(for: role.id, snapshot: snapshot)
        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(role.name) this week").font(.headline)
                    Text("\(SpreadHours.text(snapshot.remainingHours(for: role.id)))h still to place")
                        .font(.subheadline).foregroundStyle(LifePalette.secondary)
                }
                Spacer(minLength: 8)
                Button("Place hours") { localSheet = .reserve(role.id) }
                    .padding(.horizontal, 12).frame(minHeight: 44)
                    .spreadChip(selected: true).buttonStyle(.spreadPress)
            }
            Button("Change area hours") {
                // Preserve the card context when moving into the Hours instrument.
                hoursSelectedRole = role.id
                navigate(.hours)
            }
                .frame(minHeight: 44).buttonStyle(.spreadPress)
                .accessibilityIdentifier("life-change-area-hours")
            // The selected face already shows all seven days. The details
            // field lists only meaningful assignments and keeps editing below.
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Days").font(.headline)
                    Spacer()
                    Text(SpreadHours.text(LifeCardWeekDistribution.assigned(weekdayHours)) +
                         " h assigned")
                        .font(.caption).foregroundStyle(LifePalette.secondary)
                }
                ForEach(0..<7, id: \.self) { index in
                    if weekdayHours[index] > 0 {
                        HStack {
                            Text(PlannerDates.label(
                                PlannerDates.date(PlannerDates.dayISO(
                                    weekKey: snapshot.weekKey, index: index)),
                                pattern: "EEEE"))
                            Spacer()
                            Text(SpreadHours.text(weekdayHours[index]) + " h")
                                .monospacedDigit()
                        }
                        .font(.subheadline)
                        .padding(.vertical, 3)
                    }
                }
                if !weekdayHours.contains(where: { $0 > 0 }) {
                    Text("No hours assigned to days yet.")
                        .font(.subheadline).foregroundStyle(LifePalette.secondary)
                }
            }
            if !editing {
                Button("Prioritize this week") { localSheet = .priority(role.id) }
                    .padding(.horizontal, 12).frame(minHeight: 44)
                    .spreadChip(selected: false).buttonStyle(.spreadPress)
            }
            VStack(alignment: .leading, spacing: 0) {
                LifeTaskRows(planner: planner, snapshot: snapshot, tasks: snapshot.tasks(for: role.id), onOpenTask: onOpenTask)
                LifeQuickAdd(planner: planner, roleId: role.id, onOpenTask: onOpenTask)
                    .padding(.horizontal, 12).padding(.vertical, 6)
            }
            .background(Spread.inset, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        // Scroll target for editorial expansion: the top edge of the panel. Editorial only.
        // A 1pt clear overlay adds no layout and cannot receive taps.
        .overlay(alignment: .top) {
            if editorialArt {
                Color.clear.frame(height: 1).allowsHitTesting(false).id("life-details-top")
            }
        }
        .padding(16).spreadCard(radius: Spread.radiusCard)
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
    }
    private func bottom(_ snapshot: PlannerSnapshot, wide: Bool) -> some View {
        VStack(spacing: 4) {
            if !editing && historyVisible && (planner.undoId != nil || planner.redoId != nil) { history }
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 10) {
                    if !crownRight { crown(snapshot).frame(maxWidth: 270) }
                    dockActions(wide: wide)
                    if crownRight { crown(snapshot).frame(maxWidth: 270) }
                }
                VStack(spacing: 8) {
                    HStack { if !crownRight { Spacer() }; dockActions(wide: wide); if crownRight { Spacer() } }
                    crown(snapshot)
                }
            }
            .coordinateSpace(name: "life-dock-controls")
            .background {
                GeometryReader { geometry in
                    Color.clear.preference(key: LifeDockHeightKey.self, value: geometry.size.height)
                }
            }
            .onPreferenceChange(LifeDockHeightKey.self) { dockControlsHeight = $0 }
            .onPreferenceChange(LifeDockOpenerCenterKey.self) { if $0 > 0 { dockOpenerCenterY = $0 } }
        }
        .padding(.horizontal, 16).padding(.vertical, 8)
        .background(reduceTransparency ? LifePalette.surface : LifePalette.surface.opacity(0.94))
    }
    private func dockActions(wide: Bool) -> some View {
        HStack(spacing: 8) {
            if !crownRight { addTaskButton }
            if !wide { trayButton }
            if crownRight { addTaskButton }
        }.fixedSize(horizontal: true, vertical: false)
    }
    /// Edit lives in the navigation tray/rail, never above the Life cards.
    /// It is the only way to enter Edit mode.
    private var editControl: some View {
        Button {
            guard destination == .life else { return }
            focusedRole = nil
            editing.toggle()
            closeNavigation()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: editing ? "checkmark.circle" : "pencil")
                    .font(.system(size: 21, weight: .medium))
                if navigationOpen {
                    Text(editing ? "Done editing" : "Edit Life areas")
                        .font(.subheadline.weight(.medium))
                } else if navigationExpanded {
                    Text(editing ? "Done" : "Edit").font(.caption)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 52,
                   alignment: navigationOpen ? .leading : .center)
            .contentShape(Rectangle())
        }
        .buttonStyle(.spreadPress)
        .padding(.horizontal, 10)
        .accessibilityLabel(editing ? "Done editing Life areas" : "Edit Life areas")
        .accessibilityIdentifier("life-edit")
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
                      detail: "Week Crown", onDetail: today, onMove: goWeek)
            .contextMenu {
                Button("Move Crown left") { crownRight = false }
                Button("Move Crown right") { crownRight = true }
            }
            .accessibilityAction(named: "Move Crown left") { crownRight = false }
            .accessibilityAction(named: "Move Crown right") { crownRight = true }
            .accessibilityIdentifier("life-bottom-crown")
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
                    if destination == .life { editControl }
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
            .accessibilityAddTraits(.isModal)
            .accessibilityAction(.escape) { closeNavigation() }
        }
    }
    private func navigate(_ value: LifeDestination) {
        if destination != value { LifeFeedback.selection() }
        withAnimation(reduceMotion ? nil : SpreadTactile.glide) {
            destination = value
            editing = false
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
    private func goWeek(_ delta: Int) {
        Task { if await planner.send(["type": "changeWeek", "direction": delta]) { weekTick += 1 } }
    }
    private func today() {
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
                            Button("Add a Life area") { localSheet = nil; onNewRole() }.frame(minHeight: 44)
                        }
                    }.padding()
                }.navigationTitle("Add task")
            }.presentationDragIndicator(.visible)
        }
    }
}

private struct LifeDockOpenerCenterKey: PreferenceKey {
    static let defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() }
}

private struct LifeDockHeightKey: PreferenceKey {
    static let defaultValue: CGFloat = 62
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() }
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
                    Text("Choose an area. Turn left to add time. Turn right to return it.")
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
