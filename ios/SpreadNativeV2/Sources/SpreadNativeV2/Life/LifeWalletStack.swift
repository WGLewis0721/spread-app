#if os(iOS)
import SwiftUI

/// Relative to the existing, already-enhanced Life Edit glow. Its alpha was
/// almost 1.0 and could not be made 75% brighter by opacity alone.
enum LifeEditPulseTokens {
    static let emphasis: CGFloat = 1.75
    static let peakStroke: CGFloat = (2.5 * 1.25) * emphasis
    static let peakHaloRadius: CGFloat = (18 * 1.25) * emphasis
    static let peakHaloOpacity: Double = min(1, 0.975 * Double(emphasis))
    static let restingHaloOpacity: Double = min(1, 0.30 * Double(emphasis))
    static let pulseDuration: Double = 1.35 * SpreadTactile.emphasis
}

/// One full-width overlapping stack. Selection reveals a separate task field in the caller.
struct LifeWalletStack: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let roles: [Responsibility]
    @Binding var selectedRole: String?
    let editing: Bool
    var day: String? = nil
    var viewportHeight: CGFloat = 800
    var viewportWidth: CGFloat = 393
    let onManage: (String) -> Void
    let onDelete: (String) async -> Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @AccessibilityFocusState private var focusedRole: String?
    @State private var lastSelected: String?
    @State private var activeSwipeRole: String?
    // A readable full-week strip needs a complete face, not the old 72pt pitch.
    // Small overlap retains Wallet depth without hiding any title, hours or day.
    @AppStorage(LifeEditorialPresentation.defaultsKey) private var editorialArt = false
    @ScaledMetric(relativeTo: .body) private var minimumFaceHeight: CGFloat = 232
    // Preserve enough room for live weekdays on narrow phones without
    // stretching every wide-scene card to an arbitrary fixed ratio.
    private var closedHeight: CGFloat {
        let available = min(700, max(0, viewportWidth - 32))
        return max(minimumFaceHeight, min(318, available * 0.58))
    }
    private var focusedHeight: CGFloat { closedHeight + 12 }
    private var stackStep: CGFloat { max(0, closedHeight - 12) }

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
                            .zIndex(activeSwipeRole == role.id ? Double(ordered.count + 10) :
                                    selectedRole == role.id ? Double(ordered.count + 1) : Double(index))
                            .animation(reduceMotion ? nil : SpreadTactile.walletFocus,
                                       value: focusActive)
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
        .animation(reduceMotion ? nil : SpreadTactile.walletFocus, value: selectedRole)
        .onChange(of: editing) { _, active in if !active { activeSwipeRole = nil } }
        .onChange(of: roles.map(\.id)) { _, ids in
            if let activeSwipeRole, !ids.contains(activeSwipeRole) { self.activeSwipeRole = nil }
        }
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
                       onManage: { onManage(role.id) },
                       onDelete: { await onDelete(role.id) },
                       onSwipeActivity: { active in
                           if active && activeSwipeRole != role.id { activeSwipeRole = role.id }
                           else if !active && activeSwipeRole == role.id { activeSwipeRole = nil }
                       },
                       exitDistance: max(viewportWidth + 32, 480),
                       closedHeight: closedHeight,
                       focusedHeight: focusedHeight,
                       presentationWidth: min(700, max(0, viewportWidth - 32)),
                       editorialArt: editorialArt)
            // Editorial cards are capped at the presentation width. Artwork must never
            // widen the card beyond the margins, which it did at height x 5/3.
            .frame(maxWidth: editorialArt ? min(700, max(0, viewportWidth - 32)) : .infinity)
            .accessibilityFocused($focusedRole, equals: role.id)
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
    let editing: Bool
    let faceVisible: Bool
    let onSelect: () -> Void
    let onManage: () -> Void
    let onDelete: () async -> Bool
    let onSwipeActivity: (Bool) -> Void
    let exitDistance: CGFloat
    let closedHeight: CGFloat
    let focusedHeight: CGFloat
    let presentationWidth: CGFloat
    let editorialArt: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.scenePhase) private var scenePhase
    private var cardHeight: CGFloat { selected ? focusedHeight : closedHeight }
    @State private var reveal: CGFloat = 0
    @State private var translation: CGFloat = 0
    @State private var dismissOffset: CGFloat = 0
    @State private var dismissing = false
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
            // Keep the action layer structurally stable through the gesture.
            // A conditional insertion here cancels the parent swipe recognizer.
            revealedActions
                // Clip the stationary Manage tray, not the moving Wallet face.
                .clipShape(RoundedRectangle(cornerRadius: 23))
                .opacity(editing && reveal + translation < -1 ? 1 : 0)
                .allowsHitTesting(editing && reveal < 0)
            selectionButton
        }
        // The glow MUST sit after the clip. Previously it lived inside the
        // card face and its bright outer shadow was clipped away.
        // Track the face when it reveals actions rather than lighting the
        // stationary slot left behind.
        .overlay(editingOutline.offset(x: cardOffset))
        // The swipe recognizer is live only in Edit. Outside Edit the native selection
        // control (Button, or the tap gesture on editorial cards) owns the touch, so taps
        // select and vertical drags scroll. The gesture stays attached (mask only) so the
        // view structure does not change when Edit toggles.
        .simultaneousGesture(swipe, including: editing ? .all : .subviews)
        .shadow(color: roleColor.opacity(selected || editing ? 0.18 : 0.09),
                radius: selected || editing ? 16 : 8, y: 4)
        .onChange(of: dragging) { _, active in
            if !active && translation != 0 {
                withAnimation(reduceMotion ? nil : SpreadTactile.snap) { translation = 0 }
            }
        }
        .onChange(of: editing) { _, active in
            reveal = 0; translation = 0
            if !active && !dismissing { dismissOffset = 0 }
        }
        .onChange(of: selected) { _, _ in reveal = 0; translation = 0 }
        .onChange(of: scenePhase) { _, phase in
            if phase != .active { reveal = 0; translation = 0 }
        }
        .onAppear { synchronizeGlow() }
        .onChange(of: editing) { _, _ in synchronizeGlow() }
        .onChange(of: reduceMotion) { _, _ in synchronizeGlow() }
        .onChange(of: scenePhase) { _, _ in synchronizeGlow() }
        .accessibilityIdentifier("life-card-\(role.id)")
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
                if LifeCardSwipeRules.tapSelects(editing: editing) { onSelect() }
            } label: {
                // Editorial only: the whole rounded card is the target, so a tap in its open
                // middle reaches the action. The main-head card keeps its original hit area.
                cardSurface
                    .modifier(EditorialTapTarget(enabled: editorialArt))
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel(Text(spokenLabel))
            .accessibilityValue(selected ? "Focused" : "Closed")
            .accessibilityHint(selected ? "Close this area’s tasks" : "Show this area’s tasks")
            .accessibilityAddTraits(selected ? .isSelected : [])
            .accessibilityActions {
                // VoiceOver can reach swipe-only actions, but only after Edit is pressed.
                if editing {
                    Button("Manage") { if editing { onManage() } }
                    Button("Remove Life area", role: .destructive) {
                        if editing { performDismissal() }
                    }
                }
            }
        }
    }

    /// Editorial cards select with SwiftUI's native tap gesture instead of a Button. A Button
    /// fires on lift-off after a horizontal drag that stays inside the card; a tap gesture
    /// fails once the finger moves, so a swipe outside Edit never selects. The accessibility
    /// surface mirrors the Button above: one button element with the same label, value, hint,
    /// selected trait, default activation and Edit-only actions. The Button's pressed-state
    /// scale (.spreadPress) is intentionally not reproduced here.
    private var editorialSelection: some View {
        cardSurface
            .modifier(EditorialTapTarget(enabled: editorialArt))
            .onTapGesture { if LifeCardSwipeRules.tapSelects(editing: editing) { onSelect() } }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(Text(spokenLabel))
            .accessibilityValue(selected ? "Focused" : "Closed")
            .accessibilityHint(selected ? "Close this area’s tasks" : "Show this area’s tasks")
            .accessibilityAddTraits(.isButton)
            .accessibilityAddTraits(selected ? .isSelected : [])
            .accessibilityAction { if LifeCardSwipeRules.tapSelects(editing: editing) { onSelect() } }
            .accessibilityActions {
                if editing {
                    Button("Manage") { if editing { onManage() } }
                    Button("Remove Life area", role: .destructive) {
                        if editing { performDismissal() }
                    }
                }
            }
    }

    private var roleColor: Color { Color(hex: role.color) }
    // Left reveals Manage. Right follows the finger toward full-width dismissal.
    private var cardOffset: CGFloat {
        max(-CGFloat(LifeCardSwipeRules.manageDragLimit), min(exitDistance, reveal + translation + dismissOffset))
    }

    // Keep each SwiftUI builder small enough for the release compiler to solve.
    private var revealedActions: some View {
        HStack(spacing: 0) {
            Spacer(minLength: 0)
            Button {
                guard editing, reveal < 0 else { return }
                onManage()
            } label: {
                Label("Manage", systemImage: "pencil").font(.subheadline)
                    .frame(width: 92, height: cardHeight).foregroundStyle(.white)
                    .background(LifePalette.accent, in: RoundedRectangle(cornerRadius: 24))
            }.accessibilityIdentifier("life-reveal-manage-\(role.id)")
                .accessibilityHidden(!editing || reveal >= 0).allowsHitTesting(editing && reveal < 0)
        }
    }

    private var cardSurface: some View {
        face
            .frame(maxWidth: .infinity)
            .frame(height: typeSize.isAccessibilitySize ? nil : cardHeight, alignment: .top)
            .background {
                LifeEditorialArtwork(category: role.category, roleColor: roleColor, editorial: editorialArt)
            }
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 23).strokeBorder(Color(hex: role.color).opacity(selected || editing ? 0.85 : 0.48), lineWidth: 1))
            .offset(x: cardOffset)
    }

    @ViewBuilder
    private var editingOutline: some View {
        if editing {
            let atPeak = glow || reduceMotion
            RoundedRectangle(cornerRadius: 23, style: .continuous)
                // A real breathing outline, not merely two near-opaque states.
                .strokeBorder(roleColor.opacity(atPeak ? 1 : 0.46),
                              lineWidth: atPeak ? LifeEditPulseTokens.peakStroke : 1.5)
                .shadow(color: roleColor.opacity(
                            atPeak ? LifeEditPulseTokens.peakHaloOpacity
                                   : LifeEditPulseTokens.restingHaloOpacity),
                        radius: atPeak ? LifeEditPulseTokens.peakHaloRadius : 8)
                // A second short-range halo keeps the pulse visible on dark,
                // saturated Wallet cards even when the outer light is clipped.
                .shadow(color: roleColor.opacity(atPeak ? 0.72 : 0.08),
                        radius: atPeak ? 14 : 3)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
        }
    }

    private func synchronizeGlow() {
        // Reset instantly, then animate to the bright state. Only the visual
        // pulse repeats; haptics never loop. Reduced Motion gets a static peak.
        var transaction = Transaction()
        transaction.disablesAnimations = true
        withTransaction(transaction) { glow = false }
        guard editing, !reduceMotion, scenePhase == .active else { return }
        withAnimation(.easeInOut(duration: LifeEditPulseTokens.pulseDuration)
            .repeatForever(autoreverses: true)) {
            glow = true
        }
    }
    private var face: some View {
        LifeEditorialFace(role: role, snapshot: snapshot, selected: selected,
                          titleSafeWidth: presentationWidth * 0.61)
    }

    private var swipe: some Gesture {
        DragGesture(minimumDistance: 14, coordinateSpace: .global)
            .updating($dragging) { _, active, _ in active = editing && !dismissing }
            .onChanged { value in
                guard editing, !dismissing else { return }
                let horizontal = Double(value.translation.width)
                guard LifeCardSwipeRules.isHorizontal(horizontal: horizontal,
                                                      vertical: Double(value.translation.height)) else { return }
                var transaction = Transaction()
                transaction.disablesAnimations = true
                onSwipeActivity(true)
                withTransaction(transaction) {
                    // Preserve the original directions: left = Manage, right =
                    // slide the entire card off screen to remove it.
                    translation = CGFloat(LifeCardSwipeRules.liveOffset(
                        horizontal: horizontal, exitDistance: Double(exitDistance)))
                }
            }
            .onEnded { value in
                // The release thresholds live in LifeCardSwipeRules so they are tested on their own.
                switch LifeCardSwipeRules.outcome(
                    editing: editing, dismissing: dismissing, reveal: Double(reveal),
                    horizontal: Double(value.translation.width),
                    vertical: Double(value.translation.height),
                    predictedEnd: Double(value.predictedEndTranslation.width),
                    exitDistance: Double(exitDistance)
                ) {
                case .ignore:
                    return
                case .keepReveal:
                    withAnimation(reduceMotion ? nil : SpreadTactile.snap) {
                        translation = 0
                    }
                    if reveal == 0 { onSwipeActivity(false) }
                case .dismiss:
                    // The release spring completes the visible offscreen travel, then the
                    // existing undoable planner command deletes the Life area without a prompt.
                    performDismissal()
                case .closeReveal:
                    withAnimation(reduceMotion ? nil : SpreadTactile.snap) {
                        reveal = 0
                        translation = 0
                    }
                    onSwipeActivity(false)
                case .reveal(let target):
                    let manageTarget = CGFloat(target)
                    if manageTarget < 0 && manageTarget != reveal {
                        LifeFeedback.reveal(delete: false)
                    }
                    withAnimation(reduceMotion ? nil : SpreadTactile.snap) {
                        reveal = manageTarget
                        translation = 0
                    }
                    if manageTarget == 0 { onSwipeActivity(false) }
                }
            }
    }

    private func performDismissal() {
        guard editing, !dismissing else { return }
        dismissing = true
        LifeFeedback.reveal(delete: true)
        withAnimation(reduceMotion ? nil : SpreadTactile.cardDismiss) {
            reveal = 0
            translation = 0
            dismissOffset = exitDistance
        }
        Task { @MainActor in
            if !reduceMotion {
                try? await Task.sleep(for: .seconds(SpreadTactile.cardDismissDuration))
            }
            let saved = await onDelete()
            onSwipeActivity(false)
            if !saved {
                // Rejection or storage failure restores the real card.
                withAnimation(reduceMotion ? nil : SpreadTactile.settle) {
                    dismissOffset = 0
                }
                dismissing = false
            }
        }
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
                        Image(systemName: task.done ? "checkmark.circle.fill" : "circle")
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
                                Text(placement(task)).font(.subheadline).foregroundStyle(LifePalette.secondary)
                            }
                            Spacer(minLength: 6)
                            Image(systemName: "chevron.right").font(.caption).foregroundStyle(LifePalette.secondary)
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
                    Label("Add a task", systemImage: "plus").frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
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
