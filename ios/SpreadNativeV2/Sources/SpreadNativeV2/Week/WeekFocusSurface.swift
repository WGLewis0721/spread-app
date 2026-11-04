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
    @State private var sidebarExpanded = false
    @State private var sidebarHidden = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var activeRole: String? { selectedRole ?? snapshot.roles.first?.id }
    private var day: String {
        let requested = selectedDay ?? snapshot.weekKey
        let sameWeek = PlannerDates.weekKey(for: PlannerDates.date(requested)) == snapshot.weekKey
        return sameWeek ? requested : snapshot.weekKey
    }
    private var weekDays: [String] {
        (0..<7).map { PlannerDates.dayISO(weekKey: snapshot.weekKey, index: $0) }
    }
    private var todaysAllocations: [DayAllocation] {
        snapshot.allocations.filter { $0.day == day && $0.hours > 0 }
            .sorted { $0.order < $1.order }
    }
    private var unplaced: [PlannerTask] {
        snapshot.unplacedTasks.filter { $0.roleId == activeRole }
    }
    private var dayHours: Double { todaysAllocations.reduce(0) { $0 + $1.hours } }
    private var storeKey: String { "native.weekFocus.expanded." + (planner.state?.envelope.profileId ?? "none") }
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
        let tasks = snapshot.tasks.filter { $0.roleId == roleId && $0.allocationId.map { ids.contains($0) } == true }
        return !tasks.isEmpty && tasks.allSatisfy(\.done)
    }
    private func rememberExpansions() {
        let raw = expandedByDate.mapValues { Array($0).sorted() }
        guard let data = try? JSONEncoder().encode(raw) else { return }
        UserDefaults.standard.set(data, forKey: storeKey)
    }
    private func restoreExpansions() {
        guard let data = UserDefaults.standard.data(forKey: storeKey),
              let saved = try? JSONDecoder().decode([String: [String]].self, from: data) else { return }
        expandedByDate = saved.mapValues { Set($0) }
    }

    var body: some View {
        VStack(spacing: 0) {
            overview
                .padding(.horizontal, 10)
                .padding(.top, 4)
                .padding(.bottom, 6)
            HStack(alignment: .top, spacing: 8) {
                if !sidebarHidden {
                    responsibilityRail
                        .frame(width: 56)
                        .zIndex(2)
                }
                ScrollViewReader { proxy in
                    ScrollView {
                        if monthPlane {
                            MonthSurface(planner: planner, snapshot: snapshot, anchor: monthAnchor,
                                         onPick: onPickDay, selectedRole: activeRole,
                                         onLongPressAdd: { onPickDay($0) },
                                         onSwipeMonth: { delta in
                                            monthAnchor = PlannerDates.calendar.date(byAdding: .month, value: delta, to: monthAnchor) ?? monthAnchor
                                            SpreadHaptics.selection()
                                         }, mondayFirst: true)
                        } else {
                            dailyDetails
                                .simultaneousGesture(
                                    DragGesture(minimumDistance: 70).onEnded { gesture in
                                        guard abs(gesture.translation.width) > abs(gesture.translation.height) * 1.8,
                                              let index = weekDays.firstIndex(of: day) else { return }
                                        let next = index + (gesture.translation.width < 0 ? 1 : -1)
                                        if weekDays.indices.contains(next) {
                                            selectedDay = weekDays[next]
                                            SpreadHaptics.selection()
                                        }
                                    }
                                )
                        }
                    }
                    .scrollIndicators(.hidden)
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
                        responsibilityRail
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
                let now = PlannerDates.localISO()
                selectedDay = PlannerDates.weekKey(for: PlannerDates.date(now)) == snapshot.weekKey
                    ? now : snapshot.weekKey
            }
        }
        .onChange(of: snapshot.weekKey) { _, newWeek in
            selectedDay = newWeek // Monday, by owner decision
        }
        .onChange(of: expandedByDate) { _, _ in rememberExpansions() }
        .task(id: refreshKey) {
            overdueRows = await planner.allOverdueTasks(today: PlannerDates.localISO()) ?? []
        }
        .accessibilityIdentifier("week-focus-surface")
    }

    private var overview: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                if sidebarHidden {
                    Button {
                        sidebarHidden = false
                        SpreadHaptics.selection()
                    } label: {
                        Image(systemName: "sidebar.left").frame(width: 44, height: 44)
                    }
                    .accessibilityLabel("Show responsibilities")
                    .accessibilityIdentifier("focus-show-sidebar")
                }
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
                    Image(systemName: monthPlane ? "calendar.day.timeline.left" : "calendar")
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
                            selectedDay = iso
                            SpreadHaptics.selection()
                        } label: {
                            VStack(spacing: 4) {
                                Text(PlannerDates.label(PlannerDates.date(iso), pattern: "EEEEE"))
                                    .font(.system(.caption2))
                                Text(PlannerDates.label(PlannerDates.date(iso), pattern: "d"))
                                    .font(.system(.subheadline, weight: active ? .bold : .medium))
                                if let activeRole, isComplete(roleId: activeRole, on: iso) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(.caption2))
                                        .foregroundStyle(Spread.accent)
                                        .frame(height: 8)
                                } else {
                                    HStack(spacing: 2) {
                                        ForEach(snapshot.roles.filter { role in
                                            snapshot.allocations.contains { $0.day == iso && $0.roleId == role.id && $0.hours > 0 }
                                        }.prefix(3)) { role in
                                            Circle()
                                                .fill(Color(hex: role.color))
                                                .frame(width: role.id == activeRole ? 6 : 4,
                                                       height: role.id == activeRole ? 6 : 4)
                                        }
                                    }
                                    .frame(height: 8)
                                }
                            }
                            .frame(maxWidth: .infinity, minHeight: 60)
                            .background(active ? Spread.accent.opacity(0.12) : Color.clear,
                                        in: RoundedRectangle(cornerRadius: 12))
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(PlannerDates.label(PlannerDates.date(iso), pattern: "EEEE MMMM d"))
                        .accessibilityAddTraits(active ? .isSelected : [])
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
        .accessibilityIdentifier("focus-week-overview")
    }

    private var responsibilityRail: some View {
        VStack(spacing: 6) {
            ScrollView {
                VStack(spacing: 6) {
                    ForEach(snapshot.roles) { role in
                        Button {
                            selectedRole = role.id
                            expandedByDate[day, default: []].insert(role.id)
                            if sidebarExpanded { sidebarExpanded = false }
                            SpreadHaptics.selection()
                        } label: {
                            VStack(spacing: 3) {
                                ZStack {
                                    Circle().stroke(Color(hex: role.color).opacity(0.20), lineWidth: 2)
                                    Circle()
                                        .trim(from: 0, to: progress(for: role))
                                        .stroke(Color(hex: role.color), style: StrokeStyle(lineWidth: 2, lineCap: .round))
                                        .rotationEffect(.degrees(-90))
                                    RoleBadge(category: role.category == "custom" ? nil : role.category,
                                              color: role.color, size: 24)
                                }
                                .frame(width: 42, height: 42)
                                if sidebarExpanded {
                                    Text(role.name).font(.system(.caption2, weight: .medium))
                                        .lineLimit(2).multilineTextAlignment(.center)
                                }
                            }
                            .frame(maxWidth: .infinity, minHeight: sidebarExpanded ? 65 : 50)
                            .background(role.id == activeRole ? Color(hex: role.color).opacity(0.15) : Color.clear,
                                        in: RoundedRectangle(cornerRadius: 12))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(role.name)
                        .accessibilityAddTraits(role.id == activeRole ? .isSelected : [])
                        .accessibilityIdentifier("focus-role-\(role.id)")
                    }
                }
            }
            Button(action: onNewRole) {
                Image(systemName: "plus").frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel("Add responsibility")
            Button {
                withAnimation(reduceMotion ? nil : SpreadMotion.curve) { sidebarExpanded.toggle() }
            } label: {
                Image(systemName: sidebarExpanded ? "chevron.left.2" : "chevron.right.2")
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel(sidebarExpanded ? "Condense responsibilities" : "Expand responsibilities")
        }
        .padding(4)
        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: 18))
    }

    private var dailyDetails: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Text(PlannerDates.label(PlannerDates.date(day), pattern: "EEEE, MMM d"))
                    .font(.system(.headline, weight: .semibold))
                Spacer(minLength: 0)
                Text("\(SpreadHours.text(dayHours))h")
                    .font(.system(.subheadline, weight: .medium)).foregroundStyle(Spread.secondary)
            }
            .padding(.vertical, 8)
            if !unplaced.isEmpty {
                Button { trayOpen.toggle() } label: {
                    Label("To Place: \(unplaced.count)", systemImage: "tray")
                        .font(.system(.subheadline, weight: .medium))
                        .frame(minHeight: 44)
                }
                .buttonStyle(.spreadPress)
                .accessibilityIdentifier("focus-to-place")
                if trayOpen {
                    VStack(spacing: 0) {
                        ForEach(unplaced) { task in
                            TaskLine(planner: planner, snapshot: snapshot, task: task,
                                     currentAllocation: nil, onOpenTask: onOpenTask)
                        }
                    }
                    .background(Spread.elevated, in: RoundedRectangle(cornerRadius: 14))
                }
            }
            let rolesToday = snapshot.roles.filter { role in
                todaysAllocations.contains(where: { $0.roleId == role.id }) || role.id == activeRole
            }
            if rolesToday.isEmpty {
                VStack(spacing: 10) {
                    Text("Nothing planned").font(.system(.headline, weight: .semibold))
                    Button(action: onNewRole) { Text("Add responsibility").tapTarget() }
                }
                .frame(maxWidth: .infinity).padding(16).spreadCard()
            }
            ForEach(rolesToday) { role in
                roleCard(role).id(role.id)
            }
            Color.clear.frame(height: 12)
        }
        .padding(.vertical, 6)
    }

    private func roleCard(_ role: Responsibility) -> some View {
        let allocations = todaysAllocations.filter { $0.roleId == role.id }
        let allocatedIds = Set(allocations.map(\.id))
        let tasks = snapshot.tasks.filter { $0.roleId == role.id && $0.allocationId.map { allocatedIds.contains($0) } == true }
        let open = expandedByDate[day]?.contains(role.id) ?? role.id == activeRole
        let hours = allocations.reduce(0) { $0 + $1.hours }
        return VStack(spacing: 0) {
            Button {
                if open { expandedByDate[day, default: []].remove(role.id) }
                else { expandedByDate[day, default: []].insert(role.id) }
            } label: {
                HStack(spacing: 6) {
                    RoleBadge(category: role.category == "custom" ? nil : role.category,
                              color: role.color, size: 28)
                    Text(role.name).font(.system(.subheadline, weight: .semibold))
                        .lineLimit(2).frame(maxWidth: .infinity, alignment: .leading)
                    Text("\(tasks.count) tasks").font(Spread.caption).foregroundStyle(Spread.secondary)
                    Text("\(SpreadHours.text(hours))h").font(Spread.caption)
                        .foregroundStyle(Spread.secondary).padding(.leading, 3)
                    Image(systemName: "chevron.down")
                        .font(.system(.caption, weight: .semibold))
                        .rotationEffect(.degrees(open ? 180 : 0))
                        .foregroundStyle(Spread.secondary)
                }
                .frame(minHeight: 52)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("focus-role-toggle-\(role.id)")
            if open {
                VStack(spacing: 0) {
                    ForEach(allocations) { allocation in
                        AllocationRow(planner: planner, snapshot: snapshot, allocation: allocation,
                                      dayLabel: PlannerDates.label(PlannerDates.date(day), pattern: "EEEE"),
                                      onOpenTask: onOpenTask)
                    }
                    if allocations.isEmpty {
                        Button {
                            Task { await planner.placeHours(roleId: role.id, day: day, hours: 1) }
                        } label: { Label("Add hours to \(role.name)", systemImage: "plus").tapTarget() }
                        .buttonStyle(.spreadPress)
                    }
                }
                .padding(.top, 4)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 4)
        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16)
            .strokeBorder(Color(hex: role.color).opacity(role.id == activeRole ? 0.65 : 0.15),
                          lineWidth: role.id == activeRole ? 1.5 : 0.5))
    }
}
#endif
