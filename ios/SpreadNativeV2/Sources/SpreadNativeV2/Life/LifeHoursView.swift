#if os(iOS)
import SwiftUI

/// Pure geometry and arithmetic: one 15° detent is a half hour. Direction follows the
/// reference's pointerAngle/angleDelta, including wrapping at -180/180.
enum LifeOrbitMath {
    static func delta(from old: Double, to next: Double) -> Double {
        let value = (next - old + 540).truncatingRemainder(dividingBy: 360)
        return value - 180
    }
    static func angle(x: Double, y: Double, center: Double) -> Double {
        atan2(y - center, x - center) * 180 / .pi
    }
    static func capacityDelta(distance: Double, elapsed: Double) -> Int {
        guard abs(distance) > 17 else { return 0 }
        let speed = min(16, max(1, (abs(distance) - 8) / 14))
        let held = elapsed > 0.35 ? Int((elapsed - 0.35) * speed) : 0
        return (distance > 0 ? 1 : -1) * max(1, held)
    }
    static func limit(_ value: Double, minimum: Double, maximum: Double) -> Double {
        min(maximum, max(minimum, value))
    }
}

struct LifeHoursView: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let onHelp: () -> Void

    @State private var separated = false
    @State private var selectedRole: String?
    @State private var capacityDraft: Double?
    @State private var budgetDraft: Double?
    @State private var capacityText = ""
    @State private var showCapacityField = false
    @State private var capacityOrigin: Double?
    @State private var gestureStarted: Date?
    @State private var lastAngle: Double?
    @State private var angleCredit: Double = 0
    @State private var gestureContext: String?
    @State private var lastTick = Date.distantPast
    @State private var boundaryWarned = false
    @State private var message: String?
    @AppStorage("native.life.touchFeedback") private var touchFeedback = true
    @AppStorage("native.life.showTips") private var showTips = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var assigned: Double { snapshot.roles.reduce(0) { $0 + $1.hours } }
    private var capacity: Double? { capacityDraft ?? snapshot.life?.capacityHours }
    private var available: Double? { capacity.map { $0 - assigned } }
    private var selected: Responsibility? {
        snapshot.roles.first { $0.id == selectedRole }
    }
    private var context: String {
        "\(planner.state?.envelope.profileId ?? "")/\(snapshot.weekKey)"
    }
    private var selectedHours: Double { budgetDraft ?? selected?.hours ?? 0 }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Hours").font(.system(.largeTitle, weight: .bold))
                    Text("Make the hours count.")
                        .font(.subheadline).foregroundStyle(Spread.secondary)
                }
                Spacer()
                Button(action: onHelp) {
                    Image(systemName: "questionmark.circle")
                        .font(.title2).frame(width: 44, height: 44)
                }
                .accessibilityLabel("Gesture help")
            }
            orbit
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text(SpreadHours.text(assigned) + " assigned")
                        .font(.headline).monospacedDigit()
                    Text("Hours in your Life areas").font(.caption).foregroundStyle(Spread.secondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 3) {
                    Text(available.map { SpreadHours.text($0) + " unassigned" } ?? "Set capacity")
                        .font(.headline).monospacedDigit()
                    Text("Hours not assigned").font(.caption).foregroundStyle(Spread.secondary)
                }
            }
            .padding(14)
            .background(Spread.elevated, in: RoundedRectangle(cornerRadius: 18))

            if capacity == nil {
                Text("How many hours can you plan this week?")
                    .font(.headline)
                Text("Set your total planning hours. Your existing Life hours stay unchanged.")
                    .font(.subheadline).foregroundStyle(Spread.secondary)
                capacityField
            } else {
                if let available, available < 0 {
                    Label("You have \(SpreadHours.text(-available)) more assigned hours than your capacity. Your existing plan is unchanged.", systemImage: "exclamationmark.triangle")
                        .font(.callout).foregroundStyle(Spread.caution)
                }
                Text(separated ? "Choose a Life area. Circle left to add; right to subtract." :
                        "Tap the number to separate. Flick up or down to change capacity.")
                    .font(.subheadline).foregroundStyle(Spread.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                if showTips {
                    Text("Flick up or down by 1 hour. Hold and drag to change faster.")
                        .font(.caption).foregroundStyle(Spread.tertiary)
                        .frame(maxWidth: .infinity, alignment: .center)
                }
                Button(showCapacityField ? "Hide capacity controls" : "Adjust capacity with controls") {
                    showCapacityField.toggle()
                    capacityText = capacity.map(SpreadHours.text) ?? ""
                }
                .font(.subheadline)
                .frame(maxWidth: .infinity, minHeight: 44)
                if showCapacityField { capacityField }
            }
            roleChoices
            if let selected, separated, capacity != nil {
                selectedControls(selected)
            }
            if let message {
                Text(message).font(.callout).foregroundStyle(Spread.caution)
                    .accessibilityIdentifier("life-hours-message")
            }
        }
        .onChange(of: snapshot.weekKey) { _, _ in resetGestures() }
        .onChange(of: planner.state?.envelope.profileId) { _, _ in resetGestures() }
        .onChange(of: selectedRole) { _, _ in budgetDraft = nil; lastAngle = nil; angleCredit = 0 }
        .accessibilityIdentifier("life-hours-page")
    }

    private var orbit: some View {
        GeometryReader { geo in
            let diameter = min(geo.size.width, 340.0)
            let radius = diameter * 0.315
            ZStack {
                Circle()
                    .stroke(Spread.line, lineWidth: 17)
                    .padding(diameter * 0.17)
                ForEach(segments, id: \.id) { segment in
                    Circle()
                        .trim(from: segment.start, to: segment.end)
                        .stroke(Color(hex: segment.color),
                                style: StrokeStyle(lineWidth: selectedRole == segment.id && separated ? 24 : 18,
                                                   lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .padding(diameter * 0.17)
                        .offset(x: separated ? cos(segment.middle * .pi / 180) * 18 : 0,
                                y: separated ? sin(segment.middle * .pi / 180) * 18 : 0)
                        .animation(reduceMotion ? nil : .easeInOut(duration: 0.25), value: separated)
                        .accessibilityHidden(true)
                }
                Circle()
                    .stroke(Color.clear, lineWidth: 48)
                    .frame(width: radius * 2, height: radius * 2)
                    .contentShape(Circle().stroke(lineWidth: 48))
                    .gesture(DragGesture(minimumDistance: 6)
                        .onChanged { turnArc($0, diameter: diameter) }
                        .onEnded { _ in finishArc() })
                    .accessibilityHidden(true)
                VStack(spacing: 4) {
                    Text(capacity.map(SpreadHours.text) ?? "—")
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .minimumScaleFactor(0.7)
                        .monospacedDigit()
                        .accessibilityIdentifier("life-capacity-number")
                    Text("Hours available\nto plan")
                        .font(.subheadline.weight(.medium))
                        .multilineTextAlignment(.center)
                }
                .frame(width: diameter * 0.48, height: diameter * 0.48)
                .contentShape(Circle())
                .onTapGesture {
                    separated.toggle()
                    if !separated { selectedRole = nil }
                    selectionTick()
                }
                .gesture(DragGesture(minimumDistance: 10)
                    .onChanged { dragCapacity($0) }
                    .onEnded { _ in finishCapacity() })
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Weekly planning hours")
                .accessibilityValue(capacity.map(SpreadHours.spoken) ?? "Not set")
                .accessibilityHint("Tap to separate areas. Adjust up or down by one hour.")
                .accessibilityAdjustableAction { direction in
                    if let capacity {
                        let change: Double = direction == .increment ? 1 : -1
                        commitCapacity(LifeOrbitMath.limit(capacity + change, minimum: assigned, maximum: 168))
                    }
                }
            }
            .frame(width: diameter, height: diameter)
            .frame(maxWidth: .infinity)
        }
        .frame(height: 340)
        .accessibilityIdentifier("life-orbit")
    }

    private struct Segment {
        var id: String
        var color: String
        var start: CGFloat
        var end: CGFloat
        var middle: Double
    }
    private var segments: [Segment] {
        guard let capacity, capacity > 0 else { return [] }
        var cursor = 0.0
        return snapshot.roles.map { role in
            let amount = selectedRole == role.id ? selectedHours : role.hours
            let fraction = max(0, amount) / max(1, capacity)
            let sweep = fraction
            let gap = min(0.006, sweep / 4)
            let start = cursor
            cursor += sweep
            return Segment(id: role.id, color: role.color,
                           start: CGFloat(min(1, start + gap)),
                           end: CGFloat(min(1, max(start + gap, cursor - gap))),
                           middle: ((start + sweep / 2) * 360) - 90)
        }
    }

    private var roleChoices: some View {
        VStack(spacing: 8) {
            ForEach(snapshot.roles) { role in
                Button {
                    if !separated { separated = true }
                    selectedRole = role.id
                    selectionTick()
                } label: {
                    HStack(spacing: 12) {
                        Circle().fill(Color(hex: role.color)).frame(width: 13, height: 13)
                        Text(role.name).font(.body.weight(.semibold))
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Text(SpreadHours.text(selectedRole == role.id ? selectedHours : role.hours) + " h")
                            .monospacedDigit().font(.headline)
                        Image(systemName: "chevron.right").foregroundStyle(Spread.tertiary)
                    }
                    .padding(12)
                    .frame(minHeight: 50)
                    .background(selectedRole == role.id ? Spread.accent.opacity(0.1) : Spread.elevated,
                                in: RoundedRectangle(cornerRadius: 15))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("life-hours-role-\(role.id)")
            }
        }
    }

    private func selectedControls(_ role: Responsibility) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(role.name).font(.title3.bold())
                Spacer()
                Text(SpreadHours.text(selectedHours) + " h").font(.title3.bold())
            }
            HStack(spacing: 12) {
                Button { changeBudget(by: 0.5) } label: {
                    Label("Add ½h", systemImage: "arrow.counterclockwise")
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                Button { changeBudget(by: -0.5) } label: {
                    Label("Return ½h", systemImage: "arrow.clockwise")
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
            }
            .buttonStyle(.bordered)
            let reserved = snapshot.placedHours(for: role.id)
            Text("\(SpreadHours.text(reserved)) h placed on days · \(SpreadHours.text(max(0, selectedHours - reserved))) h available to place")
                .font(.callout).foregroundStyle(Spread.secondary)
        }
        .padding(16)
        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: 20))
    }

    private var capacityField: some View {
        HStack {
            Button {
                if let capacity {
                    commitCapacity(LifeOrbitMath.limit(capacity - 1, minimum: assigned, maximum: 168))
                }
            } label: { Image(systemName: "minus").frame(width: 44, height: 44) }
                .disabled(capacity == nil || capacity! <= assigned)
            TextField("Weekly hours", text: $capacityText)
                .keyboardType(.decimalPad)
                .submitLabel(.done)
                .accessibilityLabel("Total weekly planning hours")
                .accessibilityIdentifier("life-capacity-input")
                .multilineTextAlignment(.center)
            Button {
                if let capacity {
                    commitCapacity(LifeOrbitMath.limit(capacity + 1, minimum: assigned, maximum: 168))
                }
            } label: { Image(systemName: "plus").frame(width: 44, height: 44) }
                .disabled(capacity == nil || capacity! >= 168)
            Button("Set") {
                guard let entered = Double(capacityText.replacingOccurrences(of: ",", with: ".")),
                      entered >= assigned, entered <= 168, (entered * 2).rounded() == entered * 2 else {
                    message = "Enter half-hour increments between \(SpreadHours.text(assigned)) and 168."
                    return
                }
                commitCapacity(entered)
            }
            .frame(minHeight: 44)
            .buttonStyle(.borderedProminent)
        }
    }

    private func selectionTick() {
        guard touchFeedback, Date().timeIntervalSince(lastTick) >= 0.125 else { return }
        lastTick = Date()
        SpreadHaptics.selection()
    }
    private func warn(_ text: String) {
        message = text
        if !boundaryWarned {
            boundaryWarned = true
            if touchFeedback { SpreadHaptics.selection() }
        }
    }
    private func dragCapacity(_ value: DragGesture.Value) {
        guard let capacity = snapshot.life?.capacityHours else { return }
        if capacityOrigin == nil {
            capacityOrigin = capacity
            gestureStarted = value.time
            gestureContext = context
            boundaryWarned = false
        }
        guard gestureContext == context else { resetGestures(); return }
        let difference = Double(-value.translation.height)
        let elapsed = value.time.timeIntervalSince(gestureStarted ?? value.time)
        let proposed = LifeOrbitMath.limit(
            (capacityOrigin ?? capacity) + Double(LifeOrbitMath.capacityDelta(distance: difference, elapsed: elapsed)),
            minimum: assigned, maximum: 168)
        if proposed == capacityDraft { return }
        if proposed == assigned || proposed == 168 { warn("Capacity must stay between assigned hours and 168.") }
        capacityDraft = proposed
        selectionTick()
    }
    private func finishCapacity() {
        guard gestureContext == context, let value = capacityDraft,
              value != snapshot.life?.capacityHours else { resetGestures(); return }
        commitCapacity(value)
        resetGestures(keepMessage: true)
        showTips = false
    }
    private func turnArc(_ value: DragGesture.Value, diameter: CGFloat) {
        guard separated, let role = selected, let capacity = capacity,
              snapshot.life?.capacityHours != nil else { return }
        if gestureContext == nil {
            gestureContext = context
            boundaryWarned = false
        }
        guard gestureContext == context else { resetGestures(); return }
        let next = LifeOrbitMath.angle(x: Double(value.location.x), y: Double(value.location.y),
                                       center: Double(diameter / 2))
        if let lastAngle {
            angleCredit += LifeOrbitMath.delta(from: lastAngle, to: next)
            let steps = Int(angleCredit / 15)
            if steps != 0 {
                angleCredit -= Double(steps) * 15
                let current = budgetDraft ?? role.hours
                let assignedElsewhere = assigned - role.hours
                let minBudget = snapshot.placedHours(for: role.id)
                let maxBudget = max(minBudget, capacity - assignedElsewhere)
                let proposed = LifeOrbitMath.limit(current - Double(steps) * 0.5,
                                                   minimum: minBudget, maximum: maxBudget)
                if proposed == current {
                    warn(proposed <= minBudget ? "Return the hours placed on days first." :
                            "Your circle is full. Increase capacity to add time.")
                } else {
                    budgetDraft = proposed
                    selectionTick()
                }
            }
        }
        lastAngle = next
    }
    private func finishArc() {
        let draft = budgetDraft
        let roleId = selectedRole
        let old = selected?.hours
        let sameContext = gestureContext == context
        resetGestures(keepMessage: true)
        guard sameContext, let roleId, let draft, draft != old else { return }
        commitBudget(roleId, hours: draft)
        showTips = false
    }
    private func changeBudget(by delta: Double) {
        guard let role = selected, let capacity else { return }
        let reserved = snapshot.placedHours(for: role.id)
        let maxBudget = max(reserved, capacity - (assigned - role.hours))
        let next = role.hours + delta
        guard next >= reserved && next <= maxBudget else {
            warn(delta < 0 ? "Return the hours placed on days first." : "Your circle is full.")
            return
        }
        commitBudget(role.id, hours: next)
    }
    private func commitBudget(_ roleId: String, hours: Double) {
        message = nil
        Task {
            let ok = await planner.send(["type": "setLifeBudget", "roleId": roleId, "hours": hours])
            if ok { selectionTick() } else { message = "The budget was not saved. Review the current plan." }
        }
    }
    private func commitCapacity(_ hours: Double) {
        message = nil
        Task {
            let ok = await planner.send(["type": "setLifeCapacity", "hours": hours])
            if ok { capacityText = SpreadHours.text(hours); selectionTick() }
            else { message = "Capacity was not saved. Review the current plan." }
            capacityDraft = nil
        }
    }
    private func resetGestures(keepMessage: Bool = false) {
        capacityDraft = nil; budgetDraft = nil; capacityOrigin = nil
        lastAngle = nil; angleCredit = 0; gestureContext = nil
        gestureStarted = nil; boundaryWarned = false
        if !keepMessage { message = nil }
    }
}
#endif
