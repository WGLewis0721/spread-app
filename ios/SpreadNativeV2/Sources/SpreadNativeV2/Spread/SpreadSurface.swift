#if os(iOS)
import SwiftUI

/// Responsibilities are presented as one full-width Wallet-style Stack.
/// The planner store remains the only data writer; editing and expansion are UI state.
struct SpreadSurface: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    @Binding var layout: SpreadLayout
    @Binding var editing: Bool
    @Binding var selectedRole: String?
    let onOpenRole: (String) -> Void
    let onOpenTask: (String, String) -> Void
    let onNewRole: () -> Void
    let onRollover: () -> Void
    let onReview: () -> Void

    @State private var tabSelection = "all"
    @State private var daySelection = PlannerDates.localISO()
    @State private var dropOpen = false
    @State private var summaryExpanded = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var totalHours: Double { snapshot.roles.reduce(0) { $0 + $1.hours } }
    private var taskCount: Int { snapshot.tasks.count }
    private var doneCount: Int { snapshot.tasks.filter(\.done).count }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            summary
            layoutBody
            newSpread
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .onChange(of: tabSelection) { _, id in
            if snapshot.roles.contains(where: { $0.id == id }) { selectedRole = id }
        }
        .onChange(of: snapshot.roles.map(\.id)) { _, ids in
            if let selectedRole, !ids.contains(selectedRole) { self.selectedRole = ids.first }
            if tabSelection != "all", !ids.contains(tabSelection) { tabSelection = "all" }
        }
        .onChange(of: snapshot.weekKey) { _, key in
            if !PlannerOrder.displayOffsets.map({ PlannerDates.dayISO(weekKey: key, index: $0) }).contains(daySelection) {
                daySelection = PlannerOrder.day(weekKey: key, displayPosition: 0)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("spread-surface")
    }

    // MARK: Compact weekly summary

    /// An actionable status strip. The full hour distribution and the existing
    /// Rollover/Review actions remain available on disclosure, not permanently
    /// consuming a quarter of the screen above the Wallet cards.
    private var summary: some View {
        let status = WeeklyHourStatus(snapshot: snapshot)
        let spoken = "\(SpreadHours.spoken(status.remaining)) remaining to plan, " +
            "\(SpreadHours.spoken(status.scheduled)) scheduled across \(status.spreadCount) " +
            (status.spreadCount == 1 ? "spread" : "spreads") +
            (status.overbooked > 0 ? ", \(SpreadHours.spoken(status.overbooked)) overbooked" : "")

        return VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.22)) {
                    summaryExpanded.toggle()
                }
                SpreadHaptics.selection()
            } label: {
                ViewThatFits(in: .horizontal) {
                    summaryWideRow(status)
                    summaryNarrowRow(status)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("hour-summary")
            .accessibilityLabel(spoken)
            .accessibilityValue(summaryExpanded ? "Expanded" : "Collapsed")
            .accessibilityHint("Show the hour breakdown, Rollover and task review")

            if summaryExpanded {
                Rectangle()
                    .fill(Spread.secondary.opacity(0.16))
                    .frame(height: 0.5)
                    .padding(.vertical, 10)
                summaryDetails(status)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .spreadCard()
        .onChange(of: snapshot.weekKey) { _, _ in summaryExpanded = false }
    }

    private var summaryIcon: some View {
        Image(systemName: "calendar.badge.clock")
            .font(.system(.title3, weight: .semibold))
            .foregroundStyle(Spread.accent)
            .frame(width: 44, height: 44)
            .background(Spread.accent.opacity(0.12),
                        in: RoundedRectangle(cornerRadius: 13, style: .continuous))
            .accessibilityHidden(true)
    }

    private func summaryTitle(_ status: WeeklyHourStatus) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 4) {
            Text(SpreadHours.text(status.headlineHours) + "h")
                .font(.system(.title2, weight: .bold))
                .monospacedDigit()
                .foregroundStyle(Spread.ink)
            Text(status.headlineLabel)
                .font(.system(.subheadline, weight: .medium))
                .foregroundStyle(Spread.ink)
        }
    }

    private func summaryWideRow(_ status: WeeklyHourStatus) -> some View {
        HStack(spacing: 9) {
            summaryIcon
            VStack(alignment: .leading, spacing: 2) {
                summaryTitle(status).fixedSize(horizontal: true, vertical: false)
                Text("Across \(status.spreadCount) \(status.spreadCount == 1 ? "spread" : "spreads")")
                    .font(.system(.caption))
                    .foregroundStyle(Spread.secondary)
                    .fixedSize(horizontal: true, vertical: false)
            }
            Spacer(minLength: 3)
            VStack(alignment: .trailing, spacing: 3) {
                Text("\(SpreadHours.text(status.scheduled))h scheduled")
                    .font(.system(.caption2))
                    .foregroundStyle(Spread.secondary)
                Text(status.overbooked > 0
                     ? "\(SpreadHours.text(status.overbooked))h overbooked"
                     : "\(SpreadHours.text(status.remaining))h remaining")
                    .font(.system(.caption2, weight: .medium))
                    .foregroundStyle(status.overbooked > 0 ? Spread.caution : Spread.secondary)
                summaryRoleColors
            }
            .fixedSize(horizontal: true, vertical: false)
            Image(systemName: summaryExpanded ? "chevron.down" : "chevron.right")
                .font(.system(.subheadline, weight: .bold))
                .foregroundStyle(Spread.ink)
                .frame(width: 20, height: 44)
                .accessibilityHidden(true)
        }
    }

    /// Narrow / accessibility scenes can grow vertically instead of clipping.
    private func summaryNarrowRow(_ status: WeeklyHourStatus) -> some View {
        HStack(alignment: .top, spacing: 10) {
            summaryIcon
            VStack(alignment: .leading, spacing: 3) {
                summaryTitle(status)
                Text("Across \(status.spreadCount) \(status.spreadCount == 1 ? "spread" : "spreads")")
                    .font(.system(.caption))
                    .foregroundStyle(Spread.secondary)
                Text("\(SpreadHours.text(status.scheduled))h scheduled · \(SpreadHours.text(status.remaining))h remaining")
                    .font(.system(.caption))
                    .foregroundStyle(Spread.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                if status.overbooked > 0 {
                    Text("\(SpreadHours.text(status.overbooked))h overbooked")
                        .font(.system(.caption, weight: .semibold))
                        .foregroundStyle(Spread.caution)
                }
                summaryRoleColors
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Spacer(minLength: 0)
            Image(systemName: summaryExpanded ? "chevron.down" : "chevron.right")
                .font(.system(.subheadline, weight: .bold))
                .foregroundStyle(Spread.ink)
                .frame(width: 20, height: 44)
                .accessibilityHidden(true)
        }
    }

    /// These small coloured segments identify the hour banks, NOT progress.
    /// They are proportional to each responsibility's planned hours; the
    /// full-sized, 44pt-tappable selectors are inside the expanded details.
    private var summaryRoleColors: some View {
        let roles = Array(snapshot.roles.filter { $0.hours > 0 }.prefix(6))
        let sum = max(roles.reduce(0) { $0 + $1.hours }, 0.5)
        return GeometryReader { geometry in
            let gap: CGFloat = 3
            let usable = max(0, geometry.size.width - CGFloat(max(0, roles.count - 1)) * gap)
            HStack(spacing: gap) {
                ForEach(roles) { role in
                    Capsule().fill(Color(hex: role.color))
                        .frame(width: usable * CGFloat(role.hours / sum), height: 6)
                }
            }
        }
        .frame(width: 116, height: 6)
        .accessibilityHidden(true)
    }

    /// Disclosed controls preserve existing role selection and planning flows.
    private func summaryDetails(_ status: WeeklyHourStatus) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            if taskCount > 0 {
                Text("\(doneCount) of \(taskCount) tasks done")
                    .font(.system(.footnote, weight: .medium))
                    .foregroundStyle(Spread.secondary)
            }
            if totalHours > 0 {
                GeometryReader { geometry in
                    let visibleRoles = snapshot.roles.filter { $0.hours > 0 }
                    let minimumWidth = CGFloat(visibleRoles.count) * 44
                        + CGFloat(max(0, visibleRoles.count - 1)) * 4
                    ScrollView(.horizontal) {
                        HourStripRow(spacing: 4) {
                            ForEach(visibleRoles) { role in
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
                        .frame(width: max(geometry.size.width, minimumWidth), height: 44)
                    }
                    .scrollIndicators(.automatic)
                }
                .frame(height: 44)
                .animation(reduceMotion ? nil : SpreadMotion.cascade, value: selectedRole)
            }
            if taskCount == 0 {
                Text("List the work that fits.")
                    .font(Spread.footnote)
                    .foregroundStyle(Spread.secondary)
            }
            if totalHours > 45 || status.overbooked > 0 {
                Text(status.overbooked > 0
                     ? "Your week has more scheduled hours than its spread budgets."
                     : "If the hours don’t fit, something is lying.")
                    .font(Spread.footnote)
                    .foregroundStyle(Spread.caution)
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
                        Text("Review open tasks")
                            .font(.system(.subheadline, weight: .semibold))
                            .foregroundStyle(Spread.accent)
                            .padding(.horizontal, 14).frame(minHeight: 44)
                            .spreadChip(selected: false)
                    }
                    .buttonStyle(.spreadPress)
                    .accessibilityIdentifier("review-unfinished")
                }
            }
        }
        .accessibilityIdentifier("weekly-hours-details")
    }

    // MARK: The single responsibility presentation

    private var layoutBody: some View {
        StackLayout(
            planner: planner, snapshot: snapshot, selectedRole: $selectedRole,
            editing: $editing, onOpenTask: onOpenTask, onOpenRole: onOpenRole
        )
    }

    // Manage and Delete are revealed by an editing swipe on each Wallet card.
    // The previous full-width Manage box is intentionally removed.

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
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var tasks: [PlannerTask] { snapshot.tasks(for: role.id) }
    private var isOpen: Bool { expanded ?? tasksOpen }
    private var tint: Color { Color(hex: role.color) }
    private var doneCount: Int { tasks.filter(\.done).count }
    private var placedHours: Double { snapshot.allocations.filter { $0.roleId == role.id }.reduce(0) { $0 + $1.hours } }
    private var categoryKey: String? { role.category == "custom" ? nil : role.category }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            if adjusting { hoursEditor.transition(.opacity) }
            if !isOpen && !typeSize.isAccessibilitySize {
                // The cutouts move on closed Wallet cards too. The next card
                // overlaps part of this decorative band, not the title or tasks.
                HStack {
                    Spacer(minLength: 0)
                    ChalkMotionArt(category: role.category, size: 120)
                }
                .padding(.trailing, 16)
                .frame(height: 74, alignment: .top)
                .clipped()
                .accessibilityHidden(true)
            }
            if isOpen { placementBand.transition(.opacity) }
            if palette {
                PalettePanel(planner: planner, role: role)
                    .transition(.opacity.combined(with: .offset(y: 14)))
            }
            if isOpen { taskList.transition(.opacity) }
        }
        .contentShape(Rectangle())

        .id("spread-role-\(role.id)")
        .onAppear { name = role.name }
        .onChange(of: role.name) { _, value in
            name = value
            SpreadHaptics.selection()
        }
        .onChange(of: role.color) { _, _ in SpreadHaptics.selection() }
        .onChange(of: role.category) { _, _ in SpreadHaptics.selection() }
        .onChange(of: role.hours) { _, _ in SpreadHaptics.selection() }
        .onChange(of: tasks.count) { _, _ in SpreadHaptics.selection() }
        .onChange(of: palette) { _, _ in SpreadHaptics.selection() }
        .onChange(of: adjusting) { _, _ in SpreadHaptics.selection() }
        .onChange(of: editing) { _, active in
            if !active {
                commitName()
                nameFocused = false
                palette = false
                adjusting = false
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("role-block-\(role.id)")
    }

    // MARK: Header

    private var header: some View {
        HStack(alignment: .center, spacing: 7) {
            // The destructive control belongs *outside* the rounded Wallet
            // border. Never insert it into this row: doing so reallocates the
            // icon, name, hour count and chevron every time editing starts.
            Button {
                if editing {
                    withAnimation(SpreadMotion.cascade) { palette.toggle() }
                } else {
                    toggleOpen()
                }
            } label: {
                RoleBadge(category: categoryKey, color: role.color, size: 42)
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel(editing ? "Change colour and icon for \(role.name)" : "Open \(role.name)")
            .accessibilityValue(editing && palette ? "Palette open" : "")
            .accessibilityIdentifier("role-colour-\(role.id)")

            VStack(alignment: .leading, spacing: 3) {
                if editing {
                    TextField("Name", text: $name, prompt: Spread.fieldPrompt("Name"), axis: .vertical)
                        .font(.system(.headline, weight: .semibold))
                        .lineLimit(1...3)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(minHeight: 44)
                        .focused($nameFocused)
                        .submitLabel(.done)
                        .onSubmit { commitName() }
                        .accessibilityIdentifier("role-name-\(role.id)")
                } else {
                    Button(action: toggleOpen) {
                        Text(role.name)
                            .font(.system(.headline, weight: .semibold))
                            .foregroundStyle(Spread.ink)
                            .multilineTextAlignment(.leading)
                            .lineLimit(typeSize.isAccessibilitySize ? nil : 2)
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("select-role-\(role.id)")
                }
                Text(summaryLine)
                    .font(.system(.footnote))
                    .foregroundStyle(Spread.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // The number never shares a row with plus/minus controls; the hour
            // editor opens *below* the title. No more mangled names on small phones.
            Button {
                withAnimation(SpreadMotion.press) { adjusting.toggle() }
            } label: {
                Text("\(SpreadHours.text(role.hours))h")
                    .font(.system(.subheadline, weight: .bold))
                    .monospacedDigit()
                    .foregroundStyle(Spread.ink)
                    .lineLimit(1)
                    .fixedSize(horizontal: true, vertical: false)
                    .frame(minHeight: 44)
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel("\(role.name), \(SpreadHours.spoken(role.hours)). Adjust hours")
            .accessibilityIdentifier("hours-stepper-\(role.id)")

            // Never replace the chevron with an ellipsis or hour stepper.
            Button(action: toggleOpen) {
                Image(systemName: "chevron.down")
                    .font(.system(.subheadline, weight: .bold))
                    .foregroundStyle(Spread.ink)
                    .rotationEffect(.degrees(isOpen ? 180 : 0))
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel(isOpen ? "Collapse \(role.name)" : "Expand \(role.name) and show tasks")
            .accessibilityValue(isOpen ? "Expanded" : "Collapsed")
            .accessibilityHint("Reveals scheduled hours and the responsibility's tasks")
            .accessibilityIdentifier("expand-role-\(role.id)")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, minHeight: 72)
    }

    /// "2 tasks • 3h placed" (the specimen's line), or the invitation to add the first task.
    private var summaryLine: String {
        let placed = "\(SpreadHours.text(placedHours))h placed"
        if tasks.isEmpty { return "No tasks yet • \(placed)" }
        let noun = tasks.count == 1 ? "task" : "tasks"
        return "\(tasks.count) \(noun) • \(placed)"
    }

    private var hoursEditor: some View {
        let narrow = typeSize.isAccessibilitySize
        return VStack(alignment: .leading, spacing: narrow ? 4 : 0) {
            if narrow {
                Text("Hours each week")
                    .font(Spread.footnote)
                    .foregroundStyle(Spread.secondary)
            }
            HStack(spacing: 8) {
                if !narrow {
                    Text("Hours each week")
                        .font(Spread.footnote)
                        .foregroundStyle(Spread.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                HourStepper(value: role.hours, label: "\(role.name) hours", step: 0.5) { hours in
                    Task { _ = await planner.send(["type": "setHours", "roleId": role.id, "hours": hours]) }
                }
                Button("Done") {
                    withAnimation(reduceMotion ? nil : SpreadMotion.press) { adjusting = false }
                }
                .font(.system(.subheadline, weight: .semibold))
                .buttonStyle(.plain)
                .foregroundStyle(Spread.accent)
                .frame(minWidth: 44, minHeight: 44)
            }
        }
        .padding(.horizontal, 14)
        .padding(.bottom, 10)
        .accessibilityIdentifier("role-hour-editor-\(role.id)")
    }

    // MARK: Open card

    /// Where the hours stand and which days they sit on, beside the role's own Chalkboard drawing.
    private var placementBand: some View {
        let left = snapshot.remainingHours(for: role.id)
        return HStack(alignment: .center, spacing: 8) {
            VStack(alignment: .leading, spacing: 6) {
                Text("\(SpreadHours.text(placedHours)) placed · \(SpreadHours.text(left)) left")
                    .font(.system(.subheadline, weight: .medium)).foregroundStyle(Spread.ink).monospacedDigit()
                    .fixedSize(horizontal: false, vertical: true)
                DayMarks(snapshot: snapshot, role: role)
            }
            Spacer(minLength: 0)
            if !typeSize.isAccessibilitySize { artwork
                .background(
                    RadialGradient(colors: [tint.opacity(0.30), tint.opacity(0)], center: .center, startRadius: 2, endRadius: 80)
                        .allowsHitTesting(false)
                )
            }
        }
        .padding(.horizontal, 14)
        .padding(.bottom, 8)
    }

    /// Every visible responsibility illustration moves, including unfocused cards and Tabs "All".
    /// The animation clock pauses while offscreen or when Reduce Motion is enabled.
    private var artwork: some View {
        ChalkMotionArt(category: role.category, size: 132)
    }

    /// The tasks in a recessed list, so the open card reads as: identity, placement, work.
    private var taskList: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(tasks.enumerated()), id: \.element.id) { index, task in
                TaskRow(planner: planner, snapshot: snapshot, task: task, roleId: role.id, onOpen: { onOpenTask(role.id, task.id) })
                    .modifier(SpreadEntrance(index: index))
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
                    .foregroundStyle(on ? Spread.ink : Spread.tertiary)
                    .underline(on)
            }
        }
        .frame(minHeight: 44)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(spoken.isEmpty ? "Not placed on any day" : "\(role.name) on \(spoken.map { PlannerDates.label(PlannerDates.date($0), pattern: "EEEE") }.joined(separator: ", "))")
        .contentShape(.accessibility, Rectangle())
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
            FlowRow(spacing: 4) {
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
            .accessibilityLabel(task.text.isEmpty ? "Untitled task" : task.text)
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
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var text = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
        if typeSize.isAccessibilitySize {
            Text(placeholder)
                .font(.system(.body)).foregroundStyle(Spread.secondary)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.leading, 56).padding(.top, 12)
                .accessibilityHidden(true)
        }
        HStack(spacing: 0) {
            Image(systemName: "plus").font(.system(.body, weight: .regular)).foregroundStyle(Spread.accent)
                .frame(width: 56, height: 56)
                .accessibilityHidden(true)
            TextField(placeholder, text: $text, prompt: typeSize.isAccessibilitySize ? nil : Spread.fieldPrompt(placeholder))
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
/// Edit-only swipe directions. A leftward card slide reveals Manage at the
/// trailing edge; a rightward slide reveals Delete at the leading edge.
private enum WalletReveal: Equatable {
    case none, manage, delete
    var xOffset: CGFloat {
        switch self {
        case .none: return 0
        case .manage: return -80
        case .delete: return 80
        }
    }
}

struct StackLayout: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    @Binding var selectedRole: String?
    @Binding var editing: Bool
    let onOpenTask: (String, String) -> Void
    let onOpenRole: (String) -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var expandedIds: Set<String> = []
    @State private var pendingDeleteId: String?
    @State private var revealedRoleId: String?
    @State private var revealedSide: WalletReveal = .none
    @State private var draggedRoleId: String?
    @State private var dragOffset: CGFloat = 0

    private var focusedId: String { selectedRole ?? snapshot.roles.first?.id ?? "" }
    private var swipeAnimation: Animation? { reduceMotion ? nil : .interactiveSpring(response: 0.33, dampingFraction: 0.86) }

    var body: some View {
        LazyVStack(spacing: 0) {
            ForEach(Array(snapshot.roles.enumerated()), id: \.element.id) { index, role in
                walletCard(role, index: index)
                    .padding(.bottom, expandedIds.contains(role.id) || editing || typeSize.isAccessibilitySize ? 12 : -36)
                    .zIndex(Double(index))
                    .modifier(SpreadEntrance(index: index))
            }
        }
        .padding(.bottom, 36)
        .animation(reduceMotion ? nil : SpreadMotion.curve, value: expandedIds)
        .animation(reduceMotion ? nil : SpreadMotion.curve, value: editing)
        .onChange(of: editing) { _, active in
            if !active { closeReveal() }
        }
        .onChange(of: snapshot.roles.map(\.id)) { _, ids in
            expandedIds.formIntersection(Set(ids))
            if let selectedRole, !ids.contains(selectedRole) { self.selectedRole = ids.first }
            if let revealedRoleId, !ids.contains(revealedRoleId) { closeReveal() }
        }
        .confirmationDialog(
            "Remove \(snapshot.roles.first(where: { $0.id == pendingDeleteId })?.name ?? "this responsibility") and its tasks?",
            isPresented: Binding(
                get: { pendingDeleteId != nil },
                set: { if !$0 { pendingDeleteId = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Delete responsibility", role: .destructive) {
                guard let id = pendingDeleteId else { return }
                pendingDeleteId = nil
                closeReveal()
                Task {
                    if await planner.send(["type": "removeRole", "roleId": id]) {
                        SpreadHaptics.success()
                    }
                }
            }
            Button("Cancel", role: .cancel) {
                pendingDeleteId = nil
                SpreadHaptics.selection()
            }
        } message: {
            Text("This removes the responsibility and its planned work. You cannot undo this from the card.")
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Responsibilities in Stack view")
        .accessibilityValue(snapshot.roles.first(where: { $0.id == focusedId })?.name ?? "")
        .accessibilityIdentifier("stack-cards")
    }

    @ViewBuilder
    private func walletCard(_ role: Responsibility, index: Int) -> some View {
        let open = expandedIds.contains(role.id)
        ZStack(alignment: .topLeading) {
            if editing {
                actionTray(for: role)
            }
            cardContents(role, open: open)
                // Render-only offset: never resize the card, its text HStack,
                // or its artwork. The underlying action is revealed in place.
                .offset(x: cardOffset(for: role.id))
                .animation(swipeAnimation, value: revealedRoleId)
                .animation(swipeAnimation, value: revealedSide)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .simultaneousGesture(swipeGesture(for: role.id))
        .simultaneousGesture(LongPressGesture(minimumDuration: 0.55).onEnded { _ in
            guard !editing else { return }
            withAnimation(reduceMotion ? nil : SpreadMotion.curve) { editing = true }
        })
        // Custom accessibility actions give VoiceOver/keyboard users a way to
        // reach swipe-only actions, without another permanent button row.
        .accessibilityAction(named: Text("Manage \(role.name)")) {
            guard editing else { editing = true; return }
            closeReveal()
            editing = false
            SpreadHaptics.selection()
            onOpenRole(role.id)
        }
        .accessibilityAction(named: Text("Delete \(role.name)")) {
            if !editing { editing = true }
            pendingDeleteId = role.id
            SpreadHaptics.destructivePrompt()
        }
    }

    private func cardContents(_ role: Responsibility, open: Bool) -> some View {
        RoleRow(
            planner: planner, snapshot: snapshot, role: role, editing: editing,
            focused: open, expanded: open,
            onSelect: { toggle(role.id) },
            onOpenTask: onOpenTask, onOpenRole: onOpenRole
        )
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            let tint = Color(hex: role.color)
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Spread.cardFill)
                .overlay(alignment: .top) {
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .fill(LinearGradient(
                            colors: [tint.opacity(0.48), tint.opacity(0.16), .clear],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        ))
                }
        }
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .strokeBorder(Color(hex: role.color).opacity(open || editing ? 0.85 : 0.48),
                              lineWidth: editing ? 1.5 : 1)
                .allowsHitTesting(false)
        }
        .modifier(RoleEditGlow(color: Color(hex: role.color), enabled: editing))
        .shadow(color: Color(hex: role.color).opacity(open ? 0.18 : 0.09),
                radius: open ? 16 : 8, y: 4)
        .accessibilityAction(named: Text("Edit \(role.name)")) { editing = true }
    }

    @ViewBuilder
    private func actionTray(for role: Responsibility) -> some View {
        HStack {
            if visibleSide(for: role.id) == .delete {
                swipeAction("Delete", symbol: "trash.fill", id: "remove-role-\(role.id)", roleName: role.name, destructive: true) {
                    pendingDeleteId = role.id
                    SpreadHaptics.destructivePrompt()
                }
            }
            Spacer(minLength: 0)
            if visibleSide(for: role.id) == .manage {
                swipeAction("Manage", symbol: "slider.horizontal.3", id: "manage-role-\(role.id)", roleName: role.name, destructive: false) {
                    closeReveal()
                    editing = false
                    SpreadHaptics.selection()
                    onOpenRole(role.id)
                }
            }
        }
        .frame(height: 80, alignment: .center)
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 4)
    }

    private func swipeAction(
        _ title: String,
        symbol: String,
        id: String,
        roleName: String,
        destructive: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: 3) {
                Image(systemName: symbol).font(.system(.title3, weight: .semibold))
                Text(title).font(.system(.caption2, weight: .semibold))
            }
            .foregroundStyle(destructive ? Spread.onDanger : Spread.onAccent)
            .frame(width: 72, height: 64)
            .background(
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .fill(destructive ? Spread.danger : Spread.accent)
            )
            .contentShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title + " " + roleName)
        .accessibilityIdentifier(id)
    }

    private func visibleSide(for id: String) -> WalletReveal {
        if draggedRoleId == id && abs(dragOffset) > 20 {
            return dragOffset < 0 ? .manage : .delete
        }
        return revealedRoleId == id ? revealedSide : .none
    }

    private func cardOffset(for id: String) -> CGFloat {
        if draggedRoleId == id { return dragOffset }
        return revealedRoleId == id ? revealedSide.xOffset : 0
    }

    private func swipeGesture(for id: String) -> some Gesture {
        DragGesture(minimumDistance: 20)
            .onChanged { value in
                guard editing else { return }
                let x = value.translation.width
                let y = value.translation.height
                // Vertical scrolling continues uninterrupted. Only an
                // intentional horizontal gesture moves a Wallet card.
                guard abs(x) > 22, abs(x) > abs(y) * 1.5 else { return }
                let start = revealedRoleId == id ? revealedSide.xOffset : 0
                draggedRoleId = id
                dragOffset = min(88, max(-88, start + x))
            }
            .onEnded { value in
                guard editing else { return }
                defer { draggedRoleId = nil; dragOffset = 0 }
                let x = value.translation.width
                let y = value.translation.height
                guard abs(x) >= 55, abs(x) > abs(y) * 1.5 else { return }
                let start = revealedRoleId == id ? revealedSide.xOffset : 0
                let moved = start + x
                let side: WalletReveal = moved > 48 ? .delete : (moved < -48 ? .manage : .none)
                if side != revealedSide || (side != .none && revealedRoleId != id) {
                    SpreadHaptics.revealed(destructive: side == .delete)
                }
                withAnimation(swipeAnimation) {
                    revealedRoleId = side == .none ? nil : id
                    revealedSide = side
                }
            }
    }

    private func closeReveal() {
        withAnimation(swipeAnimation) {
            revealedRoleId = nil
            revealedSide = .none
            draggedRoleId = nil
            dragOffset = 0
        }
    }

    private func toggle(_ id: String) {
        withAnimation(reduceMotion ? nil : SpreadMotion.curve) {
            if expandedIds.contains(id) { expandedIds.remove(id) }
            else { expandedIds.insert(id) }
            selectedRole = id
        }
        SpreadHaptics.selection()
    }
}

/// A quiet, colour-matched edit affordance. The glow breathes only in Edit mode,
/// stops when Edit ends and remains static under the system Reduce Motion setting.
private struct RoleEditGlow: ViewModifier {
    let color: Color
    let enabled: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var bright = false

    func body(content: Content) -> some View {
        content
            .overlay {
                if enabled {
                    // Breathe along the card's actual edge without changing
                    // its size or shifting a single glyph. Static when Reduce
                    // Motion is enabled; no jitter or constant vibration.
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .strokeBorder(color.opacity(bright && !reduceMotion ? 0.72 : 0.20),
                                      lineWidth: bright && !reduceMotion ? 2 : 1)
                        .blur(radius: bright && !reduceMotion ? 2.5 : 0.5)
                        .allowsHitTesting(false)
                }
            }
            .shadow(color: enabled ? color.opacity(bright && !reduceMotion ? 0.44 : 0.16) : .clear,
                    radius: enabled ? (bright && !reduceMotion ? 20 : 7) : 0)
            .onAppear { animate() }
            .onChange(of: enabled) { _, _ in animate() }
            .onChange(of: reduceMotion) { _, _ in animate() }
    }

    private func animate() {
        bright = false
        guard enabled && !reduceMotion else { return }
        withAnimation(.easeInOut(duration: 1.3).repeatForever(autoreverses: true)) {
            bright = true
        }
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
