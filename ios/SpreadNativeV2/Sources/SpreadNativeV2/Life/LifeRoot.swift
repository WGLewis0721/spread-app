#if os(iOS)
import SwiftUI

enum LifeDestination: String, CaseIterable, Identifiable {
    case life = "Life", hours = "Hours", week = "Week"
    var id: String { rawValue }
    var icon: String { self == .life ? "icon-spread-list" : self == .hours ? "icon-rollover" : "icon-week" }
}
private enum LifeLocalSheet: Identifiable {
    case manage(String), reserve(String), priority(String), delete(String), addTask, help
    var id: String {
        switch self {
        case .manage(let id): return "manage-" + id
        case .reserve(let id): return "reserve-" + id
        case .priority(let id): return "priority-" + id
        case .delete(let id): return "delete-" + id
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
    @State private var destination: LifeDestination = .life
    @State private var focusedRole: String?
    @State private var editing = false
    @State private var navigationOpen = false
    @State private var localSheet: LifeLocalSheet?
    @State private var dockControlsHeight: CGFloat = 62
    @State private var dockOpenerCenterY: CGFloat = 31
    @State private var weekTick = 0
    @State private var pendingTask: (role: String, task: String)?
    @AppStorage("native.life.crownRight") private var crownRight = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                LifePalette.canvas.ignoresSafeArea()
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
                                    surface(snapshot)
                                }
                                .frame(maxWidth: 700).frame(maxWidth: .infinity)
                                .padding(.horizontal, 16).padding(.top, 8).padding(.bottom, 28)
                            }
                            .scrollDismissesKeyboard(.interactively).scrollIndicators(.hidden)
                            .onChange(of: destination) { _, _ in proxy.scrollTo("life-top", anchor: .top) }
                        }
                        bottom(snapshot)
                    } else {
                        ProgressView("Opening your plan…").frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                }
                .accessibilityHidden(navigationOpen)
                if navigationOpen { navigation(width: geometry.size.width) }
            }
        }
        .foregroundStyle(LifePalette.ink).tint(LifePalette.accent)
        .task { await planner.refresh() }
        .onChange(of: scenePhase) { _, phase in if phase == .active { Task { await planner.refresh() } } }
        .onChange(of: planner.state?.envelope.profileId) { _, _ in
            focusedRole = nil; editing = false; localSheet = nil; pendingTask = nil
        }
        .onChange(of: planner.snapshot?.weekKey) { _, _ in focusedRole = nil; editing = false; localSheet = nil }
        .onChange(of: editing) { _, active in LifeFeedback.edit(active) }
        .sensoryFeedback(.selection, trigger: weekTick) { _, _ in LifeFeedback.enabled }
        .sheet(item: $localSheet, onDismiss: {
            if let pending = pendingTask {
                pendingTask = nil
                onOpenTask(pending.role, pending.task)
            }
        }, content: sheetContent)
        .accessibilityIdentifier("life-root")
    }
    private var header: some View {
        HStack(spacing: 8) {
            Button { navigate(.life) } label: {
                HStack(spacing: 8) { SpreadBrandMark(size: 27); Text("Spread").font(.title3.bold()) }
                    .frame(minHeight: 44)
            }.buttonStyle(.plain).accessibilityLabel("Spread, Life").accessibilityIdentifier("life-home")
            Spacer(minLength: 4)
            if let snapshot = planner.snapshot {
                Button(action: today) {
                    Text(PlannerDates.weekRange(base: snapshot.weekKey, offset: 0)).font(.subheadline)
                        .foregroundStyle(LifePalette.secondary).frame(minHeight: 44)
                }.accessibilityLabel("Back to this week")
            }
            Button(action: onMore) {
                Image(systemName: "ellipsis").frame(width: 44, height: 44)
                    .background(LifePalette.surface, in: Circle())
            }.accessibilityLabel("More").accessibilityIdentifier("life-more")
        }.padding(.horizontal, 16).padding(.vertical, 4)
    }
    @ViewBuilder private func surface(_ snapshot: PlannerSnapshot) -> some View {
        switch destination {
        case .life: life(snapshot)
        case .hours:
            LifeHoursView(planner: planner, snapshot: snapshot, onHelp: { localSheet = .help })
        case .week:
            VStack(alignment: .leading, spacing: 16) {
                Text("Your week").font(.largeTitle.bold()).accessibilityAddTraits(.isHeader)
                Text("One day at a time.").font(.subheadline).foregroundStyle(LifePalette.secondary)
                LifeWeekView(planner: planner, snapshot: snapshot, onOpenTask: onOpenTask,
                             onReserve: { localSheet = .reserve($0) },
                             onManage: { localSheet = .manage($0) }, onDelete: { localSheet = .delete($0) })
            }.accessibilityIdentifier("life-week-page")
        }
    }
    private func life(_ snapshot: PlannerSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Life").font(.largeTitle.bold()).accessibilityAddTraits(.isHeader)
                    Text("Choose a Life area.").font(.subheadline).foregroundStyle(LifePalette.secondary)
                }
                Spacer(minLength: 8)
                Button { focusedRole = nil; editing.toggle() } label: {
                    Group {
                        if editing { Text("Done").font(.subheadline) }
                        else { SpreadIcon(name: "icon-edit", size: 22) }
                    }.frame(minWidth: 44, minHeight: 44).background(LifePalette.surface, in: Capsule())
                }.accessibilityLabel(editing ? "Done editing Life areas" : "Edit Life areas")
                    .accessibilityIdentifier("life-edit")
            }.padding(.horizontal, 4)
            Button { navigate(.hours) } label: { summary(snapshot) }.buttonStyle(.plain)
                .accessibilityLabel("Adjust weekly planning hours")
            if editing {
                Text("Swipe left to manage. Swipe right to delete.").font(.subheadline).foregroundStyle(LifePalette.secondary)
                history
            }
            if focusedRole != nil && !editing {
                Button { focusedRole = nil } label: {
                    Label("All Life areas", systemImage: "chevron.left").frame(minHeight: 44)
                }
            }
            if snapshot.roles.isEmpty {
                Text("Name the responsibilities you want to plan for.").font(.body)
                Button("Add a Life area", action: onNewRole).frame(minHeight: 44)
            } else {
                LifeWalletStack(planner: planner, snapshot: snapshot, roles: snapshot.roles,
                                selectedRole: $focusedRole, editing: editing,
                                onManage: { localSheet = .manage($0) }, onDelete: { localSheet = .delete($0) },
                                onBeginEdit: { focusedRole = $0; editing = true })
            }
            if let id = focusedRole, let role = snapshot.roles.first(where: { $0.id == id }) {
                details(role, snapshot: snapshot)
            } else if !editing && !snapshot.roles.isEmpty {
                Text("Tap a card to see its tasks.").font(.subheadline).foregroundStyle(LifePalette.secondary)
                    .frame(maxWidth: .infinity).padding(.top, 12)
            }
            if !snapshot.roles.isEmpty { Button("Add a Life area", action: onNewRole).frame(minHeight: 44) }
        }.accessibilityIdentifier("life-page")
    }
    private func summary(_ snapshot: PlannerSnapshot) -> some View {
        let assigned = snapshot.roles.reduce(0) { $0 + $1.hours }
        return VStack(spacing: 10) {
            ViewThatFits(in: .horizontal) {
                HStack {
                    Text("\(SpreadHours.text(assigned))h assigned")
                    Spacer()
                    capacitySummary(snapshot, assigned: assigned)
                }
                VStack(alignment: .leading) {
                    Text("\(SpreadHours.text(assigned))h assigned")
                    capacitySummary(snapshot, assigned: assigned)
                }
            }.font(.subheadline)
            GeometryReader { geometry in
                let capacity = max(max(assigned, snapshot.life?.capacityHours ?? assigned), 1)
                HStack(spacing: 2) {
                    ForEach(snapshot.roles) { role in
                        Rectangle().fill(Color(hex: role.color))
                            .frame(width: max(0, geometry.size.width * role.hours / capacity - 2))
                    }
                    Spacer(minLength: 0)
                }.background(LifePalette.fill).clipShape(Capsule())
            }.frame(height: 5).accessibilityHidden(true)
        }.padding(.horizontal, 4).padding(.bottom, 8)
    }
    @ViewBuilder private func capacitySummary(_ snapshot: PlannerSnapshot, assigned: Double) -> some View {
        if let capacity = snapshot.life?.capacityHours {
            Text("\(SpreadHours.text(capacity - assigned))h unassigned").foregroundStyle(LifePalette.secondary)
        } else {
            Text("Set weekly hours").foregroundStyle(LifePalette.accent)
        }
    }
    private func details(_ role: Responsibility, snapshot: PlannerSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(role.name) this week").font(.headline)
                    Text("\(SpreadHours.text(snapshot.remainingHours(for: role.id)))h still to place")
                        .font(.subheadline).foregroundStyle(LifePalette.secondary)
                }
                Spacer(minLength: 8)
                Button("Place hours") { localSheet = .reserve(role.id) }.frame(minHeight: 44)
            }
            if editing {
                HStack {
                    Button("Manage") { localSheet = .manage(role.id) }
                    Button("Delete", role: .destructive) { localSheet = .delete(role.id) }
                }.frame(minHeight: 44)
            } else {
                Button("Prioritize this week") { localSheet = .priority(role.id) }.frame(minHeight: 44)
            }
            LifeTaskRows(planner: planner, snapshot: snapshot, tasks: snapshot.tasks(for: role.id), onOpenTask: onOpenTask)
            LifeQuickAdd(planner: planner, roleId: role.id, onOpenTask: onOpenTask)
        }
        .padding(16).background(LifePalette.surface, in: RoundedRectangle(cornerRadius: 23))
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
        }.frame(minHeight: 44)
    }
    private func bottom(_ snapshot: PlannerSnapshot) -> some View {
        VStack(spacing: 4) {
            if !editing && (planner.undoId != nil || planner.redoId != nil) { history }
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 10) {
                    if !crownRight { crown(snapshot).frame(maxWidth: 270) }
                    dockActions
                    if crownRight { crown(snapshot).frame(maxWidth: 270) }
                }
                VStack(spacing: 8) {
                    HStack { if !crownRight { Spacer() }; dockActions; if crownRight { Spacer() } }
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
    private var dockActions: some View {
        HStack(spacing: 8) {
            if !crownRight { addTaskButton }
            trayButton
            if crownRight { addTaskButton }
        }.fixedSize(horizontal: true, vertical: false)
    }
    private var trayButton: some View {
        Button { withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.25)) { navigationOpen = true } } label: {
            VStack(spacing: 2) {
                SpreadIcon(name: destination.icon, size: 22)
                Text(destination.rawValue).font(.caption)
            }.frame(minWidth: 44, minHeight: 44)
        }.accessibilityLabel("Open navigation").accessibilityIdentifier("life-navigation")
            .background {
                GeometryReader { geometry in
                    Color.clear.preference(key: LifeDockOpenerCenterKey.self,
                        value: geometry.frame(in: .named("life-dock-controls")).midY)
                }
            }
    }
    private var addTaskButton: some View {
        Button { localSheet = .addTask } label: {
            Image(systemName: "plus").font(.title2).frame(width: 44, height: 44)
                .foregroundStyle(.white).background(LifePalette.accent, in: Circle())
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
        ZStack(alignment: crownRight ? .leading : .trailing) {
            Color.black.opacity(0.28).ignoresSafeArea()
                .onTapGesture { navigationOpen = false }.accessibilityHidden(true)
            VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    HStack {
                        SpreadBrandMark(size: 27); Text("Spread").font(.title2.bold()); Spacer()

                    }
                    ForEach(LifeDestination.allCases) { item in
                        Button { navigate(item) } label: {
                            HStack { SpreadIcon(name: item.icon); Text(item.rawValue).font(.title3); Spacer(); Image(systemName: "chevron.right") }
                                .frame(minHeight: 52)
                        }.accessibilityAddTraits(destination == item ? .isSelected : [])
                            .accessibilityIdentifier("life-nav-\(item.rawValue.lowercased())")
                    }
                    Menu("Crown position") {
                        Button("Move Crown left") { crownRight = false }
                        Button("Move Crown right") { crownRight = true }
                    }.frame(minHeight: 44)
                    Button("Gesture help") { navigationOpen = false; localSheet = .help }.frame(minHeight: 44)
                    Button("More") { navigationOpen = false; onMore() }.frame(minHeight: 44)
                }.padding(20)
            }
            HStack {
                if !crownRight { Spacer(minLength: 0) }
                Button {
                    withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.25)) { navigationOpen = false }
                } label: {
                    Image(systemName: "xmark").frame(width: 44, height: 44)
                }
                .accessibilityLabel("Close navigation")
                .accessibilityIdentifier("life-navigation-close")
                .offset(y: max(0, dockOpenerCenterY - 22))
                if crownRight { Spacer(minLength: 0) }
            }
            .frame(height: dockControlsHeight, alignment: .top)
            .padding(.horizontal, 16).padding(.vertical, 8)
            }
            .frame(width: min(300, max(0, width - 32))).frame(maxHeight: .infinity)
            .background(LifePalette.surface).transition(.move(edge: crownRight ? .leading : .trailing))
            .accessibilityAddTraits(.isModal)
        }
    }
    private func navigate(_ value: LifeDestination) {
        if destination != value { LifeFeedback.selection() }
        destination = value; navigationOpen = false; focusedRole = nil; editing = false
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
        case .delete(let id): LifeDeleteSheet(planner: planner, roleId: id)
        case .help: LifeGestureHelp()
        case .addTask:
            NavigationStack {
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
        NavigationStack {
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
            }
            .navigationTitle("Gesture help")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }.presentationDetents([.medium, .large])
    }
}
#endif
