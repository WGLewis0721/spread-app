#if os(iOS)
import SwiftUI
import UIKit

// Controls the sheets share: the hour stepper, the colour and symbol panel, and the task rows.

/// `DayHours`: a minus button, the hours, and a plus button. A day's allocation steps by one hour, as the original
/// planner did; a responsibility's weekly hours step by half an hour (`step: 0.5`), which the store's half-hour
/// rule has always allowed and the earlier native editor offered.
struct HourStepper: View {
    let value: Double
    let label: String
    var step: Double = 1
    var revision: Int? = nil
    var context: String = ""
    var onScrub: ((Double, Int?) async -> Bool)? = nil
    let onChange: (Double) -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @GestureState private var contact = false
    @State private var origin: Double?
    @State private var originRevision: Int?
    @State private var originContext = ""
    @State private var draft: Double?
    @State private var saving = false
    @State private var gate = TactileCueGate()
    @State private var numericOpen = false
    @State private var numericText = ""

    private var displayed: Double { draft ?? value }

    var body: some View {
        HStack(spacing: 0) {
            Button { adjust(-step) } label: {
                SpreadIcon(name: "lucide-minus", size: 18).font(.system(.footnote, weight: .semibold)).frame(width: 44, height: 44).contentShape(Rectangle())
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel("Decrease \(label)\(step < 1 ? " by half an hour" : "")")
            Button {
                guard origin == nil else { return }
                numericText = SpreadHours.text(value); numericOpen = true
            } label: {
                Text("\(SpreadHours.text(displayed))h")
                    .font(.system(.subheadline, weight: .semibold)).monospacedDigit()
                    .frame(minWidth: 44, minHeight: 44).contentShape(Rectangle())
                    .opacity(saving ? 0.6 : 1)
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel("\(label), \(SpreadHours.spoken(displayed))")
            .accessibilityValue(draft == nil ? "Saved" : saving ? "Saving" : "Draft")
            .accessibilityHint("Enter hours, or drag horizontally to adjust")
            .accessibilityAdjustableAction { adjust($0 == .increment ? step : -step) }
            .simultaneousGesture(scrub, including: onScrub == nil ? .none : .all)
            Button { adjust(step) } label: {
                SpreadIcon(name: "icon-add", size: 19).font(.system(.footnote, weight: .semibold)).frame(width: 44, height: 44).contentShape(Rectangle())
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel("Increase \(label)\(step < 1 ? " by half an hour" : "")")
        }
        .disabled(saving)
        .onChange(of: contact) { _, active in
            if !active { DispatchQueue.main.async { if !saving { cancel() } } }
        }
        .onChange(of: context) { _, _ in cancel() }
        .onChange(of: scenePhase) { _, phase in if phase != .active { cancel() } }
        .onDisappear { cancel() }
        .alert("Set \(label)", isPresented: $numericOpen) {
            TextField("Hours", text: $numericText).keyboardType(.decimalPad)
            Button("Set") {
                if let hours = Double(numericText.replacingOccurrences(of: ",", with: ".")),
                   hours.isFinite, hours >= 0, hours <= 168, hours * 2 == (hours * 2).rounded() {
                    if hours != value { onChange(hours) }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: { Text("Enter 0–168 hours in half-hour increments. Planner limits still apply.") }
    }

    private func adjust(_ delta: Double) {
        guard !saving else { return }
        let next = SpreadHours.clamp(value + delta)
        guard next != value else { SpreadHaptics.destructivePrompt(); return }
        onChange(next)
    }
    private var scrub: some Gesture {
        DragGesture(minimumDistance: 12, coordinateSpace: .global)
            .updating($contact) { _, active, _ in active = true }
            .onChanged { change in
                guard !saving, abs(change.translation.width) > abs(change.translation.height) * 1.5 else { return }
                if origin == nil {
                    origin = value; originRevision = revision; originContext = context
                    gate.reset(); SpreadHaptics.prepare()
                }
                guard let origin, originContext == context else { cancel(); return }
                let next = TactilePrecisionMath.hours(origin: origin, translation: Double(change.translation.width), step: step)
                if next != displayed, gate.tick(at: ProcessInfo.processInfo.systemUptime) { SpreadHaptics.selection() }
                if next == displayed, (next == 0 || next == 168), gate.boundary() { SpreadHaptics.destructivePrompt() }
                // No implicit animation while tracking the finger.
                var transaction = Transaction(); transaction.disablesAnimations = true
                withTransaction(transaction) { draft = next }
            }
            .onEnded { _ in
                guard let draft, let origin, draft != origin, let onScrub, originContext == context else { cancel(); return }
                let expected = originRevision, expectedContext = context
                saving = true
                Task {
                    _ = await onScrub(draft, expected)
                    guard context == expectedContext else { return }
                    // The snapshot or the existing planner error explains the outcome.
                    withAnimation(reduceMotion ? nil : SpreadTactile.settle) { cancel() }
                }
            }
    }
    private func cancel() {
        origin = nil; draft = nil; originRevision = nil; saving = false; gate.reset()
    }
}

/// Wraps chips onto new lines, for the Free time suggestion row.
struct FlowRow<Content: View>: View {
    var spacing: CGFloat = 8
    @ViewBuilder let content: () -> Content

    var body: some View {
        FlowLayout(spacing: spacing) { content() }
    }
}

/// A minimal wrapping layout (iOS 16+ `Layout`), so chips never clip at 390 pt or at accessibility sizes.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0, width: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
            width = max(width, x)
        }
        return CGSize(width: min(width, maxWidth), height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
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
                        Task { await planner.send(["type": "setRoleColor", "roleId": role.id, "color": color], completionHaptic: false) }
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
                        Task { await planner.send(["type": "setRoleCategory", "roleId": role.id, "category": item.id], completionHaptic: false) }
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
    @State private var pending = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var dayISO: String? {
        guard let allocationId = task.allocationId else { return nil }
        return snapshot.allocations.first { $0.id == allocationId }?.day
    }
    private var isToday: Bool { dayISO == PlannerDates.localISO() }

    var body: some View {
        HStack(spacing: 0) {
            Button {
                guard !pending else { return }
                pending = true
                Task {
                    _ = await planner.send(["type": "toggleTask", "roleId": roleId, "taskId": task.id], completionHaptic: !task.done)
                    pending = false
                }
            } label: {
                SpreadIcon(name: task.done ? "lucide-circle-check" : "lucide-circle", size: 22)
                    .font(.system(.title2, weight: .regular))
                    .foregroundStyle(task.done ? Spread.accent : Spread.tertiary)
                    .frame(width: 56, height: 56)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.spreadPress)
            .disabled(pending)
            .opacity(pending ? 0.6 : 1)
            .accessibilityValue(pending ? "Saving" : task.done ? "Completed" : "Incomplete")
            .accessibilityLabel(task.done ? "Mark not done: \(task.text)" : "Mark done: \(task.text)")
            .accessibilityAddTraits(task.done ? .isSelected : [])
            .accessibilityIdentifier("task-check-\(task.id)")

            Button(action: onOpen) {
                HStack(spacing: 8) {
                    if task.important == true { TaskPriorityMark() }
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
                    SpreadIcon(name: "lucide-chevron-right", size: 16).font(.system(.footnote)).foregroundStyle(Spread.tertiary)
                }
                .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel((task.important == true ? "High priority, " : "") + (task.text.isEmpty ? "Untitled task" : task.text))
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
        .animation(reduceMotion ? nil : SpreadTactile.snap, value: task.done)
        .overlay(alignment: .top) { Rectangle().fill(Spread.line).frame(height: 0.5).padding(.leading, 56) }
    }
}

/// The add-a-task line (`AddTaskRow`). Return adds the text and clears the field.
struct AddTaskRow: View {
    let placeholder: String
    let onAdd: (String) async -> Bool
    @Environment(\.dynamicTypeSize) private var typeSize
    @AppStorage private var text: String
    @State private var submitting = false

    init(placeholder: String, draftKey: String, onAdd: @escaping (String) async -> Bool) {
        self.placeholder = placeholder
        self.onAdd = onAdd
        _text = AppStorage(wrappedValue: "", draftKey)
    }

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
            SpreadIcon(name: "icon-add", size: 20).font(.system(.body, weight: .regular)).foregroundStyle(Spread.accent)
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
        guard !value.isEmpty, !submitting else { return }
        submitting = true
        Task {
            let saved = await onAdd(value)
            // Preserve a newer draft typed while the store was acknowledging this one.
            if saved && text.trimmingCharacters(in: .whitespacesAndNewlines) == value { text = "" }
            submitting = false
        }
    }
}
#endif
