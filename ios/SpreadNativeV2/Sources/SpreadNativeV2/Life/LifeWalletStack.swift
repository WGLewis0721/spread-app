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
    @ScaledMetric(relativeTo: .body) private var overlap: CGFloat = 92

    private var ordered: [Responsibility] {
        // Stable partition preserves the planner's order for every non-priority area.
        let priority = snapshot.life?.priorityRoleId
        return roles.filter { $0.id == priority } + roles.filter { $0.id != priority }
    }
    private var shown: [Responsibility] {
        guard let selectedRole else { return ordered }
        if day == nil && !editing { return ordered.filter { $0.id == selectedRole } }
        return ordered.filter { $0.id != selectedRole } + ordered.filter { $0.id == selectedRole }
    }
    var body: some View {
        VStack(spacing: typeSize.isAccessibilitySize ? 8 : -overlap) {
            ForEach(Array(shown.enumerated()), id: \.element.id) { index, role in
                LifeWalletFace(role: role, snapshot: snapshot, day: day,
                               selected: selectedRole == role.id, editing: editing,
                               faceVisible: index == shown.count - 1,
                               onSelect: { select(role.id) },
                               onManage: { onManage(role.id) }, onDelete: { onDelete(role.id) },
                               onBeginEdit: { onBeginEdit(role.id) })
                    .zIndex(Double(index))
                    .accessibilityFocused($focusedRole, equals: role.id)
            }
        }
        .animation(reduceMotion ? nil : .spring(duration: 0.28, bounce: 0.08), value: selectedRole)
        .onChange(of: selectedRole) { old, new in
            if let new { lastSelected = new; focusedRole = new }
            else { focusedRole = old ?? lastSelected }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Life area cards")
        .accessibilityIdentifier("life-wallet-stack")
    }
    private func select(_ id: String) {
        selectedRole = selectedRole == id ? nil : id
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
    @ScaledMetric(relativeTo: .body) private var cardHeight: CGFloat = 144
    @State private var reveal: CGFloat = 0
    @State private var translation: CGFloat = 0
    @State private var suppressTap = false
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
            Button {
                if suppressTap { suppressTap = false } else { onSelect() }
            } label: {
                face
                    .frame(maxWidth: .infinity, minHeight: cardHeight, alignment: .top)
                    .background(LifePalette.surface)
                    .overlay {
                        if selected { Color(hex: role.color).opacity(0.07).allowsHitTesting(false) }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 23))
                    .overlay(RoundedRectangle(cornerRadius: 23).strokeBorder(LifePalette.line, lineWidth: 0.5))
                    .overlay {
                        if editing {
                            RoundedRectangle(cornerRadius: 23)
                                .strokeBorder(Color(hex: role.color).opacity(glow ? 0.85 : 0.3), lineWidth: 1.5)
                                .shadow(color: Color(hex: role.color).opacity(glow ? 0.28 : 0.08), radius: 8)
                        }
                    }
                    .offset(x: max(-110, min(110, reveal + translation)))
            }
            .buttonStyle(.plain)
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
        .onChange(of: dragging) { _, active in if !active { translation = 0 } }
        .onChange(of: editing) { _, _ in reveal = 0 }
        .onChange(of: selected) { _, _ in reveal = 0 }
        .task(id: "\(editing)-\(reduceMotion)-\(scenePhase)") {
            glow = false
            guard editing, !reduceMotion, scenePhase == .active else { return }
            withAnimation(.easeInOut(duration: 1.9).repeatForever(autoreverses: true)) { glow = true }
        }
        .accessibilityIdentifier("life-card-\(role.id)")
    }
    private var face: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 10) {
                RoleBadge(category: role.category, color: role.color, size: 30)
                Text(role.name).font(.headline).frame(maxWidth: .infinity, alignment: .leading)
                    .lineLimit(typeSize.isAccessibilitySize ? nil : 1)
                Text("\(SpreadHours.text(hours))h").font(.subheadline).monospacedDigit()
                Image(systemName: selected ? "chevron.up" : "chevron.down").font(.caption)
            }.foregroundStyle(LifePalette.ink).frame(minHeight: 28)
            if faceVisible || typeSize.isAccessibilitySize {
                Spacer(minLength: 0)
                HStack {
                    Text("\(SpreadHours.text(reserved))h reserved")
                    Spacer(minLength: 4)
                    Text("\(openCount) open tasks")
                }.font(.subheadline).foregroundStyle(LifePalette.secondary)
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
                suppressTap = true
                translation = value.translation.width
            }
            .onEnded { value in
                guard editing, abs(value.translation.width) > abs(value.translation.height) * 1.5 else { translation = 0; return }
                let offset = reveal + value.translation.width
                let next: CGFloat = offset < -42 ? -92 : offset > 42 ? 92 : 0
                if next != reveal && next != 0 { LifeFeedback.reveal(delete: next > 0) }
                withAnimation(reduceMotion ? nil : .spring(duration: 0.28)) { reveal = next; translation = 0 }
            }
    }
}

struct LifeTaskRows: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let tasks: [PlannerTask]
    let onOpenTask: (String, String) -> Void
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
                }
                Divider()
            }
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
                    Button("Cancel") { expanded = false; title = "" }.disabled(saving)
                }.frame(minHeight: 44)
            } else {
                Button { expanded = true; focused = true } label: {
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
        guard await planner.send(["type": "addTask", "roleId": roleId, "text": name, "life": true]),
              planner.state?.envelope.profileId == profile, planner.snapshot?.weekKey == week,
              let task = planner.snapshot?.tasks.first(where: { $0.roleId == roleId && !before.contains($0.id) }) else { return }
        if let day, let allocation = planner.snapshot?.allocations.first(where: { $0.roleId == roleId && $0.day == day && $0.hours > 0 }) {
            _ = await planner.send(["type": "assignTask", "roleId": roleId, "taskId": task.id, "allocationId": allocation.id])
        }
        title = ""; expanded = false
        onOpenTask(roleId, task.id)
    }
}
#endif
