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
    @Binding var selectedRole: String?
    @GestureState private var dayTranslation: CGSize = .zero
    @State private var expanded = false
    @State private var inboxOpen = false
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
        VStack(alignment: .leading, spacing: Spread.space3) {
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
            .simultaneousGesture(daySwipe)
            if !snapshot.roles.isEmpty {
                room
            }
            if !roles.isEmpty {
                LifeWalletStack(planner: planner, snapshot: snapshot, roles: roles,
                    selectedRole: $selectedRole, day: date)
                if let roleID = selectedRole, let role = roles.first(where: { $0.id == roleID }) {
                    VStack(alignment: .leading, spacing: 14) {
                        Text(role.name).font(.title3.weight(.semibold))
                        Text("\(SpreadHours.text(snapshot.allocations.filter { $0.day == date && $0.roleId == roleID }.reduce(0) { $0 + $1.hours })) h reserved for \(PlannerDates.label(PlannerDates.date(date), pattern: "EEEE"))")
                            .font(.subheadline).foregroundStyle(LifePalette.secondary)
                        VStack(alignment: .leading, spacing: 0) {
                        LifeTaskRows(planner: planner, snapshot: snapshot,
                            tasks: LifeCalendarRules.dailyTasks(snapshot, day: date, roleId: roleID),
                            day: date, onOpenTask: onOpenTask)
                        LifeQuickAdd(planner: planner, roleId: roleID, day: date, onOpenTask: onOpenTask)
                        }.padding(.horizontal, Spread.space1)
                            .background(Spread.inset, in: RoundedRectangle(cornerRadius: Spread.radiusInset, style: .continuous))
                    }.padding(18).spreadCard()
                    .id(roleID)
                    .transition(SpreadTactile.detailReveal)
                }
            }
            unplaced

        }
        .offset(x: reduceMotion ? 0 : max(-28, min(28, dayTranslation.width * 0.35)))
        .foregroundStyle(LifePalette.ink)
        .accessibilityElement(children: .contain)
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
            let anchor = PlannerDates.date(date)
            let previous = calendar.date(byAdding: .month, value: -1, to: anchor) ?? anchor
            let next = calendar.date(byAdding: .month, value: 1, to: anchor) ?? anchor
            // The Classic service grid may have five Sunday-first rows. Read adjacent
            // months too so Life's fixed six Monday-first rows never invent empty dots.
            var combined: [String: NativeDayMark] = [:]
            for monthDate in [previous, anchor, next] {
                guard !Task.isCancelled, marksKey == origin else { return }
                let parts = calendar.dateComponents([.year, .month], from: monthDate)
                guard let year = parts.year, let month = parts.month else { continue }
                if let fresh = await planner.monthMarks(year: year, month: month - 1) {
                    combined.merge(fresh) { _, new in new }
                }
            }
            guard !Task.isCancelled, marksKey == origin else { return }
            marks = combined
        }
    }

    /// Horizontal drags on the calendar and date header change days. Keep task-reorder
    /// drop targets and vertical schedule scrolling outside this gesture region.
    private var daySwipe: some Gesture {
        DragGesture(minimumDistance: 12, coordinateSpace: .global)
            .updating($dayTranslation) { value, state, transaction in
                guard !expanded, abs(value.translation.width) > abs(value.translation.height) * 1.5 else { return }
                transaction.disablesAnimations = true
                state = value.translation
            }
            .onEnded { value in
                guard !expanded, !planner.busy else { return }
                let direction = TactilePrecisionMath.daySwipeDirection(
                    horizontal: Double(value.translation.width),
                    vertical: Double(value.translation.height), projected: Double(value.predictedEndTranslation.width))
                if direction != 0 {
                    choose(LifeCalendarRules.shiftDay(date, by: direction))
                }
            }
    }

    private var calendarSurface: some View {
        let cells = LifeCalendarRules.month(date)
        let monday = LifeCalendarRules.week(date).first
        let selectedRow = (cells.firstIndex(of: monday ?? date) ?? 0) / 7
        return VStack(spacing: 10) {
            if typeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: Spread.space1) {
                    Text(PlannerDates.label(PlannerDates.date(date), pattern: "MMMM yyyy")).font(.headline)
                    HStack { monthControls; Spacer(minLength: 0); monthToggle }
                }
            } else {
                HStack(spacing: 2) {
                    arrow("Previous month", system: "chevron.left") { choose(LifeCalendarRules.shiftMonth(date, by: -1)) }
                    Text(PlannerDates.label(PlannerDates.date(date), pattern: "MMMM yyyy"))
                        .font(.headline).frame(maxWidth: .infinity, alignment: .leading)
                    arrow("Next month", system: "chevron.right") { choose(LifeCalendarRules.shiftMonth(date, by: 1)) }
                    monthToggle
                }
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
                if expanded { Button("Today") { choose(PlannerDates.localISO()) }.frame(minHeight: Spread.minimumTarget) }
            }
        }.padding(Spread.space3).spreadCard().accessibilityElement(children: .contain)
            .simultaneousGesture(daySwipe)
    }

    private var monthControls: some View {
        HStack {
            arrow("Previous month", system: "chevron.left") { choose(LifeCalendarRules.shiftMonth(date, by: -1)) }
            arrow("Next month", system: "chevron.right") { choose(LifeCalendarRules.shiftMonth(date, by: 1)) }
        }
    }
    private var monthToggle: some View {
        Button {
            withAnimation(reduceMotion ? nil : SpreadTactile.settle) { expanded.toggle() }
        } label: {
            VStack(spacing: 2) {
                SpreadIcon(name: "lucide-calendar-days", size: 20)
                Text(expanded ? "Week" : "Month").font(.caption)
            }.frame(minWidth: Spread.minimumTarget, minHeight: Spread.minimumTarget)
        }.accessibilityLabel(expanded ? "Show week" : "Show full calendar")
            .accessibilityValue(expanded ? "Expanded" : "Collapsed")
            .accessibilityIdentifier("life-week-month-toggle")
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
                    .background(selected ? Spread.accent : Color.clear, in: Circle())
                    .foregroundStyle(selected ? Spread.onAccent : Spread.ink)
                    .overlay(Circle().strokeBorder(today ? Spread.accent : .clear, lineWidth: 1.5))
                HStack(spacing: 2) {
                    ForEach(Array(mark.colors.prefix(4).enumerated()), id: \.offset) { _, color in
                        Circle().fill(Color(hex: color)).frame(width: 4, height: 4)
                    }
                    if mark.extra > 0 { Text("+").font(.caption2) }
                }.frame(height: 5)
            }.frame(maxWidth: .infinity, minHeight: 48)
                .opacity(iso.prefix(7) == date.prefix(7) ? 1 : 0.4)
                .contentShape(Rectangle())
        }.buttonStyle(.spreadPress).disabled(planner.busy).opacity(planner.busy ? Spread.disabledOpacity : 1)
            .accessibilityLabel("\(today ? "Today, " : "")\(PlannerDates.label(PlannerDates.date(iso), pattern: "EEEE MMMM d yyyy"))")
            .accessibilityValue("\(mark.count) Life areas planned")
            .accessibilityAddTraits(selected ? .isSelected : [])
            .accessibilityIdentifier("life-calendar-day-\(iso)")
    }

    private var unplaced: some View {
        let tasks = snapshot.unplacedTasks
        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Spacer(minLength: 0)
                Button {
                    withAnimation(reduceMotion ? nil : SpreadTactile.settle) { inboxOpen.toggle() }
                } label: {
                    HStack(spacing: Spread.space2) {
                        SpreadIcon(name: "lucide-inbox", size: 19)
                            .font(.title3.weight(.medium))
                        Text(String(tasks.count))
                            .font(.subheadline.weight(.semibold))
                            .monospacedDigit()
                        SpreadIcon(name: inboxOpen ? "lucide-chevron-up" : "lucide-chevron-down", size: 18)
                            .font(.caption.weight(.semibold))
                    }
                    .foregroundStyle(Spread.ink)
                    .padding(.horizontal, 14)
                    .frame(minHeight: Spread.minimumTarget)
                    .background(Spread.elevated, in: Capsule())
                    .overlay(Capsule().strokeBorder(Spread.line, lineWidth: 1))
                }
                .buttonStyle(.spreadPress)
                .accessibilityLabel("Tasks to place, \(tasks.count)")
                .accessibilityValue(inboxOpen ? "Expanded" : "Collapsed")
                .accessibilityHint("Show or hide tasks waiting for a day")
                .accessibilityIdentifier("life-to-place-inbox")
            }
            if inboxOpen && !tasks.isEmpty {
                LifeTaskRows(planner: planner, snapshot: snapshot, tasks: tasks, onOpenTask: onOpenTask)
                    .padding(Spread.space3)
                    .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }

    private var room: some View {
        GeometryReader { geometry in
            ScrollView(.horizontal) {
                HStack(alignment: .top, spacing: Spread.space3) {
                    ForEach(snapshot.roles) { role in
                        Button {
                            let targetDay = date
                            Task {
                                // Hours placement is not a task completion, so it is silent (OD2).
                                _ = await planner.placeHours(roleId: role.id, day: targetDay, hours: 1)
                            }
                        } label: {
                            VStack(spacing: Spread.space2) {
                                ZStack {
                                    Circle().fill(Color(hex: role.color).opacity(0.16))
                                    Circle().strokeBorder(Color(hex: role.color), lineWidth: 2)
                                        .shadow(color: Color(hex: role.color).opacity(0.5), radius: 6)
                                    Text("+1h").font(.headline).foregroundStyle(Spread.ink)
                                }.frame(width: 52, height: 52)
                                Text(role.name).font(.caption).lineLimit(2)
                            }.frame(width: max(56, (geometry.size.width - 36) / 4))
                        }.buttonStyle(.spreadPress)
                            .disabled(planner.busy || snapshot.remainingHours(for: role.id) < 1)
                            .opacity(planner.busy || snapshot.remainingHours(for: role.id) < 1 ? Spread.disabledOpacity : 1)
                            .accessibilityLabel("Plan one hour of \(role.name) on \(PlannerDates.label(PlannerDates.date(date), pattern: "EEEE"))")
                    }
                }.padding(.vertical, Spread.space2)
            }.scrollIndicators(.hidden)
        }.frame(height: 112)
    }

    private func arrow(_ label: String, system: String, action: @escaping () -> Void) -> some View {
        Button(action: action) { SpreadIcon(name: system == "chevron.left" ? "lucide-chevron-left" : "lucide-chevron-right", size: 20).frame(minWidth: Spread.minimumTarget, minHeight: Spread.minimumTarget) }
            .accessibilityLabel(label).disabled(planner.busy)
            .opacity(planner.busy ? Spread.disabledOpacity : 1)
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
        withAnimation(reduceMotion ? nil : SpreadTactile.glide) {
            if selectedDate != iso { selectedRole = nil }
            selectedDate = iso
        }
        dateHeadingFocused = true
        UserDefaults.standard.set(iso, forKey: selectionKey)
    }
    private func choose(_ iso: String) {
        guard !planner.busy else { return }
        let targetWeek = PlannerDates.weekKey(for: PlannerDates.date(iso))
        if targetWeek == snapshot.weekKey {
            if date != iso { accept(iso); LifeFeedback.selection() }
            return
        }
        let token = UUID(), originProfile = profile
        navigationID = token; pendingDate = iso
        Task { @MainActor in
            let accepted = await planner.send(["type": "openWeek", "weekKey": targetWeek])
            guard navigationID == token, profile == originProfile else { return }
            pendingDate = nil
            guard accepted, planner.snapshot?.weekKey == targetWeek else { return }
            accept(iso)
            LifeFeedback.selection()
        }
    }
}
#endif
