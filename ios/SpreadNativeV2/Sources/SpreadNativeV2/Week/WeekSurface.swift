#if os(iOS)
import SwiftUI
import UIKit
import os

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
    @Environment(\.dynamicTypeSize) private var typeSize
    /// Horizontal feedback resets on end, cancellation and leaving the surface.
    @State private var swipeShift: CGFloat = 0
    @State private var width: CGFloat = 0

    private var today: String { PlannerDates.localISO() }
    private func dayCard(_ position: Int) -> some View {
        let iso = PlannerOrder.day(weekKey: snapshot.weekKey, displayPosition: position)
        return DayCard(
            planner: planner,
            snapshot: snapshot,
            day: iso,
            selectedRole: selectedRole,
            isToday: iso == today,
            onOpenTask: onOpenTask,
            onOpenRole: onOpenRole
        )
        .id(iso)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("day-card-\(iso)")
    }

    private var dayColumns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: 12, alignment: .top), count: PlannerLayout.dayColumns(availableWidth: Double(width), accessibilityText: typeSize.isAccessibilitySize))
    }
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
                // One eager column on iPhone (every day stays in the accessibility tree); two columns on iPad, where a
                // single wide column of day cards would be mostly air.
                if dayColumns.count == 2 {
                    LazyVGrid(columns: dayColumns, spacing: 12) {
                        ForEach(0..<7, id: \.self) { position in dayCard(position) }
                    }
                } else {
                    VStack(spacing: 12) {
                        ForEach(0..<7, id: \.self) { position in dayCard(position) }
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
            .background {
                // Give the UIKit recognizer anchor real layout bounds. A zero-size
                // UIViewRepresentable background rejects every touch in shouldReceive.
                GeometryReader { geometry in
                    WeekHorizontalSwipe(onShift: { swipeShift = $0 }, onMove: onSwipeWeek)
                        .frame(width: geometry.size.width, height: geometry.size.height)
                }
            }
        }
        .id(snapshot.weekKey)
        .transition(weekTransition)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("week-surface")
    }

    private var weekTransition: AnyTransition {
        guard !reduceMotion, direction != 0 else { return .opacity }
        return .asymmetric(
            insertion: .offset(x: CGFloat(direction) * 36).combined(with: .opacity),
            removal: .opacity
        )
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
                            RoleBadge(category: role.category == "custom" ? nil : role.category, color: role.color, size: 26)
                            Text(role.name).font(.system(.subheadline, weight: .semibold))
                            Text("\(SpreadHours.text(left))h")
                                .font(.system(.subheadline)).foregroundStyle(Spread.secondary).monospacedDigit()
                        }
                        .padding(.leading, 9).padding(.trailing, 14)
                        .frame(minHeight: 44)
                        .background(Capsule().fill(selected ? Color(hex: role.color).opacity(0.20) : Spread.elevated))
                        .overlay(Capsule().strokeBorder(selected ? Color(hex: role.color) : Spread.line, lineWidth: selected ? 1.5 : 0.5))
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
                    SpreadIcon(name: "lucide-clock", size: 17).font(.system(.footnote, weight: .bold))
                }
                .foregroundStyle(Spread.accent)
                .padding(.horizontal, 4)
                Text("Tap to add an hour on the lightest day ahead.")
                    .font(Spread.footnote).foregroundStyle(Spread.secondary).padding(.horizontal, 4)
                FlowRow(spacing: 8) {
                    ForEach(items) { item in
                        let role = snapshot.roles.first { $0.id == item.roleId }
                        Button {
                            Task { await planner.placeHours(roleId: item.roleId, day: item.day, hours: item.hours) }
                        } label: {
                            HStack(spacing: 8) {
                                SpreadIcon(name: "icon-add", size: 19).font(.system(.footnote, weight: .bold))
                                Circle().fill(Color(hex: role?.color ?? "#8E8E93")).frame(width: 8, height: 8)
                                Text(role?.name ?? "").foregroundStyle(Spread.ink)
                                Text(String(item.dayLabel.prefix(3))).foregroundStyle(Spread.ink)
                                Text("\(SpreadHours.text(item.hours))h").foregroundStyle(Spread.ink).monospacedDigit()
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

/// The vertical ScrollView owns vertical movement. A UIKit pan delegate can reject a vertical
/// touch before recognizing it; checking the direction inside SwiftUI's onChanged is too late.
/// Attach only to the enclosing scroll view, and accept touches inside the day/tray region only.
private struct WeekHorizontalSwipe: UIViewRepresentable {
    let onShift: (CGFloat) -> Void
    let onMove: (Int) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onShift: onShift, onMove: onMove) }
    func makeUIView(context: Context) -> AnchorView {
        let view = AnchorView()
        view.isUserInteractionEnabled = false
        view.moved = { [weak coordinator = context.coordinator] view in coordinator?.attach(to: view) }
        return view
    }
    func updateUIView(_ view: AnchorView, context: Context) {
        context.coordinator.onShift = onShift
        context.coordinator.onMove = onMove
        context.coordinator.attach(to: view)
    }
    static func dismantleUIView(_ view: AnchorView, coordinator: Coordinator) { coordinator.detach() }

    final class AnchorView: UIView {
        var moved: ((UIView) -> Void)?
        override func didMoveToWindow() { super.didMoveToWindow(); moved?(self) }
    }

    final class Coordinator: NSObject, UIGestureRecognizerDelegate {
        var onShift: (CGFloat) -> Void
        var onMove: (Int) -> Void
        private weak var anchor: UIView?
        private weak var scroller: UIScrollView?
        private var start = CGPoint.zero
        private lazy var pan = UIPanGestureRecognizer(target: self, action: #selector(changed(_:)))

        init(onShift: @escaping (CGFloat) -> Void, onMove: @escaping (Int) -> Void) {
            self.onShift = onShift
            self.onMove = onMove
        }
        /// Debug builds only, so none of this ships in Release. Read with
        /// `log show --predicate 'subsystem == "com.graymatter.spread" AND category == "week-swipe"'`.
        private static let log = Logger(subsystem: "com.graymatter.spread", category: "week-swipe")
        private func trace(_ text: @autoclosure () -> String) {
            #if DEBUG
            let message = text()
            Self.log.notice("\(message, privacy: .public)")
            #endif
        }
        private func describe(_ point: CGPoint) -> String { String(format: "(%.1f, %.1f)", point.x, point.y) }

        /// The scroll view that owns this surface's vertical scrolling. Normally an ancestor of the anchor. If SwiftUI
        /// hosts the anchor beside the scroll view instead, use the scroll view that covers most of the anchor on screen.
        private func owningScrollView(of view: UIView) -> UIScrollView? {
            var ancestor = view.superview
            while let current = ancestor {
                if let scroll = current as? UIScrollView { return scroll }
                ancestor = current.superview
            }
            guard let window = view.window else { return nil }
            let target = view.convert(view.bounds, to: window)
            var best: (scroll: UIScrollView, area: CGFloat)?
            var pending: [UIView] = [window]
            while let node = pending.popLast() {
                if let scroll = node as? UIScrollView, scroll.isScrollEnabled {
                    let overlap = scroll.convert(scroll.bounds, to: window).intersection(target)
                    let area = overlap.isNull ? 0 : overlap.width * overlap.height
                    if area > (best?.area ?? 0) { best = (scroll, area) }
                }
                pending.append(contentsOf: node.subviews)
            }
            return best?.scroll
        }

        func attach(to view: UIView) {
            anchor = view
            guard view.window != nil else { detach(); return }
            guard let scroll = owningScrollView(of: view) else {
                trace("attach failed: no scroll view owns the anchor; superview chain \(chain(from: view))")
                return
            }
            guard scroll !== scroller else { return }
            detach()
            anchor = view
            scroller = scroll
            pan.delegate = self
            pan.maximumNumberOfTouches = 1
            pan.cancelsTouchesInView = false
            scroll.addGestureRecognizer(pan)
            trace("attached to \(String(describing: type(of: scroll))) bounds=\(scroll.bounds); superview chain \(chain(from: view))")
        }
        private func chain(from view: UIView) -> String {
            var names: [String] = []
            var node: UIView? = view
            while let current = node, names.count < 14 {
                names.append(String(describing: type(of: current)))
                node = current.superview
            }
            return names.joined(separator: " < ")
        }
        func detach() {
            scroller?.removeGestureRecognizer(pan)
            scroller = nil
        }
        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
            // The Week column is capped at 1120pt, but on an unfolded/rotated
            // Duo the parent scroll view can be wider. Use the anchor's vertical
            // range to exclude the independently scrolling role strip and sticky
            // Crown; use the full visible viewport horizontally, including its
            // gutters, so swipes don't silently die outside the column.
            guard let anchor, let scroller else { trace("shouldReceive=false: no anchor or scroll view"); return false }
            let region = anchor.convert(anchor.bounds, to: scroller)
            let viewport = scroller.bounds
            guard region.height > 0, viewport.width > 0 else {
                trace("shouldReceive=false: empty region \(region) or viewport \(viewport)")
                return false
            }
            let point = touch.location(in: scroller)
            guard point.y >= region.minY, point.y <= region.maxY,
                  point.x >= viewport.minX, point.x <= viewport.maxX else {
                trace("shouldReceive=false: touch \(describe(point)) outside region \(region) of viewport \(viewport)")
                return false
            }
            start = CGPoint(x: point.x - viewport.minX, y: point.y - region.minY)
            trace("shouldReceive=true: touch \(describe(point)) start \(describe(start)) region \(region)")
            return true
        }
        func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
            guard let scroller, scroller.bounds.width > 0 else { trace("shouldBegin=false: no scroll view"); return false }
            let translation = pan.translation(in: scroller)
            let velocity = pan.velocity(in: scroller)
            let begin = WeekSwipeRules.shouldBegin(start: start, translation: translation, velocity: velocity, width: scroller.bounds.width)
            trace("shouldBegin=\(begin) start \(describe(start)) translation \(describe(translation)) velocity \(describe(velocity)) width \(scroller.bounds.width)")
            return begin
        }
        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool {
            // Day cards use SwiftUI drag and tap recognizers. If one of those wins
            // exclusivity, the outer swipe can never reach .ended on iPhone Duo.
            // A horizontal swipe has already passed the direction gate above;
            // the vertical ScrollView pan must keep running for normal scrolling.
            return other === scroller?.panGestureRecognizer || other is UIPanGestureRecognizer
        }
        @objc private func changed(_ gesture: UIPanGestureRecognizer) {
            let translation = gesture.translation(in: scroller)
            let end = CGPoint(x: start.x + translation.x, y: start.y + translation.y)
            switch gesture.state {
            case .began, .changed:
                onShift(WeekSwipeRules.shift(start: start, current: end))
            case .ended:
                let direction = WeekSwipeRules.direction(start: start, end: end, width: scroller?.bounds.width ?? 0,
                                                        velocity: gesture.velocity(in: scroller))
                trace("ended: start \(describe(start)) end \(describe(end)) direction \(direction.map { String($0) } ?? "none")")
                withAnimation(UIAccessibility.isReduceMotionEnabled ? nil : SpreadTactile.glide) { onShift(0) }
                if let direction { onMove(direction) }
            case .cancelled, .failed:
                withAnimation(UIAccessibility.isReduceMotionEnabled ? nil : SpreadTactile.glide) { onShift(0) }
            default: break
            }
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
                    Text("Today").font(.system(.caption, weight: .semibold)).foregroundStyle(Spread.ink)
                }
                Spacer()
                Text(PlannerDates.label(PlannerDates.date(day), pattern: "MM/dd"))
                    .font(.system(.caption)).foregroundStyle(Spread.secondary).monospacedDigit()
            }
            .padding(.horizontal, 4)
            .frame(minHeight: allocations.isEmpty && selectedRole == nil ? 28 : 0)
            .accessibilityElement(children: .combine)
            .accessibilityValue(allocations.isEmpty ? "Nothing planned" : "")

            if !allocations.isEmpty {
            VStack(spacing: 8) {
                ForEach(allocations) { allocation in
                    AllocationRow(planner: planner, snapshot: snapshot, allocation: allocation, dayLabel: label, onOpenTask: onOpenTask)
                        .transition(reduceMotion ? .opacity : .opacity.combined(with: .offset(y: -22)))
                }
            }

            }
            if let selectedRole, let name = selectedName {
                Button {
                    Task { await planner.placeHours(roleId: selectedRole, day: day, hours: 1) }
                } label: {
                    HStack(spacing: 6) {
                        SpreadIcon(name: "icon-add", size: 19).font(.system(.subheadline, weight: .bold))
                        Text("Add \(name)").font(.system(.subheadline, weight: .semibold))
                    }
                    .foregroundStyle(Spread.accent)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(RoundedRectangle(cornerRadius: Spread.radiusRow, style: .continuous).fill(Spread.inset))
                    .overlay(RoundedRectangle(cornerRadius: Spread.radiusRow, style: .continuous).strokeBorder(Spread.accent.opacity(0.45), lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("add-to-\(day)")
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, allocations.isEmpty && selectedRole == nil ? 8 : 12)
        .spreadCard(edge: isToday ? Spread.accent : nil, active: isToday)
        .overlay(
            RoundedRectangle(cornerRadius: Spread.radiusCard, style: .continuous)
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
            await planner.placeHours(roleId: item.roleId, day: day, hours: 1)
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
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var role: Responsibility? { snapshot.roles.first { $0.id == allocation.roleId } }
    private var tasks: [PlannerTask] { snapshot.tasks.filter { $0.allocationId == allocation.id } }

    var body: some View {
        if let role {
            VStack(spacing: 0) {
                if typeSize.isAccessibilitySize {
                    Text(role.name).font(.headline).frame(maxWidth: .infinity, alignment: .leading).padding(12)
                }
                HStack(spacing: 4) {
                    // Drag handle: the role dot. Long press starts a native drag; the Move control is the alternative.
                    RoleBadge(category: role.category == "custom" ? nil : role.category, color: role.color, size: 30)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                        .draggable(SpreadDragPayload.allocation(id: allocation.id, roleId: role.id, label: role.name))
                        .accessibilityLabel("Move \(role.name)")
                        .accessibilityIdentifier("allocation-\(allocation.id)")

                    if typeSize.isAccessibilitySize && tasks.isEmpty {
                        Spacer(minLength: 0)
                    } else if tasks.isEmpty {
                        Text(role.name).font(.system(.subheadline, weight: .medium))
                            .lineLimit(2).fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    } else {
                        Button { showTasks.toggle() } label: {
                            VStack(alignment: .leading, spacing: 0) {
                                Text(role.name).font(.system(.subheadline, weight: .medium))
                                    .lineLimit(3).fixedSize(horizontal: false, vertical: true)
                                HStack(spacing: 2) {
                                    Text("\(tasks.count) \(tasks.count == 1 ? "task" : "tasks")")
                                    SpreadIcon(name: "lucide-chevron-down", size: 16).font(.system(.caption2, weight: .bold))
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
                        revision: planner.state?.revision,
                        context: "\(planner.state?.envelope.profileId ?? "")/\(snapshot.weekKey)/\(allocation.id)",
                        onScrub: { hours, revision in
                            await planner.send(["type": "allocationHours", "allocationId": allocation.id, "hours": hours],
                                               completionHaptic: true, expectedRevision: revision)
                        },
                        onChange: { hours in
                            Task { if await planner.setAllocationHours(allocation, to: hours) { SpreadHaptics.completed() } }
                        }
                    )

                    Button {
                        leaving = true
                        Task {
                            await planner.send(["type": "removeAllocation", "allocationId": allocation.id])
                            leaving = false
                        }
                    } label: {
                        SpreadIcon(name: "lucide-minus", size: 18).font(.system(.subheadline, weight: .semibold)).foregroundStyle(Spread.tertiary)
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
            .background(RoundedRectangle(cornerRadius: Spread.radiusRow, style: .continuous).fill(Spread.inset))
            .overlay(RoundedRectangle(cornerRadius: Spread.radiusRow, style: .continuous).strokeBorder(Color(hex: role.color).opacity(0.28), lineWidth: 1))
            .opacity(leaving ? 0 : 1)
            .offset(y: leaving && !reduceMotion ? -22 : 0)
            .animation(reduceMotion ? nil : SpreadMotion.ascend, value: leaving)
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

/// `DayHours`: a minus button, the hours, and a plus button. A day's allocation steps by one hour, as the original
/// planner did; a responsibility's weekly hours step by half an hour (`step: 0.5`), which the store's half-hour
/// rule has always allowed and the earlier native editor offered.
struct HourStepper: View {
    let value: Double
    let label: String
    var step: Double = 1
    var revision: Int? = nil
    var context: String = ""
    var onScrub: ((Double, Int?) async -> Bool)? = nil
    let onChange: (Double) -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @GestureState private var contact = false
    @State private var origin: Double?
    @State private var originRevision: Int?
    @State private var originContext = ""
    @State private var draft: Double?
    @State private var saving = false
    @State private var gate = TactileCueGate()
    @State private var numericOpen = false
    @State private var numericText = ""

    private var displayed: Double { draft ?? value }

    var body: some View {
        HStack(spacing: 0) {
            Button { adjust(-step) } label: {
                SpreadIcon(name: "lucide-minus", size: 18).font(.system(.footnote, weight: .semibold)).frame(width: 44, height: 44).contentShape(Rectangle())
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel("Decrease \(label)\(step < 1 ? " by half an hour" : "")")
            Button {
                guard origin == nil else { return }
                numericText = SpreadHours.text(value); numericOpen = true
            } label: {
                Text("\(SpreadHours.text(displayed))h")
                    .font(.system(.subheadline, weight: .semibold)).monospacedDigit()
                    .frame(minWidth: 44, minHeight: 44).contentShape(Rectangle())
                    .opacity(saving ? 0.6 : 1)
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel("\(label), \(SpreadHours.spoken(displayed))")
            .accessibilityValue(draft == nil ? "Saved" : saving ? "Saving" : "Draft")
            .accessibilityHint("Enter hours, or drag horizontally to adjust")
            .accessibilityAdjustableAction { adjust($0 == .increment ? step : -step) }
            .simultaneousGesture(scrub, including: onScrub == nil ? .none : .all)
            Button { adjust(step) } label: {
                SpreadIcon(name: "icon-add", size: 19).font(.system(.footnote, weight: .semibold)).frame(width: 44, height: 44).contentShape(Rectangle())
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel("Increase \(label)\(step < 1 ? " by half an hour" : "")")
        }
        .disabled(saving)
        .onChange(of: contact) { _, active in
            if !active { DispatchQueue.main.async { if !saving { cancel() } } }
        }
        .onChange(of: context) { _, _ in cancel() }
        .onChange(of: scenePhase) { _, phase in if phase != .active { cancel() } }
        .onDisappear { cancel() }
        .alert("Set \(label)", isPresented: $numericOpen) {
            TextField("Hours", text: $numericText).keyboardType(.decimalPad)
            Button("Set") {
                if let hours = Double(numericText.replacingOccurrences(of: ",", with: ".")),
                   hours.isFinite, hours >= 0, hours <= 168, hours * 2 == (hours * 2).rounded() {
                    if hours != value { onChange(hours) }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: { Text("Enter 0–168 hours in half-hour increments. Planner limits still apply.") }
    }

    private func adjust(_ delta: Double) {
        guard !saving else { return }
        let next = SpreadHours.clamp(value + delta)
        guard next != value else { SpreadHaptics.destructivePrompt(); return }
        onChange(next)
    }
    private var scrub: some Gesture {
        DragGesture(minimumDistance: 12, coordinateSpace: .global)
            .updating($contact) { _, active, _ in active = true }
            .onChanged { change in
                guard !saving, abs(change.translation.width) > abs(change.translation.height) * 1.5 else { return }
                if origin == nil {
                    origin = value; originRevision = revision; originContext = context
                    gate.reset(); SpreadHaptics.prepare()
                }
                guard let origin, originContext == context else { cancel(); return }
                let next = TactilePrecisionMath.hours(origin: origin, translation: Double(change.translation.width), step: step)
                if next != displayed, gate.tick(at: ProcessInfo.processInfo.systemUptime) { SpreadHaptics.selection() }
                if next == displayed, (next == 0 || next == 168), gate.boundary() { SpreadHaptics.destructivePrompt() }
                // No implicit animation while tracking the finger.
                var transaction = Transaction(); transaction.disablesAnimations = true
                withTransaction(transaction) { draft = next }
            }
            .onEnded { _ in
                guard let draft, let origin, draft != origin, let onScrub, originContext == context else { cancel(); return }
                let expected = originRevision, expectedContext = context
                saving = true
                Task {
                    _ = await onScrub(draft, expected)
                    guard context == expectedContext else { return }
                    // The snapshot or the existing planner error explains the outcome.
                    withAnimation(reduceMotion ? nil : SpreadTactile.settle) { cancel() }
                }
            }
    }
    private func cancel() {
        origin = nil; draft = nil; originRevision = nil; saving = false; gate.reset()
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
