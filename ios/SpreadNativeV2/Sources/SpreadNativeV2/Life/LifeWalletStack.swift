#if os(iOS)
import SwiftUI

/// One full-width overlapping stack. Selection reveals a separate task field in the caller.
struct LifeWalletStack: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let roles: [Responsibility]
    @Binding var selectedRole: String?
    var day: String? = nil
    var viewportHeight: CGFloat = 800
    var viewportWidth: CGFloat = 393
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @AccessibilityFocusState private var focusedRole: String?
    @State private var lastSelected: String?
    // Wallet-style stack: each collapsed card shows its name strip.
    // The front card shows the complete face with hours and the week strip.
    // Owner-retired Chalk/doodle presentation; editorial art is now the only style.
    private let editorialArt = true
    @ScaledMetric(relativeTo: .body) private var minimumFaceHeight: CGFloat = 232
    // Preserve enough room for live weekdays on narrow phones without
    // stretching every wide-scene card to an arbitrary fixed ratio.
    private var closedHeight: CGFloat {
        let available = min(700, max(0, viewportWidth - 32))
        return max(minimumFaceHeight, min(318, available * 0.58))
    }
    private var focusedHeight: CGFloat { closedHeight + 12 }
    private var stackStep: CGFloat { (closedHeight * 0.40).rounded() }

    private var ordered: [Responsibility] {
        let priority = snapshot.life?.priorityRoleId
        return roles.filter { $0.id == priority } + roles.filter { $0.id != priority }
    }
    private var focusActive: Bool { day == nil && selectedRole != nil }
    private var stackOrder: [Responsibility] {
        if !focusActive, let selectedRole {
            return ordered.filter { $0.id != selectedRole } + ordered.filter { $0.id == selectedRole }
        }
        return ordered
    }
    private var shown: [Responsibility] {
        focusActive ? ordered.filter { $0.id == selectedRole } : ordered
    }

    private func page(_ delta: Int) {
        guard let selectedRole,
              let index = ordered.firstIndex(where: { $0.id == selectedRole }),
              ordered.count > 1 else { return }
        let next = (index + delta + ordered.count) % ordered.count
        select(ordered[next].id)
    }

    /// A focused Life card supports swipe-up to the next card.
    /// The existing downward Wallet pull still closes the focused card.
    @ViewBuilder private var pageDots: some View {
        if focusActive, ordered.count > 1, let selectedRole,
           let selected = ordered.firstIndex(where: { $0.id == selectedRole }) {
            let count = min(ordered.count, 9)
            let first = min(max(selected - 4, 0), max(0, ordered.count - count))
            VStack(spacing: 6) {
                ForEach(0..<count, id: \.self) { index in
                    Circle()
                        .fill(first + index == selected ? Color.white : Color.white.opacity(0.35))
                        .frame(width: first + index == selected ? 6 : 4,
                               height: first + index == selected ? 6 : 4)
                }
            }
            .padding(6)
            .background(Color.black.opacity(0.25), in: Capsule())
            .padding(.trailing, 5)
            .accessibilityHidden(true)
            .allowsHitTesting(false)
        }
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
                    ForEach(Array(ordered.enumerated()), id: \.element.id) { index, role in
                        let hidden = focusActive && selectedRole != role.id
                        card(role, faceVisible: focusActive || index == ordered.count - 1 || selectedRole == role.id)
                            .offset(y: focusActive
                                ? (selectedRole == role.id ? 0 :
                                   max(viewportHeight + focusedHeight + CGFloat(index) * 24,
                                       CGFloat(index) * stackStep + viewportHeight))
                                : CGFloat(index) * stackStep)
                            .allowsHitTesting(!hidden)
                            .accessibilityHidden(hidden)
                            .opacity(hidden ? 0.35 : 1)
                            .blur(radius: hidden && !reduceTransparency ? 10 : 0)
                            .zIndex(selectedRole == role.id ? Double(ordered.count + 1) : Double(index))
                            .animation(reduceMotion ? nil : SpreadTactile.walletFocus,
                                       value: focusActive)
                    }
                    // Layout-only markers at each card's resting strip, so closing can
                    // scroll back to where that card sits in the stack.
                    ForEach(Array(ordered.enumerated()), id: \.element.id) { index, role in
                        Color.clear.frame(height: stackStep)
                            .alignmentGuide(VerticalAlignment.top) { _ in -CGFloat(index) * stackStep }
                            .id("life-slot-" + role.id)
                            .allowsHitTesting(false)
                            .accessibilityHidden(true)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .top)
                .frame(height: focusActive ? focusedHeight :
                    CGFloat(max(0, ordered.count - 1)) * stackStep + (selectedRole == nil ? closedHeight : focusedHeight),
                    alignment: .top)
                // Intentionally no stack-level clipping: outgoing sibling faces
                // remain whole while the scroll viewport clips their device exit.
                // This also avoids an oversized animated GPU mask.
            }
        }
        .overlay(alignment: .trailing) { pageDots }
        .animation(reduceMotion ? nil : SpreadTactile.walletFocus, value: selectedRole)
        .onChange(of: selectedRole) { old, new in
            if let new { lastSelected = new; focusedRole = new }
            else { focusedRole = old ?? lastSelected }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Life area cards")
        .accessibilityIdentifier("life-wallet-stack")
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: page(1)
            case .decrement: page(-1)
            @unknown default: break
            }
        }
    }
    private func card(_ role: Responsibility, faceVisible: Bool) -> some View {
        LifeWalletFace(role: role, snapshot: snapshot, day: day,
                       selected: selectedRole == role.id,
                       faceVisible: faceVisible,
                       onSelect: { select(role.id) },
                       closedHeight: closedHeight,
                       focusedHeight: focusedHeight,
                       presentationWidth: min(700, max(0, viewportWidth - 32)),
                       editorialArt: editorialArt)
            // Editorial cards are capped at the presentation width. Artwork must never
            // widen the card beyond the margins, which it did at height x 5/3.
            .frame(maxWidth: editorialArt ? min(700, max(0, viewportWidth - 32)) : .infinity)
            .accessibilityFocused($focusedRole, equals: role.id)
            .simultaneousGesture(pullToClose(role.id))
    }
    /// In foreground Life, swipe up changes to the next card; pull down retains
    /// the existing Wallet exit. The two gestures use opposite directions.
    private func pullToClose(_ id: String) -> some Gesture {
        DragGesture(minimumDistance: 20, coordinateSpace: .global)
            .onEnded { value in
                guard focusActive, selectedRole == id else { return }
                let dy = value.translation.height
                guard abs(dy) > abs(value.translation.width) * 1.5 else { return }
                if dy < -85 || value.predictedEndTranslation.height < -200 {
                    page(1)
                } else if dy > 110 || value.predictedEndTranslation.height > 260 {
                    select(id)
                }
            }
    }
    private func select(_ id: String) {
        withAnimation(reduceMotion ? nil : SpreadTactile.walletFocus) {
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
    let faceVisible: Bool
    let onSelect: () -> Void
    let closedHeight: CGFloat
    let focusedHeight: CGFloat
    let presentationWidth: CGFloat
    let editorialArt: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    private var cardHeight: CGFloat { selected ? focusedHeight : closedHeight }
    private var reserved: Double {
        snapshot.allocations.filter { $0.roleId == role.id && (day == nil || $0.day == day) }.reduce(0) { $0 + $1.hours }
    }
    private var hours: Double { day == nil ? role.hours : reserved }
    private var openCount: Int {
        let ids = Set(snapshot.allocations.filter { $0.roleId == role.id && $0.day == day }.map(\.id))
        return snapshot.tasks.filter { $0.roleId == role.id && !$0.done && (day == nil || ids.contains($0.allocationId ?? "")) }.count
    }
    var body: some View {
        selectionButton
            .accessibilityIdentifier("life-card-\(role.id)")
            .shadow(color: roleColor.opacity(selected ? 0.18 : 0.09),
                    radius: selected ? 16 : 8, y: 4)
    }
    // Resolve formatting as String before entering SwiftUI's overloaded text builders.
    private var spokenLabel: String {
        // Keep the selected week, not baked artwork values, in the spoken card.
        let weekly = SpreadHours.spoken(role.hours)
        let booked = SpreadHours.spoken(snapshot.placedHours(for: role.id))
        return role.name + ", " + weekly + " weekly budget, " + booked + " assigned"
    }

    @ViewBuilder
    private var selectionButton: some View {
        if editorialArt {
            editorialSelection
        } else {
            Button {
                onSelect()
            } label: {
                // Editorial only: the whole rounded card is the target, so a tap in its open
                // middle reaches the action. The main-head card keeps its original hit area.
                cardSurface
                    .modifier(EditorialTapTarget(enabled: editorialArt))
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel(Text(spokenLabel))
            .accessibilityValue(selected ? "Focused" : "Closed")
            .accessibilityHint(selected ? "Return to Life area stack" : "Focus this Life area")
            .accessibilityAddTraits(selected ? .isSelected : [])
        }
    }

    /// Editorial cards use a tap gesture so horizontal browsing cannot select a card.
    /// Accessibility still exposes the same focus action as the non-editorial Button.
    private var editorialSelection: some View {
        cardSurface
            .modifier(EditorialTapTarget(enabled: editorialArt))
            .onTapGesture { onSelect() }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(Text(spokenLabel))
            .accessibilityValue(selected ? "Focused" : "Closed")
            .accessibilityHint(selected ? "Return to Life area stack" : "Focus this Life area")
            .accessibilityAddTraits(.isButton)
            .accessibilityAddTraits(selected ? .isSelected : [])
            .accessibilityAction { onSelect() }
    }

    private var roleColor: Color { Color(hex: role.color) }
    private var cardSurface: some View {
        face
            .frame(maxWidth: .infinity)
            .frame(height: typeSize.isAccessibilitySize ? nil : cardHeight, alignment: .top)
            .background {
                LifeEditorialArtwork(category: role.category, roleColor: roleColor, editorial: editorialArt)
            }
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 23).strokeBorder(Color(hex: role.color).opacity(selected ? 0.85 : 0.48), lineWidth: 1))
    }

    private var face: some View {
        LifeEditorialFace(role: role, snapshot: snapshot, selected: selected,
                          titleSafeWidth: presentationWidth * 0.61)
    }

}

/// Editorial cards only: the whole rounded card is the tap target (see selectionButton).
private struct EditorialTapTarget: ViewModifier {
    let enabled: Bool
    func body(content: Content) -> some View {
        if enabled {
            content.contentShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        } else {
            content
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
    @State private var pendingTasks: Set<String> = []
    var body: some View {
        VStack(spacing: 0) {
            if tasks.isEmpty {
                Text("Nothing to do here yet.").font(.subheadline).foregroundStyle(LifePalette.secondary).padding(.vertical, 16)
            }
            ForEach(tasks) { task in
                HStack(spacing: 0) {
                    Button {
                        guard !pendingTasks.contains(task.id) else { return }
                        pendingTasks.insert(task.id)
                        Task {
                            _ = await planner.send(["type": "toggleTask", "roleId": task.roleId, "taskId": task.id],
                                                   completionHaptic: !task.done)
                            pendingTasks.remove(task.id)
                        }
                    } label: {
                        SpreadIcon(name: task.done ? "lucide-circle-check" : "lucide-circle", size: 22)
                            .font(.title3).frame(width: 44, height: 44)
                    }.buttonStyle(.spreadPress).foregroundStyle(task.done ? LifePalette.accent : LifePalette.secondary)
                        .disabled(planner.busy || pendingTasks.contains(task.id))
                        .opacity(pendingTasks.contains(task.id) ? 0.6 : 1)
                        .accessibilityValue(pendingTasks.contains(task.id) ? "Saving" : task.done ? "Completed" : "Incomplete")
                        .accessibilityLabel("\(task.done ? "Reopen" : "Complete") \(task.text)")
                    Button { onOpenTask(task.roleId, task.id) } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(task.text).font(.body).strikethrough(task.done).foregroundStyle(LifePalette.ink)
                                if task.important == true {
                                    Label { Text("High priority") } icon: { SpreadIcon(name: "lucide-flag", size: 14) }
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(Spread.danger)
                                }
                                Text(placement(task)).font(.subheadline).foregroundStyle(LifePalette.secondary)
                            }
                            Spacer(minLength: 6)
                            SpreadIcon(name: "lucide-chevron-right", size: 16).font(.caption).foregroundStyle(LifePalette.secondary)
                        }.frame(maxWidth: .infinity, minHeight: 60, alignment: .leading)
                    }.buttonStyle(.spreadPress)
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
                    Button {
                        guard !planner.busy, !pendingTasks.contains(task.id) else { return }
                        pendingTasks.insert(task.id)
                        Task {
                            let ok = await planner.send([
                                "type": "setTaskImportant", "roleId": task.roleId,
                                "taskId": task.id, "important": task.important != true
                            ])
                            pendingTasks.remove(task.id)
                            if ok { LifeFeedback.accepted() }
                        }
                    } label: {
                        SpreadIcon(name: "lucide-flag", size: 20)
                            .font(.body.weight(.semibold))
                            .foregroundStyle(task.important == true ? Spread.danger : Spread.secondary)
                            .frame(width: 44, height: 44)
                    }
                    .buttonStyle(.spreadPress)
                    .disabled(planner.busy || pendingTasks.contains(task.id))
                    .accessibilityLabel((task.important == true
                        ? "Remove high priority from " : "Mark high priority: ") + task.text)
                    .accessibilityIdentifier("life-task-priority-" + task.id)
                    if day != nil {
                        SpreadIcon(name: "icon-drag", size: 18)
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
                Divider().overlay(Spread.line)
            }
        }
        .padding(.horizontal, 12)
        .animation(reduceMotion ? nil : SpreadTactile.settle, value: tasks.map(\.id))
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
                    Label { Text("Add a task") } icon: { SpreadIcon(name: "icon-add", size: 18) }.frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                }
            }
        }.font(.body).tint(LifePalette.accent)
            .buttonStyle(.spreadPress)
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
