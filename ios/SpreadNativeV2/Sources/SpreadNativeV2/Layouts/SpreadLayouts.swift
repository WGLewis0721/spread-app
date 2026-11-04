#if os(iOS)
import SwiftUI

/// Fan: a hand of role cards pivoting on a point below the stage (`FanLayout`, `.studio-fan-card`).
/// The chosen card is upright and in front with its name and hours. Others lean out behind it. Drag to
/// deal the hand; the card settles with the finger's speed, and a tap brings any card forward.
struct FanLayout: View {
    @ObservedObject var planner: LivePlanner
    let rows: [LayoutRow]
    let selectedId: String
    let onSelect: (String) -> Void
    let onOpenTask: (String, String) -> Void
    let snapshot: PlannerSnapshot

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var drag: CGFloat = 0

    private let step: CGFloat = 96
    private let stageHeight: CGFloat = 224

    private var count: Int { rows.count }
    private var at: Int { max(0, rows.firstIndex { $0.id == selectedId } ?? 0) }

    var body: some View {
        VStack(spacing: 12) {
            GeometryReader { proxy in
                ZStack {
                    ForEach(rows.indices, id: \.self) { index in
                        card(rows[index], index: index, width: proxy.size.width)
                    }
                }
                .frame(width: proxy.size.width, height: stageHeight)
            }
            .frame(height: stageHeight)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 6)
                    .onChanged { value in
                        guard count > 1 else { return }
                        // Rubber band past two cards, so the hand never runs away from the finger.
                        let raw = value.translation.width
                        let pulled = abs(raw) > step * 2 ? CGFloat(raw.sign == .minus ? -1 : 1) * (step * 2 + (abs(raw) - step * 2) * 0.25) : raw
                        drag = -pulled / step
                    }
                    .onEnded { value in
                        guard count > 1 else { return }
                        let dx = value.translation.width
                        let steps = Int((-(dx + value.predictedEndTranslation.width - dx) / step).rounded())
                        drag = 0
                        let clamped = max(-2, min(2, steps))
                        if clamped != 0 { move(clamped) }
                    }
            )
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Spreads")
            .accessibilityAdjustableAction { direction in
                switch direction {
                case .increment: move(1)
                case .decrement: move(-1)
                @unknown default: break
                }
            }
            .accessibilityIdentifier("fan-cards")

            if count > 1 {
                HStack(spacing: 6) {
                    ForEach(rows.indices, id: \.self) { index in
                        Capsule().fill(index == at ? Spread.ink : Spread.ink.opacity(0.3))
                            .frame(width: index == at ? 22 : 6, height: 6)
                    }
                }
                .accessibilityHidden(true)
            }

            // The chosen spread's tasks, so every task is reachable from the Fan as well.
            if let front = rows.indices.contains(at) ? rows[at] : nil {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(snapshot.tasks(for: front.role.id)) { task in
                        TaskRow(planner: planner, snapshot: snapshot, task: task, roleId: front.role.id, onOpen: { onOpenTask(front.role.id, task.id) })
                    }
                    AddTaskRow(placeholder: "Add a task") { text in
                        Task { await planner.send(["type": "addTask", "roleId": front.role.id, "text": text]) }
                    }
                }
                .padding(.horizontal, 4)
                .spreadCard(edge: Color(hex: front.role.color), active: true)
            }
        }
    }

    private func signed(_ index: Int) -> Int {
        var d = index - at
        if d > count / 2 { d -= count }
        if d < -count / 2 { d += count }
        return d
    }

    private func move(_ steps: Int) {
        guard count > 1, steps != 0 else { return }
        let target = rows[((at + steps) % count + count * 4) % count]
        withAnimation(reduceMotion ? nil : .timingCurve(0.32, 0.72, 0, 1, duration: 0.56)) {
            onSelect(target.id)
        }
    }

    @ViewBuilder private func card(_ row: LayoutRow, index: Int, width: CGFloat) -> some View {
        let d = signed(index)
        let e = CGFloat(d) + drag   // whole cards plus the live fraction while the hand is dragged
        let ea = abs(e)
        let cardWidth = min(264, width * 0.74)
        let front = d == 0
        let tint = Color(hex: row.role.color)
        let shape = RoundedRectangle(cornerRadius: 28, style: .continuous)
        ZStack(alignment: .topLeading) {
            // Navy body, a role-colour wash from the lit corner, and a bounded edge: the same card language as the Stack.
            shape.fill(Spread.cardFill)
            shape.fill(LinearGradient(colors: [tint.opacity(front ? 0.40 : 0.55), tint.opacity(0)], startPoint: .topLeading, endPoint: UnitPoint(x: 0.75, y: 0.75)))
            shape.strokeBorder(tint.opacity(front ? 0.95 : 0.55), lineWidth: front ? 1.5 : 1)
            RoleBadge(category: row.role.category == "custom" ? nil : row.role.category, color: row.role.color, size: 44)
                .offset(x: 16 + (cardWidth - 76) * min(1, max(0, e)), y: 14)
            if front {
                // The front card carries its Chalkboard art and the Studio motion layers. Only the card in front
                // animates, so the work stays off the screen and off Reduce Motion users' screens.
                ChalkMotionArt(category: row.role.category, size: 150)
                    .offset(x: cardWidth - 160, y: 10)
                    .allowsHitTesting(false)
            }
            if !front {
                Text("\(SpreadHours.text(row.hours))h")
                    .font(.system(.footnote, weight: .bold)).foregroundStyle(Spread.ink).monospacedDigit()
                    .frame(width: cardWidth, alignment: .trailing)
                    .padding(.trailing, 16)
                    .padding(.top, 62)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(row.role.name)
                    .font(.system(size: 30, weight: .bold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Text("\(SpreadHours.text(row.hours))h")
                    .font(.system(size: 18, weight: .bold)).foregroundStyle(Spread.secondary).monospacedDigit()
            }
            .foregroundStyle(Spread.ink)
            .padding(.horizontal, 20)
            .padding(.bottom, 18)
            .frame(width: cardWidth, height: 176, alignment: .bottomLeading)
            .opacity(max(0, min(1, 1 - Double(ea) * 1.8)))
        }
        .shadow(color: tint.opacity(front ? 0.35 : 0.14), radius: front ? 16 : 10, y: 8)
        .frame(width: cardWidth, height: 176)
        .rotationEffect(.degrees(Double(e) * 13), anchor: UnitPoint(x: 0.5, y: 1.85))
        .scaleEffect(1 - ea * 0.035)
        .opacity(max(0, min(1, 1 - Double(ea - 2) * 2)))
        .position(x: width / 2, y: 88 + 12)
        .zIndex(Double(20 - ea * 2))
        .onTapGesture { onSelect(row.id) }
        .allowsHitTesting(ea <= 2)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(row.role.name), \(SpreadHours.spoken(row.hours))")
        .accessibilityAddTraits(front ? .isSelected : [])
        .accessibilityIdentifier("fan-card-\(row.role.id)")
        .animation(reduceMotion ? nil : .timingCurve(0.32, 0.72, 0, 1, duration: 0.56), value: at)
    }
}

/// Dial: arcs sized by each role's hours around a ring, a knob on the chosen arc, and a dark sphere that
/// shows the chosen role's hours (`DialLayout`). Drag around the ring, tap an arc, or use VoiceOver's adjustment.
/// Uses the same proportional segmentation as `DialGeometry`, which mirrors Studio's `dialSegments`.
struct DialLayout: View {
    @ObservedObject var planner: LivePlanner
    let rows: [LayoutRow]
    let selectedId: String
    let onSelect: (String) -> Void
    let onOpenRole: (String) -> Void
    let snapshot: PlannerSnapshot

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var roles: [Responsibility] { rows.map(\.role) }
    private var arcs: [DialArc] { DialGeometry.arcs(for: roles) }
    private var selected: LayoutRow? { rows.first { $0.id == selectedId } ?? rows.first }
    private var total: Double { rows.reduce(0) { $0 + $1.hours } }

    var body: some View {
        VStack(spacing: 12) {
            GeometryReader { proxy in
                let side = min(280, proxy.size.width * 0.8)
                let center = CGPoint(x: proxy.size.width / 2, y: side / 2)
                ZStack {
                    tickRing(center: center, side: side)
                    ForEach(arcs, id: \.id) { arc in
                        let isSelected = arc.id == selectedId
                        arcPath(arc, center: center, radius: side / 2 - 22)
                            .stroke(Color(hex: rows.first { $0.id == arc.id }?.role.color ?? "#8E8E93"),
                                    style: StrokeStyle(lineWidth: isSelected ? 26 : 14, lineCap: .round))
                            .opacity(isSelected ? 1 : 0.42)
                            .animation(reduceMotion ? nil : .timingCurve(0.32, 0.72, 0, 1, duration: 0.38), value: selectedId)
                    }
                    knob(center: center, side: side)
                    sphere(side: side)
                }
                .frame(width: side, height: side)
                .position(x: proxy.size.width / 2, y: side / 2)
                .contentShape(Circle())
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            let dx = value.location.x - center.x
                            let dy = value.location.y - center.y
                            let angle = atan2(dy, dx) * 180 / .pi + 90
                            if let id = DialGeometry.roleId(at: Double((angle + 360).truncatingRemainder(dividingBy: 360)), arcs: arcs), id != selectedId {
                                onSelect(id)
                            }
                        }
                )
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Spread dial")
                .accessibilityValue(selected.map { "\($0.role.name), \(SpreadHours.spoken($0.hours))" } ?? "")
                .accessibilityAdjustableAction { direction in
                    guard let index = rows.firstIndex(where: { $0.id == selectedId }), rows.count > 1 else { return }
                    let next = direction == .increment ? index + 1 : index - 1
                    onSelect(rows[(next + rows.count) % rows.count].id)
                }
                .accessibilityIdentifier("dial")
            }
            .frame(height: 300)
        }
    }

    private func arcPath(_ arc: DialArc, center: CGPoint, radius: CGFloat) -> Path {
        var path = Path()
        path.addArc(center: center, radius: radius, startAngle: .degrees(arc.from - 90), endAngle: .degrees(arc.to - 90), clockwise: false)
        return path
    }

    private func tickRing(center: CGPoint, side: CGFloat) -> some View {
        Canvas { context, _ in
            for index in 0..<72 {
                let deg = Double(index) * 5
                let rad = (deg - 90) * .pi / 180
                let r0 = side / 2 - 4, r1 = side / 2 - (index % 6 == 0 ? 0 : 2)
                var path = Path()
                path.move(to: CGPoint(x: center.x + CGFloat(cos(rad)) * r0, y: center.y + CGFloat(sin(rad)) * r0))
                path.addLine(to: CGPoint(x: center.x + CGFloat(cos(rad)) * r1, y: center.y + CGFloat(sin(rad)) * r1))
                context.stroke(path, with: .color(Spread.ink.opacity(0.18)), style: StrokeStyle(lineWidth: index % 6 == 0 ? 1.6 : 1.1, lineCap: .round))
            }
        }
        .frame(width: side, height: side)
        .position(center)
        .accessibilityHidden(true)
    }

    private func knob(center: CGPoint, side: CGFloat) -> some View {
        let segment = arcs.first { $0.id == selectedId }
        let mid = segment.map { ($0.from + $0.to) / 2 } ?? 0
        let radius = side / 2 - 22
        let rad = (mid - 90) * .pi / 180
        return Circle().fill(.white)
            .frame(width: 20, height: 20)
            .shadow(color: .black.opacity(0.5), radius: 4, y: 2)
            .position(x: center.x + CGFloat(cos(rad)) * radius, y: center.y + CGFloat(sin(rad)) * radius)
            .animation(reduceMotion ? nil : .timingCurve(0.32, 0.72, 0, 1, duration: 0.52), value: selectedId)
            .accessibilityHidden(true)
    }

    private func sphere(side: CGFloat) -> some View {
        let glow = Color(hex: selected?.role.color ?? "#8E8E93")
        return VStack(spacing: 2) {
            Text("\(SpreadHours.text(selected?.hours ?? 0))h")
                .font(.system(size: 44, weight: .heavy)).monospacedDigit().tracking(-1.2)
                .contentTransition(.numericText())
                .animation(reduceMotion ? nil : .timingCurve(0.32, 0.72, 0, 1, duration: 0.42), value: selected?.hours)
            Text(selected?.role.name ?? "")
                .font(.system(.body, weight: .bold)).lineLimit(1)
            Text("of \(SpreadHours.text(total))h")
                .font(.system(.footnote, weight: .semibold)).foregroundStyle(.white.opacity(0.78))
        }
        .foregroundStyle(.white)
        .frame(width: side * 0.64, height: side * 0.64)
        .background(
            RadialGradient(colors: [glow.opacity(0.52), Color(hex6: 0x0B0B0C)], center: UnitPoint(x: 0.38, y: 0.24), startRadius: 0, endRadius: side * 0.42)
                .clipShape(Circle())
        )
        .background(Color(hex6: 0x0B0B0C), in: Circle())
        .position(x: side / 2, y: side / 2)
        .allowsHitTesting(false)
    }
}

/// Tabs: All, or one responsibility at a time, with the chosen tab kept in view (`TabsLayout`).
/// The panel slides in from the side the tab lies on.
struct TabsLayout: View {
    @ObservedObject var planner: LivePlanner
    let rows: [LayoutRow]
    @Binding var tab: String
    let snapshot: PlannerSnapshot
    let onOpenTask: (String, String) -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var lastIndex = 0

    private var ids: [String] { ["all"] + rows.map(\.id) }
    private var index: Int { ids.firstIndex(of: tab) ?? 0 }

    var body: some View {
        VStack(spacing: 12) {
            ScrollViewReader { proxy in
                ScrollView(.horizontal) {
                    HStack(spacing: 8) {
                        tabButton(id: "all", title: "All", color: nil, category: nil)
                        ForEach(rows) { row in
                            tabButton(id: row.id, title: row.role.name, color: row.role.color, category: row.role.category)
                        }
                    }
                    .padding(.vertical, 2)
                }
                .scrollIndicators(.hidden)
                .onChange(of: tab) { _, value in
                    withAnimation(reduceMotion ? nil : SpreadMotion.curve) { proxy.scrollTo("tab-\(value)", anchor: .center) }
                }
            }
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Spreads")
            .accessibilityIdentifier("role-tabs")

            Group {
                if tab == "all" {
                    VStack(spacing: 10) {
                        ForEach(rows) { row in
                            RoleRow(planner: planner, snapshot: snapshot, role: row.role, editing: false, onOpenTask: onOpenTask, onOpenRole: { _ in })
                                .spreadCard(edge: Color(hex: row.role.color))
                        }
                    }
                } else if let row = rows.first(where: { $0.id == tab }) {
                    RoleRow(planner: planner, snapshot: snapshot, role: row.role, editing: false, focused: true, onOpenTask: onOpenTask, onOpenRole: { _ in })
                        .spreadCard(edge: Color(hex: row.role.color), active: true)
                }
            }
            .id(tab)
            .transition(panelTransition)
        }
        .onAppear { lastIndex = index }
        .onChange(of: tab) { _, _ in lastIndex = index }
        .accessibilityIdentifier("tabs-panel")
    }

    private var panelTransition: AnyTransition {
        guard !reduceMotion else { return .opacity }
        let forward = index >= lastIndex
        return .asymmetric(
            insertion: .offset(x: forward ? 40 : -40).combined(with: .opacity),
            removal: .opacity
        )
    }

    private func tabButton(id: String, title: String, color: String?, category: String?) -> some View {
        let selected = tab == id
        let tint: Color? = color.map { Color(hex: $0) }
        return Button {
            tab = id
        } label: {
            HStack(spacing: 8) {
                if let color { RoleBadge(category: category == "custom" ? nil : category, color: color, size: 26) }
                Text(title).font(.system(.subheadline, weight: .semibold)).lineLimit(1)
            }
            .foregroundStyle(selected ? Spread.onAccent : Spread.ink)
            .padding(.leading, color == nil ? 16 : 9).padding(.trailing, 16)
            .frame(minHeight: 44)
            .background {
                if selected {
                    Capsule().fill(tint.map { AnyShapeStyle($0) } ?? AnyShapeStyle(Spread.accentGradient))
                } else {
                    Capsule().fill(Spread.inset)
                }
            }
            .overlay(Capsule().strokeBorder(Spread.line, lineWidth: selected ? 0 : 0.5))
        }
        .buttonStyle(.spreadPress)
        // The chosen tab lifts a little and settles with a spring; no tab is ever drawn below its 44 pt target.
        .scaleEffect(selected && !reduceMotion ? 1.04 : 1.0)
        .animation(reduceMotion ? nil : .spring(response: 0.32, dampingFraction: 0.62), value: selected)
        .id("tab-\(id)")
        .accessibilityAddTraits(selected ? .isSelected : [])
        .accessibilityIdentifier("role-tab-\(id)")
    }
}

/// Day: the seven days as chips filled by how busy each is against the busiest day, then the chosen day's
/// planned hours as a timeline of role-coloured blocks (`DayLayout`). Hours shown are placed hours, never
/// invented appointments.
struct DayLayout: View {
    @ObservedObject var planner: LivePlanner
    let rows: [LayoutRow]
    let snapshot: PlannerSnapshot
    @Binding var selectedDay: String
    @Binding var selectedRole: String?
    let onOpenTask: (String, String) -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var days: [String] {
        PlannerOrder.displayOffsets.map { PlannerDates.dayISO(weekKey: snapshot.weekKey, index: $0) }
    }
    private func load(_ day: String) -> Double {
        snapshot.allocations.filter { $0.day == day && $0.hours > 0 }.reduce(0) { $0 + $1.hours }
    }

    var body: some View {
        let busiest = max(1, days.map(load).max() ?? 1)
        let blocks = snapshot.allocations.filter { $0.day == selectedDay && $0.hours > 0 }.sorted { $0.order < $1.order }
        let dayTotal = blocks.reduce(0) { $0 + $1.hours }
        // Cumulative start hour of each block, so each row's time is where the previous block ended.
        let starts = blocks.reduce(into: [0.0]) { $0.append(($0.last ?? 0) + $1.hours) }
        let today = PlannerDates.localISO()
        let label = PlannerDates.label(PlannerDates.date(selectedDay), pattern: "EEEE")

        VStack(alignment: .leading, spacing: 16) {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 7), spacing: 6) {
                ForEach(days, id: \.self) { day in
                    let filled = load(day) / busiest
                    let isSelected = day == selectedDay
                    Button { if day != selectedDay { withAnimation(reduceMotion ? nil : SpreadMotion.curve) { selectedDay = day } } } label: {
                        VStack(spacing: 2) {
                            Text(String(PlannerDates.label(PlannerDates.date(day), pattern: "EEE").prefix(3)))
                                .font(.system(.caption2, weight: .semibold))
                            Text(PlannerDates.label(PlannerDates.date(day), pattern: "d"))
                                .font(.system(.body, weight: .heavy)).monospacedDigit()
                        }
                        .foregroundStyle(isSelected ? Spread.onAccent : Spread.ink)
                        .frame(maxWidth: .infinity, minHeight: 60)
                        .background(alignment: .bottom) {
                            // How busy the day is, against the busiest day: a quiet fill rising from the bottom.
                            Rectangle().fill(isSelected ? Color.white.opacity(0.24) : Spread.accent.opacity(0.22))
                                .frame(height: 60 * filled)
                                .animation(reduceMotion ? nil : .timingCurve(0.32, 0.72, 0, 1, duration: 0.64), value: filled)
                        }
                        .background {
                            if isSelected {
                                RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Spread.accentGradient)
                            } else {
                                RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Spread.elevated)
                            }
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .strokeBorder(day == today ? Spread.accent : Spread.line, lineWidth: day == today ? 1.5 : 0.5))
                    }
                    .buttonStyle(.spreadPress)
                    .accessibilityLabel("\(PlannerDates.label(PlannerDates.date(day), pattern: "EEEE"))\(day == today ? ", today" : "")\(load(day) > 0 ? ", \(SpreadHours.spoken(load(day))) planned" : ", nothing planned")")
                    .accessibilityAddTraits(isSelected ? .isSelected : [])
                    .accessibilityIdentifier("day-chip-\(day)")
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(selectedDay == today ? "Your day at a glance" : "\(label) at a glance")
                    .font(.system(.title2, weight: .bold))
                Text(dayTotal > 0 ? "\(SpreadHours.spoken(dayTotal)) planned across \(blocks.count) \(blocks.count == 1 ? "block" : "blocks")" : "Nothing planned yet. Place hours on the Week tab.")
                    .font(Spread.footnote).foregroundStyle(Spread.secondary)
            }

            if !blocks.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(blocks.indices, id: \.self) { index in
                        let block = blocks[index]
                        let start = starts[index]
                        let role = rows.first { $0.role.id == block.roleId }?.role
                        HStack(alignment: .top, spacing: 8) {
                            Text("\(SpreadHours.text(start))h")
                                .font(.system(.caption2, weight: .semibold)).foregroundStyle(Spread.secondary)
                                .frame(width: 42, alignment: .trailing).padding(.top, 14)
                            Circle().fill(Color(hex: role?.color ?? "#8E8E93")).frame(width: 12, height: 12).padding(.top, 14)
                            Button {
                                selectedRole = block.roleId
                            } label: {
                                HStack(spacing: 10) {
                                    if let role { RoleBadge(category: role.category == "custom" ? nil : role.category, color: role.color, size: 32) }
                                    Text(role?.name ?? "").font(.system(.body, weight: .semibold)).lineLimit(1)
                                    Spacer(minLength: 4)
                                    Text("\(SpreadHours.text(block.hours))h").font(.system(.subheadline, weight: .semibold)).monospacedDigit()
                                }
                                .foregroundStyle(Spread.ink)
                                .padding(.horizontal, 14)
                                .frame(maxWidth: .infinity, minHeight: max(56, 40 + min(block.hours, 6) * 14), alignment: .leading)
                                .background {
                                    let tint = Color(hex: role?.color ?? "#8E8E93")
                                    ZStack {
                                        RoundedRectangle(cornerRadius: 22, style: .continuous).fill(Spread.cardFill)
                                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                                            .fill(LinearGradient(colors: [tint.opacity(0.42), tint.opacity(0.06)], startPoint: .leading, endPoint: .trailing))
                                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                                            .strokeBorder(tint.opacity(selectedRole == block.roleId ? 0.95 : 0.5), lineWidth: selectedRole == block.roleId ? 1.5 : 1)
                                    }
                                }
                                .contentShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                            }
                            .buttonStyle(.spreadPress)
                            .accessibilityLabel("\(role?.name ?? ""), \(SpreadHours.spoken(block.hours))")
                            .accessibilityAddTraits(selectedRole == block.roleId ? .isSelected : [])
                        }
                        .transition(.opacity.combined(with: .offset(y: reduceMotion ? 0 : 14)))
                    }
                    HStack(spacing: 8) {
                        Text("\(SpreadHours.text(dayTotal))h").font(.system(.caption2, weight: .semibold)).foregroundStyle(Spread.secondary)
                            .frame(width: 42, alignment: .trailing)
                        Circle().strokeBorder(Spread.ink, lineWidth: 2).frame(width: 12, height: 12)
                        Text("End of plan").font(.system(.caption, weight: .semibold)).foregroundStyle(Spread.secondary)
                            .padding(.horizontal, 10).padding(.vertical, 3)
                            .background(Spread.elevated, in: Capsule())
                    }
                }
            }

            if let role = rows.first(where: { $0.id == selectedRole })?.role {
                RoleRow(planner: planner, snapshot: snapshot, role: role, editing: false, focused: true, onOpenTask: onOpenTask, onOpenRole: { _ in })
                    .spreadCard(edge: Color(hex: role.color), active: true)
            }
        }
        .accessibilityIdentifier("day-layout")
    }
}
#endif
