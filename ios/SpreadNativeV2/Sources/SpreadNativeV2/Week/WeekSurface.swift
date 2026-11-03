#if os(iOS)
import SwiftUI

/// The Week body from `weekly-view.tsx`, top to bottom: the caption, the role bubble strip (remaining hours),
/// Free time suggestions, the dashed To place tray, then seven solid day cards, Sunday first.
/// Every drag has a tap equivalent (Place/Move to, the Add button, Free time chips, the hour steppers).
struct WeekSurface: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    @Binding var selectedRole: String?
    @Binding var focusDay: String?
    let direction: Int
    let onOpenRole: (String) -> Void
    let onOpenTask: (String, String) -> Void
    let onReview: () -> Void
    /// -1 previous week, 1 next week. The root owns week changes so the Crown, keys, caps and this swipe share one path.
    let onSwipeWeek: (Int) -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    /// Finger offset while a swipe is live. A `GestureState` returns to zero on end *and* on cancel, so an
    /// interrupted swipe (a system drag lift, a scroll takeover) can never leave the week offset or dimmed.
    @GestureState(resetTransaction: Transaction(animation: SpreadMotion.press)) private var swipeShift: CGFloat = 0
    @State private var width: CGFloat = 0

    private var today: String { PlannerDates.localISO() }
    private var showsTray: Bool {
        snapshot.tasks.contains(where: { $0.allocationId == nil }) || snapshot.tasks.contains(where: { !$0.done })
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // The caption and the role bubbles sit outside the swipe region: the bubble strip scrolls sideways,
            // and a sideways scrub there must scroll the strip, never change the week.
            VStack(alignment: .leading, spacing: 16) {
                Text("Drag a spread onto a day, or tap one, then add it.")
                    .font(Spread.footnote)
                    .foregroundStyle(Spread.secondary)
                    .padding(.horizontal, 4)
                    .padding(.top, 8)
                bubbleStrip
            }
            .padding(.horizontal, 16)
            .modifier(WeekFollow(shift: swipeShift, enabled: !reduceMotion))

            // The swipe region. The gesture is measured on this fixed wrapper while the content inside follows the
            // finger, so the drag never feeds back into itself: 64 points of travel is 64 points, on the first touch.
            VStack(alignment: .leading, spacing: 16) {
                freeTime
                if showsTray {
                    ToPlaceTray(planner: planner, snapshot: snapshot, onOpenTask: onOpenTask)
                }
                VStack(spacing: 12) {
                    ForEach(0..<7, id: \.self) { position in
                        let iso = PlannerOrder.day(weekKey: snapshot.weekKey, displayPosition: position)
                        DayCard(
                            planner: planner,
                            snapshot: snapshot,
                            day: iso,
                            selectedRole: selectedRole,
                            isToday: iso == today,
                            onOpenTask: onOpenTask,
                            onOpenRole: onOpenRole
                        )
                        .id(iso)
                        .accessibilityIdentifier("day-card-\(iso)")
                    }
                }
            }
            .modifier(WeekFollow(shift: swipeShift, enabled: !reduceMotion))
            .padding(.horizontal, 16)
            .contentShape(Rectangle())
            .background(GeometryReader { proxy in
                Color.clear
                    .onAppear { width = proxy.size.width }
                    .onChange(of: proxy.size.width) { _, value in width = value }
            })
            .simultaneousGesture(swipeGesture)
        }
        .id(snapshot.weekKey)
        .transition(weekTransition)
        .accessibilityIdentifier("week-surface")
    }

    private var weekTransition: AnyTransition {
        guard !reduceMotion, direction != 0 else { return .opacity }
        return .asymmetric(
            insertion: .offset(x: CGFloat(direction) * 36).combined(with: .opacity),
            removal: .opacity
        )
    }

    private var swipeGesture: some Gesture {
        DragGesture(minimumDistance: 10)
            .updating($swipeShift) { value, state, _ in
                state = WeekSwipeRules.shift(start: value.startLocation, current: value.location)
            }
            .onEnded { value in
                if let dir = WeekSwipeRules.direction(start: value.startLocation, end: value.location, width: width) {
                    onSwipeWeek(dir)
                }
            }
    }

    // MARK: Role bubbles (`SpreadChip`, `SpreadBubbleStrip`)

    private var bubbleStrip: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                ForEach(snapshot.roles) { role in
                    let left = snapshot.remainingHours(for: role.id)
                    let selected = selectedRole == role.id
                    Button {
                        selectedRole = selected ? nil : role.id
                    } label: {
                        HStack(spacing: 8) {
                            Circle().fill(Color(hex: role.color)).frame(width: 10, height: 10)
                            Text(role.name).font(.system(.subheadline, weight: .semibold))
                            Text("\(SpreadHours.text(left))h")
                                .font(.system(.subheadline)).foregroundStyle(Spread.secondary).monospacedDigit()
                        }
                        .padding(.horizontal, 12)
                        .frame(minHeight: 44)
                        .background(Spread.elevated, in: Capsule())
                        .overlay(Capsule().stroke(Color(hex: role.color), lineWidth: selected ? 2 : 0))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(role.name), \(SpreadHours.spoken(left)) left")
                    .accessibilityAddTraits(selected ? .isSelected : [])
                    .accessibilityIdentifier("role-chip-\(role.id)")
                    .draggable(SpreadDragPayload.spread(roleId: role.id, label: role.name))
                }
            }
            .padding(.vertical, 4)
        }
        .scrollIndicators(.hidden)
    }

    // MARK: Free time (`FreeTimeChip`)

    @ViewBuilder private var freeTime: some View {
        let items = FreeTimeMirror.suggestions(for: snapshot, today: today)
        if !items.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Label {
                    Text("Free time").font(.system(.subheadline, weight: .semibold))
                } icon: {
                    Image(systemName: "clock").font(.system(.footnote, weight: .bold))
                }
                .foregroundStyle(Spread.accent)
                .padding(.horizontal, 4)
                Text("Tap to add an hour on the lightest day ahead.")
                    .font(Spread.footnote).foregroundStyle(Spread.secondary).padding(.horizontal, 4)
                FlowRow(spacing: 8) {
                    ForEach(items) { item in
                        let role = snapshot.roles.first { $0.id == item.roleId }
                        Button {
                            Task { await planner.send(["type": "moveSpreadToDay", "roleId": item.roleId, "day": item.day, "hours": item.hours]) }
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "plus").font(.system(.footnote, weight: .bold))
                                Circle().fill(Color(hex: role?.color ?? "#8E8E93")).frame(width: 8, height: 8)
                                Text(role?.name ?? "").foregroundStyle(Spread.ink)
                                Text(String(item.dayLabel.prefix(3)))
                                Text("\(SpreadHours.text(item.hours))h").opacity(0.7).monospacedDigit()
                            }
                            .font(.system(.subheadline, weight: .semibold))
                            .foregroundStyle(Spread.accent)
                            .padding(.horizontal, 14)
                            .frame(minHeight: 44)
                            .background(Spread.accent.opacity(0.10), in: Capsule())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Add \(SpreadHours.spoken(item.hours)) of \(role?.name ?? "") on \(item.dayLabel)")
                        .accessibilityIdentifier("free-time-\(item.roleId)")
                    }
                }
            }
            .padding(.top, 4)
        }
    }
}

/// One solid day card (`DayCard`): label, date, Today, the allocation rows, and an Add button for the selected role.
struct DayCard: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let day: String
    let selectedRole: String?
    let isToday: Bool
    let onOpenTask: (String, String) -> Void
    let onOpenRole: (String) -> Void

    @State private var dropTargeted = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var label: String { PlannerDates.label(PlannerDates.date(day), pattern: "EEEE") }
    private var allocations: [DayAllocation] {
        snapshot.allocations.filter { $0.day == day }.sorted { $0.order < $1.order }
    }
    private var selectedName: String? { snapshot.roles.first { $0.id == selectedRole }?.name }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(label)
                    .font(.system(.body, weight: .semibold))
                    .accessibilityAddTraits(isToday ? .isHeader : [])
                if isToday {
                    Text("Today").font(.system(.caption, weight: .semibold)).foregroundStyle(Spread.accent)
                }
                Spacer()
                Text(PlannerDates.label(PlannerDates.date(day), pattern: "MM/dd"))
                    .font(.system(.caption)).foregroundStyle(Spread.secondary).monospacedDigit()
            }
            .padding(.horizontal, 4)

            if allocations.isEmpty {
                // Visually empty day: the label is still announced, and the card stays a calm, solid surface.
                Color.clear.frame(width: 1, height: 1)
                    .accessibilityLabel("No responsibilities scheduled for \(label).")
            }

            VStack(spacing: 8) {
                ForEach(allocations) { allocation in
                    AllocationRow(planner: planner, snapshot: snapshot, allocation: allocation, dayLabel: label, onOpenTask: onOpenTask)
                        .transition(reduceMotion ? .opacity : .opacity.combined(with: .offset(y: -22)))
                }
            }

            if let selectedRole, let name = selectedName {
                Button {
                    Task { await planner.send(["type": "moveSpreadToDay", "roleId": selectedRole, "day": day, "hours": 1]) }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus").font(.system(.subheadline, weight: .bold))
                        Text("Add \(name)").font(.system(.subheadline, weight: .semibold))
                    }
                    .foregroundStyle(Spread.accent)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(Spread.canvas, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("add-to-\(day)")
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, allocations.isEmpty && selectedRole == nil ? 10 : 12)
        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
        .overlay(
            RoundedRectangle(cornerRadius: Spread.radiusCard)
                .stroke(Spread.accent, lineWidth: dropTargeted ? 2 : 0)
        )
        .dropDestination(for: SpreadDragPayload.self) { items, _ in
            guard let item = items.first else { return false }
            Task { await drop(item) }
            return true
        } isTargeted: { dropTargeted = $0 }
        .accessibilityElement(children: .contain)
    }

    /// Spread chips and allocations drop on a day; a task drops on a day only through one of its role's allocations.
    private func drop(_ item: SpreadDragPayload) async {
        switch item.kind {
        case .spread:
            await planner.send(["type": "moveSpreadToDay", "roleId": item.roleId, "day": day, "hours": 1])
        case .allocation:
            await planner.send(["type": "moveAllocation", "allocationId": item.itemId, "day": day])
        case .task:
            // A task can only be placed on a day allocated to its own responsibility. Its place is the
            // first allocation of that role on this day, when there is one; otherwise the store refuses.
            if let target = allocations.first(where: { $0.roleId == item.roleId }) {
                await planner.send(["type": "assignTask", "roleId": item.roleId, "taskId": item.itemId, "allocationId": target.id])
            } else {
                planner.error = "Place hours for this responsibility on that day first."
            }
        }
    }
}

/// One allocated spread on a day: its drag handle and colour dot, name with a folded task count,
/// the hour stepper, and remove. The task list folds underneath and opens on tap, as in `AllocationRow`.
struct AllocationRow: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let allocation: DayAllocation
    let dayLabel: String
    let onOpenTask: (String, String) -> Void

    @State private var showTasks = false
    @State private var leaving = false

    private var role: Responsibility? { snapshot.roles.first { $0.id == allocation.roleId } }
    private var tasks: [PlannerTask] { snapshot.tasks.filter { $0.allocationId == allocation.id } }

    var body: some View {
        if let role {
            VStack(spacing: 0) {
                HStack(spacing: 4) {
                    // Drag handle: the role dot. Long press starts a native drag; the Move control is the alternative.
                    Circle().fill(Color(hex: role.color)).frame(width: 10, height: 10)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                        .draggable(SpreadDragPayload.allocation(id: allocation.id, roleId: role.id, label: role.name))
                        .accessibilityLabel("Move \(role.name)")
                        .accessibilityIdentifier("allocation-\(allocation.id)")

                    if tasks.isEmpty {
                        Text(role.name).font(.system(.subheadline, weight: .medium)).lineLimit(1)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    } else {
                        Button { showTasks.toggle() } label: {
                            VStack(alignment: .leading, spacing: 0) {
                                Text(role.name).font(.system(.subheadline, weight: .medium)).lineLimit(1)
                                HStack(spacing: 2) {
                                    Text("\(tasks.count) \(tasks.count == 1 ? "task" : "tasks")")
                                    Image(systemName: "chevron.down").font(.system(.caption2, weight: .bold))
                                        .rotationEffect(.degrees(showTasks ? 180 : 0))
                                }
                                .font(.system(.caption)).foregroundStyle(Spread.secondary)
                            }
                            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityValue(showTasks ? "Tasks shown" : "Tasks folded")
                        .accessibilityIdentifier("allocation-toggle-\(allocation.id)")
                    }

                    HourStepper(
                        value: allocation.hours,
                        label: "\(role.name) on \(dayLabel)",
                        onChange: { hours in
                            Task { await planner.send(["type": "allocationHours", "allocationId": allocation.id, "hours": hours]) }
                        }
                    )

                    Button {
                        leaving = true
                        Task {
                            try? await Task.sleep(nanoseconds: 340_000_000)
                            await planner.send(["type": "removeAllocation", "allocationId": allocation.id])
                            leaving = false
                        }
                    } label: {
                        Image(systemName: "minus").font(.system(.subheadline, weight: .semibold)).foregroundStyle(Spread.tertiary)
                            .frame(width: 44, height: 44).contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Remove \(role.name) from \(dayLabel)")
                    .accessibilityIdentifier("remove-allocation-\(allocation.id)")
                }
                .padding(.leading, 8)

                if showTasks && !tasks.isEmpty {
                    VStack(spacing: 0) {
                        ForEach(tasks) { task in
                            TaskLine(planner: planner, snapshot: snapshot, task: task, currentAllocation: allocation, onOpenTask: onOpenTask)
                        }
                    }
                    .background(Spread.elevated, in: RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal, 8).padding(.bottom, 8)
                }
            }
            .background(Spread.canvas, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
            .opacity(leaving ? 0 : 1)
            .offset(y: leaving ? -22 : 0)
            .animation(SpreadMotion.ascend, value: leaving)
            .dropDestination(for: SpreadDragPayload.self) { items, _ in
                guard let item = items.first else { return false }
                Task {
                    if item.kind == .task, item.roleId == role.id {
                        await planner.send(["type": "assignTask", "roleId": role.id, "taskId": item.itemId, "allocationId": allocation.id])
                    } else if item.kind == .allocation, item.itemId != allocation.id, item.roleId == role.id {
                        await planner.send(["type": "moveAllocation", "allocationId": item.itemId, "day": allocation.day])
                    }
                }
                return true
            } isTargeted: { _ in }
        }
    }
}

/// `DayHours`: a minus button, the hours, and a plus button. Half-hour steps are not used here (the day step is one hour).
struct HourStepper: View {
    let value: Double
    let label: String
    let onChange: (Double) -> Void

    var body: some View {
        HStack(spacing: 0) {
            Button { onChange(SpreadHours.clamp(value - 1)) } label: {
                Image(systemName: "minus").font(.system(.footnote, weight: .semibold)).frame(width: 44, height: 44).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Decrease \(label)")
            Text("\(SpreadHours.text(value))h")
                .font(.system(.subheadline, weight: .semibold)).monospacedDigit()
                .frame(minWidth: 32)
                .accessibilityLabel("\(label), \(SpreadHours.spoken(value))")
            Button { onChange(SpreadHours.clamp(value + 1)) } label: {
                Image(systemName: "plus").font(.system(.footnote, weight: .semibold)).frame(width: 44, height: 44).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Increase \(label)")
        }
    }
}

/// Wraps chips onto new lines, for the Free time suggestion row.
struct FlowRow<Content: View>: View {
    var spacing: CGFloat = 8
    @ViewBuilder let content: () -> Content

    var body: some View {
        FlowLayout(spacing: spacing) { content() }
    }
}

/// A minimal wrapping layout (iOS 16+ `Layout`), so chips never clip at 390 pt or at accessibility sizes.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0, width: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
            width = max(width, x)
        }
        return CGSize(width: min(width, maxWidth), height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
#endif
