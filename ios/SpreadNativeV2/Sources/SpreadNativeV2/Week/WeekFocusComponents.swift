#if os(iOS)
import SwiftUI

/// A task action menu is opened by tapping the row; the actual task editor stays separate.
/// Long press/drag and all alternate controls operate through LivePlanner's existing bridge.
struct FocusedTaskRow: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let task: PlannerTask
    let day: String
    let roleId: String
    let onOpenEditor: (String, String) -> Void

    @State private var showActions = false
    @State private var showMove = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(spacing: 4) {
            Button {
                Task { await planner.send(["type": "toggleTask", "roleId": roleId,
                                           "taskId": task.id], completionHaptic: !task.done) }
            } label: {
                Image(systemName: task.done ? "checkmark.circle.fill" : "circle")
                    .font(.system(.title3))
                    .foregroundStyle(task.done ? Spread.accent : Spread.secondary)
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(task.done ? "Mark \(task.text) incomplete" : "Complete \(task.text)")
            Button { showActions = true } label: {
                Text(task.text.isEmpty ? "Untitled task" : task.text)
                    .font(.system(.subheadline))
                    .foregroundStyle(task.done ? Spread.secondary : Spread.ink)
                    .strikethrough(task.done)
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                    .multilineTextAlignment(.leading)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityHint("Complete, Reschedule, Edit, or Delete")
            .accessibilityIdentifier("focus-task-\(task.id)")
            Image(systemName: "line.3.horizontal")
                .foregroundStyle(Spread.tertiary)
                .font(.system(.footnote))
                .frame(width: 38, height: 44)
                .contentShape(Rectangle())
                .draggable(SpreadDragPayload.task(id: task.id, roleId: roleId, label: task.text))
                .accessibilityLabel("Drag \(task.text) to another day or task")
        }
        .padding(.horizontal, 4)
        .background(Spread.inset, in: RoundedRectangle(cornerRadius: 12))
        .dropDestination(for: SpreadDragPayload.self) { items, _ in
            guard let item = items.first, item.kind == .task, item.roleId == roleId, item.itemId != task.id else { return false }
            Task {
                _ = await planner.send(["type": "reorderDayTask", "roleId": roleId,
                                        "day": day, "taskId": item.itemId, "beforeId": task.id])
            }
            return true
        } isTargeted: { _ in }
        .confirmationDialog(task.text, isPresented: $showActions, titleVisibility: .visible) {
            Button(task.done ? "Mark incomplete" : "Complete") {
                Task { await planner.send(["type": "toggleTask", "roleId": roleId, "taskId": task.id],
                                          completionHaptic: !task.done) }
            }
            if !task.done {
                Button("Reschedule") { showMove = true }
            }
            Button("Edit") { onOpenEditor(roleId, task.id) }
            Button("Delete", role: .destructive) {
                Task { await planner.send(["type": "deleteTask", "roleId": roleId, "taskId": task.id]) }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Deleted tasks stay recoverable for 30 days in Settings.")
        }
        .sheet(isPresented: $showMove) { MoveToSheet(planner: planner, taskId: task.id) }
    }
}

/// Inline creation is one text field plus an optional richer editor path.
/// Adding a task without day hours never silently loses that task; it stays To Place.
struct FocusedQuickAdd: View {
    @ObservedObject var planner: LivePlanner
    let roleId: String
    let day: String
    let onOpenEditor: (String, String) -> Void

    @State private var expanded = false
    @State private var text = ""
    @State private var pendingTaskId: String?
    @State private var wantsHours = false
    @State private var saving = false
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if !expanded {
                Button {
                    expanded = true
                    focused = true
                } label: {
                    Label("Add task", systemImage: "plus")
                        .font(.system(.subheadline, weight: .medium))
                        .foregroundStyle(Spread.accent)
                        .frame(minHeight: 44)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("focus-quick-add-\(roleId)")
            } else {
                TextField("Task name", text: $text)
                    .focused($focused)
                    .font(.system(.subheadline))
                    .submitLabel(.done)
                    .onSubmit { Task { await save(openDetails: false) } }
                    .padding(.horizontal, 10)
                    .frame(minHeight: 44)
                    .background(Spread.inset, in: RoundedRectangle(cornerRadius: 10))
                    .accessibilityIdentifier("focus-quick-add-field")
                HStack(spacing: 12) {
                    Button("Save") { Task { await save(openDetails: false) } }
                        .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || saving)
                        .frame(minHeight: 44)
                    Button("More details") { Task { await save(openDetails: true) } }
                        .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || saving)
                        .frame(minHeight: 44)
                    Button("Cancel") { expanded = false; text = "" }
                        .frame(minHeight: 44)
                }
                .font(.system(.footnote, weight: .semibold))
            }
        }
        .confirmationDialog("Schedule this task?", isPresented: $wantsHours, titleVisibility: .visible) {
            Button("Add 30 minutes to this day") { Task { await allocateAndSchedule() } }
            Button("Keep in To Place", role: .cancel) { pendingTaskId = nil }
        } message: {
            Text("No time has been allocated to this responsibility on the selected day. The task has been saved to To Place.")
        }
    }

    private func save(openDetails: Bool) async {
        let title = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty, !saving else { return }
        saving = true
        let previous = Set(planner.snapshot?.tasks.map(\.id) ?? [])
        let ok = await planner.send(["type": "addTask", "roleId": roleId, "text": title])
        guard ok, let added = planner.snapshot?.tasks.first(where: { $0.roleId == roleId && !previous.contains($0.id) }) else {
            saving = false
            return
        }
        text = ""
        expanded = false
        saving = false
        if openDetails { onOpenEditor(roleId, added.id) }
        let allocation = planner.snapshot?.allocations.first(where: { $0.roleId == roleId && $0.day == day && $0.hours > 0 })
        if let allocation {
            _ = await planner.send(["type": "assignTask", "roleId": roleId,
                                    "taskId": added.id, "allocationId": allocation.id])
        } else {
            pendingTaskId = added.id
            wantsHours = true
        }
    }

    private func allocateAndSchedule() async {
        guard let pendingTaskId else { return }
        if await planner.placeHours(roleId: roleId, day: day, hours: 0.5),
           let allocation = planner.snapshot?.allocations.first(where: { $0.day == day && $0.roleId == roleId && $0.hours > 0 }) {
            _ = await planner.send(["type": "assignTask", "roleId": roleId,
                                    "taskId": pendingTaskId, "allocationId": allocation.id])
        }
        self.pendingTaskId = nil
    }
}

/// Compact, independent group. The data model's hour allocations are unchanged by
/// completing tasks. Completed rows live behind one disclosure per date and role.
struct FocusedRoleCard: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let role: Responsibility
    let day: String
    let selected: Bool
    let expanded: Bool
    let onToggle: () -> Void
    let onOpenTask: (String, String) -> Void

    @State private var showCompleted = false
    @State private var showHours = false

    private var allocations: [DayAllocation] {
        snapshot.allocations.filter { $0.day == day && $0.roleId == role.id && $0.hours > 0 }
    }
    private var tasks: [PlannerTask] {
        let ids = Set(allocations.map(\.id))
        let filtered = snapshot.tasks.filter { $0.roleId == role.id && ids.contains($0.allocationId ?? "") }
        let order = snapshot.dayTaskOrder?[day + "|" + role.id] ?? []
        let index = Dictionary(uniqueKeysWithValues: order.enumerated().map { ($0.element, $0.offset) })
        return filtered.sorted {
            (index[$0.id] ?? Int.max) < (index[$1.id] ?? Int.max)
        }
    }
    private var openTasks: [PlannerTask] { tasks.filter { !$0.done } }
    private var doneTasks: [PlannerTask] { tasks.filter { $0.done } }
    private var hours: Double { allocations.reduce(0) { $0 + $1.hours } }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 4) {
                Button(action: onToggle) {
                    HStack(spacing: 8) {
                        RoleBadge(category: role.category == "custom" ? nil : role.category,
                                  color: role.color, size: 27)
                        Text(role.name).font(.system(.subheadline, weight: .semibold))
                            .lineLimit(2)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Text("\(tasks.count) task\(tasks.count == 1 ? "" : "s")")
                            .font(Spread.caption).foregroundStyle(Spread.secondary)
                        Image(systemName: "chevron.down")
                            .font(.system(.footnote, weight: .semibold))
                            .rotationEffect(.degrees(expanded ? 180 : 0))
                            .foregroundStyle(Spread.secondary)
                    }
                    .frame(minHeight: 52)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(role.name), \(tasks.count) tasks, \(SpreadHours.text(hours)) hours")
                .accessibilityValue(expanded ? "Expanded" : "Collapsed")
                .accessibilityIdentifier("focus-role-toggle-\(role.id)")
                Button {
                    showHours.toggle()
                } label: {
                    Text("\(SpreadHours.text(hours))h")
                        .font(.system(.caption, weight: .semibold)).monospacedDigit()
                        .foregroundStyle(Spread.ink)
                        .frame(minWidth: 44, minHeight: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Adjust \(role.name) allocated hours")
                .accessibilityIdentifier("focus-hour-\(role.id)")
            }
            if showHours {
                if let first = allocations.first {
                    HourStepper(value: first.hours, label: "\(role.name) on \(day)", step: 0.5) { amount in
                        Task { await planner.setAllocationHours(first, to: amount) }
                    }
                } else {
                    Button("Allocate 30 minutes") {
                        Task { await planner.placeHours(roleId: role.id, day: day, hours: 0.5) }
                    }
                    .frame(minHeight: 44)
                }
            }
            if expanded {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(openTasks) { task in
                        FocusedTaskRow(planner: planner, snapshot: snapshot, task: task,
                                       day: day, roleId: role.id, onOpenEditor: onOpenTask)
                    }
                    if !doneTasks.isEmpty {
                        Button {
                            showCompleted.toggle()
                        } label: {
                            Label("\(doneTasks.count) completed", systemImage: "checkmark.circle")
                                .font(.system(.footnote, weight: .medium))
                                .foregroundStyle(Spread.secondary)
                                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("focus-completed-toggle-\(role.id)")
                        if showCompleted {
                            ForEach(doneTasks) { task in
                                FocusedTaskRow(planner: planner, snapshot: snapshot, task: task,
                                               day: day, roleId: role.id, onOpenEditor: onOpenTask)
                            }
                        }
                    }
                    FocusedQuickAdd(planner: planner, roleId: role.id, day: day, onOpenEditor: onOpenTask)
                }
                .padding(.top, 3)
                .padding(.bottom, 8)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 4)
        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
        .overlay(RoundedRectangle(cornerRadius: Spread.radiusRow)
            .strokeBorder(Color(hex: role.color).opacity(selected ? 0.65 : 0.15),
                          lineWidth: selected ? 1.5 : 0.5))
    }
}
#endif
