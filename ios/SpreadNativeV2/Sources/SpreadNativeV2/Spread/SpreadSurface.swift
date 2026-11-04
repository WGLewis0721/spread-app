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
            manageRow
            newSpread
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .accessibilityIdentifier("spread-surface")
    }

    // MARK: Summary

    /// The real hour summary: total hours, how many spreads they cover, an hour-proportional bar to choose a
    /// responsibility, and the two quiet planning actions. One card, one row of actions.
    private var summary: some View {
        let spreads = snapshot.roles.count
        let spreadWord = spreads == 1 ? "spread" : "spreads"
        let spoken = SpreadHours.spoken(totalHours) + " across \(spreads) \(spreadWord)" + (taskCount > 0 ? ", \(doneCount) of \(taskCount) tasks done" : "")
        return VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    Text(SpreadHours.text(totalHours)).font(.system(.title, weight: .bold)).monospacedDigit()
                    Text("h").font(.system(.headline, weight: .semibold)).foregroundStyle(Spread.secondary)
                }
                Text("across \(spreads) \(spreadWord)").font(.system(.subheadline)).foregroundStyle(Spread.secondary)
                Spacer(minLength: 8)
                if taskCount > 0 {
                    Text("\(doneCount) of \(taskCount) done")
                        .font(.system(.subheadline, weight: .medium)).foregroundStyle(Spread.secondary).monospacedDigit()
                }
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(spoken)
            .accessibilityIdentifier("hour-summary")

            if totalHours > 0 {
                // One segment per responsibility, sized by its hours. Choosing one selects that responsibility in
                // every layout (the selection is shared) and never switches the layout or writes planner data.
                HourStripRow(spacing: 4) {
                    ForEach(snapshot.roles.filter { $0.hours > 0 }) { role in
                        let chosen = selectedRole == role.id
                        Button {
                            selectedRole = role.id
                            tabSelection = role.id
                        } label: {
                            Capsule().fill(Color(hex: role.color))
                                .frame(height: chosen ? 12 : 8)
                                .shadow(color: Color(hex: role.color).opacity(chosen ? 0.55 : 0), radius: 6)
                                .frame(maxWidth: .infinity, minHeight: 44)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .hourStripHours(role.hours)
                        .accessibilityLabel("\(role.name), \(SpreadHours.spoken(role.hours))")
                        .accessibilityAddTraits(chosen ? .isSelected : [])
                        .accessibilityIdentifier("hour-segment-\(role.id)")
                    }
                }
                .frame(height: 44)
                .animation(SpreadMotion.cascade, value: selectedRole)
                .accessibilityElement(children: .contain)
                .accessibilityLabel("\(SpreadHours.spoken(totalHours)) across responsibilities. Choose a colour to select its responsibility.")
            }

            if taskCount == 0 {
                Text("List the work that fits.").font(Spread.footnote).foregroundStyle(Spread.secondary)
            }
            if totalHours > 45 {
                Text("If the hours don’t fit, something is lying.").font(Spread.footnote).foregroundStyle(Spread.caution)
            }

            FlowRow(spacing: 8) {
                Button(action: onRollover) {
                    HStack(spacing: 6) {
                        SpreadIcon(name: "icon-rollover", size: 20)
                        Text("Rollover").font(.system(.subheadline, weight: .semibold))
                    }
                    .foregroundStyle(Spread.accent)
                    .padding(.horizontal, 14).frame(minHeight: 44)
                    .spreadChip(selected: false)
                }
                .buttonStyle(.spreadPress)
                .accessibilityIdentifier("rollover")
                if snapshot.tasks.contains(where: { !$0.done }) {
                    Button(action: onReview) {
                        Text("Review open tasks").font(.system(.subheadline, weight: .semibold))
                            .foregroundStyle(Spread.accent)
                            .padding(.horizontal, 14).frame(minHeight: 44)
                            .spreadChip(selected: false)
                    }
                    .buttonStyle(.spreadPress)
                    .accessibilityIdentifier("review-unfinished")
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .spreadCard()
    }

    // MARK: Layout picker

    /// The five presentation modes as one recessed rail with a lit selection. It fits 390 pt without scrolling and
    /// scrolls only when large text needs the room.
    private var layoutPicker: some View {
        ViewThatFits(in: .horizontal) {
            layoutRail
            ScrollView(.horizontal) { layoutRail }
                .scrollIndicators(.hidden)
        }
    }

    private var layoutRail: some View {
        HStack(spacing: 4) {
            ForEach(SpreadLayout.allCases) { item in
                let selected = layout == item
                Button { withAnimation(SpreadMotion.curve) { layout = item } } label: {
                    VStack(spacing: 4) {
                        LayoutGlyph(layout: item, tint: selected ? Spread.onAccent : Spread.secondary)
                            .frame(width: 26, height: 26)
                        Text(item.title).font(.system(.caption, weight: .semibold))
                    }
                    .foregroundStyle(selected ? Spread.onAccent : Spread.secondary)
                    .padding(.horizontal, 6)
                    .frame(minWidth: 62, maxWidth: .infinity, minHeight: 56)
                    .background {
                        if selected { RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Spread.accentGradient) }
                    }
                    .contentShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.spreadPress)
                .accessibilityLabel(item.title)
                .accessibilityAddTraits(selected ? .isSelected : [])
                .accessibilityIdentifier("layout-\(item.rawValue)")
            }
        }
        .padding(4)
        .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Spread.inset))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Spread.line, lineWidth: 0.5))
        // A real container element: the five mode buttons stay individually reachable inside it, and the group
        // itself has the stable identifier the UI tests and VoiceOver landmarks use.
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Spread view")
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

    /// The responsibility the modes other than Stack are showing: the Fan's and Dial's selection (first by default),
    /// the open Tabs tab, the Day panel's role. The Stack opens its own card and has its menu.
    private var managedRole: Responsibility? {
        let id: String?
        switch layout {
        case .stack: id = nil
        case .tabs: id = tabSelection == "all" ? nil : tabSelection
        case .day: id = selectedRole
        case .fan, .dial: id = selectedRole ?? snapshot.roles.first?.id
        }
        return snapshot.roles.first { $0.id == id }
    }

    /// One way to open the full responsibility editor from every mode, named for what it opens.
    @ViewBuilder private var manageRow: some View {
        if let role = managedRole {
            Button { onOpenRole(role.id) } label: {
                HStack(spacing: 12) {
                    RoleBadge(category: role.category == "custom" ? nil : role.category, color: role.color, size: 32)
                    Text("Manage \(role.name)").font(.system(.subheadline, weight: .semibold)).lineLimit(1)
                    Spacer(minLength: 4)
                    Image(systemName: "chevron.right").font(.system(.footnote, weight: .semibold)).foregroundStyle(Spread.tertiary)
                }
                .padding(.horizontal, 14)
                .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
                .spreadCard(edge: Color(hex: role.color))
                .contentShape(Rectangle())
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel("Manage \(role.name)")
            .accessibilityHint("Opens hours, colour, symbol, placed days and tasks")
            .accessibilityIdentifier("manage-selected")
        }
    }

    private var newSpread: some View {
        Button(action: onNewRole) {
            HStack(spacing: 12) {
                SpreadIcon(name: "icon-new-life", size: 32, original: true)
                VStack(alignment: .leading, spacing: 2) {
                    Text("New Spread").font(.system(.body, weight: .semibold))
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
    var tint: Color = Spread.ink

    var body: some View {
        Canvas { context, size in
            let s = size.width / 34
            let stroke = StrokeStyle(lineWidth: 1.6 * s, lineCap: .round, lineJoin: .round)
            func rrect(_ x: Double, _ y: Double, _ w: Double, _ h: Double, _ r: Double) -> Path {
                Path(roundedRect: CGRect(x: x * s, y: y * s, width: w * s, height: h * s), cornerRadius: r * s)
            }
            switch layout {
            case .stack:
                for y in [6.0, 13.0, 20.0] { context.stroke(rrect(5, y, 24, 8, 4), with: .color(tint), style: stroke) }
            case .fan:
                context.stroke(rrect(9, 8, 16, 20, 4), with: .color(tint.opacity(0.5)), style: stroke)
                context.stroke(rrect(9, 7, 16, 21, 4), with: .color(tint), style: stroke)
            case .dial:
                let ring = Path(ellipseIn: CGRect(x: 6 * s, y: 6 * s, width: 22 * s, height: 22 * s))
                context.stroke(ring, with: .color(tint), style: stroke)
                context.stroke(Path(ellipseIn: CGRect(x: 12 * s, y: 12 * s, width: 10 * s, height: 10 * s)), with: .color(tint), style: stroke)
            case .tabs:
                for x in [3.0, 14.0, 25.0] { context.stroke(rrect(x, 6, 9, 6, 3), with: .color(tint), style: stroke) }
                context.stroke(rrect(5, 16, 24, 12, 4), with: .color(tint), style: stroke)
            case .day:
                var rail = Path()
                rail.move(to: CGPoint(x: 8 * s, y: 5 * s)); rail.addLine(to: CGPoint(x: 8 * s, y: 29 * s))
                context.stroke(rail, with: .color(tint), style: stroke)
                context.stroke(rrect(14, 6, 14, 8, 3), with: .color(tint), style: stroke)
                context.stroke(rrect(14, 18, 14, 9, 3), with: .color(tint), style: stroke)
            }
        }
        .accessibilityHidden(true)
    }
}

/// One responsibility as an illustrated card: its category tile and name, the hours, a Chalkboard drawing, and
/// (when open) the placement summary, its tasks in a recessed list, and the add-a-task line. Shared by the Stack and
/// the Tabs/Day panels. `expanded` is `nil` where the card is always open (Tabs, Day) and a value where the Stack
/// opens one card at a time. The drawing never sits on task text: compact cards carry a small one beside the hours,
/// the open card gives it its own band.
struct RoleRow: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let role: Responsibility
    let editing: Bool
    var focused: Bool = false
    var expanded: Bool? = nil
    var onSelect: () -> Void = {}
    let onOpenTask: (String, String) -> Void
    let onOpenRole: (String) -> Void

    @State private var name = ""
    @State private var palette = false
    @State private var adjusting = false
    @State private var tasksOpen = true
    @FocusState private var nameFocused: Bool
    @Environment(\.dynamicTypeSize) private var typeSize

    private var tasks: [PlannerTask] { snapshot.tasks(for: role.id) }
    private var isOpen: Bool { expanded ?? tasksOpen }
    private var tint: Color { Color(hex: role.color) }
    private var doneCount: Int { tasks.filter(\.done).count }
    private var placedHours: Double { snapshot.allocations.filter { $0.roleId == role.id }.reduce(0) { $0 + $1.hours } }
    private var categoryKey: String? { role.category == "custom" ? nil : role.category }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            if isOpen { placementBand.transition(.opacity) }
            if palette {
                PalettePanel(planner: planner, role: role)
                    .transition(.opacity.combined(with: .offset(y: 14)))
            }
            if editing { removeRow }
            if isOpen { taskList.transition(.opacity) }
        }
        .contentShape(Rectangle())
        .onTapGesture { onSelect() }
        .id("spread-role-\(role.id)")
        .onAppear { name = role.name }
        .onChange(of: role.name) { _, value in name = value }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("role-block-\(role.id)")
    }

    // MARK: Header

    private var header: some View {
        HStack(spacing: 12) {
            Button { withAnimation(SpreadMotion.cascade) { palette.toggle() } } label: {
                RoleBadge(category: categoryKey, color: role.color, size: 48)
                    .frame(width: 48, height: 48)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel("Colour and symbol for \(role.name)")
            .accessibilityValue(palette ? "Expanded" : "Collapsed")
            .accessibilityIdentifier("role-colour-\(role.id)")

            VStack(alignment: .leading, spacing: 2) {
                if isOpen || editing {
                    // Renaming lives on the open card (and in Edit mode), so a tap on a compact card always opens it.
                    TextField("Name", text: $name)
                        .font(.system(.title3, weight: .semibold))
                        .focused($nameFocused)
                        .submitLabel(.done)
                        .onSubmit { commitName() }
                        .onChange(of: nameFocused) { _, focused in if !focused { commitName() } }
                        .accessibilityLabel("\(role.name) name")
                        .accessibilityIdentifier("role-name-\(role.id)")
                } else {
                    Text(role.name)
                        .font(.system(.title3, weight: .semibold))
                        .lineLimit(1)
                        .accessibilityIdentifier("role-name-\(role.id)")
                }
                Text(summaryLine)
                    .font(.system(.footnote)).foregroundStyle(Spread.secondary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // At accessibility text sizes the name needs the room, so the small drawing steps aside.
            if !isOpen && !typeSize.isAccessibilitySize {
                ChalkIllustration(category: role.category, maxWidth: 68, maxHeight: 48)
                    .frame(width: 68, height: 48)
            }

            hoursControl

            if adjusting {
                // While the hours are being adjusted the stepper needs the row; the menu and chevron wait.
                EmptyView()
            } else if expanded != nil {
                // Every Stack card carries the same quick actions, in one place instead of more buttons on a 390 pt row.
                Menu {
                    Button { onOpenRole(role.id) } label: { Label("Details and hours", systemImage: "slider.horizontal.3") }
                    Button { withAnimation(SpreadMotion.cascade) { palette.toggle() } } label: { Label("Colour and symbol", systemImage: "paintpalette") }
                    Button { adjusting = true } label: { Label("Adjust weekly hours", systemImage: "clock") }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.system(.body, weight: .semibold)).foregroundStyle(Spread.secondary)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("More for \(role.name)")
                .accessibilityIdentifier("role-menu-\(role.id)")
            } else {
                Button { toggleOpen() } label: {
                    Image(systemName: "chevron.right")
                        .font(.system(.subheadline, weight: .semibold)).foregroundStyle(Spread.secondary)
                        .rotationEffect(.degrees(isOpen ? 90 : 0))
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.spreadPress)
                .accessibilityLabel(isOpen ? "Hide tasks for \(role.name)" : "Show tasks for \(role.name)")
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .frame(minHeight: 68)
    }

    /// "2 tasks • 3h placed" (the specimen's line), or the invitation to add the first task.
    private var summaryLine: String {
        let placed = "\(SpreadHours.text(placedHours))h placed"
        if tasks.isEmpty { return "No tasks yet • \(placed)" }
        let noun = tasks.count == 1 ? "task" : "tasks"
        return "\(tasks.count) \(noun) • \(placed)"
    }

    @ViewBuilder private var hoursControl: some View {
        if adjusting {
            HStack(spacing: 0) {
                HourStepper(value: role.hours, label: "\(role.name) hours", step: 0.5) { hours in
                    Task { await planner.send(["type": "setHours", "roleId": role.id, "hours": hours]) }
                }
                Button { adjusting = false } label: {
                    Text("Done").font(.system(.subheadline, weight: .semibold)).foregroundStyle(Spread.accent).frame(minWidth: 44, minHeight: 44)
                }
                .buttonStyle(.plain)
            }
            .transition(.opacity)
        } else {
            Button { adjusting = true } label: {
                Text("\(SpreadHours.text(role.hours))h")
                    .font(.system(.title2, weight: .bold)).foregroundStyle(Spread.ink).monospacedDigit()
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel("\(role.name), \(SpreadHours.spoken(role.hours)). Adjust")
            .accessibilityIdentifier("hours-stepper-\(role.id)")
        }
    }

    // MARK: Open card

    /// Where the hours stand and which days they sit on, beside the role's own Chalkboard drawing.
    private var placementBand: some View {
        let left = snapshot.remainingHours(for: role.id)
        return HStack(alignment: .center, spacing: 8) {
            VStack(alignment: .leading, spacing: 6) {
                Text("\(SpreadHours.text(placedHours)) placed · \(SpreadHours.text(left)) left")
                    .font(.system(.subheadline, weight: .medium)).foregroundStyle(Spread.ink).monospacedDigit()
                DayMarks(snapshot: snapshot, role: role)
            }
            Spacer(minLength: 0)
            artwork
                .background(
                    RadialGradient(colors: [tint.opacity(0.30), tint.opacity(0)], center: .center, startRadius: 2, endRadius: 80)
                        .allowsHitTesting(false)
                )
        }
        .padding(.horizontal, 14)
        .padding(.bottom, 8)
    }

    /// The role's Chalkboard drawing. Only the focused card animates it; where several cards are open at once
    /// (Tabs "All") the drawings stay still, so no more than one set of cutouts is ever running.
    @ViewBuilder private var artwork: some View {
        if focused {
            ChalkMotionArt(category: role.category, size: 132)
        } else {
            ChalkIllustration(category: role.category, maxWidth: 132, maxHeight: 92)
                .frame(width: 132, height: 92)
        }
    }

    private var removeRow: some View {
        Button {
            onOpenRole(role.id)
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "minus.circle.fill").foregroundStyle(Spread.danger)
                Text("Remove \(role.name)").font(.system(.subheadline, weight: .medium)).foregroundStyle(Spread.danger)
            }
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            .padding(.horizontal, 16)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("remove-role-\(role.id)")
    }

    /// The tasks in a recessed list, so the open card reads as: identity, placement, work.
    private var taskList: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(tasks) { task in
                TaskRow(planner: planner, snapshot: snapshot, task: task, roleId: role.id, onOpen: { onOpenTask(role.id, task.id) })
            }
            AddTaskRow(placeholder: tasks.isEmpty ? "What matters most here?" : "Add a task") { text in
                Task { await planner.send(["type": "addTask", "roleId": role.id, "text": text]) }
            }
        }
        .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Spread.inset))
        .padding(.horizontal, 10)
        .padding(.bottom, 10)
    }

    private func toggleOpen() {
        if expanded != nil {
            onSelect()
        } else {
            withAnimation(SpreadMotion.curve) { tasksOpen.toggle() }
        }
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
                    .font(.system(.caption, weight: on ? Font.Weight.semibold : Font.Weight.medium))
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
    /// Each category's preset colour (`SPREAD_CATEGORIES` in model.ts): choosing a symbol also takes this colour.
    static let categoryColors: [String: String] = [
        "work": "#34C759", "school": "#007AFF", "home": "#FF9500", "health": "#30B0C7", "family": "#AF52DE",
        "fitness": "#FFCC00", "business": "#5856D6", "project": "#FF9F0A", "church": "#BF5AF2", "personal": "#FF2D55",
    ]
    static let categories: [(id: String, label: String)] = [
        ("work", "Work"), ("school", "School"), ("home", "Home"), ("health", "Health"), ("family", "Family"),
        ("fitness", "Fitness"), ("business", "Business"), ("project", "Project"), ("church", "Church"), ("personal", "Personal"),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Colour").font(.system(.subheadline, weight: .semibold))
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
                    .font(.system(.title2, weight: .regular))
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
                        .font(.system(.body))
                        .strikethrough(task.done)
                        .foregroundStyle(task.done ? Spread.secondary : Spread.ink)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    Spacer(minLength: 4)
                    if let dayISO, !isToday {
                        Text(PlannerDates.label(PlannerDates.date(dayISO), pattern: "EEE"))
                            .font(.system(.caption, weight: .semibold)).foregroundStyle(Spread.secondary)
                    }
                    Image(systemName: "chevron.right").font(.system(.footnote)).foregroundStyle(Spread.tertiary)
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
                    Text("Not today").font(.system(.subheadline, weight: .semibold)).foregroundStyle(Spread.accent)
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
            Image(systemName: "plus").font(.system(.body, weight: .regular)).foregroundStyle(Spread.accent)
                .frame(width: 56, height: 56)
                .accessibilityHidden(true)
            TextField(placeholder, text: $text)
                .font(.system(.body))
                .submitLabel(.done)
                .onSubmit { submit() }
                .frame(minHeight: 56)
                .accessibilityLabel(placeholder)
                .accessibilityIdentifier("new-task-field")
            // Return adds the task, and so does this: an explicit control for anyone who does not reach for Return.
            if !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Button { submit() } label: {
                    Text("Add task").font(.system(.subheadline, weight: .semibold)).foregroundStyle(Spread.accent)
                        .padding(.horizontal, 14).frame(minHeight: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.spreadPress)
                .accessibilityIdentifier("add-task-button")
                .transition(.opacity)
            }
        }
        .padding(.leading, 12)
        .overlay(alignment: .top) { Rectangle().fill(Spread.line).frame(height: 0.5).padding(.leading, 56) }
    }

    private func submit() {
        let value = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty else { return }
        onAdd(value)
        text = ""
    }
}

/// The Stack: the responsibilities as a vertical stack of illustrated cards. One card is open at a time (its
/// placement, tasks and add-a-task line); the others stay compact, so every responsibility is visible at once and
/// the open one has room. Choosing a card opens it with the shared curve; its role-colour edge is the brightest.
struct StackLayout: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    @Binding var selectedRole: String?
    let editing: Bool
    let onOpenTask: (String, String) -> Void
    let onOpenRole: (String) -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var focusedId: String { selectedRole ?? snapshot.roles.first?.id ?? "" }

    var body: some View {
        VStack(spacing: 10) {
            ForEach(snapshot.roles) { role in
                let isFocused = focusedId == role.id
                RoleRow(
                    planner: planner, snapshot: snapshot, role: role, editing: editing,
                    focused: isFocused, expanded: isFocused,
                    onSelect: { select(role.id) },
                    onOpenTask: onOpenTask, onOpenRole: onOpenRole
                )
                .spreadCard(edge: Color(hex: role.color), active: isFocused)
                .zIndex(isFocused ? 1 : 0)
            }
        }
        .animation(reduceMotion ? nil : SpreadMotion.curve, value: focusedId)
        .accessibilityIdentifier("stack-cards")
    }

    private func select(_ id: String) {
        guard selectedRole != id else { return }
        selectedRole = id
    }
}

/// Lays the hour strip's segments side by side, each as wide as its hours say (see `HourStrip`).
struct HourStripRow: Layout {
    var spacing: CGFloat = 4

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        CGSize(width: proposal.width ?? 0, height: 44)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let hours: [Double] = subviews.map { $0[HourStripHours.self] }
        let widths = HourStrip.widths(hours: hours, available: Double(bounds.width), spacing: Double(spacing), minimum: 44)
        var x = bounds.minX
        for (index, subview) in subviews.enumerated() {
            let width = CGFloat(widths[index])
            subview.place(at: CGPoint(x: x, y: bounds.minY), anchor: .topLeading, proposal: ProposedViewSize(width: width, height: bounds.height))
            x += width + spacing
        }
    }
}

private struct HourStripHours: LayoutValueKey {
    static let defaultValue: Double = 1
}

extension View {
    /// The hours a strip segment stands for; `HourStripRow` sizes the segment by it.
    func hourStripHours(_ hours: Double) -> some View { layoutValue(key: HourStripHours.self, value: hours) }
}
#endif
