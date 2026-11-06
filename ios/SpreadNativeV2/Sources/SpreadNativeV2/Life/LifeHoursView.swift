import Foundation

/// Pure geometry and arithmetic: one 15° detent is a half hour. Direction follows the
/// reference's pointerAngle/angleDelta, including wrapping at -180/180.
enum LifeOrbitMath {
    /// Twenty-second visible orbit around the weekly capacity. Pauses on selection/Reduce Motion.
    static let orbitDegreesPerSecond = 18.0

    static func delta(from old: Double, to next: Double) -> Double {
        let value = (next - old + 540).truncatingRemainder(dividingBy: 360)
        return value - 180
    }
    static func angle(x: Double, y: Double, center: Double) -> Double {
        atan2(y - center, x - center) * 180 / .pi
    }
    static func holdCredit(distance: Double, interval: Double) -> Double {
        guard abs(distance) > 12 else { return 0 }
        return max(0, interval) * min(16, max(1, (abs(distance) - 8) / 14))
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

#if os(iOS)
import SwiftUI
import Combine
import UIKit

struct LifeHoursView: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let onHelp: () -> Void

    @State private var separated = false
    @State private var phase: Double = 0
    @State private var phaseTime = Date()
    @State private var isVisible = false
    @State private var holding = false
    @State private var holdDistance: Double = 0
    @State private var holdCredit: Double = 0
    @State private var holdLast = Date()
    @State private var holdChanged = false
    @State private var originRevision: Int?
    @State private var saving = false
    @State private var rejected = false
    @GestureState private var contactActive = false
    @ScaledMetric(relativeTo: .largeTitle) private var numberSize: CGFloat = 48
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dynamicTypeSize) private var typeSize
    private let clock = Timer.publish(every: 1.0 / 60, on: .main, in: .common).autoconnect()
    @Binding var selectedRole: String?
    @State private var capacityDraft: Double?
    @State private var budgetDraft: Double?
    @State private var capacityText = ""
    @State private var showCapacityField = false
    @State private var capacityOrigin: Double?
    @State private var gestureStarted: Date?
    @State private var lastAngle: Double?
    @State private var angleCredit: Double = 0
    @State private var gestureContext: String?
    @State private var cueGate = TactileCueGate()
    @State private var message: String?
    @AppStorage("native.life.touchFeedback") private var touchFeedback = true
    @AppStorage("native.life.showTips") private var showTips = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var storedAssigned: Double { snapshot.roles.reduce(0) { $0 + $1.hours } }
    private var assigned: Double {
        storedAssigned - (selected?.hours ?? 0) + (selectedRole == nil ? 0 : selectedHours)
    }
    private var capacity: Double? { capacityDraft ?? snapshot.life?.capacityHours }
    private var available: Double? { capacity.map { $0 - assigned } }
    private var selected: Responsibility? {
        snapshot.roles.first { $0.id == selectedRole }
    }
    private var context: String {
        "\(planner.state?.sessionId ?? "")/\(planner.state?.envelope.profileId ?? "")/\(snapshot.weekKey)"
    }
    private var selectedHours: Double { budgetDraft ?? selected?.hours ?? 0 }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Hours").font(.system(.largeTitle, weight: .bold))
                    Text("Make the hours count.")
                        .font(.subheadline).foregroundStyle(LifePalette.secondary)
                }
                Spacer()
                Button(action: onHelp) {
                    Image(systemName: "questionmark.circle")
                        .font(.title2).frame(width: 44, height: 44)
                }
                .accessibilityLabel("Gesture help")
            }
            Text(selectedRole == nil ? "Tap the center to set your weekly hours. Choose an area, then turn left to give it time or right to take time back." : "Turn left to add ½ hour. Turn right to return ½ hour to your weekly pool.")
                .font(.callout).foregroundStyle(LifePalette.secondary)
            orbit
            roleChoices
            if let selected, separated {
                if capacity != nil {
                    selectedControls(selected)
                } else {
                    Button("Set weekly hours to adjust \(selected.name)") {
                        capacityText = ""
                        showCapacityField = true
                    }
                    .frame(minHeight: 44)
                    .accessibilityIdentifier("life-selected-hours-needs-capacity")
                }
            }
            if saving { ProgressView("Saving hours…") }
            if rejected {
                HStack {
                    Button("Retry save") { retryDraft() }
                    Button("Discard draft") { resetGestures() }
                }.buttonStyle(.bordered).frame(minHeight: 44)
            }
            if let message {
                Text(message).font(.callout).foregroundStyle(Spread.caution)
                    .accessibilityIdentifier("life-hours-message")
            }
        }
        .sheet(isPresented: $showCapacityField) {
            SpreadSheetStack {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Weekly planning hours").font(.title2.bold())
                    Text("Choose the hours you want to divide between your Life areas.")
                    capacityField
                    Button("Done") { showCapacityField = false }.frame(minHeight: 44)
                }.padding(20)
            }.presentationDetents([.medium])
        }
        .onChange(of: snapshot.weekKey) { _, _ in resetGestures() }
        .onChange(of: planner.state?.envelope.profileId) { _, _ in resetGestures() }
        .onChange(of: selectedRole) { _, role in
            if !rejected { budgetDraft = nil }
            lastAngle = nil; angleCredit = 0
            if role != nil { separated = true }
        }
        .onChange(of: planner.state?.revision) { _, value in
            if let originRevision, value != originRevision, !saving, !rejected { resetGestures() }
        }
        .onChange(of: context) { _, _ in resetGestures() }
        .onChange(of: scenePhase) { _, next in if next != .active { resetGestures() }; phaseTime = Date() }
        .onChange(of: contactActive) { _, active in
            if !active { DispatchQueue.main.async { if gestureContext != nil && !saving && !rejected { resetGestures() } } }
        }
        .onAppear {
            isVisible = true; phaseTime = Date()
            // A role chosen from its Life card opens Hours ready for adjustment.
            if selectedRole != nil { separated = true }
        }
        .onDisappear { isVisible = false; resetGestures() }
        .onReceive(clock) { now in advanceClock(now) }
        .accessibilityIdentifier("life-hours-page")
    }

    private var orbit: some View {
        GeometryReader { geo in
            let diameter = min(geo.size.width, typeSize.isAccessibilitySize ? 500.0 : 280.0)
            let radius = diameter * 0.315
            ZStack {
                ForEach(segments, id: \.id) { segment in
                    Circle()
                        .trim(from: segment.start, to: segment.end)
                        .stroke(Color(hex: segment.color),
                                style: StrokeStyle(lineWidth: selectedRole == segment.id && separated ? 24 : 18,
                                                   lineCap: .round))
                        .rotationEffect(.degrees(-90 + phase))
                        .frame(width: radius * 2, height: radius * 2)
                        .shadow(color: Color(hex: segment.color).opacity(0.70),
                                radius: selectedRole == segment.id ? 14 : 10)
                        .shadow(color: Color(hex: segment.color).opacity(0.28), radius: 4)

                        .animation(reduceMotion ? nil : SpreadTactile.settle, value: separated)
                        .animation(reduceMotion ? nil : SpreadTactile.snap, value: selectedRole)
                        .contentShape(Circle().trim(from: segment.start, to: segment.end).stroke(lineWidth: 44))
                        .onTapGesture {
                            separated = true; selectedRole = segment.id; selectionTick()
                        }
                        .accessibilityHidden(true)
                }
                Circle()
                    .stroke(Color.clear, lineWidth: 48)
                    .frame(width: radius * 2, height: radius * 2)
                    .contentShape(Circle().stroke(lineWidth: 48))
                    .gesture(DragGesture(minimumDistance: 6, coordinateSpace: .named("life-orbit"))
                        .updating($contactActive) { _, state, _ in state = true }
                        .onChanged { turnArc($0, diameter: diameter) }
                        .onEnded { _ in finishArc() })
                    .simultaneousGesture(SpatialTapGesture(coordinateSpace: .named("life-orbit")).onEnded { value in
                        let angle = (LifeOrbitMath.angle(x: Double(value.location.x), y: Double(value.location.y), center: Double(diameter / 2)) + 90 - phase + 720).truncatingRemainder(dividingBy: 360) / 360
                        if let segment = segments.first(where: { angle >= Double($0.start) && angle <= Double($0.end) }) {
                            selectedRole = segment.id; separated = true; selectionTick()
                        }
                    })
                    .accessibilityHidden(true)
                VStack(spacing: 4) {
                    Text(selectedRole == nil ? (capacity.map(SpreadHours.text) ?? "Set") : SpreadHours.text(selectedHours))
                        .font(.system(size: numberSize, weight: .bold, design: .rounded))
                        .monospacedDigit()

                    Text("hours").font(.caption)
                    if selectedRole == nil {
                        Text(available.map { SpreadHours.text($0) + " h left to assign" } ?? "Tap to set your budget")
                            .font(.caption).foregroundStyle(LifePalette.secondary)
                    }
                    if capacityDraft != nil { Text("Draft").font(.subheadline.weight(.semibold)) }
                    Text(selected?.name ?? "Weekly hours")
                        .font(.subheadline.weight(.medium))
                        .multilineTextAlignment(.center)
                }
                .frame(width: diameter * 0.54)
                .fixedSize(horizontal: false, vertical: true)
                .contentShape(Circle())
                .onTapGesture {
                    guard !saving, !rejected else { return }
                    if selectedRole != nil { selectedRole = nil; separated = false }
                    else {
                        capacityText = capacity.map(SpreadHours.text) ?? ""
                        showCapacityField = true
                    }
                    selectionTick()
                }
                .accessibilityElement(children: .ignore)
                .accessibilityIdentifier("life-capacity-number")
                .accessibilityLabel("Weekly planning hours")
                .accessibilityValue(capacity.map(SpreadHours.spoken) ?? "Not set")
                .accessibilityHint("Tap to type weekly planning hours. Select an area to adjust its hours.")
                .accessibilityAdjustableAction { direction in
                    if let capacity {
                        let change: Double = direction == .increment ? 1 : -1
                        commitCapacity(LifeOrbitMath.limit(capacity + change, minimum: min(storedAssigned, capacity), maximum: max(168, capacity)))
                    }
                }
            }
            .coordinateSpace(name: "life-orbit")
            .frame(width: diameter, height: diameter)
            .frame(maxWidth: .infinity)
        }
        .frame(height: typeSize.isAccessibilitySize ? max(390, numberSize * 5.5) : 280)
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
        ScrollView(.horizontal) {
            HStack(alignment: .top, spacing: 16) {
                ForEach(snapshot.roles) { role in
                    Button {
                        withAnimation(reduceMotion ? nil : SpreadTactile.snap) {
                            separated = true; selectedRole = role.id
                        }
                        selectionTick()
                    } label: {
                        VStack(spacing: 8) {
                            ZStack {
                                Circle().fill(Color(hex: role.color).opacity(0.12))
                                Circle().strokeBorder(Color(hex: role.color), lineWidth: selectedRole == role.id ? 4 : 2)
                                    .shadow(color: Color(hex: role.color).opacity(0.5), radius: 6)
                                Text(SpreadHours.text(selectedRole == role.id ? selectedHours : role.hours) + "h")
                                    .font(.headline).foregroundStyle(Spread.ink)
                            }.frame(width: 64, height: 64)
                            Text(role.name).font(.caption).lineLimit(2)
                        }.frame(width: 78)
                    }.buttonStyle(.spreadPress).disabled(saving || rejected)
                        .accessibilityLabel(role.name + ", " + SpreadHours.spoken(role.hours))
                        .accessibilityAddTraits(selectedRole == role.id ? .isSelected : [])
                        .accessibilityIdentifier("life-hours-role-\(role.id)")
                }
            }.padding(.vertical, 8)
        }.scrollIndicators(.hidden)
    }

    private func selectedControls(_ role: Responsibility) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(role.name).font(.title3.bold())
                Spacer()
                Text(SpreadHours.text(selectedHours) + " h").font(.title3.bold())
            }
            let controls = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(spacing: 12)) : AnyLayout(HStackLayout(spacing: 12))
            controls {
                Button { changeBudget(by: 0.5) } label: {
                    Label("Add ½h", systemImage: "arrow.counterclockwise")
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .keyboardShortcut(.leftArrow, modifiers: [.option])
                Button { changeBudget(by: -0.5) } label: {
                    Label("Return ½h", systemImage: "arrow.clockwise")
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .keyboardShortcut(.rightArrow, modifiers: [.option])
            }
            .buttonStyle(.bordered)
            if budgetDraft != nil { Text("Draft · release to save").font(.subheadline).foregroundStyle(LifePalette.secondary) }
            let reserved = snapshot.placedHours(for: role.id)
            Text("\(SpreadHours.text(reserved)) h placed on days · \(SpreadHours.text(max(0, selectedHours - reserved))) h available to place")
                .font(.callout).foregroundStyle(LifePalette.secondary)
        }
        .accessibilityElement(children: .contain)
        .accessibilityValue(SpreadHours.spoken(selectedHours))
        .accessibilityAdjustableAction { direction in changeBudget(by: direction == .increment ? 0.5 : -0.5) }
        .padding(16)
        .spreadCard(radius: 20)
        .accessibilityIdentifier("life-selected-hours-controls")
    }

    private var capacityField: some View {
        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(spacing: 8)) : AnyLayout(HStackLayout(spacing: 8))
        return layout {
            Button {
                if let capacity {
                    commitCapacity(LifeOrbitMath.limit(capacity - 1, minimum: storedAssigned, maximum: 168))
                }
            } label: { Image(systemName: "minus").frame(width: 44, height: 44) }
                .accessibilityLabel("Decrease weekly planning hours")
                .keyboardShortcut(.downArrow, modifiers: [.option])
                .disabled(saving || rejected || capacity == nil || capacity! <= min(storedAssigned, capacity!))
            TextField("Weekly hours", text: $capacityText)
                .keyboardType(.decimalPad)
                .submitLabel(.done)
                .accessibilityLabel("Total weekly planning hours")
                .accessibilityIdentifier("life-capacity-input")
                .multilineTextAlignment(.center)
            Button {
                if let capacity {
                    commitCapacity(LifeOrbitMath.limit(capacity + 1, minimum: storedAssigned, maximum: 168))
                }
            } label: { Image(systemName: "plus").frame(width: 44, height: 44) }
                .accessibilityLabel("Increase weekly planning hours")
                .keyboardShortcut(.upArrow, modifiers: [.option])
                .disabled(saving || rejected || capacity == nil || capacity! >= max(168, capacity!))
            Button("Set") {
                guard let entered = Double(capacityText.replacingOccurrences(of: ",", with: ".")),
                      entered >= storedAssigned, entered <= 168, (entered * 2).rounded() == entered * 2 else {
                    message = "Enter half-hour increments between \(SpreadHours.text(assigned)) and 168."
                    return
                }
                commitCapacity(entered)
            }
            .frame(minHeight: 44)
            .buttonStyle(.borderedProminent)
        }
        .disabled(saving || rejected)
    }

    private func selectionTick() {
        guard cueGate.tick(at: ProcessInfo.processInfo.systemUptime, enabled: touchFeedback) else { return }
        SpreadHaptics.selection()
    }
    private func warn(_ text: String) {
        message = text
        if cueGate.boundary(enabled: touchFeedback) { LifeFeedback.boundary() }
    }
    private func dragCapacity(_ value: DragGesture.Value) {
        guard !saving, !rejected, let capacity = snapshot.life?.capacityHours else { return }
        if capacityOrigin == nil {
            capacityOrigin = capacity; capacityDraft = capacity
            gestureStarted = value.time; holdLast = value.time
            holdCredit = 0; holdChanged = false; holding = true
            beginContext()
        }
        guard gestureContext == context else { resetGestures(); return }
        holdDistance = Double(-value.translation.height)
    }
    private func finishCapacity() {
        guard gestureContext == context else { resetGestures(); return }
        if !holdChanged, abs(holdDistance) > 17 { applyCapacityStep(holdDistance > 0 ? 1 : -1) }
        holding = false
        guard let value = capacityDraft, value != snapshot.life?.capacityHours else { resetGestures(); return }
        commitCapacity(value)
    }
    private func turnArc(_ value: DragGesture.Value, diameter: CGFloat) {
        guard !saving, !rejected, separated, let role = selected, let capacity = capacity,
              snapshot.life?.capacityHours != nil else { return }
        if gestureContext == nil {
            beginContext()
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
                let assignedElsewhere = storedAssigned - role.hours
                let minBudget = snapshot.placedHours(for: role.id)
                let maxBudget = max(current, max(minBudget, capacity - assignedElsewhere))
                let proposed = LifeOrbitMath.limit(current - Double(steps) * 0.5,
                                                   minimum: minBudget, maximum: maxBudget)
                if proposed == current {
                    warn(proposed <= minBudget ? "\(SpreadHours.text(minBudget)) h are already reserved. Return time from a day first." :
                            "All hours are assigned. Add weekly hours to assign more.")
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
        lastAngle = nil; angleCredit = 0
        guard sameContext, let roleId, let draft, draft != old else { resetGestures(); return }
        commitBudget(roleId, hours: draft)
    }
    private func changeBudget(by delta: Double) {
        guard !saving, !rejected, let role = selected, let capacity else { return }
        let reserved = snapshot.placedHours(for: role.id)
        let maxBudget = max(role.hours, max(reserved, capacity - (storedAssigned - role.hours)))
        let next = role.hours + delta
        guard next >= reserved && next <= maxBudget else {
            warn(delta < 0 ? "\(SpreadHours.text(reserved)) h are already reserved. Return time from a day first." : "All hours are assigned. Add weekly hours to assign more.")
            return
        }
        commitBudget(role.id, hours: next)
    }

    private func beginContext() {
        gestureContext = context
        originRevision = planner.state?.revision
        cueGate.reset(); SpreadHaptics.prepare()
    }
    private func advanceClock(_ now: Date) {
        let elapsed = max(0, min(0.1, now.timeIntervalSince(phaseTime)))
        phaseTime = now
        if isVisible && scenePhase == .active && !reduceMotion && !separated && !holding && !saving {
            // One complete orbit in 20 seconds, rather than a barely noticeable minute.
            phase = (phase + elapsed * LifeOrbitMath.orbitDegreesPerSecond).truncatingRemainder(dividingBy: 360)
        }
        guard holding, gestureContext == context else { return }
        let interval = max(0, now.timeIntervalSince(holdLast))
        holdLast = now
        guard now.timeIntervalSince(gestureStarted ?? now) >= 0.35, abs(holdDistance) > 12 else { return }
        holdCredit += LifeOrbitMath.holdCredit(distance: holdDistance, interval: min(interval, now.timeIntervalSince(gestureStarted ?? now) - 0.35))
        let steps = Int(holdCredit)
        if steps > 0 {
            holdCredit -= Double(steps)
            applyCapacityStep(Double(steps) * (holdDistance > 0 ? 1 : -1))
        }
    }
    private func applyCapacityStep(_ step: Double) {
        guard let current = capacityDraft ?? snapshot.life?.capacityHours else { return }
        let minimum = min(storedAssigned, current)
        let maximum = max(168, current)
        let proposed = LifeOrbitMath.limit(current + step, minimum: minimum, maximum: maximum)
        if proposed == current { warn("Capacity must stay between assigned hours and 168."); return }
        capacityDraft = proposed; holdChanged = true
        selectionTick()
    }
    private func retryDraft() {
        beginContext()
        if let value = capacityDraft { commitCapacity(value) }
        else if let role = selectedRole, let value = budgetDraft { commitBudget(role, hours: value) }
    }
    private func commitBudget(_ roleId: String, hours: Double) {
        guard !saving else { return }
        if gestureContext == nil { beginContext() }
        budgetDraft = hours
        save(["type": "setLifeBudget", "roleId": roleId, "hours": hours])
    }
    private func commitCapacity(_ hours: Double) {
        guard !saving else { return }
        if gestureContext == nil { beginContext() }
        capacityDraft = hours
        save(["type": "setLifeCapacity", "hours": hours])
    }
    private func save(_ command: [String: Any]) {
        guard gestureContext == context else { resetGestures(); return }
        let origin = context
        let revision = originRevision
        saving = true; rejected = false; message = nil
        Task {
            let ok = await planner.send(command, expectedRevision: revision)
            guard origin == context else { resetGestures(); return }
            saving = false
            if ok {
                showTips = false
                capacityText = capacityDraft.map(SpreadHours.text) ?? capacityText
                resetGestures()
                if touchFeedback { LifeFeedback.accepted() }
            } else {
                rejected = true; holding = false
                message = "Hours were not saved. Your draft is kept. Review the current plan, then retry or discard."
            }
        }
    }
    private func resetGestures(keepMessage: Bool = false) {
        capacityDraft = nil; budgetDraft = nil; capacityOrigin = nil
        lastAngle = nil; angleCredit = 0; gestureContext = nil; originRevision = nil
        gestureStarted = nil; cueGate.reset(); holding = false
        holdCredit = 0; holdDistance = 0; rejected = false; saving = false
        if !keepMessage { message = nil }
    }
}
#endif
