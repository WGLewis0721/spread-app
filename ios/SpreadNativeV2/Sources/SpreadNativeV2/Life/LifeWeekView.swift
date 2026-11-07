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
    let onNewRole: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var selectedDate = ""
    @Binding var selectedRole: String?
    @Binding var expanded: Bool
    @Binding var monthAnchor: String?
    let todaySelectionTick: Int
    @GestureState private var dayTranslation: CGSize = .zero
    @State private var dayTravelDirection = 1
    @State private var showingDayComplete = false
    @State private var toPlaceOpen = false
    @State private var overdueOpen = false
    @State private var overdueRows: [NativeOverdueTask] = []
    @State private var overdueLoaded = false
    @State private var overdueReadFailed = false
    @State private var monthAddTarget: MonthAddTarget?
    @State private var invalidDropRoleId: String?
    @State private var showInvalidDrop = false
    @State private var monthLongPress: (iso: String, when: Date)?
    @State private var marks: [String: NativeDayMark] = [:]
    @State private var navigationID = UUID()
    @State private var pendingDate: String?
    @State private var activeProfile = ""
    @AccessibilityFocusState private var dateHeadingFocused: Bool

    private var profile: String { planner.state?.envelope.profileId ?? "" }
    private var date: String { selectedDate.isEmpty ? snapshot.weekKey : selectedDate }
    private var calendarAnchor: String { expanded ? (monthAnchor ?? date) : date }
    private var calendar: Calendar { PlannerDates.calendar }
    private var roles: [Responsibility] { LifeCalendarRules.dailyRoles(snapshot, day: date) }
    private var marksKey: String { "\(profile)|\(calendarAnchor.prefix(7))|\(planner.state?.sessionId ?? "")|\(planner.state?.revision ?? 0)|\(selectedRole ?? "")" }
    private var selectionKey: String { "native.life.selectedDate.\(profile)" }
    private var visibleRole: String? { selectedRole ?? snapshot.roles.first?.id }
    private var toPlaceTasks: [PlannerTask] {
        LifeCalendarRules.toPlaceTasks(snapshot, selectedRoleId: visibleRole)
    }
    private var dayCompletionKey: String {
        "\(date)|\(LifeCalendarRules.dayCompleted(snapshot, day: date))"
    }
    private var overdueRefreshKey: String {
        "\(profile)|\(planner.state?.sessionId ?? "")|\(snapshot.weekKey)|\(planner.state?.revision ?? 0)"
    }
    private struct MonthAddTarget: Identifiable {
        let iso: String
        var id: String { iso }
    }
    private var dayTransition: AnyTransition {
        guard !reduceMotion else { return .opacity }
        return .asymmetric(
            insertion: .offset(x: CGFloat(dayTravelDirection) * 28).combined(with: .opacity),
            removal: .offset(x: CGFloat(-dayTravelDirection) * 28).combined(with: .opacity)
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if expanded {
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        calendarSurface
                        Text("Choose a date to return to your week.")
                            .font(.subheadline).foregroundStyle(LifePalette.secondary)
                            .accessibilityIdentifier("life-month-help")
                    }
                    .padding(.bottom, 16)
                }
                .scrollIndicators(.hidden)
            } else {
                // Pinned overview: only the day workspace scrolls. Never let a long
                // task list push the week's seven dates offscreen.
                calendarSurface
                ScrollView {
                    dayWorkspace
                        .id(date)
                        .transition(dayTransition)
                        .padding(.bottom, 24)
                }
                .scrollDismissesKeyboard(.interactively)
                .scrollIndicators(.hidden)
                .scrollClipDisabled()
                .accessibilityIdentifier("life-week-day-scroll")
            }
        }
        .frame(maxHeight: .infinity, alignment: .top)
        .foregroundStyle(LifePalette.ink)
        .onAppear { restoreProfile() }
        .onChange(of: profile) { _ in restoreProfile() }
        .onChange(of: expanded) { _, active in if !active { monthAnchor = nil } }
        .onChange(of: todaySelectionTick) { _, _ in
            withAnimation(reduceMotion ? nil : SpreadTactile.settle) { expanded = false; monthAnchor = nil }
            choose(PlannerDates.localISO())
        }
        .onChange(of: dayCompletionKey) { old, new in
            let parts = old.split(separator: "|", omittingEmptySubsequences: false)
            guard parts.count == 2, String(parts[0]) == date, String(parts[1]) == "false",
                  new == date + "|true" else { return }
            withAnimation(reduceMotion ? nil : SpreadTactile.settle) { showingDayComplete = true }
            AccessibilityNotification.Announcement("Day complete").post()
            // LifeTaskRows already emits one haptic on a successful completion; do not emit a second.
            Task {
                try? await Task.sleep(for: .seconds(1.3))
                if !Task.isCancelled {
                    withAnimation(reduceMotion ? nil : SpreadTactile.settle) { showingDayComplete = false }
                }
            }
        }
        .overlay {
            if showingDayComplete {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 58, weight: .medium))
                    .foregroundStyle(LifePalette.accent)
                    .padding(20)
                    .background(LifePalette.surface, in: Circle())
                    .transition(reduceMotion ? .opacity : .scale.combined(with: .opacity))
                    .allowsHitTesting(false)
                    .accessibilityIdentifier("life-day-complete")
            }
        }
        .onChange(of: snapshot.weekKey) { week in
            guard activeProfile == profile else { restoreProfile(); return }
            let candidate = pendingDate.flatMap { PlannerDates.weekKey(for: PlannerDates.date($0)) == week ? $0 : nil }
            accept(candidate ?? LifeCalendarRules.selection(selectedDate.isEmpty ? nil : selectedDate, in: week, today: PlannerDates.localISO()))
        }
        .onChange(of: snapshot.roles.map(\.id)) { ids in
            if let selectedRole, !ids.contains(selectedRole) { self.selectedRole = nil }
        }
        .task(id: overdueRefreshKey) { await loadOverdue() }
        .sheet(isPresented: $toPlaceOpen) { toPlaceSheet }
        .sheet(isPresented: $overdueOpen) { overdueSheet }
        .sheet(item: $monthAddTarget) { item in
            MonthQuickAddSheet(planner: planner, roleId: visibleRole ?? "", day: item.iso)
        }
        .confirmationDialog("Reserve time first", isPresented: $showInvalidDrop,
                            titleVisibility: .visible) {
            if let invalidDropRoleId {
                Button("Reserve day hours") { onReserve(invalidDropRoleId) }
                Button("Adjust weekly hours") { onManage(invalidDropRoleId) }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This Life area has no time reserved on that day. The task has not moved.")
        }
        .task(id: marksKey) {
            marks = [:]
            let origin = marksKey
            let anchor = PlannerDates.date(calendarAnchor)
            let previous = calendar.date(byAdding: .month, value: -1, to: anchor) ?? anchor
            let next = calendar.date(byAdding: .month, value: 1, to: anchor) ?? anchor
            // The Classic service grid may have five Sunday-first rows. Read adjacent
            // months too so Life's fixed six Monday-first rows never invent empty dots.
            var combined: [String: NativeDayMark] = [:]
            for monthDate in [previous, anchor, next] {
                guard !Task.isCancelled, marksKey == origin else { return }
                let parts = calendar.dateComponents([.year, .month], from: monthDate)
                guard let year = parts.year, let month = parts.month else { continue }
                if let fresh = await planner.monthMarks(year: year, month: month - 1, selectedRoleId: selectedRole) {
                    combined.merge(fresh) { _, new in new }
                }
            }
            guard !Task.isCancelled, marksKey == origin else { return }
            marks = combined
        }
    }


    private var dayWorkspace: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(PlannerDates.label(PlannerDates.date(date), pattern: "MMMM d"))
                        .font(.subheadline).foregroundStyle(LifePalette.secondary)
                    Text(PlannerDates.label(PlannerDates.date(date), pattern: "EEEE"))
                        .font(.title2.weight(.semibold))
                }.frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityElement(children: .combine).accessibilityAddTraits(.isHeader)
                    .accessibilityFocused($dateHeadingFocused)
                    .accessibilityIdentifier("life-week-day-workspace")
                arrow("Previous day", system: "chevron.left") { choose(LifeCalendarRules.shiftDay(date, by: -1)) }
                arrow("Next day", system: "chevron.right") { choose(LifeCalendarRules.shiftDay(date, by: 1)) }
            }
            .simultaneousGesture(daySwipe)
            dayHoursSummary
            room
            if roles.isEmpty {
                Text("Nothing planned. Tap a glowing Life area to reserve 1 hour on this day.")
                    .font(.callout).foregroundStyle(LifePalette.secondary)
            } else {
                LifeWalletStack(planner: planner, snapshot: snapshot, roles: roles,
                    selectedRole: $selectedRole, editing: false, day: date,
                    onManage: onManage, onDelete: { _ in false })
                if let roleID = selectedRole, let role = roles.first(where: { $0.id == roleID }) {
                    VStack(alignment: .leading, spacing: 14) {
                        Text(role.name).font(.title3.weight(.semibold))
                        HStack(spacing: 8) {
                            Text("\(SpreadHours.text(snapshot.allocations.filter { $0.day == date && $0.roleId == roleID }.reduce(0) { $0 + $1.hours })) h reserved for \(PlannerDates.label(PlannerDates.date(date), pattern: "EEEE"))")
                                .font(.subheadline).foregroundStyle(LifePalette.secondary)
                            Spacer(minLength: 4)
                            Button("Adjust day hours") { onReserve(roleID) }
                                .font(.subheadline.weight(.medium))
                                .frame(minHeight: 44)
                                .accessibilityIdentifier("life-week-adjust-day-hours")
                        }
                        VStack(alignment: .leading, spacing: 0) {
                        LifeTaskRows(planner: planner, snapshot: snapshot,
                            tasks: LifeCalendarRules.dailyTasks(snapshot, day: date, roleId: roleID),
                            day: date, onOpenTask: onOpenTask)
                        LifeQuickAdd(planner: planner, roleId: roleID, day: date, onOpenTask: onOpenTask,
                                     onNeedsHours: onReserve)
                        }.padding(.horizontal, 4)
                            .background(Spread.inset, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }.padding(18).spreadCard()
                    .id(roleID)
                    .transition(SpreadTactile.detailReveal)
                }
            }
            weekInboxes
        }
        .offset(x: reduceMotion ? 0 : max(-28, min(28, dayTranslation.width * 0.35)))
    }

    private var dayHoursSummary: some View {
        HStack(spacing: 8) {
            Text("\(SpreadHours.text(LifeCalendarRules.dailyHours(snapshot, day: date)))h planned today")
                .font(.subheadline.weight(.semibold))
            Spacer(minLength: 4)
            Text("\(roles.count) Life areas")
                .font(.caption).foregroundStyle(LifePalette.secondary)
        }
        .accessibilityIdentifier("life-day-hour-summary")
    }

    private var weekInboxes: some View {
        HStack(spacing: 10) {
            Button { toPlaceOpen = true } label: {
                Label("To Place \(toPlaceTasks.count)", systemImage: "tray")
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .accessibilityIdentifier("life-to-place")
            Button { overdueOpen = true } label: {
                Label(overdueLoaded
                      ? (overdueReadFailed ? "Overdue unavailable" : "Overdue \(overdueRows.count)")
                      : "Overdue loading", systemImage: "calendar.badge.exclamationmark")
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .accessibilityIdentifier("life-overdue")
        }
        .font(.subheadline.weight(.medium))
        .buttonStyle(.spreadPress)
        .spreadCard()
    }

    private var toPlaceSheet: some View {
        SpreadSheetStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Tasks waiting for a day")
                        .font(.headline)
                    ScrollView(.horizontal) {
                        HStack(spacing: 8) {
                            ForEach(snapshot.roles) { role in
                                Button(role.name) { selectedRole = role.id }
                                    .padding(.horizontal, 12)
                                    .frame(minHeight: 44)
                                    .spreadChip(selected: visibleRole == role.id)
                                    .accessibilityIdentifier("life-to-place-role-\(role.id)")
                            }
                        }
                    }
                    .scrollIndicators(.hidden)
                    if toPlaceTasks.isEmpty {
                        ContentUnavailableView("Nothing to place", systemImage: "tray",
                                               description: Text("Add a task or choose another Life area."))
                    } else {
                        ForEach(toPlaceTasks) { task in
                            TaskLine(planner: planner, snapshot: snapshot, task: task,
                                     currentAllocation: nil, onOpenTask: onOpenTask)
                        }
                    }
                }
                .padding(16)
            }
            .navigationTitle("To Place")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("New Life area") {
                        toPlaceOpen = false
                        onNewRole()
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { toPlaceOpen = false }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .accessibilityIdentifier("life-to-place-sheet")
    }

    private var overdueSheet: some View {
        SpreadSheetStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    if !overdueLoaded {
                        ProgressView("Checking overdue tasks")
                    } else if overdueReadFailed {
                        Text("Overdue tasks could not be read. Nothing was changed.")
                        Button("Try again") { Task { await loadOverdue() } }
                            .frame(minHeight: 44)
                    } else if overdueRows.isEmpty {
                        ContentUnavailableView("Nothing overdue", systemImage: "checkmark.circle",
                                               description: Text("You're caught up."))
                    } else {
                        OverdueSelectionTray(planner: planner, snapshot: snapshot,
                                             rows: overdueRows, currentDay: date,
                                             weekDays: LifeCalendarRules.week(date))
                    }
                }
                .padding(16)
            }
            .navigationTitle("Overdue")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { overdueOpen = false }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .accessibilityIdentifier("life-overdue-sheet")
    }

    private func loadOverdue() async {
        let origin = overdueRefreshKey
        overdueLoaded = false
        overdueReadFailed = false
        let response = await planner.allOverdueTasks(today: PlannerDates.localISO())
        guard !Task.isCancelled, overdueRefreshKey == origin else { return }
        overdueRows = response ?? []
        overdueReadFailed = response == nil
        overdueLoaded = true
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

    /// The week strip owns week swipes. Day swipes belong only to the focused day header.
    private var stripSwipe: some Gesture {
        DragGesture(minimumDistance: 65, coordinateSpace: .global).onEnded { value in
            guard !planner.busy,
                  abs(value.translation.width) > abs(value.translation.height) * 1.8 else { return }
            let direction = value.translation.width < 0 ? 1 : -1
            if expanded {
                shiftShownMonth(direction)
            } else {
                choose(LifeCalendarRules.shiftDay(snapshot.weekKey, by: direction * 7))
            }
        }
    }

    private var calendarSurface: some View {
        let cells = LifeCalendarRules.month(calendarAnchor)
        let monday = LifeCalendarRules.week(date).first
        let selectedRow = (cells.firstIndex(of: monday ?? date) ?? 0) / 7
        return VStack(spacing: 10) {
            if typeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: 4) {
                    Text(PlannerDates.label(PlannerDates.date(calendarAnchor), pattern: "MMMM yyyy")).font(.headline)
                    HStack { monthControls; Spacer(minLength: 0); monthToggle }
                }
            } else {
                HStack(spacing: 2) {
                    arrow("Previous month", system: "chevron.left") { shiftShownMonth(-1) }
                    Text(PlannerDates.label(PlannerDates.date(calendarAnchor), pattern: "MMMM yyyy"))
                        .font(.headline).frame(maxWidth: .infinity, alignment: .leading)
                    arrow("Next month", system: "chevron.right") { shiftShownMonth(1) }
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
                if expanded { Button("Today") { choose(PlannerDates.localISO()) }.frame(minHeight: 44) }
            }
        }.padding(12).spreadCard().accessibilityElement(children: .contain)
            .accessibilityIdentifier("life-calendar-strip")
            .accessibilityValue("Planner week \(snapshot.weekKey)")
            .simultaneousGesture(stripSwipe)
    }

    /// Calendar browsing is presentation-only until someone taps an actual date.
    private func shiftShownMonth(_ delta: Int) {
        if expanded {
            withAnimation(reduceMotion ? nil : SpreadTactile.settle) {
                monthAnchor = LifeCalendarRules.shiftMonth(calendarAnchor, by: delta)
            }
            LifeFeedback.selection()
        } else {
            choose(LifeCalendarRules.shiftMonth(date, by: delta))
        }
    }

    private var monthControls: some View {
        HStack {
            arrow("Previous month", system: "chevron.left") { shiftShownMonth(-1) }
            arrow("Next month", system: "chevron.right") { shiftShownMonth(1) }
        }
    }
    private var monthToggle: some View {
        Button {
            withAnimation(reduceMotion ? nil : SpreadTactile.settle) {
                monthAnchor = expanded ? nil : date
                expanded.toggle()
            }
        } label: {
            VStack(spacing: 2) {
                Image(systemName: "calendar")
                Text(expanded ? "Week" : "Month").font(.caption)
            }.frame(minWidth: 44, minHeight: 44)
        }.accessibilityLabel(expanded ? "Show week" : "Show full calendar")
            .accessibilityValue(expanded ? "Expanded" : "Collapsed")
            .accessibilityIdentifier("life-week-month-toggle")
    }

    private func dayCell(_ iso: String) -> some View {
        let selected = iso == date
        let today = iso == PlannerDates.localISO()
        let mark = mark(for: iso)
        let completed = selectedRole.map { LifeCalendarRules.dayCompleted(snapshot, day: iso, roleId: $0) } ?? false
        return Button {
            if let previous = monthLongPress, previous.iso == iso,
               Date().timeIntervalSince(previous.when) < 1.5 {
                monthLongPress = nil
                return
            }
            if expanded { withAnimation(reduceMotion ? nil : SpreadTactile.settle) { expanded = false } }
            choose(iso)
        } label: {
            VStack(spacing: 6) {
                Text(PlannerDates.label(PlannerDates.date(iso), pattern: "d"))
                    .font(.subheadline.weight(.semibold)).monospacedDigit()
                    .frame(minWidth: 30, minHeight: 30)
                    .background(selected ? Spread.accent : Color.clear, in: Circle())
                    .foregroundStyle(selected ? Spread.onAccent : Spread.ink)
                    .overlay(Circle().strokeBorder(today ? Spread.accent : .clear, lineWidth: 1.5))
                HStack(spacing: 2) {
                    ForEach(Array(mark.colors.prefix(3).enumerated()), id: \.offset) { _, color in
                        Circle().fill(Color(hex: color))
                            .frame(width: color == snapshot.roles.first(where: { $0.id == selectedRole })?.color ? 6 : 4,
                                   height: color == snapshot.roles.first(where: { $0.id == selectedRole })?.color ? 6 : 4)
                    }
                    if LifeCalendarRules.overflow(mark.count) > 0 {
                        Text("+\(LifeCalendarRules.overflow(mark.count))").font(.caption2)
                    }
                    if completed {
                        Image(systemName: "checkmark").font(.system(size: 7, weight: .bold))
                            .foregroundStyle(LifePalette.accent)
                    }
                }.frame(height: 5)
            }.frame(maxWidth: .infinity, minHeight: 48)
                .opacity(iso.prefix(7) == date.prefix(7) ? 1 : 0.4)
                .contentShape(Rectangle())
        }.buttonStyle(.spreadPress).disabled(planner.busy)
            .accessibilityLabel("\(today ? "Today, " : "")\(PlannerDates.label(PlannerDates.date(iso), pattern: "EEEE MMMM d yyyy"))")
            .accessibilityValue("\(mark.count) Life areas planned\(completed ? ", selected Life area complete" : "")")
            .accessibilityAddTraits(selected ? .isSelected : [])
            .accessibilityIdentifier("life-calendar-day-\(iso)")
            .dropDestination(for: SpreadDragPayload.self) { items, _ in
                guard let item = items.first, item.kind == .task else { return false }
                if let allocation = snapshot.allocations.first(where: {
                    $0.day == iso && $0.roleId == item.roleId && $0.hours > 0
                }) {
                    Task {
                        if await planner.send(["type": "assignTask", "roleId": item.roleId,
                                               "taskId": item.itemId, "allocationId": allocation.id]) {
                            LifeFeedback.accepted()
                        }
                    }
                } else {
                    invalidDropRoleId = item.roleId
                    showInvalidDrop = true
                }
                return true
            } isTargeted: { _ in }
            .simultaneousGesture(LongPressGesture(minimumDuration: 0.45).onEnded { _ in
                guard expanded, visibleRole != nil else { return }
                monthLongPress = (iso, Date())
                monthAddTarget = MonthAddTarget(iso: iso)
            })
            .accessibilityAction(named: "Add task to this day") {
                if expanded, visibleRole != nil { monthAddTarget = MonthAddTarget(iso: iso) }
            }
    }

    private var room: some View {
        GeometryReader { geometry in
            ScrollView(.horizontal) {
                HStack(alignment: .top, spacing: 12) {
                    ForEach(snapshot.roles) { role in
                        Button {
                            let targetDay = date
                            Task {
                                if await planner.placeHours(roleId: role.id, day: targetDay, hours: 1) {
                                    selectedRole = role.id
                                    LifeFeedback.accepted()
                                }
                            }
                        } label: {
                            VStack(spacing: 8) {
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
                            .accessibilityLabel("Plan one hour of \(role.name) on \(PlannerDates.label(PlannerDates.date(date), pattern: "EEEE"))")
                    }
                }.padding(.vertical, 8)
            }.scrollIndicators(.hidden)
        }.frame(height: 112)
    }

    private func arrow(_ label: String, system: String, action: @escaping () -> Void) -> some View {
        Button(action: action) { Image(systemName: system).frame(minWidth: 44, minHeight: 44) }
            .accessibilityLabel(label).disabled(planner.busy)
    }
    private func mark(for iso: String) -> NativeDayMark {
        if let known = marks[iso] { return known }
        let colors = LifeCalendarRules.orderedDayColors(snapshot, day: iso, selectedRoleId: selectedRole)
        return NativeDayMark(colors: Array(colors.prefix(3)), extra: LifeCalendarRules.overflow(colors.count))
    }
    private func restoreProfile() {
        if !activeProfile.isEmpty && activeProfile != profile { selectedRole = nil }
        navigationID = UUID(); pendingDate = nil; activeProfile = profile; marks = [:]
        expanded = false
        monthAnchor = nil
        accept(LifeCalendarRules.selection(UserDefaults.standard.string(forKey: selectionKey),
            in: snapshot.weekKey, today: PlannerDates.localISO()))
    }
    private func accept(_ iso: String) {
        if date != iso { dayTravelDirection = iso > date ? 1 : -1 }
        withAnimation(reduceMotion ? nil : SpreadTactile.glide) {
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
