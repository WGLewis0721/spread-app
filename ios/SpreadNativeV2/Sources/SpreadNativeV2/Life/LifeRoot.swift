#if os(iOS)
import SwiftUI

/// Life is an opt-in native presentation of the existing planner, not a second planner.
/// All real edits continue through LivePlanner's guarded TypeScript bridge.
enum LifeDestination: String, CaseIterable, Identifiable {
    case life = "Life"
    case hours = "Hours"
    case week = "Week"
    var id: String { rawValue }
    var icon: String {
        switch self {
        case .life: "square.stack.3d.up"
        case .hours: "circle.dotted.circle"
        case .week: "calendar"
        }
    }
}

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
    @State private var month = false
    @State private var selectedDay = PlannerDates.localISO()
    @State private var monthAnchor = PlannerDates.date(PlannerDates.localISO())
    @State private var menuOpen = false
    @State private var gestureHelp = false
    @State private var weekTick = 0
    @AppStorage("native.life.crownRight") private var crownRight = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        ZStack {
            Spread.canvas.ignoresSafeArea()
            VStack(spacing: 0) {
                titleBar
                if let snapshot = planner.snapshot {
                    ScrollView {
                        VStack(spacing: 16) {
                            if planner.saveFailure != nil {
                                Label("Changes could not be saved. Open More to back up your plan.", systemImage: "exclamationmark.triangle")
                                    .font(.callout).foregroundStyle(Spread.danger)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            switch destination {
                            case .life: lifePage(snapshot)
                            case .hours:
                                LifeHoursView(planner: planner, snapshot: snapshot, onHelp: { gestureHelp = true })
                            case .week: weekPage(snapshot)
                            }
                            Color.clear.frame(height: 8)
                        }
                        .frame(maxWidth: 700)
                        .frame(maxWidth: .infinity)
                        .padding(.horizontal, 16)
                    }
                    .scrollDismissesKeyboard(.interactively)
                    .scrollIndicators(.hidden)
                    bottomControls(snapshot)
                } else {
                    ProgressView("Opening your plan…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
        }
        .foregroundStyle(Spread.ink)
        .tint(Spread.accent)
        .task { await planner.refresh() }
        .onChange(of: planner.state?.envelope.profileId) { _, _ in resetForContext() }
        .onChange(of: planner.snapshot?.weekKey) { _, key in
            guard let key else { return }
            let days = (0..<7).map { PlannerDates.dayISO(weekKey: key, index: $0) }
            if !days.contains(selectedDay) { selectedDay = key }
            focusedRole = nil
        }
        .sensoryFeedback(.selection, trigger: weekTick)
        .sheet(isPresented: $gestureHelp) { LifeGestureHelp() }
        .accessibilityIdentifier("life-root")
    }

    private var titleBar: some View {
        HStack(spacing: 12) {
            Button { destination = .life; focusedRole = nil } label: {
                HStack(spacing: 9) {
                    SpreadBrandMark(size: 30)
                    Text("Life").font(.system(.title2, weight: .bold))
                }
                .frame(minHeight: 44)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("life-home")
            Spacer(minLength: 4)
            Button {
                if destination == .life && focusedRole != nil { focusedRole = nil }
                else { editing.toggle(); SpreadHaptics.editMode(entering: editing) }
            } label: {
                Label(focusedRole != nil ? "Back" : editing ? "Done" : "Edit",
                      systemImage: focusedRole != nil ? "arrow.left" : "pencil")
                    .font(.system(.subheadline, weight: .semibold))
                    .frame(minHeight: 44)
            }
            .accessibilityIdentifier("life-edit")
            Menu {
                ForEach(LifeDestination.allCases) { page in
                    Button { destination = page; focusedRole = nil } label: {
                        Label(page.rawValue, systemImage: page.icon)
                    }
                }
                Divider()
                Button("Move Crown left") { crownRight = false }
                Button("Move Crown right") { crownRight = true }
                Button("Gesture help") { gestureHelp = true }
                Button("More") { onMore() }
            } label: {
                Image(systemName: "line.3.horizontal")
                    .font(.system(size: 20, weight: .semibold))
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .accessibilityLabel("Life navigation and options")
            .accessibilityIdentifier("life-menu")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 6)
    }

    @ViewBuilder
    private func lifePage(_ snapshot: PlannerSnapshot) -> some View {
        let assigned = snapshot.roles.reduce(0) { $0 + $1.hours }
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Your Life").font(.system(.largeTitle, weight: .bold))
                    Text("Give your time to what matters.")
                        .font(.subheadline).foregroundStyle(Spread.secondary)
                }
                Spacer(minLength: 0)
                Button { destination = .hours } label: {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(SpreadHours.text(assigned) + " h")
                            .font(.system(.title3, weight: .bold)).monospacedDigit()
                        Text("assigned").font(.caption).foregroundStyle(Spread.secondary)
                    }.frame(minWidth: 58, minHeight: 44)
                }
                .accessibilityLabel("Open Hours, \(SpreadHours.spoken(assigned)) assigned")
            }
            if snapshot.roles.isEmpty {
                ContentUnavailableView("Make room for what matters", systemImage: "square.stack.3d.up",
                                       description: Text("Create a Life area to start planning."))
                Button("Create Life area") { onNewRole() }.buttonStyle(.borderedProminent)
            } else if let id = focusedRole, let role = snapshot.roles.first(where: { $0.id == id }) {
                LifeWalletCard(role: role, editing: editing, onTap: { focusedRole = nil },
                               onManage: { onOpenRole(role.id) }, onDelete: { onDeleteRole(role.id) })
                    .accessibilityIdentifier("life-focused-card")
                Button { focusedRole = nil } label: {
                    Label("All Life areas", systemImage: "square.stack.3d.up")
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(.bordered)
                roleDetails(role, snapshot: snapshot)
            } else {
                let step: CGFloat = typeSize.isAccessibilitySize ? 105 : 67
                ZStack(alignment: .top) {
                    ForEach(snapshot.roles.indices, id: \.self) { index in
                        let role = snapshot.roles[index]
                        LifeWalletCard(role: role, editing: editing,
                                       onTap: { withAnimation(reduceMotion ? nil : .spring(response: 0.32)) {
                                           focusedRole = role.id
                                       }},
                                       onManage: { onOpenRole(role.id) },
                                       onDelete: { onDeleteRole(role.id) })
                            .offset(y: CGFloat(index) * step)
                            .zIndex(Double(snapshot.roles.count - index))
                    }
                }
                .frame(height: CGFloat(max(0, snapshot.roles.count - 1)) * step + 200)
                .accessibilityIdentifier("life-wallet-stack")
                Button { onNewRole() } label: {
                    Label("Add Life area", systemImage: "plus")
                        .frame(maxWidth: .infinity, minHeight: 48)
                }.buttonStyle(.bordered)
            }
            historyControls
        }
        .accessibilityIdentifier("life-page")
    }

    private func roleDetails(_ role: Responsibility, snapshot: PlannerSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Tasks").font(.title3.bold())
                Spacer()
                Text("\(snapshot.tasks(for: role.id).filter(\.done).count)/\(snapshot.tasks(for: role.id).count)")
                    .font(.subheadline).foregroundStyle(Spread.secondary)
                Button("Manage") { onOpenRole(role.id) }.frame(minHeight: 44)
            }
            let tasks = snapshot.tasks(for: role.id)
            if tasks.isEmpty {
                Text("No tasks yet. Add one to begin.")
                    .font(.subheadline).foregroundStyle(Spread.secondary)
            }
            ForEach(tasks) { task in taskRow(task) }
            Button { onOpenRole(role.id) } label: {
                Label("Add task", systemImage: "plus")
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.bordered)
        }
        .padding(16)
        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: 22))
        .accessibilityIdentifier("life-task-details")
    }

    private func taskRow(_ task: PlannerTask) -> some View {
        HStack(spacing: 10) {
            Button {
                Task { await planner.send(["type": "toggleTask", "roleId": task.roleId,
                                           "taskId": task.id], completionHaptic: true) }
            } label: {
                Image(systemName: task.done ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 23))
                    .foregroundStyle(task.done ? Spread.accent : Spread.secondary)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel(task.done ? "Mark \(task.text) incomplete" : "Complete \(task.text)")
            Button { onOpenTask(task.roleId, task.id) } label: {
                HStack {
                    Text(task.text)
                        .font(.body)
                        .strikethrough(task.done)
                        .foregroundStyle(Spread.ink)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    if let estimate = task.estimateMinutes {
                        Text("\(estimate)m").font(.caption).foregroundStyle(Spread.secondary)
                    }
                    Image(systemName: "chevron.right").foregroundStyle(Spread.tertiary)
                }
                .frame(minHeight: 44).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
        .accessibilityElement(children: .contain)
    }

    @ViewBuilder private var historyControls: some View {
        if planner.undoId != nil || planner.redoId != nil {
            HStack(spacing: 10) {
                if let undoId = planner.undoId {
                    Button { Task { await planner.send(["type": "undo", "editId": undoId]) } } label: {
                        Label("Undo", systemImage: "arrow.uturn.backward").frame(minHeight: 44)
                    }
                    .accessibilityIdentifier("life-undo")
                }
                if let redoId = planner.redoId {
                    Button { Task { await planner.send(["type": "redo", "editId": redoId]) } } label: {
                        Label("Redo", systemImage: "arrow.uturn.forward").frame(minHeight: 44)
                    }
                    .accessibilityIdentifier("life-redo")
                }
            }
            .buttonStyle(.bordered)
        }
    }

    private func weekPage(_ snapshot: PlannerSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text(month ? "Month" : "Week").font(.largeTitle.bold())
                Spacer()
                Button { selectToday() } label: { Text("Today").frame(minHeight: 44) }
                Button {
                    month.toggle()
                    monthAnchor = PlannerDates.date(selectedDay)
                } label: {
                    Label(month ? "Week" : "Month", systemImage: "calendar")
                        .frame(minHeight: 44)
                }
                .accessibilityIdentifier("life-week-month-toggle")
            }
            if month {
                MonthSurface(planner: planner, snapshot: snapshot, anchor: monthAnchor,
                             onPick: { pickDay($0) }, mondayFirst: true)
                HStack {
                    Button { shiftMonth(-1) } label: { Image(systemName: "chevron.left").frame(width: 44, height: 44) }
                    Spacer()
                    Text(PlannerDates.label(monthAnchor, pattern: "MMMM yyyy")).font(.headline)
                    Spacer()
                    Button { shiftMonth(1) } label: { Image(systemName: "chevron.right").frame(width: 44, height: 44) }
                }
            } else {
                HStack(spacing: 4) {
                    ForEach(0..<7, id: \.self) { index in
                        let iso = PlannerDates.dayISO(weekKey: snapshot.weekKey, index: index)
                        Button {
                            withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.2)) { selectedDay = iso }
                        } label: {
                            VStack(spacing: 4) {
                                Text(PlannerDates.weekday(weekKey: snapshot.weekKey, index: index))
                                    .font(.caption2)
                                Text(PlannerDates.dayNumber(weekKey: snapshot.weekKey, index: index))
                                    .font(.headline)
                            }
                            .frame(maxWidth: .infinity, minHeight: 54)
                            .background(selectedDay == iso ? Spread.accent : Spread.elevated,
                                        in: RoundedRectangle(cornerRadius: 12))
                            .foregroundStyle(selectedDay == iso ? Spread.onAccent : Spread.ink)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(PlannerDates.label(PlannerDates.date(iso), pattern: "EEEE, MMMM d"))
                        .accessibilityAddTraits(selectedDay == iso ? .isSelected : [])
                    }
                }
                Text(PlannerDates.label(PlannerDates.date(selectedDay), pattern: "EEEE, MMMM d"))
                    .font(.title3.bold())
                let allocations = snapshot.allocations.filter { $0.day == selectedDay }
                if allocations.isEmpty {
                    ContentUnavailableView("No time placed on this day", systemImage: "calendar")
                }
                ForEach(allocations) { allocation in
                    if let role = snapshot.roles.first(where: { $0.id == allocation.roleId }) {
                        VStack(alignment: .leading, spacing: 10) {
                            LifeWalletCard(role: role, editing: false,
                                           onTap: { onOpenRole(role.id) },
                                           onManage: { onOpenRole(role.id) },
                                           onDelete: { onDeleteRole(role.id) })
                            HStack {
                                Text(SpreadHours.text(allocation.hours) + " h on this day")
                                    .font(.subheadline).foregroundStyle(Spread.secondary)
                                Spacer()
                                Button("Manage") { onOpenRole(role.id) }
                            }
                            ForEach(snapshot.tasks.filter { $0.allocationId == allocation.id }) { task in
                                taskRow(task)
                            }
                        }
                        .padding(12)
                        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: 22))
                    }
                }
                if !snapshot.unplacedTasks.isEmpty {
                    DisclosureGroup("To place (\(snapshot.unplacedTasks.count))") {
                        ForEach(snapshot.unplacedTasks) { task in taskRow(task) }
                    }
                    .padding(14)
                    .background(Spread.elevated, in: RoundedRectangle(cornerRadius: 18))
                }
            }
            historyControls
        }
        .accessibilityIdentifier("life-week-page")
    }

    private func bottomControls(_ snapshot: PlannerSnapshot) -> some View {
        VStack(spacing: 6) {
            HStack(spacing: 8) {
                ForEach(LifeDestination.allCases) { page in
                    Button { destination = page; focusedRole = nil } label: {
                        VStack(spacing: 3) {
                            Image(systemName: page.icon).font(.system(size: 18, weight: .medium))
                            Text(page.rawValue).font(.caption2.weight(.semibold))
                        }
                        .foregroundStyle(destination == page ? Spread.accent : Spread.secondary)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(destination == page ? Spread.accent.opacity(0.11) : .clear,
                                    in: RoundedRectangle(cornerRadius: 12))
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("life-nav-\(page.rawValue.lowercased())")
                    .accessibilityAddTraits(destination == page ? .isSelected : [])
                }
                Button { onMore() } label: {
                    VStack(spacing: 3) {
                        Image(systemName: "ellipsis").font(.system(size: 18, weight: .medium))
                        Text("More").font(.caption2.weight(.semibold))
                    }
                    .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("life-more")
            }
            HStack {
                if crownRight { Spacer(minLength: 0) }
                WeekCrownView(
                    title: PlannerDates.weekRange(base: snapshot.weekKey, offset: 0),
                    detail: nil,
                    onMove: { goWeek($0) }
                )
                .frame(maxWidth: 355)
                if !crownRight { Spacer(minLength: 0) }
            }
            .accessibilityIdentifier("life-bottom-crown")
        }
        .padding(.horizontal, 16)
        .padding(.top, 6)
        .padding(.bottom, 4)
        .background(Spread.canvas)
    }

    private func resetForContext() {
        focusedRole = nil; editing = false; month = false
        selectedDay = planner.snapshot?.weekKey ?? PlannerDates.localISO()
    }
    private func goWeek(_ delta: Int) {
        Task {
            if await planner.send(["type": "changeWeek", "direction": delta]) { weekTick += 1 }
        }
    }
    private func selectToday() {
        let today = PlannerDates.localISO()
        selectedDay = today
        Task { if await planner.send(["type": "changeWeek", "direction": "today"]) { weekTick += 1 } }
    }
    private func shiftMonth(_ delta: Int) {
        monthAnchor = PlannerDates.calendar.date(byAdding: .month, value: delta, to: monthAnchor) ?? monthAnchor
    }
    private func pickDay(_ iso: String) {
        Task {
            let key = PlannerDates.weekKey(for: PlannerDates.date(iso))
            if await planner.send(["type": "openWeek", "weekKey": key]) {
                selectedDay = iso
                month = false
            }
        }
    }
}

/// Entire Wallet card translates as one rigid object. Swipes reveal actions without resizing its face.
private struct LifeWalletCard: View {
    let role: Responsibility
    let editing: Bool
    let onTap: () -> Void
    let onManage: () -> Void
    let onDelete: () -> Void
    @State private var reveal: Int = 0
    @GestureState private var drag: CGFloat = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var shift: CGFloat { CGFloat(reveal) * 88 + drag }
    var body: some View {
        ZStack {
            HStack {
                Button(role: .destructive, action: onDelete) {
                    Label("Delete", systemImage: "trash").font(.caption.bold())
                        .frame(width: 83, height: 60)
                }
                Spacer()
                Button(action: onManage) {
                    Label("Manage", systemImage: "pencil").font(.caption.bold())
                        .frame(width: 86, height: 60)
                }
            }
            .buttonStyle(.bordered)
            cardFace
                .offset(x: shift)
                .highPriorityGesture(DragGesture(minimumDistance: 24)
                    .updating($drag) { value, state, _ in state = value.translation.width }
                    .onEnded { value in
                        withAnimation(reduceMotion ? nil : .spring(response: 0.22)) {
                            reveal = value.translation.width > 65 ? 1 : value.translation.width < -65 ? -1 : 0
                        }
                        if reveal != 0 { SpreadHaptics.selection() }
                    })
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .contain)
        .accessibilityAction(named: Text("Manage \(role.name)")) { onManage() }
        .accessibilityAction(named: Text("Delete \(role.name)")) { onDelete() }
    }

    private var cardFace: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 10) {
                    Image(systemName: editing ? "pencil.circle" : "circle.hexagongrid.fill")
                        .font(.system(size: 22)).foregroundStyle(Color(hex: role.color))
                    Spacer(minLength: 0)
                    Text(role.name)
                        .font(.system(.title2, weight: .bold))
                        .lineLimit(2)
                        .foregroundStyle(Spread.ink)
                    Text(SpreadHours.text(role.hours) + " hours this week")
                        .font(.subheadline).foregroundStyle(Spread.secondary)
                }
                Spacer(minLength: 0)
                ChalkMotionArt(category: role.category, size: 126)
                    .accessibilityHidden(true)
            }
            .padding(20)
            .frame(maxWidth: .infinity, minHeight: 200, maxHeight: 200)
            .background(Spread.cardFill, in: RoundedRectangle(cornerRadius: 25))
            .overlay(RoundedRectangle(cornerRadius: 25)
                .strokeBorder(Color(hex: role.color).opacity(editing ? 0.82 : 0.36),
                              lineWidth: editing ? 2.1 : 1))
            .shadow(color: Color(hex: role.color).opacity(editing ? 0.30 : 0.07),
                    radius: editing ? 15 : 7, y: 4)
            .contentShape(RoundedRectangle(cornerRadius: 25))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(role.name), \(SpreadHours.spoken(role.hours))")
        .accessibilityHint("Double tap to open tasks. Swipe left for Manage or right for Delete.")
    }
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
                    Text("Counterclockwise adds time. Clockwise returns it.")
                    Text("Tap the center number to separate Life areas.")
                }
                Section("Feedback") {
                    Toggle("Touch feedback", isOn: $touchFeedback)
                    Button("Show tips again") { showTips = true }
                }
            }
            .navigationTitle("Gesture help")
            .toolbar { ToolbarItem(placement: .confirmationAction) {
                Button("Done") { dismiss() }
            } }
        }
        .presentationDetents([.medium, .large])
    }
}
#endif
