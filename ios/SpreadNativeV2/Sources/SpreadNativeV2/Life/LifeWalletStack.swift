#if os(iOS)
import SwiftUI

/// One full-width overlapping stack. Selection reveals a separate task field in the caller.
struct LifeWalletStack: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let roles: [Responsibility]
    @Binding var selectedRole: String?
    let editing: Bool
    var day: String? = nil
    let onManage: (String) -> Void
    let onDelete: (String) -> Void
    let onBeginEdit: (String) -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @AccessibilityFocusState private var focusedRole: String?
    @State private var lastSelected: String?
    @ScaledMetric(relativeTo: .body) private var closedHeight: CGFloat = 144
    @ScaledMetric(relativeTo: .body) private var focusedHeight: CGFloat = 162
    @ScaledMetric(relativeTo: .body) private var stackStep: CGFloat = 52

    private var ordered: [Responsibility] {
        let priority = snapshot.life?.priorityRoleId
        return roles.filter { $0.id == priority } + roles.filter { $0.id != priority }
    }
    private var focusActive: Bool { day == nil && !editing && selectedRole != nil }
    private var stackOrder: [Responsibility] {
        if !focusActive, let selectedRole {
            return ordered.filter { $0.id != selectedRole } + ordered.filter { $0.id == selectedRole }
        }
        return ordered
    }
    private var shown: [Responsibility] {
        focusActive ? ordered.filter { $0.id == selectedRole } : ordered
    }
    var body: some View {
        Group {
            if typeSize.isAccessibilitySize {
                VStack(spacing: 8) {
                    ForEach(shown) { role in card(role, faceVisible: true) }
                }
            } else {
                // Preserve every role's identity and full width during focus.
                // Only the card's vertical position changes; sibling removal must
                // never cause the selected face or its text to interpolate width.
                ZStack(alignment: .top) {
                    ForEach(Array(stackOrder.enumerated()), id: \.element.id) { index, role in
                        let hidden = focusActive && selectedRole != role.id
                        card(role, faceVisible: focusActive || index == ordered.count - 1 || selectedRole == role.id)
                            .offset(y: focusActive ? 0 : CGFloat(index) * stackStep)
                            .opacity(hidden ? 0 : 1)
                            .allowsHitTesting(!hidden)
                            .accessibilityHidden(hidden)
                            .zIndex(selectedRole == role.id ? Double(ordered.count + 1) : Double(index))
                            .animation(reduceMotion ? nil : (hidden ? SpreadTactile.snap : SpreadTactile.settle),
                                       value: focusActive)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .top)
                .frame(height: focusActive ? focusedHeight :
                    CGFloat(max(0, ordered.count - 1)) * stackStep + (selectedRole == nil ? closedHeight : focusedHeight),
                    alignment: .top)
            }
        }
        .animation(reduceMotion ? nil : SpreadTactile.settle, value: selectedRole)
        .onChange(of: selectedRole) { old, new in
            if let new { lastSelected = new; focusedRole = new }
            else { focusedRole = old ?? lastSelected }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Life area cards")
        .accessibilityIdentifier("life-wallet-stack")
    }
    private func card(_ role: Responsibility, faceVisible: Bool) -> some View {
        LifeWalletFace(role: role, snapshot: snapshot, day: day,
                       selected: selectedRole == role.id, editing: editing,
                       faceVisible: faceVisible,
                       onSelect: { select(role.id) },
                       onManage: { onManage(role.id) }, onDelete: { onDelete(role.id) },
                       onBeginEdit: { onBeginEdit(role.id) })
            .frame(maxWidth: .infinity)
            .accessibilityFocused($focusedRole, equals: role.id)
    }
    private func select(_ id: String) {
        withAnimation(reduceMotion ? nil : SpreadTactile.settle) {
            selectedRole = selectedRole == id ? nil : id
        }
        LifeFeedback.selection()
    }
}

private struct LifeWalletFace: View {
    let role: Responsibility
    let snapshot: PlannerSnapshot
    let day: String?
    let selected: Bool
    let editing: Bool
    let faceVisible: Bool
    let onSelect: () -> Void
    let onManage: () -> Void
    let onDelete: () -> Void
    let onBeginEdit: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.scenePhase) private var scenePhase
    @ScaledMetric(relativeTo: .body) private var closedHeight: CGFloat = 144
    @ScaledMetric(relativeTo: .body) private var focusedHeight: CGFloat = 162
    private var cardHeight: CGFloat { selected ? focusedHeight : closedHeight }
    @State private var reveal: CGFloat = 0
    @State private var translation: CGFloat = 0
    @State private var ignoreTapUntil = Date.distantPast
    @State private var revealCue = 0
    @GestureState private var dragging = false
    @State private var glow = false
    private var reserved: Double {
        snapshot.allocations.filter { $0.roleId == role.id && (day == nil || $0.day == day) }.reduce(0) { $0 + $1.hours }
    }
    private var hours: Double { day == nil ? role.hours : reserved }
    private var openCount: Int {
        let ids = Set(snapshot.allocations.filter { $0.roleId == role.id && $0.day == day }.map(\.id))
        return snapshot.tasks.filter { $0.roleId == role.id && !$0.done && (day == nil || ids.contains($0.allocationId ?? "")) }.count
    }
    var body: some View {
        ZStack {
            revealedActions
            Button {
                if Date() >= ignoreTapUntil { onSelect() }
            } label: {
                cardSurface
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel("\(role.name), \(SpreadHours.spoken(hours))")
            .accessibilityValue(selected ? "Focused" : "Closed")
            .accessibilityHint("Show this area's tasks")
            .accessibilityAddTraits(selected ? .isSelected : [])
            .accessibilityAction(named: "Manage") { onManage() }
            .accessibilityAction(named: "Delete") { onDelete() }
            .accessibilityAction(named: "Edit Life areas") { onBeginEdit() }
            .onLongPressGesture(minimumDuration: 0.55, perform: onBeginEdit)
            .simultaneousGesture(swipe)
        }
        .clipShape(RoundedRectangle(cornerRadius: 23))
        .onChange(of: dragging) { _, active in
            if !active && translation != 0 {
                withAnimation(reduceMotion ? nil : SpreadTactile.snap) { translation = 0 }
            }
        }
        .onChange(of: editing) { _, _ in reveal = 0 }
        .onChange(of: selected) { _, _ in reveal = 0 }
        .task(id: "\(editing)-\(reduceMotion)-\(scenePhase)") {
            glow = false
            guard editing, !reduceMotion, scenePhase == .active else { return }
            withAnimation(.easeInOut(duration: 1.9).repeatForever(autoreverses: true)) { glow = true }
        }
        .accessibilityIdentifier("life-card-\(role.id)")
    }
    private var roleColor: Color { Color(hex: role.color) }

    // Keep each SwiftUI builder small enough for the release compiler to solve.
    private var revealedActions: some View {
        HStack(spacing: 0) {
            Button(role: .destructive, action: onDelete) {
                Label("Delete", systemImage: "trash").font(.subheadline)
                    .frame(width: 92, height: cardHeight).foregroundStyle(.white)
                    .background(Spread.danger)
            }.accessibilityHidden(reveal <= 0).allowsHitTesting(reveal > 0)
            Spacer(minLength: 0)
            Button(action: onManage) {
                Label("Manage", systemImage: "pencil").font(.subheadline)
                    .frame(width: 92, height: cardHeight).foregroundStyle(.white)
                    .background(LifePalette.accent)
            }.accessibilityHidden(reveal >= 0).allowsHitTesting(reveal < 0)
        }
    }

    private var cardSurface: some View {
        face
            .frame(maxWidth: .infinity, minHeight: cardHeight, alignment: .top)
            .background(cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 23).strokeBorder(Color(hex: role.color).opacity(selected || editing ? 0.85 : 0.48), lineWidth: 1))
            .overlay(editingOutline)
            .offset(x: max(-110, min(110, reveal + translation)))
    }

    private var cardBackground: some View {
        let tint = roleColor
        let colors: [Color] = [tint.opacity(0.48), tint.opacity(0.16), .clear]
        let gradient = LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
        return RoundedRectangle(cornerRadius: 24, style: .continuous)
            .fill(Spread.cardFill)
            .overlay {
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill(gradient)
            }
    }

    @ViewBuilder
    private var editingOutline: some View {
        if editing {
            RoundedRectangle(cornerRadius: 23)
                .strokeBorder(roleColor.opacity(glow ? 0.85 : 0.3), lineWidth: 1.5)
                .shadow(color: roleColor.opacity(glow ? 0.28 : 0.08), radius: 8)
        }
    }
    private var face: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                RoleBadge(category: role.category, color: role.color, size: 30)
                Text(role.name).font(.headline).frame(maxWidth: .infinity, alignment: .leading)
                    .lineLimit(typeSize.isAccessibilitySize ? nil : 1)
                if snapshot.life?.priorityRoleId == role.id {
                    Text("Priority").font(.caption).padding(.horizontal, 5)
                        .background(LifePalette.fill, in: RoundedRectangle(cornerRadius: 5))
                }
                Text("\(SpreadHours.text(hours))h").font(.subheadline).monospacedDigit()
                Image(systemName: selected ? "chevron.up" : "chevron.down").font(.caption)
            }.foregroundStyle(LifePalette.ink).frame(minHeight: 28)
            if faceVisible || typeSize.isAccessibilitySize {
                Spacer(minLength: 0)
                HStack(alignment: .bottom, spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(SpreadHours.text(reserved))h reserved")
                        Text("\(openCount) open tasks")
                    }
                    .font(.subheadline).foregroundStyle(LifePalette.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                    if !typeSize.isAccessibilitySize {
                        ChalkMotionArt(category: role.category, size: 100)
                            .frame(width: 100, height: 56, alignment: .top)
                            .clipped()
                            .allowsHitTesting(false)
                            .accessibilityHidden(true)
                    }
                }
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Capsule().fill(LifePalette.fill)
                        Capsule().fill(Color(hex: role.color))
                            .frame(width: geometry.size.width * min(1, max(0, hours > 0 ? reserved / hours : 0)))
                    }
                }.frame(height: 4).accessibilityHidden(true)
            }
        }.padding(.horizontal, 18).padding(.vertical, 12)
    }
    private var swipe: some Gesture {
        DragGesture(minimumDistance: 12)
            .updating($dragging) { _, active, _ in active = editing }
            .onChanged { value in
                guard editing, abs(value.translation.width) > abs(value.translation.height) * 1.5 else { return }
                ignoreTapUntil = Date().addingTimeInterval(0.25)
                translation = value.translation.width
                let offset = reveal + translation
                let side = offset < -42 ? -1 : offset > 42 ? 1 : 0
                if side != 0 && side != revealCue {
                    revealCue = side
                    LifeFeedback.reveal(delete: side > 0)
                }
            }
            .onEnded { value in
                guard editing, abs(value.translation.width) > abs(value.translation.height) * 1.5 else { translation = 0; return }
                ignoreTapUntil = Date().addingTimeInterval(0.25)
                let target = TactilePrecisionMath.revealTarget(
                    current: Double(reveal), translation: Double(value.translation.width),
                    projected: Double(value.predictedEndTranslation.width))
                revealCue = 0
                withAnimation(reduceMotion ? nil : SpreadTactile.snap) {
                    reveal = CGFloat(target)
                    translation = 0
                }
            }
    }
}

struct LifeTaskRows: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let tasks: [PlannerTask]
    /// Reordering is only available on a specific day's scheduled task list.
    var day: String? = nil
    let onOpenTask: (String, String) -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var targetedTaskId: String?
    var body: some View {
        VStack(spacing: 0) {
            if tasks.isEmpty {
                Text("Nothing to do here yet.").font(.subheadline).foregroundStyle(LifePalette.secondary).padding(.vertical, 16)
            }
            ForEach(tasks) { task in
                HStack(spacing: 0) {
                    Button {
                        Task {
                            if await planner.send(["type": "toggleTask", "roleId": task.roleId, "taskId": task.id]),
                               LifeFeedback.enabled { SpreadHaptics.completed() }
                        }
                    } label: {
                        Image(systemName: task.done ? "checkmark.circle.fill" : "circle")
                            .font(.title3).frame(width: 44, height: 44)
                    }.buttonStyle(.plain).foregroundStyle(task.done ? LifePalette.accent : LifePalette.secondary)
                        .disabled(planner.busy)
                        .accessibilityLabel("\(task.done ? "Reopen" : "Complete") \(task.text)")
                    Button { onOpenTask(task.roleId, task.id) } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(task.text).font(.body).strikethrough(task.done).foregroundStyle(LifePalette.ink)
                                Text(placement(task)).font(.subheadline).foregroundStyle(LifePalette.secondary)
                            }
                            Spacer(minLength: 6)
                            Image(systemName: "chevron.right").font(.caption).foregroundStyle(LifePalette.secondary)
                        }.frame(maxWidth: .infinity, minHeight: 60, alignment: .leading)
                    }.buttonStyle(.plain)
                        .accessibilityActions {
                            if day != nil, let index = tasks.firstIndex(where: { $0.id == task.id }) {
                                if index > 0 {
                                    Button("Move up") { reorder(task, before: tasks[index - 1].id) }
                                }
                                if index + 1 < tasks.count {
                                    Button("Move down") {
                                        reorder(task, before: index + 2 < tasks.count ? tasks[index + 2].id : nil)
                                    }
                                }
                            }
                        }
                    if day != nil {
                        Image(systemName: "line.3.horizontal")
                            .font(.footnote).foregroundStyle(LifePalette.secondary)
                            .frame(width: 44, height: 44)
                            .draggable(SpreadDragPayload.task(id: task.id, roleId: task.roleId, label: task.text))
                            .accessibilityHidden(true)
                    }
                }
                .background(targetedTaskId == task.id ? LifePalette.fill : Color.clear,
                            in: RoundedRectangle(cornerRadius: 12))
                .animation(reduceMotion ? nil : SpreadTactile.snap, value: targetedTaskId)
                .dropDestination(for: SpreadDragPayload.self) { items, _ in
                    guard let day, !planner.busy, let item = items.first, item.kind == .task,
                          item.roleId == task.roleId, item.itemId != task.id else { return false }
                    Task {
                        let ok = await planner.send([
                            "type": "reorderDayTask", "roleId": task.roleId, "day": day,
                            "taskId": item.itemId, "beforeId": task.id
                        ])
                        if ok { LifeFeedback.accepted() }
                    }
                    return true
                } isTargeted: { targeted in targetedTaskId = targeted ? task.id : nil }
                Divider()
            }
        }
    }

    private func reorder(_ task: PlannerTask, before id: String?) {
        guard let day, !planner.busy else { return }
        let target: Any = id.map { $0 as Any } ?? NSNull()
        Task {
            let ok = await planner.send([
                "type": "reorderDayTask", "roleId": task.roleId, "day": day,
                "taskId": task.id, "beforeId": target
            ])
            if ok { LifeFeedback.accepted() }
        }
    }

    private func placement(_ task: PlannerTask) -> String {
        let day = snapshot.allocations.first { $0.id == task.allocationId }
            .map { PlannerDates.label(PlannerDates.date($0.day), pattern: "EEEE") } ?? "To place"
        return day + (task.estimateMinutes.map { " · \($0) min" } ?? "")
    }
}

struct LifeQuickAdd: View {
    @ObservedObject var planner: LivePlanner
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let roleId: String
    var day: String? = nil
    let onOpenTask: (String, String) -> Void
    @State private var expanded = false
    @State private var title = ""
    @State private var saving = false
    @FocusState private var focused: Bool
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if expanded {
                TextField("Task name", text: $title).focused($focused).submitLabel(.done)
                    .frame(minHeight: 44).onSubmit { Task { await save() } }
                    .accessibilityIdentifier("life-add-task-name")
                HStack {
                    Button("Add task") { Task { await save() } }
                        .disabled(saving || title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    Button("Cancel") {
                        withAnimation(reduceMotion ? nil : SpreadTactile.snap) { expanded = false }
                        title = ""
                    }.disabled(saving)
                }.frame(minHeight: 44)
            } else {
                Button {
                    withAnimation(reduceMotion ? nil : SpreadTactile.settle) { expanded = true }
                    focused = true
                    LifeFeedback.selection()
                } label: {
                    Label("Add a task", systemImage: "plus").frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                }
            }
        }.font(.body).tint(LifePalette.accent)
    }
    private func save() async {
        guard !saving else { return }
        let name = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        saving = true
        defer { saving = false }
        let profile = planner.state?.envelope.profileId
        let week = planner.snapshot?.weekKey
        let before = Set(planner.snapshot?.tasks.map(\.id) ?? [])
        var action: [String: Any] = ["type": day == nil ? "addTask" : "addTaskForDay",
                                     "roleId": roleId, "text": name, "life": true]
        if let day { action["day"] = day }
        guard await planner.send(action),
              planner.state?.envelope.profileId == profile, planner.snapshot?.weekKey == week,
              let task = planner.snapshot?.tasks.first(where: { $0.roleId == roleId && !before.contains($0.id) }) else { return }
        title = ""
        withAnimation(reduceMotion ? nil : SpreadTactile.snap) { expanded = false }
        LifeFeedback.accepted()
        onOpenTask(roleId, task.id)
    }
}
#endif
