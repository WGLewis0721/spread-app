#if os(iOS)
import SwiftUI

/// The Spread surface (`Summary` and `RoleBlock` in spread-app.tsx) with the owner-approved layout choice
/// (Stack, Fan, Dial, Tabs, Day). The summary is the same in every layout: total hours, a responsibility-coloured
/// hour bar that jumps to a role, done counts, Rollover and Review open tasks. Changing the layout is a
/// per-device display choice; it never writes planner data.
struct SpreadSurface: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    @Binding var layout: SpreadLayout
    let editing: Bool
    @Binding var selectedRole: String?
    let onOpenRole: (String) -> Void
    let onOpenTask: (String, String) -> Void
    let onNewRole: () -> Void
    let onRollover: () -> Void
    let onReview: () -> Void

    @State private var tabSelection = "all"
    @State private var daySelection = PlannerDates.localISO()
    @State private var dropOpen = false

    private var totalHours: Double { snapshot.roles.reduce(0) { $0 + $1.hours } }
    private var taskCount: Int { snapshot.tasks.count }
    private var doneCount: Int { snapshot.tasks.filter(\.done).count }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            summary
            layoutPicker
            layoutBody
            newSpread
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .accessibilityIdentifier("spread-surface")
    }

    // MARK: Summary

    private var summary: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("\(SpreadHours.text(totalHours)) \(totalHours == 1 ? "hour" : "hours") across \(snapshot.roles.count) \(snapshot.roles.count == 1 ? "spread" : "spreads")")
                .font(.system(size: 17))
                .monospacedDigit()
            if totalHours > 0 {
                HStack(spacing: 4) {
                    ForEach(snapshot.roles.filter { $0.hours > 0 }) { role in
                        Button {
                            selectedRole = role.id
                            withAnimation(SpreadMotion.curve) { layout = .stack }
                        } label: {
                            Capsule().fill(Color(hex: role.color)).frame(height: 8)
                                .frame(minHeight: 44)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .frame(maxWidth: .infinity)
                        .layoutPriority(role.hours)
                        .accessibilityLabel("Jump to \(role.name), \(SpreadHours.spoken(role.hours))")
                    }
                }
                .frame(minHeight: 44)
                .accessibilityElement(children: .contain)
                .accessibilityLabel("\(SpreadHours.spoken(totalHours)) across responsibilities. Choose a colour to jump to its responsibility.")
            }
            Text(taskCount == 0 ? "List the work that fits." : "\(doneCount) of \(taskCount) done")
                .font(Spread.footnote).foregroundStyle(Spread.secondary).monospacedDigit()
            if totalHours > 45 {
                Text("If the hours don’t fit, something is lying.").font(Spread.footnote).foregroundStyle(Spread.caution)
            }
            HStack(spacing: 24) {
                Button(action: onRollover) {
                    HStack(spacing: 8) {
                        SpreadIcon(name: "icon-rollover", size: 22)
                        Text("Rollover").font(.system(size: 15, weight: .semibold))
                    }
                    .foregroundStyle(Spread.accent).frame(minHeight: 44)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("rollover")
                if snapshot.tasks.contains(where: { !$0.done }) {
                    Button(action: onReview) {
                        Text("Review open tasks").font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Spread.accent).frame(minHeight: 44)
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("review-unfinished")
                }
            }
        }
        .padding(.top, 8)
    }

    // MARK: Layout picker

    private var layoutPicker: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                ForEach(SpreadLayout.allCases) { item in
                    let selected = layout == item
                    Button { withAnimation(SpreadMotion.curve) { layout = item } } label: {
                        VStack(spacing: 4) {
                            LayoutGlyph(layout: item)
                                .frame(width: 28, height: 28)
                            Text(item.title).font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundStyle(selected ? Spread.onAccent : Spread.ink)
                        .padding(.horizontal, 12)
                        .frame(minWidth: 64, minHeight: 56)
                        .background(selected ? Spread.accent : Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
                        .contentShape(RoundedRectangle(cornerRadius: Spread.radiusRow))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(item.title)
                    .accessibilityAddTraits(selected ? .isSelected : [])
                    .accessibilityIdentifier("layout-\(item.rawValue)")
                }
            }
            .padding(.vertical, 2)
        }
        .scrollIndicators(.hidden)
        .accessibilityIdentifier("view-mode-button")
    }

    // MARK: Layout bodies

    @ViewBuilder private var layoutBody: some View {
        let rows = snapshot.roles.map { LayoutRow(role: $0, hours: $0.hours) }
        switch layout {
        case .stack:
            StackLayout(planner: planner, snapshot: snapshot, selectedRole: $selectedRole, editing: editing, onOpenTask: onOpenTask, onOpenRole: onOpenRole)
        case .fan:
            FanLayout(planner: planner, rows: rows, selectedId: selectedRole ?? rows.first?.role.id ?? "", onSelect: { selectedRole = $0 }, onOpenTask: onOpenTask, snapshot: snapshot)
        case .dial:
            DialLayout(planner: planner, rows: rows, selectedId: selectedRole ?? rows.first?.role.id ?? "", onSelect: { selectedRole = $0 }, onOpenRole: onOpenRole, snapshot: snapshot)
        case .tabs:
            TabsLayout(planner: planner, rows: rows, tab: $tabSelection, snapshot: snapshot, onOpenTask: onOpenTask)
        case .day:
            DayLayout(planner: planner, rows: rows, snapshot: snapshot, selectedDay: $daySelection, selectedRole: $selectedRole, onOpenTask: onOpenTask)
        }
    }

    private var newSpread: some View {
        Button(action: onNewRole) {
            HStack(spacing: 12) {
                SpreadIcon(name: "icon-new-life", size: 32, original: true)
                VStack(alignment: .leading, spacing: 2) {
                    Text("New Spread").font(.system(size: 17, weight: .semibold))
                    Text("Make your own spreads.").font(Spread.footnote).foregroundStyle(Spread.secondary)
                }
                Spacer(minLength: 0)
            }
            .padding(16)
            .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
            .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
            .contentShape(RoundedRectangle(cornerRadius: Spread.radiusCard))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("new-spread")
    }
}

/// One row of the layout data: a responsibility with its bank of hours.
struct LayoutRow: Identifiable {
    let role: Responsibility
    let hours: Double
    var id: String { role.id }
}

/// The mini glyph for each layout (drawn from the Studio `LayoutGlyph` geometry, in the current ink).
struct LayoutGlyph: View {
    let layout: SpreadLayout

    var body: some View {
        Canvas { context, size in
            let s = size.width / 34
            let stroke = StrokeStyle(lineWidth: 1.6 * s, lineCap: .round, lineJoin: .round)
            func rrect(_ x: Double, _ y: Double, _ w: Double, _ h: Double, _ r: Double) -> Path {
                Path(roundedRect: CGRect(x: x * s, y: y * s, width: w * s, height: h * s), cornerRadius: r * s)
            }
            switch layout {
            case .stack:
                for y in [6.0, 13.0, 20.0] { context.stroke(rrect(5, y, 24, 8, 4), with: .color(Spread.ink), style: stroke) }
            case .fan:
                context.stroke(rrect(9, 8, 16, 20, 4), with: .color(Spread.ink.opacity(0.5)), style: stroke)
                context.stroke(rrect(9, 7, 16, 21, 4), with: .color(Spread.ink), style: stroke)
            case .dial:
                let ring = Path(ellipseIn: CGRect(x: 6 * s, y: 6 * s, width: 22 * s, height: 22 * s))
                context.stroke(ring, with: .color(Spread.ink), style: stroke)
                context.stroke(Path(ellipseIn: CGRect(x: 12 * s, y: 12 * s, width: 10 * s, height: 10 * s)), with: .color(Spread.ink), style: stroke)
            case .tabs:
                for x in [3.0, 14.0, 25.0] { context.stroke(rrect(x, 6, 9, 6, 3), with: .color(Spread.ink), style: stroke) }
                context.stroke(rrect(5, 16, 24, 12, 4), with: .color(Spread.ink), style: stroke)
            case .day:
                var rail = Path()
                rail.move(to: CGPoint(x: 8 * s, y: 5 * s)); rail.addLine(to: CGPoint(x: 8 * s, y: 29 * s))
                context.stroke(rail, with: .color(Spread.ink), style: stroke)
                context.stroke(rrect(14, 6, 14, 8, 3), with: .color(Spread.ink), style: stroke)
                context.stroke(rrect(14, 18, 14, 9, 3), with: .color(Spread.ink), style: stroke)
            }
        }
        .accessibilityHidden(true)
    }
}

/// Role row with its colour/category button, inline name, day marks, hour adjust, task fold, palette, and
/// (in Edit) Remove. Shared by the Stack list and the Tabs panel.
struct RoleRow: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let role: Responsibility
    let editing: Bool
    var focused: Bool = false
    let onOpenTask: (String, String) -> Void
    let onOpenRole: (String) -> Void

    @State private var name = ""
    @State private var palette = false
    @State private var adjusting = false
    @State private var tasksOpen = true
    @FocusState private var nameFocused: Bool

    private var tasks: [PlannerTask] { snapshot.tasks(for: role.id) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 12) {
                Button { withAnimation(SpreadMotion.cascade) { palette.toggle() } } label: {
                    RoleBadge(category: role.category == "custom" ? nil : role.category, color: role.color, size: 36)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Colour for \(role.name)")
                .accessibilityValue(palette ? "Expanded" : "Collapsed")
                .accessibilityIdentifier("role-colour-\(role.id)")

                VStack(alignment: .leading, spacing: 2) {
                    TextField("Name", text: $name)
                        .font(.system(size: 17))
                        .focused($nameFocused)
                        .submitLabel(.done)
                        .onSubmit { commitName() }
                        .onChange(of: nameFocused) { _, focused in if !focused { commitName() } }
                        .accessibilityLabel("\(role.name) name")
                        .accessibilityIdentifier("role-name-\(role.id)")
                    DayMarks(snapshot: snapshot, role: role)
                }

                if adjusting {
                    HourStepper(value: role.hours, label: "\(role.name) hours") { hours in
                        Task { await planner.send(["type": "setHours", "roleId": role.id, "hours": hours]) }
                    }
                    .transition(.opacity)
                    Button { adjusting = false } label: {
                        Text("Done").font(.system(size: 15, weight: .semibold)).foregroundStyle(Spread.accent).frame(minHeight: 44)
                    }
                    .buttonStyle(.plain)
                } else {
                    Button { adjusting = true } label: {
                        Text("\(SpreadHours.text(role.hours))h")
                            .font(.system(size: 17)).foregroundStyle(Spread.secondary).monospacedDigit()
                            .frame(minWidth: 44, minHeight: 44)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(role.name), \(SpreadHours.spoken(role.hours)). Adjust")
                    .accessibilityIdentifier("hours-stepper-\(role.id)")
                }

                Button { withAnimation(SpreadMotion.curve) { tasksOpen.toggle() } } label: {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 15, weight: .semibold)).foregroundStyle(Spread.secondary)
                        .rotationEffect(.degrees(tasksOpen ? 90 : 0))
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tasksOpen ? "Hide tasks for \(role.name)" : "Show tasks for \(role.name)")
                .accessibilityAddTraits(tasksOpen ? .isExpanded : [])
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .frame(minHeight: 64)

            if palette {
                PalettePanel(planner: planner, role: role)
                    .transition(.opacity.combined(with: .offset(y: 14)))
            }

            if editing {
                Button {
                    onOpenRole(role.id)
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "minus.circle.fill").foregroundStyle(Spread.danger)
                        Text("Remove \(role.name)").font(.system(size: 15, weight: .medium)).foregroundStyle(Spread.danger)
                    }
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                    .padding(.horizontal, 16)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("remove-role-\(role.id)")
            }

            if tasksOpen {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(tasks) { task in
                        TaskRow(planner: planner, snapshot: snapshot, task: task, roleId: role.id, onOpen: { onOpenTask(role.id, task.id) })
                            .transition(.opacity.combined(with: .offset(y: 14)))
                    }
                    AddTaskRow(placeholder: tasks.isEmpty ? "What matters most here?" : "Add a task") { text in
                        Task { await planner.send(["type": "addTask", "roleId": role.id, "text": text]) }
                    }
                }
                .padding(.bottom, 4)
            }
        }
        .background(focused ? Spread.elevated : Color.clear)
        .id("spread-role-\(role.id)")
        .onAppear { name = role.name }
        .onChange(of: role.name) { _, value in name = value }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("role-block-\(role.id)")
    }

    private func commitName() {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { name = role.name; return }
        guard trimmed != role.name else { return }
        Task { await planner.send(["type": "renameRole", "roleId": role.id, "name": trimmed], completionHaptic: false) }
    }
}

/// Day marks: M Tu W Th F Sa Su, coloured in the role's colour on each day it is placed (`DayMarks`).
struct DayMarks: View {
    let snapshot: PlannerSnapshot
    let role: Responsibility

    var body: some View {
        let placed = Set(snapshot.allocations.filter { $0.roleId == role.id && $0.hours > 0 }.map(\.day))
        // Monday first, the order of the day marks (M Tu W Th F Sa Su).
        let marksOrder = Array(PlannerOrder.displayOffsets.reversed())
        let spoken = PlannerOrder.displayOffsets.reversed().map { PlannerDates.dayISO(weekKey: snapshot.weekKey, index: $0) }.filter { placed.contains($0) }
        HStack(spacing: 8) {
            ForEach(marksOrder.indices, id: \.self) { index in
                let iso = PlannerDates.dayISO(weekKey: snapshot.weekKey, index: marksOrder[index])
                let on = placed.contains(iso)
                Text(PlannerOrder.dayMarks[index])
                    .font(.system(size: 12, weight: on ? .semibold : .medium))
                    .foregroundStyle(on ? Color(hex: role.color) : Spread.tertiary)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(spoken.isEmpty ? "Not placed on any day" : "\(role.name) on \(spoken.map { PlannerDates.label(PlannerDates.date($0), pattern: "EEEE") }.joined(separator: ", "))")
    }
}

/// The colour and symbol palette (`Color` / `Symbol` in `RoleBlock`). Changing either is a store write.
struct PalettePanel: View {
    @ObservedObject var planner: LivePlanner
    let role: Responsibility

    static let colors: [String] = ["#34C759", "#FF9500", "#007AFF", "#FF2D55", "#AF52DE", "#64D2FF", "#5856D6",
                                   "#30B0C7", "#FFCC00", "#FF9F0A", "#BF5AF2"]
    static let categories: [(id: String, label: String)] = [
        ("work", "Work"), ("school", "School"), ("home", "Home"), ("health", "Health"), ("family", "Family"),
        ("fitness", "Fitness"), ("business", "Business"), ("project", "Project"), ("church", "Church"), ("personal", "Personal"),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Colour").font(.system(size: 15, weight: .semibold))
            HStack(spacing: 4) {
                ForEach(Self.colors, id: \.self) { color in
                    Button {
                        Task { await planner.send(["type": "setRoleColor", "roleId": role.id, "color": color]) }
                    } label: {
                        Circle().fill(Color(hex: color)).frame(width: 28, height: 28)
                            .overlay(Circle().stroke(Spread.ink, lineWidth: role.color.lowercased() == color.lowercased() ? 2 : 0).padding(-4))
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Use \(color)")
                    .accessibilityAddTraits(role.color.lowercased() == color.lowercased() ? .isSelected : [])
                }
            }
            Text("Symbol" + (role.category == "custom" ? "" : " · \(Self.categories.first { $0.id == role.category }?.label ?? "")"))
                .font(Spread.footnote).foregroundStyle(Spread.secondary)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 5), spacing: 6) {
                ForEach(Self.categories, id: \.id) { item in
                    let selected = role.category == item.id
                    Button {
                        Task { await planner.send(["type": "setRoleCategory", "roleId": role.id, "category": item.id]) }
                    } label: {
                        RoleBadge(category: item.id, color: role.color, size: 32)
                            .frame(width: 44, height: 44)
                            .overlay(Circle().stroke(Spread.ink, lineWidth: selected ? 2 : 0).frame(width: 40, height: 40))
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(item.label)
                    .accessibilityAddTraits(selected ? .isSelected : [])
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// One task inside a role (`TaskRow`): a 56 pt checkbox, the text (opens the task sheet), the day it is on,
/// and Not today while it sits on today. Completing a task gives one light haptic, after the store's ACK.
struct TaskRow: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let task: PlannerTask
    let roleId: String
    let onOpen: () -> Void

    private var dayISO: String? {
        guard let allocationId = task.allocationId else { return nil }
        return snapshot.allocations.first { $0.id == allocationId }?.day
    }
    private var isToday: Bool { dayISO == PlannerDates.localISO() }

    var body: some View {
        HStack(spacing: 0) {
            Button {
                Task { await planner.send(["type": "toggleTask", "roleId": roleId, "taskId": task.id], completionHaptic: !task.done) }
            } label: {
                Image(systemName: task.done ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 26, weight: .regular))
                    .foregroundStyle(task.done ? Spread.accent : Spread.tertiary)
                    .frame(width: 56, height: 56)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(task.done ? "Mark not done: \(task.text)" : "Mark done: \(task.text)")
            .accessibilityAddTraits(task.done ? .isSelected : [])
            .accessibilityIdentifier("task-check-\(task.id)")

            Button(action: onOpen) {
                HStack(spacing: 8) {
                    Text(task.text.isEmpty ? "Untitled task" : task.text)
                        .font(.system(size: 17))
                        .strikethrough(task.done)
                        .foregroundStyle(task.done ? Spread.secondary : Spread.ink)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    Spacer(minLength: 4)
                    if let dayISO, !isToday {
                        Text(PlannerDates.label(PlannerDates.date(dayISO), pattern: "EEE"))
                            .font(.system(size: 12, weight: .semibold)).foregroundStyle(Spread.secondary)
                    }
                    Image(systemName: "chevron.right").font(.system(size: 13)).foregroundStyle(Spread.tertiary)
                }
                .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("task-row-\(task.id)")

            if isToday && !task.done {
                Button {
                    Task { await planner.send(["type": "assignTask", "roleId": roleId, "taskId": task.id, "allocationId": NSNull()]) }
                } label: {
                    Text("Not today").font(.system(size: 15, weight: .semibold)).foregroundStyle(Spread.accent)
                        .padding(.leading, 4).padding(.trailing, 12).frame(minHeight: 56)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Not today: \(task.text)")
                .accessibilityIdentifier("not-today-\(task.id)")
            }
        }
        .padding(.leading, 12)
        .overlay(alignment: .top) { Rectangle().fill(Spread.line).frame(height: 0.5).padding(.leading, 56) }
    }
}

/// The add-a-task line (`AddTaskRow`). Return adds the text and clears the field.
struct AddTaskRow: View {
    let placeholder: String
    let onAdd: (String) -> Void
    @State private var text = ""

    var body: some View {
        HStack(spacing: 0) {
            Image(systemName: "plus").font(.system(size: 18, weight: .regular)).foregroundStyle(Spread.accent)
                .frame(width: 56, height: 56)
                .accessibilityHidden(true)
            TextField(placeholder, text: $text)
                .font(.system(size: 17))
                .submitLabel(.done)
                .onSubmit {
                    let value = text.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !value.isEmpty else { return }
                    onAdd(value)
                    text = ""
                }
                .frame(minHeight: 56)
                .accessibilityLabel(placeholder)
                .accessibilityIdentifier("new-task-field")
        }
        .padding(.leading, 12)
        .overlay(alignment: .top) { Rectangle().fill(Spread.line).frame(height: 0.5).padding(.leading, 56) }
    }
}

/// The Stack layout: role rows as overlapping cards, the focused one open, the rest tucked behind it (C06).
struct StackLayout: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    @Binding var selectedRole: String?
    let editing: Bool
    let onOpenTask: (String, String) -> Void
    let onOpenRole: (String) -> Void

    var body: some View {
        VStack(spacing: 0) {
            ForEach(snapshot.roles) { role in
                RoleRow(planner: planner, snapshot: snapshot, role: role, editing: editing, focused: selectedRole == role.id,
                        onOpenTask: onOpenTask, onOpenRole: onOpenRole)
                    .background(Spread.elevated)
                    .overlay(alignment: .top) {
                        if role.id != snapshot.roles.first?.id { Rectangle().fill(Spread.line).frame(height: 0.5).padding(.leading, 60) }
                    }
                    .onTapGesture { selectedRole = role.id }
                    .shadow(color: Spread.shadow.opacity(0.7), radius: 6, y: -2)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: Spread.radiusCard))
        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
        .accessibilityIdentifier("stack-cards")
    }
}
#endif
