#if os(iOS)
import SwiftUI
import UIKit

public struct NativeProfile: Decodable, Identifiable {
    public let id: String
    public let name: String
}
struct LiveState: Decodable {
    let sessionId: String
    let revision: Int
    let envelope: NativeV2Envelope
}
struct LiveReply: Decodable {
    let ok: Bool
    let taskDetail: NativeTaskDetail?
    let error: String?
    let undoId: String?
    let requestId: String?
    let state: LiveState?
    let profiles: [NativeProfile]?
    let saveError: String?
    let recoveryNotice: String?
}

/// Read-only observable projection; all mutations are awaited intents to the React store.
@MainActor public final class LivePlanner: ObservableObject {
    @Published var state: LiveState?
    @Published var profiles: [NativeProfile] = []
    @Published var details: [String: NativeTaskContent] = [:]
    @Published var error: String?
    @Published var saveFailure: String?
    @Published var recoveryNotice: String?
    @Published var busy = false
    @Published var undoId: String?
    private let exchange: (String) async throws -> String
    private var tail: Task<Bool, Never>?
    public init(exchange: @escaping (String) async throws -> String) { self.exchange = exchange }
    var snapshot: PlannerSnapshot? { state?.envelope.snapshot }
    public func refresh() async {
        let previous = tail
        let task = Task { @MainActor in
            _ = await previous?.value
            do { _ = try await self.receive("null"); return true }
            catch { self.error = error.localizedDescription; return false }
        }
        tail = task
        _ = await task.value
    }
    private func receive(_ json: String, expectedRequestId: String? = nil) async throws -> LiveReply {
        let text = try await exchange(json)
        let reply = try JSONDecoder().decode(LiveReply.self, from: Data(text.utf8))
        if let expectedRequestId, reply.requestId != expectedRequestId { throw NSError(domain: "Spread", code: 4, userInfo: [NSLocalizedDescriptionKey: "Unmatched planner acknowledgement."]) }
        guard let value = reply.state, value.envelope.isSupported else {
            throw NSError(domain: "Spread", code: 1, userInfo: [NSLocalizedDescriptionKey: "Planner is still starting. Try again."])
        }
        if state?.sessionId != value.sessionId || state?.envelope.profileId != value.envelope.profileId || state?.envelope.snapshot.weekKey != value.envelope.snapshot.weekKey { details = [:]; undoId = nil }
        state = value
        profiles = reply.profiles ?? []
        if let detail = reply.taskDetail { details = [detail.taskId: detail.content] }
        recoveryNotice = reply.recoveryNotice
        saveFailure = reply.saveError
        if reply.saveError == "newer" { error = "This plan was saved by a newer Spread version. Update Spread before editing." }
        else if reply.saveError != nil { error = "Couldn’t save on this device. Retry saving or open Backup and restore before closing Spread." }
        else if !reply.ok {
            switch reply.error {
            case "stale-profile", "stale-week", "stale-revision", "stale-session": error = "Your plan changed. Review the current plan and try again."
            case "ineligible-day": error = "Place hours for this responsibility on that day first."
            case "save-failed", "save-unavailable": error = "Couldn’t save on this device. Retry saving or back up before closing Spread."
            default: error = "The change could not be completed. Your current plan is shown."
            }
        }
        return reply
    }
    @discardableResult func send(_ action: [String: Any], completionHaptic: Bool = false) async -> Bool {
        let previous = tail
        let originProfile = state?.envelope.profileId
        let originWeek = state?.envelope.snapshot.weekKey
        let task = Task { @MainActor in
            _ = await previous?.value
            guard let current = self.state, current.envelope.profileId == originProfile else { return false }
            if action["type"] as? String != "changeWeek", current.envelope.snapshot.weekKey != originWeek { self.error = "The week changed. Please choose the task again."; return false }
            self.busy = true
            defer { self.busy = false }
            do {
                let requestId = UUID().uuidString
                let request: [String: Any] = ["protocolVersion": 1, "sessionId": current.sessionId,
                    "requestId": requestId, "expectedProfileId": current.envelope.profileId,
                    "expectedWeek": current.envelope.snapshot.weekKey, "expectedRevision": current.revision, "action": action]
                let bytes = try JSONSerialization.data(withJSONObject: request)
                let json = String(decoding: bytes, as: UTF8.self)
                let reply: LiveReply
                do { reply = try await self.receive(json, expectedRequestId: requestId) }
                catch { reply = try await self.receive(json, expectedRequestId: requestId) } // Same correlation ID: safe after a lost ACK.
                guard reply.ok else { return false }
                if action["type"] as? String != "readTaskContent" { self.undoId = reply.undoId }
                if completionHaptic { UISelectionFeedbackGenerator().selectionChanged() }
                return true
            } catch { self.error = error.localizedDescription; return false }
        }
        tail = task
        return await task.value
    }
}

public struct SpreadLiveRoot: View {
    @ObservedObject var planner: LivePlanner
    let recovery: () -> Void
    @State private var destination = 0
    @State private var mode = SpreadLayout.stack
    @State private var selectedRole = ""
    @State private var editor: LiveSheet?
    @State private var showMonth = false
    @State private var selectedDate: String?
    @State private var allTrayTasks = Set<String>()
    @State private var dismissedRecovery: String?
    @Environment(\.scenePhase) private var scenePhase
    public init(planner: LivePlanner, recovery: @escaping () -> Void) { self.planner = planner; self.recovery = recovery }
    private var verificationWidth: CGFloat? {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if let index = args.firstIndex(of: "-SpreadViewportWidth"), args.indices.contains(index + 1), let width = Double(args[index + 1]), (320...1366).contains(width) { return CGFloat(width) }
        #endif
        return nil
    }
    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header
                if let notice = planner.recoveryNotice, dismissedRecovery != notice {
                    VStack(alignment: .leading, spacing: 8) {
                        Label(notice, systemImage: "exclamationmark.shield").foregroundStyle(Chalk.yellow)
                        HStack {
                            Button { recovery() } label: { Text("Backup and restore").frame(minHeight: 44).contentShape(Rectangle()) }
                            Button { dismissedRecovery = notice } label: { Text("Got it").frame(minWidth: 44, minHeight: 44).contentShape(Rectangle()) }
                        }
                    }.padding(12).background(Chalk.surface)
                }
                if let failure = planner.saveFailure {
                    VStack(alignment: .leading, spacing: 8) {
                        Label(failure == "newer" ? "Update Spread to edit this plan" : "Changes are not saved on this device", systemImage: "exclamationmark.triangle")
                            .font(.headline).foregroundStyle(Chalk.yellow)
                        HStack {
                            if failure != "newer" { Button("Retry saving") { Task { planner.error = nil; await planner.send(["type": "retrySave"]) } }.frame(minHeight: 44) }
                            Button("Back up") { recovery() }.frame(minHeight: 44)
                        }
                    }.padding(12).frame(maxWidth: .infinity, alignment: .leading).background(Chalk.surface)
                }
                if let snapshot = planner.snapshot {
                    HStack(spacing: 4) {
                        destinationButton("Week", value: 0)
                        destinationButton("Spread", value: 1)
                    }
                    .padding(4).background(Chalk.surface, in: RoundedRectangle(cornerRadius: 16))
                    .padding(.horizontal, 20).padding(.vertical, 8)
                    if snapshot.roles.isEmpty {
                        ContentUnavailableView {
                            Label("Make room for what matters", systemImage: "square.stack")
                        } description: { Text("Name a responsibility, give it hours, then place those hours in your week.") }
                        actions: { Button("Create responsibility") { editor = .newRole }.buttonStyle(.borderedProminent).frame(minHeight: 44) }
                    } else if destination == 1 {
                        SpreadLayoutsView(snapshot: snapshot, mode: $mode, selectedId: $selectedRole,
                            onManage: { editor = .role($0) }, onTask: { editor = .task($0) },
                            onToggle: { task in Task { await planner.send(["type": "toggleTask", "roleId": task.roleId, "taskId": task.id], completionHaptic: !task.done) } })
                    } else {
                        week(snapshot)
                    }
                    if let undo = planner.undoId {
                        Button("Undo last change") { Task { await planner.send(["type": "undo", "editId": undo]) } }
                            .frame(minHeight: 44).frame(maxWidth: .infinity).background(Chalk.surface)
                    }
                } else {
                    ProgressView("Opening your plan…").frame(maxWidth: .infinity, maxHeight: .infinity)
                    Button("Try again") { Task { await planner.refresh() } }.frame(minHeight: 44)
                    Button("Open existing planner") { recovery() }.frame(minHeight: 44)
                }
            }
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier("native-content")
            .background(Chalk.canvas).foregroundStyle(Chalk.ink)
            .toolbar(.hidden, for: .navigationBar)
            .sheet(item: $editor) { sheet in
                LiveEditor(planner: planner, sheet: sheet)
            }
            .alert("Spread", isPresented: Binding(get: { planner.error != nil }, set: { if !$0 { planner.error = nil } })) {
                Button("OK") { planner.error = nil }
                Button("Retry saving") { Task { planner.error = nil; await planner.send(["type": "retrySave"]) } }
                Button("Backup and restore") { recovery() }
            } message: { Text(planner.error ?? "") }
        }
        .frame(width: verificationWidth)
        .tint(Chalk.yellow).preferredColorScheme(.dark)
        .task { await planner.refresh() }
        .onChange(of: scenePhase) { _, phase in if phase == .active { Task { await planner.refresh() } } }
        .onChange(of: planner.snapshot?.roles.count) { _, _ in
            if let editor, case .newRole = editor { destination = 1; selectedRole = planner.snapshot?.roles.last?.id ?? "" }
        }
        .onChange(of: planner.state?.envelope.profileId) { _, _ in selectedRole = ""; editor = nil; planner.undoId = nil }
    }
    private func destinationButton(_ title: String, value: Int) -> some View {
        Button { destination = value } label: {
            Text(title).font(.headline).frame(maxWidth: .infinity, minHeight: 44)
                .foregroundStyle(destination == value ? Chalk.canvas : Chalk.ink)
                .background(destination == value ? Chalk.yellow : Color.clear, in: RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(value == 0 ? "native-week" : "native-spread")
        .accessibilityAddTraits(destination == value ? .isSelected : [])
    }
    private var header: some View {
        VStack(spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Spread").font(.system(.largeTitle, design: .serif).weight(.semibold))
                    if let profile = planner.profiles.first(where: { $0.id == planner.state?.envelope.profileId }) { Text(profile.name).font(.caption).foregroundStyle(Chalk.secondary).lineLimit(1) }
                }
                Spacer()
                Button { Task { await planner.send(["type": "changeWeek", "direction": "today"]) } } label: { Text("Today").frame(minWidth: 44, minHeight: 44).contentShape(Rectangle()) }
                Menu {
                    Button("New responsibility") { editor = .newRole }
                    Button("Profiles") { editor = .profiles }
                    Button("Backup and restore") { recovery() }
                } label: { Image(systemName: "ellipsis.circle").frame(width: 44, height: 44) }
                .accessibilityLabel("More")
            }
            if let key = planner.snapshot?.weekKey {
                WeekCrownView(title: "Your week", detail: PlannerDates.weekRange(base: key, offset: 0),
                    onMove: { delta in Task { for _ in 0..<abs(delta) { await planner.send(["type": "changeWeek", "direction": delta > 0 ? 1 : -1], completionHaptic: true) } } },
                    onToday: { Task { await planner.send(["type": "changeWeek", "direction": "today"]) } })
            }
        }.padding(.horizontal, 20).padding(.top, 8)
    }
    private func week(_ snapshot: PlannerSnapshot) -> some View {
        ScrollViewReader { proxy in
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Your week").font(.title2.bold())
                    Spacer()
                    Button { showMonth.toggle() } label: { Text(showMonth ? "Week" : "Month").frame(minWidth: 44, minHeight: 44).contentShape(Rectangle()) }.buttonStyle(.plain)
                }
                if showMonth { month(snapshot) }
                else {
                    if snapshot.allocations.isEmpty && snapshot.tasks.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Start with what matters").font(.headline)
                            Text("Choose a responsibility, set its hours, then place those hours on a day.").foregroundStyle(Chalk.secondary)
                            Button("Plan responsibilities") { destination = 1 }.buttonStyle(.borderedProminent).frame(minHeight: 44)
                        }.padding(16)
                    }
                    if !snapshot.unplacedTasks.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Label("To place", systemImage: "tray").font(.headline)
                            ForEach(snapshot.roles) { role in
                                let tasks = snapshot.unplacedTasks.filter { $0.roleId == role.id }
                                if !tasks.isEmpty {
                                    DisclosureGroup("\(role.name) · \(tasks.count) tasks") {
                                        ForEach(allTrayTasks.contains(role.id) ? tasks : Array(tasks.prefix(6))) { task in taskRow(task) }
                                        if tasks.count > 6 && !allTrayTasks.contains(role.id) { Button("Show \(tasks.count - 6) more") { allTrayTasks.insert(role.id) }.frame(minHeight: 44) }
                                    }.frame(minHeight: 44)
                                }
                            }
                        }.padding(16).overlay(RoundedRectangle(cornerRadius: 22).stroke(style: StrokeStyle(lineWidth: 1, dash: [6, 5])))
                    }
                    ForEach(0..<7, id: \.self) { index in
                        let iso = PlannerDates.dayISO(weekKey: snapshot.weekKey, index: index)
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("\(PlannerDates.weekday(weekKey: snapshot.weekKey, index: index)) \(PlannerDates.dayNumber(weekKey: snapshot.weekKey, index: index))").font(.headline)
                                if selectedDate == iso { Text("Selected").font(.caption).foregroundStyle(Chalk.yellow) }
                            }
                            let allocations = snapshot.allocations.filter { $0.day == iso }.sorted { $0.order < $1.order }
                            if allocations.isEmpty { Text("Nothing planned").foregroundStyle(Chalk.secondary) }
                            ForEach(allocations) { allocation in
                                if let role = snapshot.roles.first(where: { $0.id == allocation.roleId }) {
                                    Button { editor = .role(role) } label: {
                                        HStack { Text(role.name); Spacer(); Text("\(allocation.hours.formatted())h") }.frame(minHeight: 44)
                                    }
                                    ForEach(snapshot.tasks.filter { $0.allocationId == allocation.id }) { task in taskRow(task) }
                                }
                            }
                        }.padding(16).frame(maxWidth: .infinity, alignment: .leading).background(Chalk.surface, in: RoundedRectangle(cornerRadius: 22)).id(iso)
                    }
                    Button("Review unfinished work") { editor = .review }.frame(minHeight: 44)
                }
            }.padding(20).frame(maxWidth: 760)
                .frame(maxWidth: .infinity)
        }
        .onChange(of: selectedDate) { _, date in
            if let date { proxy.scrollTo(date, anchor: .top) }
        }
        }
    }
    private func taskRow(_ task: PlannerTask) -> some View {
        HStack(alignment: .top, spacing: 4) {
            Button { Task { await planner.send(["type": "toggleTask", "roleId": task.roleId, "taskId": task.id], completionHaptic: !task.done) } } label: {
                Image(systemName: task.done ? "checkmark.circle.fill" : "circle").frame(width: 44, height: 44)
            }.accessibilityLabel(task.done ? "Reopen \(task.text)" : "Complete \(task.text)")
            Button { editor = .task(task) } label: { Text(task.text).strikethrough(task.done).frame(maxWidth: .infinity, minHeight: 44, alignment: .leading).multilineTextAlignment(.leading) }
            Button { editor = .move(task) } label: { Text(task.allocationId == nil ? "Place" : "Move").frame(minWidth: 44, minHeight: 44).contentShape(Rectangle()) }
        }
    }
    private func month(_ snapshot: PlannerSnapshot) -> some View {
        let date = PlannerDates.date(snapshot.weekKey)
        let calendar = PlannerDates.calendar
        let start = calendar.date(from: calendar.dateComponents([.year, .month], from: date)) ?? date
        return VStack(spacing: 8) {
            Text(PlannerDates.label(start, pattern: "MMMM yyyy")).font(.headline)
            HStack(spacing: 0) {
                ForEach(0..<7, id: \.self) { index in
                    Text(["M", "T", "W", "T", "F", "S", "S"][index])
                        .font(.caption).frame(maxWidth: .infinity).accessibilityHidden(true)
                }
            }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 7), spacing: 4) {
                ForEach(PlannerDates.monthCells(weekKey: snapshot.weekKey)) { cell in
                    if let day = cell.day, let selected = cell.date {
                        Button {
                            Task { if await planner.send(["type": "openWeek", "weekKey": PlannerDates.weekKey(for: selected)]) { selectedDate = PlannerDates.formatter.string(from: selected); showMonth = false } }
                        } label: {
                            Text(String(day)).font(.body).lineLimit(1).minimumScaleFactor(0.7)
                                .frame(maxWidth: .infinity, minHeight: 44).contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(PlannerDates.label(selected, pattern: "EEEE MMMM d yyyy"))
                        .accessibilityIdentifier("month-day-" + PlannerDates.formatter.string(from: selected))
                    } else { Color.clear.frame(height: 44).accessibilityHidden(true) }
                }
            }
        }
    }
}

enum LiveSheet: Identifiable {
    case newRole, role(Responsibility), newTask(String), task(PlannerTask), move(PlannerTask), review, profiles
    var id: String {
        switch self { case .newRole: return "newRole"; case .role(let r): return "role-" + r.id
        case .newTask(let r): return "newTask-" + r; case .task(let t): return "task-" + t.id
        case .move(let t): return "move-" + t.id; case .review: return "review"; case .profiles: return "profiles" }
    }
}

struct LiveEditor: View {
    @ObservedObject var planner: LivePlanner
    let sheet: LiveSheet
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var hours = 1.0
    @State private var allocationHours = 0.5
    @State private var category = "custom"
    @State private var day = ""
    @State private var selected = Set<String>()
    @State private var addingTask = false
    @State private var taskText = ""
    @State private var confirmDelete = false
    var body: some View {
        NavigationStack {
            Form { content }
                .navigationTitle(title)
                .alert("Couldn’t complete the change", isPresented: Binding(get: { planner.error != nil }, set: { if !$0 { planner.error = nil } })) { Button("OK") { planner.error = nil } } message: { Text(planner.error ?? "") }
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } } }
                .onAppear {
                    day = planner.snapshot?.weekKey ?? ""
                    switch sheet {
                    case .role(let r): name = r.name; hours = r.hours
                    case .task(let t): name = t.text
                    default: break
                    }
                }
                .confirmationDialog("Delete this responsibility and its tasks from all weeks?", isPresented: $confirmDelete, titleVisibility: .visible) {
                    if case .role(let role) = sheet { Button("Delete responsibility", role: .destructive) { submit(["type": "removeRole", "roleId": role.id]) } }
                }
        }.tint(Chalk.yellow).preferredColorScheme(.dark)
    }
    private var title: String {
        switch sheet { case .newRole: return "New responsibility"; case .role: return "Responsibility"
        case .newTask, .task: return "Task"; case .move: return "Place task"; case .review: return "Unfinished work"; case .profiles: return "Profiles" }
    }
    @ViewBuilder private var content: some View {
        switch sheet {
        case .newRole:
            TextField("Name", text: $name)
            Picker("Illustration", selection: $category) { ForEach(ChalkArtwork.categories, id: \.self) { Text($0.capitalized).tag($0) } }
            hourControl
            Button("Create responsibility") { submit(["type": "addRole", "name": name, "hours": hours, "category": category]) }.disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || planner.busy)
        case .role(let role):
            ChalkIllustration(category: role.category).frame(height: 100).frame(maxWidth: .infinity)
            Section("Responsibility") {
                TextField("Name", text: $name)
                Button("Save name") { submit(["type": "renameRole", "roleId": role.id, "name": name], close: false) }.disabled(name.isEmpty)
                hourControl
                Button("Save hours") { submit(["type": "setHours", "roleId": role.id, "hours": hours], close: false) }
            }
            Section("Place hours") {
                Text("\(planner.snapshot?.remainingHours(for: role.id).formatted() ?? "0")h left in this week’s bank")
                dayPicker
                Stepper("Place \(allocationHours.formatted())h", value: $allocationHours, in: 0.5...168, step: 0.5)
                Button("Place \(allocationHours.formatted())h") { submit(["type": "allocate", "roleId": role.id, "day": day, "hours": allocationHours], close: false) }
                    .disabled((planner.snapshot?.remainingHours(for: role.id) ?? 0) < allocationHours)
            }
            Section("Placed hours") {
                ForEach(planner.snapshot?.allocations.filter { $0.roleId == role.id } ?? []) { item in
                    Stepper("\(item.day) · \(item.hours.formatted())h", value: Binding(get: { item.hours }, set: { submit(["type": "allocationHours", "allocationId": item.id, "hours": $0], close: false) }), in: 0...168, step: 0.5)
                    Button("Remove hours from \(item.day)", role: .destructive) { submit(["type": "removeAllocation", "allocationId": item.id], close: false) }
                }
            }
            Section("Tasks") {
                TextField("New task", text: $taskText)
                Button("Add task") { let text = taskText; Task { if await planner.send(["type": "addTask", "roleId": role.id, "text": text]) { taskText = "" } } }.disabled(taskText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || planner.busy)
                ForEach(planner.snapshot?.tasks(for: role.id) ?? []) { task in
                    NavigationLink(task.text) { LiveEditor(planner: planner, sheet: .task(task)) }
                }
            }
            Button("Delete responsibility", role: .destructive) { confirmDelete = true }
        case .newTask(let role):
            TextField("Task", text: $name)
            Button("Add task") { submit(["type": "addTask", "roleId": role, "text": name]) }.disabled(name.isEmpty)
        case .task(let task):
            TextField("Task", text: $name, axis: .vertical)
            Button("Save task") { submit(["type": "editTask", "roleId": task.roleId, "taskId": task.id, "text": name]) }.disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            NavigationLink("Notes and attachments") { NativeTaskContentEditor(planner: planner, task: task) }
            NavigationLink("Place or move") { LiveEditor(planner: planner, sheet: .move(task)) }
            Button(task.done ? "Reopen task" : "Complete task") { submit(["type": "toggleTask", "roleId": task.roleId, "taskId": task.id]) }
            Button("Delete task", role: .destructive) { submit(["type": "deleteTask", "roleId": task.roleId, "taskId": task.id]) }
        case .move(let task):
            Text(task.text)
            let eligible = planner.snapshot?.eligibleAllocations(for: task) ?? []
            if eligible.isEmpty { Text(task.done ? "Reopen this task before moving it." : "Place hours for this responsibility on a day first.") }
            ForEach(eligible) { allocation in
                Button("\(allocation.day) · \(allocation.hours.formatted())h") { submit(["type": "assignTask", "roleId": task.roleId, "taskId": task.id, "allocationId": allocation.id]) }.frame(minHeight: 44).accessibilityIdentifier("eligible-day-\(allocation.id)")
            }
            if task.allocationId != nil { Button("Take off this day") { submit(["type": "assignTask", "roleId": task.roleId, "taskId": task.id, "allocationId": NSNull()]) } }
        case .review:
            let open = planner.snapshot?.tasks.filter { !$0.done } ?? []
            if open.isEmpty { Text("No unfinished work this week.") }
            ForEach(open) { task in
                Toggle(task.text, isOn: Binding(get: { selected.contains(task.id) }, set: { if $0 { selected.insert(task.id) } else { selected.remove(task.id) } }))
            }
            Button("Move selected to next week") {
                let picks = open.filter { selected.contains($0.id) }.map { ["roleId": $0.roleId, "taskId": $0.id] }
                submit(["type": "carryOver", "picks": picks])
            }.disabled(selected.isEmpty)
        case .profiles:
            ForEach(planner.profiles) { profile in
                Button { submit(["type": "switchProfile", "profileId": profile.id]) } label: {
                    HStack { Text(profile.name); Spacer(); if profile.id == planner.state?.envelope.profileId { Image(systemName: "checkmark") } }
                }.frame(minHeight: 44)
            }
            TextField("New profile name", text: $name)
            Button("Create profile") { submit(["type": "addProfile", "name": name]) }.disabled(name.isEmpty || planner.profiles.count >= 10)
        }
    }
    private var hourControl: some View { Stepper("\(hours.formatted()) hours", value: $hours, in: 0...168, step: 0.5) }
    private var dayPicker: some View {
        Picker("Day", selection: $day) {
            ForEach(0..<7, id: \.self) { i in
                let iso = PlannerDates.dayISO(weekKey: planner.snapshot?.weekKey ?? "", index: i)
                Text(PlannerDates.label(PlannerDates.date(iso), pattern: "EEEE")).tag(iso)
            }
        }
    }
    private func submit(_ action: [String: Any], close: Bool = true) {
        Task { if await planner.send(action), close { dismiss() } }
    }
}
#endif
