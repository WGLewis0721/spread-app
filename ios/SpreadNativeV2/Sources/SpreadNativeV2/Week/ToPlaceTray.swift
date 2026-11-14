#if os(iOS)
import SwiftUI

/// The To place tray (`ToPlaceTray` in weekly-view.tsx): a dashed, tinted-on-hover container, grouped by
/// responsibility because a task can only go on its own role's days. Groups start open while there are at
/// most five tasks; past a group's first six, "Show N more" reveals the rest. Dropping a task here takes it
/// off its day.
struct ToPlaceTray: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let onOpenTask: (String, String) -> Void

    @State private var toggled: [String: Bool] = [:]
    @State private var expandedMore: Set<String> = []
    @State private var targeted = false

    static let openAllUpTo = 5
    static let groupPreview = 6

    private var tasks: [PlannerTask] { snapshot.unplacedTasks }
    private var groups: [(role: Responsibility, tasks: [PlannerTask])] {
        snapshot.roles.compactMap { role in
            let mine = tasks.filter { $0.roleId == role.id }
            return mine.isEmpty ? nil : (role, mine)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                SpreadIcon(name: "lucide-inbox", size: 18).foregroundStyle(Spread.secondary)
                Text("To place").font(.system(.subheadline, weight: .semibold))
                Spacer()
                if tasks.isEmpty {
                    Text("Drop a task here to take it off its day.")
                        .font(Spread.caption).foregroundStyle(Spread.secondary).multilineTextAlignment(.trailing)
                } else {
                    Text("\(tasks.count)")
                        .font(.system(.caption, weight: .semibold)).monospacedDigit()
                        .padding(.horizontal, 8).frame(minHeight: 24)
                        .background(Spread.fill, in: Capsule())
                        .accessibilityLabel("\(tasks.count) to place")
                }
            }
            .padding(.horizontal, 4)

            if !groups.isEmpty {
                VStack(spacing: 0) {
                    let all = groups
                    ForEach(all.indices, id: \.self) { index in
                        groupView(all[index].role, all[index].tasks, first: index == 0)
                    }
                }
                .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, tasks.isEmpty ? 8 : 12)
        .background(
            RoundedRectangle(cornerRadius: Spread.radiusCard)
                .fill(targeted ? Spread.accent.opacity(0.10) : Color.clear)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Spread.radiusCard)
                .strokeBorder(targeted ? Spread.accent : Spread.secondary.opacity(0.55), style: StrokeStyle(lineWidth: 1.5, dash: [6, 5]))
        )
        .dropDestination(for: SpreadDragPayload.self) { items, _ in
            guard let item = items.first, item.kind == .task else { return false }
            Task { await planner.send(["type": "assignTask", "roleId": item.roleId, "taskId": item.itemId, "allocationId": NSNull()]) }
            return true
        } isTargeted: { targeted = $0 }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("To place")
        .accessibilityIdentifier("to-place-tray")
    }

    private func isOpen(_ role: Responsibility, count: Int) -> Bool {
        toggled[role.id] ?? (tasks.count <= Self.openAllUpTo)
    }

    @ViewBuilder private func groupView(_ role: Responsibility, _ mine: [PlannerTask], first: Bool) -> some View {
        let opened = isOpen(role, count: mine.count)
        VStack(spacing: 0) {
            if !first { Rectangle().fill(Spread.line).frame(height: 0.5) }
            Button {
                toggled[role.id] = !opened
            } label: {
                HStack(spacing: 12) {
                    Circle().fill(Color(hex: role.color)).frame(width: 10, height: 10)
                    Text(role.name).font(.system(.subheadline, weight: .semibold))
                        .lineLimit(3).fixedSize(horizontal: false, vertical: true).layoutPriority(1)
                    Spacer(minLength: 4)
                    Text("\(mine.count) \(mine.count == 1 ? "task" : "tasks")")
                        .font(Spread.caption).foregroundStyle(Spread.secondary).monospacedDigit()
                    SpreadIcon(name: "lucide-chevron-down", size: 16).foregroundStyle(Spread.tertiary)
                        .rotationEffect(.degrees(opened ? 180 : 0))
                }
                .padding(.horizontal, 16)
                .frame(minHeight: 48)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityValue(opened ? "Expanded" : "Collapsed")
            .accessibilityIdentifier("tray-role-\(role.id)")

            if opened {
                let showAll = expandedMore.contains(role.id) || mine.count <= Self.groupPreview
                let shown = showAll ? mine : Array(mine.prefix(Self.groupPreview))
                VStack(spacing: 0) {
                    ForEach(shown) { task in
                        TaskLine(planner: planner, snapshot: snapshot, task: task, currentAllocation: nil, onOpenTask: onOpenTask)
                    }
                    if !showAll {
                        Button { expandedMore.insert(role.id) } label: {
                            Text("Show \(mine.count - Self.groupPreview) more")
                                .font(.system(.subheadline, weight: .semibold)).foregroundStyle(Spread.accent)
                                .frame(maxWidth: .infinity, minHeight: 44)
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("tray-show-more-\(role.id)")
                    }
                }
                .padding(.leading, 16)
            }
        }
    }
}

/// High priority (`important`): an optional red "!" beside the task text, spoken as "High priority". It marks the task
/// only. It never changes where the task is scheduled, and the words carry the meaning without the colour.
struct TaskPriorityMark: View {
    var body: some View {
        Text("!")
            .font(.system(.caption, weight: .heavy))
            .foregroundStyle(Spread.danger)
            .frame(width: 20, height: 20)
            .overlay(Circle().strokeBorder(Spread.danger, lineWidth: 1.5))
            .accessibilityLabel("High priority")
    }
}

/// One task row. The grip is a native drag handle; the text opens the task sheet; Place (or Move to) is the tap
/// path to the same change, offering only this responsibility's eligible days as chips.
struct TaskLine: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let task: PlannerTask
    /// The allocation the task sits on, when it is on a day (`Move to`), or nil in the To place tray.
    let currentAllocation: DayAllocation?
    let onOpenTask: (String, String) -> Void

    @State private var showMove = false
    @State private var reorderTarget = false
    @State private var reordering = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var dayTasks: [PlannerTask] {
        guard let currentAllocation else { return [] }
        return LifeCalendarRules.dailyTasks(snapshot, day: currentAllocation.day, roleId: task.roleId)
    }
    private var index: Int? { dayTasks.firstIndex(where: { $0.id == task.id }) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 0) {
                SpreadIcon(name: "icon-drag", size: 18).foregroundStyle(Spread.tertiary)
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
                    .draggable(SpreadDragPayload.task(id: task.id, roleId: task.roleId, label: task.text))
                    .accessibilityLabel("Move task \(task.text)")
                    .accessibilityIdentifier("task-grip-\(task.id)")

                Button { onOpenTask(task.roleId, task.id) } label: {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        if task.important == true { TaskPriorityMark() }
                        Text(task.text.isEmpty ? "Untitled task" : task.text)
                            .font(.system(.subheadline))
                            .strikethrough(task.done)
                            .foregroundStyle(task.done ? Spread.secondary : Spread.ink)
                            .multilineTextAlignment(.leading)
                            .lineLimit(4).fixedSize(horizontal: false, vertical: true)
                    }
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityValue(task.done ? "Completed" : "Open")
                .accessibilityIdentifier("task-row-\(task.id)")

                if !task.done {
                    Button { showMove = true } label: {
                        Text(currentAllocation == nil ? "Place" : "Move to")
                            .font(.system(.subheadline, weight: .semibold)).foregroundStyle(Spread.accent)
                            .padding(.horizontal, 12).frame(minHeight: 44)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("task-move-\(task.id)")
                }
            }
            Rectangle().fill(Spread.line).frame(height: 0.5).padding(.leading, 44)
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(task.text)
        .accessibilityAddTraits(task.done ? .isSelected : [])
        .background(reorderTarget ? Spread.fill : .clear, in: RoundedRectangle(cornerRadius: 12))
        .animation(reduceMotion ? nil : SpreadTactile.snap, value: reorderTarget)
        .animation(reduceMotion ? nil : SpreadTactile.settle, value: dayTasks.map(\.id))
        .accessibilityActions {
            if let index {
                if index > 0 { Button("Move up") { reorder(task.id, before: dayTasks[index - 1].id) } }
                if index + 1 < dayTasks.count {
                    Button("Move down") { reorder(task.id, before: index + 2 < dayTasks.count ? dayTasks[index + 2].id : nil) }
                }
            }
        }
        .contextMenu {
            if let index {
                if index > 0 { Button("Move up") { reorder(task.id, before: dayTasks[index - 1].id) } }
                if index + 1 < dayTasks.count {
                    Button("Move down") { reorder(task.id, before: index + 2 < dayTasks.count ? dayTasks[index + 2].id : nil) }
                }
            }
        }
        .dropDestination(for: SpreadDragPayload.self) { items, _ in
            guard !reordering, let item = items.first, item.kind == .task,
                  item.roleId == task.roleId, item.itemId != task.id,
                  dayTasks.contains(where: { $0.id == item.itemId }) else { return false }
            reorder(item.itemId, before: task.id)
            return true
        } isTargeted: { reorderTarget = $0 && currentAllocation != nil }
        .sheet(isPresented: $showMove) { MoveToSheet(planner: planner, taskId: task.id) }
    }
    private func reorder(_ id: String, before target: String?) {
        guard let day = currentAllocation?.day, !reordering else { return }
        let revision = planner.state?.revision
        reordering = true
        Task {
            _ = await planner.send(["type": "reorderDayTask", "roleId": task.roleId, "day": day,
                                    "taskId": id, "beforeId": target.map { $0 as Any } ?? NSNull()],
                                   completionHaptic: true, expectedRevision: revision)
            reordering = false; reorderTarget = false
        }
    }
}

/// Move to (or Place): the days this responsibility is already on, each with its hours, plus "Not scheduled" to take
/// the task off its day. A task can only go on its own responsibility's days, so nothing else is offered; when
/// there are none it says why and what to do. The change is one store command, and the dock offers Undo after it.
struct MoveToSheet: View {
    @ObservedObject var planner: LivePlanner
    let taskId: String

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        SpreadSheetStack {
            Group {
                if let snapshot = planner.snapshot,
                   let task = snapshot.tasks.first(where: { $0.id == taskId }),
                   let role = snapshot.roles.first(where: { $0.id == task.roleId }) {
                    content(snapshot: snapshot, task: task, role: role)
                } else {
                    ContentUnavailableView("This task is no longer in the plan.", systemImage: "checkmark.circle")
                }
            }
            .navigationTitle("Move to")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button { dismiss() } label: { Text("Cancel").tapTarget() }
                        .accessibilityIdentifier("move-cancel")
                }
            }
        }
        .presentationDetents([.medium, .large])
        .accessibilityIdentifier("move-to-sheet")
    }

    private func content(snapshot: PlannerSnapshot, task: PlannerTask, role: Responsibility) -> some View {
        let choices = snapshot.eligibleAllocations(for: task)
        let tint = Color(hex: role.color)
        return ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 12) {
                    RoleBadge(category: role.category == "custom" ? nil : role.category, color: role.color, size: 40)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(task.text.isEmpty ? "Untitled task" : task.text).font(.system(.headline, weight: .semibold)).lineLimit(2)
                        Text(role.name).font(.system(.footnote)).foregroundStyle(Spread.secondary)
                    }
                    Spacer(minLength: 0)
                }
                .padding(.bottom, 4)

                if choices.isEmpty {
                    Text("\(role.name) isn’t on a day yet. Add it to a day on the Week first, then place this task there.")
                        .font(.system(.subheadline)).foregroundStyle(Spread.secondary)
                        .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                        .spreadCard()
                }
                ForEach(choices) { allocation in
                    let current = allocation.id == task.allocationId
                    Button {
                        Task { if await planner.send(["type": "assignTask", "roleId": task.roleId, "taskId": task.id, "allocationId": allocation.id]) { dismiss() } }
                    } label: {
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(PlannerDates.label(PlannerDates.date(allocation.day), pattern: "EEEE")).font(.system(.headline, weight: .semibold))
                                Text(PlannerDates.label(PlannerDates.date(allocation.day), pattern: "MMM d")).font(.system(.footnote)).foregroundStyle(Spread.secondary)
                            }
                            Spacer(minLength: 8)
                            Text("\(SpreadHours.text(allocation.hours))h").font(.system(.title3, weight: .bold)).monospacedDigit()
                            SpreadIcon(name: current ? "lucide-circle-check" : "lucide-circle", size: 22)
                                .foregroundStyle(current ? tint : Spread.tertiary)
                        }
                        .padding(.horizontal, 16).frame(maxWidth: .infinity, minHeight: 60)
                        .spreadCard(edge: tint, active: current)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.spreadPress)
                    .disabled(current)
                    .accessibilityLabel("\(PlannerDates.label(PlannerDates.date(allocation.day), pattern: "EEEE")), \(SpreadHours.spoken(allocation.hours))\(current ? ", current" : "")")
                    .accessibilityIdentifier("eligible-day-\(allocation.id)")
                }
                if task.allocationId != nil {
                    Button {
                        Task { if await planner.send(["type": "assignTask", "roleId": task.roleId, "taskId": task.id, "allocationId": NSNull()]) { dismiss() } }
                    } label: {
                        HStack(spacing: 8) {
                            SpreadIcon(name: "lucide-inbox", size: 18)
                            Text("Not scheduled").font(.system(.subheadline, weight: .semibold))
                            Spacer(minLength: 0)
                            Text("Back to To place").font(.system(.footnote)).foregroundStyle(Spread.secondary)
                        }
                        .foregroundStyle(Spread.accent)
                        .padding(.horizontal, 16).frame(maxWidth: .infinity, minHeight: 52)
                        .spreadCard()
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.spreadPress)
                    .accessibilityLabel("Not scheduled. Take this task off its day.")
                    .accessibilityIdentifier("task-unplace")
                }
            }
            .padding(16)
        }
    }
}
#endif
