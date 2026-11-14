#if os(iOS)
import SwiftUI

/// Opt-in Week/Month review surface. Classic Week remains the default and unchanged.
/// This is a UI-only first slice: the existing LivePlanner is always the sole writer.
/// See docs/design/specs/2026-11-04-week-month-owner-decisions.md for the remaining gates.
struct WeekFocusSurface: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    @Binding var selectedRole: String?
    @Binding var selectedDay: String?
    @Binding var monthPlane: Bool
    @Binding var monthAnchor: Date
    let onWeekChange: (Int) -> Void
    let onPickDay: (String) -> Void
    let onOpenTask: (String, String) -> Void
    let onNewRole: () -> Void

    @State private var expandedByDate: [String: Set<String>] = [:]
    @State private var trayOpen = false
    @State private var overdueOpen = false
    @State private var overdueRows: [NativeOverdueTask] = []
    @State private var monthQuickAddDay: MonthAddDate?
    @State private var sidebarExpanded = false
    @State private var sidebarHidden = false
    @State private var showDayDone = false
    @State private var daySlideDirection = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    /// Decision 53: each strip day and its Month cell share an id, so opening Month morphs the week into the grid.
    @Namespace private var calendarMorph
    private struct MonthAddDate: Identifiable {
        let iso: String
        var id: String { iso }
    }

    private var activeRole: String? { selectedRole ?? snapshot.roles.first?.id }
    private var day: String {
        let requested = selectedDay ?? snapshot.weekKey
        let sameWeek = PlannerDates.weekKey(for: PlannerDates.date(requested)) == snapshot.weekKey
        return sameWeek ? requested : snapshot.weekKey
    }
    private var weekDays: [String] {
        (0..<7).map { PlannerDates.dayISO(weekKey: snapshot.weekKey, index: $0) }
    }
    /// Animate calendar progression while Reduce Motion removes directional movement.
    private var dayTransition: AnyTransition {
        guard !reduceMotion, daySlideDirection != 0 else { return .opacity }
        let offset = CGFloat(daySlideDirection) * 28
        return .asymmetric(
            insertion: .offset(x: offset).combined(with: .opacity),
            removal: .offset(x: -offset).combined(with: .opacity)
        )
    }

    private func selectWeekDay(_ iso: String) {
        guard iso != day, weekDays.contains(iso) else { return }
        daySlideDirection = iso > day ? 1 : -1
        withAnimation(reduceMotion ? nil : SpreadMotion.weekSlide) { selectedDay = iso }
        SpreadHaptics.selection()
    }

    private var todaysAllocations: [DayAllocation] {
        snapshot.allocations.filter { $0.day == day && $0.hours > 0 }
            .sorted { $0.order < $1.order }
    }
    private var unplaced: [PlannerTask] {
        snapshot.unplacedTasks.filter { $0.roleId == activeRole }
    }
    private var dayHours: Double { todaysAllocations.reduce(0) { $0 + $1.hours } }
    /// Every task scheduled on the selected day is done (and there is at least one).
    private var dayComplete: Bool {
        let ids = Set(todaysAllocations.map(\.id))
        let tasks = snapshot.tasks.filter { ids.contains($0.allocationId ?? "") }
        return !tasks.isEmpty && tasks.allSatisfy(\.done)
    }
    /// Changes only when the same day becomes complete, not when moving to an already complete day.
    private var dayCompletion: String { "\(day)|\(dayComplete)" }
    private func rolesOn(_ iso: String) -> [Responsibility] {
        var roles = snapshot.roles.filter { role in
            snapshot.allocations.contains { $0.day == iso && $0.roleId == role.id && $0.hours > 0 }
        }
        if let activeRole, let index = roles.firstIndex(where: { $0.id == activeRole }) {
            let highlighted = roles.remove(at: index)
            roles.insert(highlighted, at: 0)
        }
        return roles
    }
    private var storeKey: String { "native.weekFocus.expanded." + (planner.state?.envelope.profileId ?? "none") }
    /// Decision 10: Week returns to the last selected day (per profile); the first visit opens Today.
    private var dayKey: String { "native.weekFocus.day." + (planner.state?.envelope.profileId ?? "none") }
    private var refreshKey: String {
        "\(planner.state?.envelope.profileId ?? "")-\(planner.state?.revision ?? 0)-\(PlannerDates.localISO())"
    }
    private func progress(for role: Responsibility) -> Double {
        let tasks = snapshot.tasks.filter { $0.roleId == role.id }
        guard !tasks.isEmpty else { return 0 }
        return Double(tasks.filter(\.done).count) / Double(tasks.count)
    }
    private func isComplete(roleId: String, on date: String) -> Bool {
        let ids = Set(snapshot.allocations.filter { $0.day == date && $0.roleId == roleId }.map(\.id))
        let tasks = snapshot.tasks.filter { $0.roleId == roleId && ids.contains($0.allocationId ?? "") }
        return !tasks.isEmpty && tasks.allSatisfy(\.done)
    }
    private func rememberExpansions() {
        let raw = expandedByDate.mapValues { Array($0).sorted() }
        guard let data = try? JSONEncoder().encode(raw) else { return }
        UserDefaults.standard.set(data, forKey: storeKey)
    }
    private func restoreExpansions() {
        expandedByDate = [:]
        guard let data = UserDefaults.standard.data(forKey: storeKey),
              let saved = try? JSONDecoder().decode([String: [String]].self, from: data) else { return }
        expandedByDate = saved.mapValues { Set($0) }
    }

    var body: some View {
        GeometryReader { geometry in
        // Seven 44pt dates, six 6pt gaps and Month's 8pt padding need 352pt.
        // With the 56pt rail, 8pt gap and 20pt outer padding that means 436pt.
        // Below that width retain every rail action in a row above the calendar.
        let horizontalMonthRail = monthPlane && geometry.size.width < 436
        VStack(spacing: 0) {
            overview
                .padding(.horizontal, 10)
                .padding(.top, 4)
                .padding(.bottom, 6)
            if horizontalMonthRail && !sidebarHidden {
                responsibilityRail(horizontal: true)
                    .opacity(sidebarExpanded ? 0 : 1)
                    .allowsHitTesting(!sidebarExpanded)
                    .accessibilityHidden(sidebarExpanded)
                    .padding(.horizontal, 10)
                    .padding(.bottom, 8)
            }
            HStack(alignment: .top, spacing: 8) {
                if !sidebarHidden && !horizontalMonthRail {
                    // Keep the compact rail's slot while the expanded rail overlays the schedule, so the
                    // schedule is neither squeezed nor shifted (owner decision 50). Hidden from VoiceOver
                    // and hit testing while the overlay is up, so each control exists once.
                    responsibilityRail()
                        .frame(width: 56)
                        .opacity(sidebarExpanded ? 0 : 1)
                        .allowsHitTesting(!sidebarExpanded)
                        .accessibilityHidden(sidebarExpanded)
                        .zIndex(2)
                }
                ScrollViewReader { proxy in
                    ScrollView {
                        if monthPlane {
                            MonthSurface(planner: planner, snapshot: snapshot, anchor: monthAnchor,
                                         onPick: onPickDay, selectedRole: activeRole,
                                         onLongPressAdd: { iso in
                                            monthQuickAddDay = MonthAddDate(iso: iso)
                                            SpreadHaptics.selection()
                                         },
                                         onSwipeMonth: { delta in
                                            monthAnchor = PlannerDates.calendar.date(byAdding: .month, value: delta, to: monthAnchor) ?? monthAnchor
                                            SpreadHaptics.selection()
                                         }, mondayFirst: true, morphNamespace: calendarMorph)
                        } else {
                            dailyDetails
                                .id(day)
                                .transition(dayTransition)
                                .simultaneousGesture(
                                    DragGesture(minimumDistance: 70).onEnded { gesture in
                                        guard abs(gesture.translation.width) > abs(gesture.translation.height) * 1.8,
                                              let index = weekDays.firstIndex(of: day) else { return }
                                        let next = index + (gesture.translation.width < 0 ? 1 : -1)
                                        if weekDays.indices.contains(next) {
                                            selectWeekDay(weekDays[next])
                                        }
                                    }
                                )
                        }
                    }
                    .scrollIndicators(.hidden)
                    .animation(reduceMotion ? nil : SpreadMotion.weekSlide, value: day)
                    .onChange(of: selectedRole) { _, role in
                        guard let role else { return }
                        expandedByDate[day, default: []].insert(role)
                        withAnimation(reduceMotion ? nil : SpreadMotion.curve) {
                            proxy.scrollTo(role, anchor: .top)
                        }
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .padding(.horizontal, 10)
            .overlay(alignment: .leading) {
                if sidebarExpanded && !sidebarHidden {
                    ZStack(alignment: .leading) {
                        Color.black.opacity(0.12)
                            .contentShape(Rectangle())
                            .onTapGesture { sidebarExpanded = false }
                        responsibilityRail()
                            .frame(width: 148)
                            .shadow(color: Spread.shadow, radius: 14, x: 6, y: 0)
                    }
                    .transition(.move(edge: .leading).combined(with: .opacity))
                    .zIndex(5)
                }
            }
        }
        .onAppear {
            restoreExpansions()
            if selectedRole == nil { selectedRole = snapshot.roles.first?.id }
            if selectedDay == nil {
                let remembered = UserDefaults.standard.string(forKey: dayKey)
                let now = PlannerDates.localISO()
                if let remembered, PlannerDates.weekKey(for: PlannerDates.date(remembered)) == snapshot.weekKey {
                    selectedDay = remembered
                } else {
                    selectedDay = PlannerDates.weekKey(for: PlannerDates.date(now)) == snapshot.weekKey
                        ? now : snapshot.weekKey
                }
            }
        }
        .onChange(of: snapshot.weekKey) { _, newWeek in
            daySlideDirection = 0
            selectedDay = newWeek // Monday, by owner decision
        }
        .onChange(of: expandedByDate) { _, _ in rememberExpansions() }
        .onChange(of: dayCompletion) { old, new in
            // Decision 35: a brief check when the open day becomes complete. The haptic is played by the
            // completing row (one per tap); this view only draws.
            guard new == day + "|true", old == day + "|false" else { return }
            withAnimation(reduceMotion ? nil : SpreadMotion.curve) { showDayDone = true }
            AccessibilityNotification.Announcement("Day complete").post()
            Task {
                try? await Task.sleep(nanoseconds: 1_400_000_000)
                withAnimation(reduceMotion ? nil : SpreadMotion.curve) { showDayDone = false }
            }
        }
        .overlay {
            if showDayDone {
                SpreadIcon(name: "lucide-circle-check", size: 21)
                    .font(.system(size: 64, weight: .semibold))
                    .foregroundStyle(Spread.accent)
                    .padding(24)
                    .background(.ultraThinMaterial, in: Circle())
                    .transition(reduceMotion ? .opacity : .scale.combined(with: .opacity))
                    .allowsHitTesting(false)
                    .accessibilityLabel("Day complete")
                    .accessibilityIdentifier("focus-day-complete")
            }
        }
        .onChange(of: selectedDay) { _, newDay in
            if let newDay { UserDefaults.standard.set(newDay, forKey: dayKey) }
        }
        .sheet(item: $monthQuickAddDay) { target in
            MonthQuickAddSheet(planner: planner, roleId: activeRole ?? "", day: target.iso)
        }
        .task(id: refreshKey) {
            overdueRows = await planner.allOverdueTasks(today: PlannerDates.localISO()) ?? []
        }
        // A container identifier otherwise replaces its children's own identifiers.
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("week-focus-surface")
        }
    }

    private var overview: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Button {
                    sidebarHidden.toggle()
                    if sidebarHidden { sidebarExpanded = false }
                    SpreadHaptics.selection()
                } label: {
                    SpreadIcon(name: "lucide-panel-left", size: 20)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(sidebarHidden ? "Show responsibilities" : "Hide responsibilities")
                .accessibilityIdentifier("focus-show-sidebar")
                Text(monthPlane ? PlannerDates.label(monthAnchor, pattern: "MMMM yyyy") : "This week")
                    .font(.system(.headline, weight: .semibold))
                Spacer()
                Button {
                    if monthPlane {
                        withAnimation(reduceMotion ? nil : SpreadMotion.morph) { monthPlane = false }
                    } else {
                        monthAnchor = PlannerDates.date(day)
                        withAnimation(reduceMotion ? nil : SpreadMotion.morph) { monthPlane = true }
                    }
                    SpreadHaptics.selection()
                } label: {
                    SpreadIcon(name: monthPlane ? "lucide-calendar-range" : "lucide-calendar-days", size: 20)
                        .font(.system(.body, weight: .semibold))
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.spreadPress)
                .accessibilityLabel(monthPlane ? "Return to Week" : "Open Month")
                .accessibilityIdentifier("focus-week-month-toggle")
            }
            if !monthPlane {
                HStack(spacing: 1) {
                    ForEach(weekDays, id: \.self) { iso in
                        let active = iso == day
                        Button {
                            selectWeekDay(iso)
                        } label: {
                            VStack(spacing: 4) {
                                Text(PlannerDates.label(PlannerDates.date(iso), pattern: "EEEEE"))
                                    .font(.system(.caption2))
                                Text(PlannerDates.label(PlannerDates.date(iso), pattern: "d"))
                                    .font(.system(.subheadline, weight: active ? .bold : .medium))
                                HStack(spacing: 2) {
                                    ForEach(rolesOn(iso).prefix(3)) { role in
                                        Circle()
                                            .fill(Color(hex: role.color))
                                            .frame(width: role.id == activeRole ? 6 : 4,
                                                   height: role.id == activeRole ? 6 : 4)
                                    }
                                    if let activeRole, isComplete(roleId: activeRole, on: iso) {
                                        SpreadIcon(name: "icon-check", size: 9)
                                            .foregroundStyle(Spread.accent)
                                    }
                                }
                                .frame(height: 8)
                            }
                            .frame(maxWidth: .infinity, minHeight: 60)
                            .background(active ? Spread.accent.opacity(0.12) : Color.clear,
                                        in: RoundedRectangle(cornerRadius: 12))
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(PlannerDates.label(PlannerDates.date(iso), pattern: "EEEE MMMM d"))
                        .accessibilityAddTraits(active ? .isSelected : [])
                        .matchedGeometryEffect(id: "calendar-day-\(iso)", in: calendarMorph)
                        .accessibilityIdentifier("focus-day-\(iso)")
                        .dropDestination(for: SpreadDragPayload.self) { items, _ in
                            guard let item = items.first, item.kind == .task else { return false }
                            if let target = snapshot.allocations.first(where: {
                                $0.day == iso && $0.roleId == item.roleId && $0.hours > 0
                            }) {
                                Task {
                                    _ = await planner.send(["type": "assignTask", "roleId": item.roleId,
                                                            "taskId": item.itemId, "allocationId": target.id])
                                }
                            } else {
                                planner.error = "Place hours for this responsibility on that day first."
                            }
                            return true
                        } isTargeted: { _ in }
                    }
                }
                .simultaneousGesture(
                    DragGesture(minimumDistance: 65).onEnded { gesture in
                        guard abs(gesture.translation.width) > abs(gesture.translation.height) * 1.8 else { return }
                        onWeekChange(gesture.translation.width < 0 ? 1 : -1)
                    }
                )
            }
        }
        .padding(10)
        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
        // A container identifier otherwise replaces its children's own identifiers.
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("focus-week-overview")
    }

    private func responsibilityRail(horizontal: Bool = false) -> some View {
        ResponsibilitySidebar(
            snapshot: snapshot,
            selectedRole: $selectedRole,
            expanded: horizontal ? false : sidebarExpanded,
            onAdd: onNewRole,
            onToggle: {
                withAnimation(reduceMotion ? nil : SpreadMotion.curve) {
                    sidebarExpanded.toggle()
                }
            },
            onSelected: { _ in
                if sidebarExpanded {
                    withAnimation(reduceMotion ? nil : SpreadMotion.curve) { sidebarExpanded = false }
                }
            },
            horizontal: horizontal
        )
    }

    private var dailyDetails: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Text(PlannerDates.label(PlannerDates.date(day), pattern: "EEEE, MMM d"))
                    .font(.system(.headline, weight: .semibold))
                Spacer(minLength: 0)
                Text("\(SpreadHours.text(dayHours))h planned")
                    .font(.system(.subheadline, weight: .medium))
                    .foregroundStyle(Spread.secondary)
                    .monospacedDigit()
            }
            .padding(.vertical, 8)

            if dayHours > 0 {
                GeometryReader { geometry in
                    let gap: CGFloat = 3
                    let usable = max(0, geometry.size.width - CGFloat(max(0, todaysAllocations.count - 1)) * gap)
                    HStack(spacing: gap) {
                        ForEach(todaysAllocations) { allocation in
                            if let role = snapshot.roles.first(where: { $0.id == allocation.roleId }) {
                                Capsule()
                                    .fill(Color(hex: role.color))
                                    .frame(width: usable * CGFloat(allocation.hours / dayHours), height: 6)
                                    .accessibilityHidden(true)
                            }
                        }
                    }
                }
                .frame(height: 6)
                .accessibilityLabel("Daily allocation total \(SpreadHours.text(dayHours)) hours")
            }

            HStack(spacing: 8) {
                if !unplaced.isEmpty {
                    Button {
                        trayOpen.toggle()
                        if trayOpen { overdueOpen = false }
                    } label: {
                        Label { Text("To Place \(unplaced.count)") } icon: { SpreadIcon(name: "lucide-inbox", size: 18) }
                            .font(.system(.caption, weight: .semibold))
                            .frame(minHeight: 44)
                            .padding(.horizontal, 8)
                            .background(Spread.elevated, in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("focus-to-place")
                }
                if !overdueRows.isEmpty {
                    Button {
                        overdueOpen.toggle()
                        if overdueOpen { trayOpen = false }
                    } label: {
                        Label { Text("Overdue \(overdueRows.count)") } icon: { SpreadIcon(name: "lucide-clock", size: 18) }
                            .font(.system(.caption, weight: .semibold))
                            .frame(minHeight: 44)
                            .padding(.horizontal, 8)
                            .background(Spread.elevated, in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("focus-overdue")
                }
                Spacer(minLength: 0)
            }
            if trayOpen {
                VStack(spacing: 0) {
                    ForEach(unplaced) { task in
                        TaskLine(planner: planner, snapshot: snapshot, task: task,
                                 currentAllocation: nil, onOpenTask: onOpenTask)
                    }
                }
                .background(Spread.elevated, in: RoundedRectangle(cornerRadius: 14))
                .dropDestination(for: SpreadDragPayload.self) { items, _ in
                    guard let item = items.first, item.kind == .task else { return false }
                    Task {
                        _ = await planner.send(["type": "assignTask", "roleId": item.roleId,
                                                "taskId": item.itemId, "allocationId": NSNull()])
                    }
                    return true
                } isTargeted: { _ in }
            }
            if overdueOpen {
                OverdueSelectionTray(planner: planner, snapshot: snapshot,
                                     rows: overdueRows, currentDay: day, weekDays: weekDays)
            }
            let rolesToday = snapshot.roles.filter { role in
                todaysAllocations.contains(where: { $0.roleId == role.id }) || role.id == activeRole
            }
            // Decision 13: a day with no hours says so. The selected responsibility's own card (below) keeps
            // its compact Add row (decision 16), so Add appears here only when there is no card to hold it.
            if todaysAllocations.isEmpty {
                VStack(spacing: 12) {
                    SpreadIcon(name: "lucide-calendar-plus", size: 24)
                        .font(.system(.title2))
                        .foregroundStyle(Spread.secondary)
                    Text("Nothing planned")
                        .font(.system(.headline, weight: .semibold))
                    if rolesToday.isEmpty, let activeRole {
                        FocusedQuickAdd(planner: planner, roleId: activeRole, day: day,
                                        onOpenEditor: onOpenTask)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(16)
                .spreadCard()
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("focus-nothing-planned")
            }
            ForEach(rolesToday) { role in
                FocusedRoleCard(
                    planner: planner, snapshot: snapshot, role: role, day: day,
                    selected: role.id == activeRole,
                    expanded: expandedByDate[day]?.contains(role.id) ?? (role.id == activeRole),
                    onToggle: {
                        let expanded = expandedByDate[day]?.contains(role.id) ?? (role.id == activeRole)
                        if expanded { expandedByDate[day, default: []].remove(role.id) }
                        else { expandedByDate[day, default: []].insert(role.id) }
                        SpreadHaptics.selection()
                    }, onOpenTask: onOpenTask
                )
                .id(role.id)
            }
            Color.clear.frame(height: 12)
        }
        .padding(.vertical, 6)
    }

}
#endif
