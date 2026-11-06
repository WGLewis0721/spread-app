#if os(iOS)
import SwiftUI

/// A single date surface expands in place; only acknowledged planner intents mutate the plan.
struct LifeWeekView: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let onOpenTask: (String, String) -> Void
    let onReserve: (String) -> Void
    let onManage: (String) -> Void
    let onDelete: (String) -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var selectedDate = ""
    @State private var selectedRole: String?
    @State private var expanded = false
    @State private var marks: [String: NativeDayMark] = [:]
    @State private var navigationID = UUID()
    @State private var pendingDate: String?
    @State private var activeProfile = ""
    @AccessibilityFocusState private var dateHeadingFocused: Bool

    private var profile: String { planner.state?.envelope.profileId ?? "" }
    private var date: String { selectedDate.isEmpty ? snapshot.weekKey : selectedDate }
    private var calendar: Calendar { PlannerDates.calendar }
    private var roles: [Responsibility] { LifeCalendarRules.dailyRoles(snapshot, day: date) }
    private var marksKey: String { "\(profile)|\(date.prefix(7))|\(planner.state?.sessionId ?? "")|\(planner.state?.revision ?? 0)" }
    private var selectionKey: String { "native.life.selectedDate.\(profile)" }

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            calendarSurface
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(PlannerDates.label(PlannerDates.date(date), pattern: "MMMM d"))
                        .font(.subheadline).foregroundStyle(LifePalette.secondary)
                    Text(PlannerDates.label(PlannerDates.date(date), pattern: "EEEE"))
                        .font(.title2.weight(.semibold))
                }.frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityElement(children: .combine).accessibilityAddTraits(.isHeader)
                    .accessibilityFocused($dateHeadingFocused)
                arrow("Previous day", system: "chevron.left") { choose(LifeCalendarRules.shiftDay(date, by: -1)) }
                arrow("Next day", system: "chevron.right") { choose(LifeCalendarRules.shiftDay(date, by: 1)) }
            }
            if roles.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("A day with room.").font(.title3.weight(.semibold))
                    Text("Start by giving a Life area some time.").foregroundStyle(LifePalette.secondary)
                    if let role = snapshot.roles.first {
                        Button("Place some hours") { onReserve(role.id) }.frame(minHeight: 44)
                    }
                }.padding(20).frame(maxWidth: .infinity, alignment: .leading)
                    .background(LifePalette.surface, in: RoundedRectangle(cornerRadius: 24))
            } else {
                LifeWalletStack(planner: planner, snapshot: snapshot, roles: roles,
                    selectedRole: $selectedRole, editing: false, day: date,
                    onManage: onManage, onDelete: onDelete, onBeginEdit: onManage)
                if let roleID = selectedRole, let role = roles.first(where: { $0.id == roleID }) {
                    VStack(alignment: .leading, spacing: 14) {
                        Text(role.name).font(.title3.weight(.semibold))
                        LifeTaskRows(planner: planner, snapshot: snapshot,
                            tasks: LifeCalendarRules.dailyTasks(snapshot, day: date, roleId: roleID),
                            onOpenTask: onOpenTask)
                        LifeQuickAdd(planner: planner, roleId: roleID, day: date, onOpenTask: onOpenTask)
                    }.padding(18).background(LifePalette.surface, in: RoundedRectangle(cornerRadius: 22))
                }
            }
            unplaced
            room
            if planner.undoId != nil || planner.redoId != nil {
                HStack(spacing: 16) {
                    if let id = planner.undoId {
                        Button("Undo") { Task { await planner.send(["type": "undo", "editId": id], completionHaptic: true) } }
                            .accessibilityIdentifier("life-week-undo")
                    }
                    if let id = planner.redoId {
                        Button("Redo") { Task { await planner.send(["type": "redo", "editId": id], completionHaptic: true) } }
                    }
                }.frame(minHeight: 44).disabled(planner.busy)
            }
        }
        .foregroundStyle(LifePalette.ink)
        .accessibilityIdentifier("life-week-page")
        .onAppear { restoreProfile() }
        .onChange(of: profile) { _ in restoreProfile() }
        .onChange(of: snapshot.weekKey) { week in
            guard activeProfile == profile else { restoreProfile(); return }
            let candidate = pendingDate.flatMap { PlannerDates.weekKey(for: PlannerDates.date($0)) == week ? $0 : nil }
            accept(candidate ?? LifeCalendarRules.selection(selectedDate.isEmpty ? nil : selectedDate, in: week, today: PlannerDates.localISO()))
        }
        .onChange(of: roles.map(\.id)) { ids in
            if let selectedRole, !ids.contains(selectedRole) { self.selectedRole = nil }
        }
        .task(id: marksKey) {
            marks = [:]
            let origin = marksKey
            let parts = calendar.dateComponents([.year, .month], from: PlannerDates.date(date))
            guard let year = parts.year, let month = parts.month,
                  let fresh = await planner.monthMarks(year: year, month: month - 1),
                  !Task.isCancelled, marksKey == origin else { return }
            marks = fresh
        }
    }

    private var calendarSurface: some View {
        let cells = LifeCalendarRules.month(date)
        let monday = LifeCalendarRules.week(date).first
        let selectedRow = (cells.firstIndex(of: monday ?? date) ?? 0) / 7
        return VStack(spacing: 10) {
            HStack(spacing: 2) {
                arrow("Previous month", system: "chevron.left") { choose(LifeCalendarRules.shiftMonth(date, by: -1)) }
                Text(PlannerDates.label(PlannerDates.date(date), pattern: "MMMM yyyy"))
                    .font(.headline).frame(maxWidth: .infinity, alignment: .leading)
                arrow("Next month", system: "chevron.right") { choose(LifeCalendarRules.shiftMonth(date, by: 1)) }
                Button {
                    withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.28)) { expanded.toggle() }
                } label: {
                    VStack(spacing: 2) {
                        Image(systemName: "calendar")
                        Text(expanded ? "Week" : "Month").font(.caption)
                    }.frame(minWidth: 44, minHeight: 44)
                }.accessibilityLabel(expanded ? "Show week" : "Show full calendar")
                    .accessibilityValue(expanded ? "Expanded" : "Collapsed")
                    .accessibilityIdentifier("life-week-month-toggle")
            }
            HStack(spacing: 0) {
                ForEach(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], id: \.self) { day in
                    Text(typeSize.isAccessibilitySize ? String(day.prefix(1)) : day)
                        .font(.caption).foregroundStyle(LifePalette.secondary).frame(maxWidth: .infinity)
                        .accessibilityHidden(true)
                }
            }
            VStack(spacing: 0) {
                ForEach(0..<6, id: \.self) { row in
                    let shown = expanded || row == selectedRow
                    HStack(spacing: 0) {
                        ForEach(Array(cells[(row * 7)..<(row * 7 + 7)]), id: \.self) { iso in
                            dayCell(iso)
                        }
                    }
                    .frame(height: shown ? (typeSize.isAccessibilitySize ? 90 : (expanded ? 56 : 67)) : 0, alignment: .top)
                    .opacity(shown ? 1 : 0).clipped().allowsHitTesting(shown).accessibilityHidden(!shown)
                }
            }
            HStack {
                Text(expanded ? "Choose a date to see its Life cards." : PlannerDates.weekRange(base: snapshot.weekKey, offset: 0))
                    .font(.caption).foregroundStyle(LifePalette.secondary)
                Spacer(minLength: 0)
                if expanded { Button("Today") { choose(PlannerDates.localISO()) }.frame(minHeight: 44) }
            }
        }.padding(.vertical, 8).accessibilityElement(children: .contain)
    }

    private func dayCell(_ iso: String) -> some View {
        let selected = iso == date
        let today = iso == PlannerDates.localISO()
        let mark = mark(for: iso)
        return Button { choose(iso) } label: {
            VStack(spacing: 6) {
                Text(PlannerDates.label(PlannerDates.date(iso), pattern: "d"))
                    .font(.subheadline.weight(.semibold)).monospacedDigit()
                    .frame(minWidth: 30, minHeight: 30)
                    .background(selected ? LifePalette.ink : Color.clear, in: Circle())
                    .foregroundStyle(selected ? LifePalette.canvas : LifePalette.ink)
                HStack(spacing: 2) {
                    ForEach(Array(mark.colors.prefix(4).enumerated()), id: \.offset) { _, color in
                        Circle().fill(Color(hex: color)).frame(width: 4, height: 4)
                    }
                    if mark.extra > 0 { Text("+").font(.caption2) }
                }.frame(height: 5)
            }.frame(maxWidth: .infinity, minHeight: 48)
                .opacity(iso.prefix(7) == date.prefix(7) ? 1 : 0.4)
                .contentShape(Rectangle())
        }.buttonStyle(.plain).disabled(planner.busy)
            .accessibilityLabel("\(today ? "Today, " : "")\(PlannerDates.label(PlannerDates.date(iso), pattern: "EEEE MMMM d yyyy"))")
            .accessibilityValue("\(mark.count) Life areas planned")
            .accessibilityAddTraits(selected ? .isSelected : [])
            .accessibilityIdentifier("life-calendar-day-\(iso)")
    }

    private var unplaced: some View {
        let tasks = snapshot.tasks.filter { $0.allocationId == nil }
        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("To place").font(.title3.weight(.semibold))
                Spacer()
                Text("\(tasks.count) tasks").font(.subheadline).foregroundStyle(LifePalette.secondary)
            }
            if tasks.isEmpty {
                Text("Everything has a place.").font(.subheadline).foregroundStyle(LifePalette.secondary)
            } else {
                LifeTaskRows(planner: planner, snapshot: snapshot, tasks: tasks, onOpenTask: onOpenTask)
            }
        }
    }

    private var room: some View {
        let available = snapshot.roles.filter { snapshot.remainingHours(for: $0.id) >= 0.5 }
            .sorted { ($0.id == snapshot.life?.priorityRoleId ? 0 : 1) < ($1.id == snapshot.life?.priorityRoleId ? 0 : 1) }
        return VStack(alignment: .leading, spacing: 10) {
            if !available.isEmpty {
                Text("Make a little room").font(.title3.weight(.semibold))
                ForEach(available) { role in
                    Button {
                        let day = date
                        Task {
                            if await planner.placeHours(roleId: role.id, day: day, hours: 0.5) {
                                SpreadHaptics.completed()
                            }
                        }
                    } label: {
                        HStack {
                            Circle().fill(Color(hex: role.color)).frame(width: 10, height: 10)
                            Text(role.name)
                            Spacer()
                            Text("+ ½ h").fontWeight(.semibold)
                        }.frame(minHeight: 44)
                    }.disabled(planner.busy)
                        .accessibilityLabel("Reserve half an hour for \(role.name) on \(PlannerDates.label(PlannerDates.date(date), pattern: "EEEE MMMM d"))")
                }
            }
        }
    }

    private func arrow(_ label: String, system: String, action: @escaping () -> Void) -> some View {
        Button(action: action) { Image(systemName: system).frame(minWidth: 44, minHeight: 44) }
            .accessibilityLabel(label).disabled(planner.busy)
    }
    private func mark(for iso: String) -> NativeDayMark {
        if let known = marks[iso] { return known }
        let colors = LifeCalendarRules.dailyRoles(snapshot, day: iso).map(\.color)
        return NativeDayMark(colors: Array(colors.prefix(4)), extra: max(0, colors.count - 4))
    }
    private func restoreProfile() {
        navigationID = UUID(); pendingDate = nil; activeProfile = profile; selectedRole = nil; marks = [:]
        accept(LifeCalendarRules.selection(UserDefaults.standard.string(forKey: selectionKey),
            in: snapshot.weekKey, today: PlannerDates.localISO()))
    }
    private func accept(_ iso: String) {
        if selectedDate != iso { selectedRole = nil }
        selectedDate = iso
        dateHeadingFocused = true
        UserDefaults.standard.set(iso, forKey: selectionKey)
    }
    private func choose(_ iso: String) {
        guard !planner.busy else { return }
        let targetWeek = PlannerDates.weekKey(for: PlannerDates.date(iso))
        if targetWeek == snapshot.weekKey { accept(iso); return }
        let token = UUID(), originProfile = profile
        navigationID = token; pendingDate = iso
        Task { @MainActor in
            let accepted = await planner.send(["type": "openWeek", "weekKey": targetWeek])
            guard navigationID == token, profile == originProfile else { return }
            pendingDate = nil
            guard accepted, planner.snapshot?.weekKey == targetWeek else { return }
            accept(iso)
        }
    }
}
#endif
