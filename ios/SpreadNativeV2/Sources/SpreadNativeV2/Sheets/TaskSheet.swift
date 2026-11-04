#if os(iOS)
import SwiftUI
import PhotosUI
import UIKit

// MARK: Rich task content (wire shape of `TaskContent` in src/lib/spread/model.ts)

struct NativeOutlineItem: Codable, Identifiable, Equatable {
    var id: String
    var text: String
    var level: Double
}

struct NativeContentBlock: Codable, Identifiable, Equatable {
    var id = UUID().uuidString
    var type: String
    var text: String?
    var items: [NativeOutlineItem]?
    var cells: [[String]]?
    var src: String?
}

struct NativeTaskContent: Codable, Equatable {
    var blocks: [NativeContentBlock] = []
}

struct NativeTaskDetail: Decodable {
    let taskId: String
    let content: NativeTaskContent
}

/// The four content kinds the native editor can write. Any other kind is shown read-only and never re-sent,
/// so a newer or unknown block is preserved in the store rather than downgraded here.
private let editableKinds: Set<String> = ["notes", "outline", "table", "photo"]

/// The task sheet (`TaskSheet` in task-sheet.tsx): the title, the rich blocks (Notes, Outline, Table, Photo) with
/// their remove controls, the Add menu of formats, and Delete. Content is read with `readTaskContent` and saved with
/// `setTaskContent` after each change; the store's acknowledgement is what the sheet shows.
struct TaskSheet: View {
    @ObservedObject var planner: LivePlanner
    let roleId: String
    let taskId: String

    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var title = ""
    @State private var content = NativeTaskContent()
    @State private var loaded = false
    @State private var expandedNote: String?
    @State private var showFormats = false
    @State private var saveTask: Task<Void, Never>?
    @State private var photoPick: PhotosPickerItem?
    @State private var confirmDelete = false

    private var task: PlannerTask? { planner.snapshot?.tasks.first { $0.id == taskId } }
    private var supported: Bool { content.blocks.allSatisfy { editableKinds.contains($0.type) } }

    var body: some View {
        SpreadSheetStack {
            Group {
                if let task {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            taskHeader(task)
                            TextField("Task title", text: $title, prompt: Spread.fieldPrompt("Task title"), axis: .vertical)
                                .font(.system(.title2, weight: .bold))
                                .padding(.vertical, 10)
                                .frame(minHeight: 52)
                                .lineLimit(1...4)
                                .submitLabel(.done)
                                .onSubmit { commitTitle() }
                                .accessibilityLabel("Task title")
                                .accessibilityIdentifier("task-editor")
                            if !loaded {
                                ProgressView("Opening task content…")
                            } else if !supported {
                                Text("This content requires a newer version of Spread. It will be preserved.")
                                    .font(Spread.footnote).foregroundStyle(Spread.secondary)
                            } else if let note = expandedNote, let block = content.blocks.first(where: { $0.id == note }) {
                                expandedNotes(block)
                            } else {
                                ForEach(content.blocks) { block in
                                    blockSection(block)
                                }
                                formatMenu
                            }
                            if expandedNote == nil {
                                Button(role: .destructive) { confirmDelete = true } label: {
                                    HStack(spacing: 8) {
                                        SpreadIcon(name: "icon-trash", size: 22, original: true)
                                        Text("Delete task").font(.system(.subheadline, weight: .semibold))
                                    }
                                    .frame(maxWidth: .infinity, minHeight: 48)
                                }
                                .accessibilityIdentifier("delete-task")
                                .padding(.top, 8)
                            }
                        }
                        .padding(20)
                    }
                    .scrollDismissesKeyboard(.interactively)
                    .onAppear { title = task.text }
                    .onChange(of: task.text) { _, value in if title != value { title = value } }
                } else {
                    ContentUnavailableView("This task is no longer in the plan.", systemImage: "checkmark.circle")
                }
            }
            .navigationTitle("Task")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button { finishEditing() } label: { Text("Done").tapTarget() }
                        .accessibilityIdentifier("task-sheet-done")
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .task { await load() }
        .onChange(of: planner.details[taskId]) { _, value in
            if let value, !loaded { content = value; loaded = true }
        }
        .onChange(of: photoPick) { _, item in
            guard let item else { return }
            Task { await addPhoto(item) }
        }
        .confirmationDialog("Delete this task?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete task", role: .destructive) {
                Task {
                    if await planner.send(["type": "deleteTask", "roleId": roleId, "taskId": taskId]) { dismiss() }
                }
            }
        }
    }

    // MARK: Header

    /// Whose task this is, where it sits this week, and a one-tap completion. The same store command as the
    /// checkbox in the list, so the haptic is felt only after the store has acknowledged it.
    @ViewBuilder private func taskHeader(_ task: PlannerTask) -> some View {
        if let role = planner.snapshot?.roles.first(where: { $0.id == roleId }) {
            HStack(spacing: 12) {
                RoleBadge(category: role.category == "custom" ? nil : role.category, color: role.color, size: 44)
                VStack(alignment: .leading, spacing: 2) {
                    Text(role.name).font(.system(.headline, weight: .semibold)).fixedSize(horizontal: false, vertical: true)
                    Text(placementText(task)).font(.system(.footnote)).foregroundStyle(Spread.secondary).fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 8)
                Button {
                    Task { await planner.send(["type": "toggleTask", "roleId": roleId, "taskId": taskId], completionHaptic: !task.done) }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: task.done ? "checkmark.circle.fill" : "circle")
                        if !typeSize.isAccessibilitySize { Text(task.done ? "Done" : "Mark done") }
                    }
                    .font(.system(.subheadline, weight: .semibold))
                    .foregroundStyle(task.done ? Spread.onAccent : Spread.accent)
                    .padding(.horizontal, 14).frame(minHeight: 44)
                    .spreadChip(selected: task.done)
                }
                .buttonStyle(.spreadPress)
                .accessibilityLabel(task.done ? "Mark not done" : "Mark done")
                .accessibilityIdentifier("task-sheet-complete")
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .spreadCard(edge: Color(hex: role.color))
        }
    }

    private func placementText(_ task: PlannerTask) -> String {
        guard let allocationId = task.allocationId,
              let allocation = planner.snapshot?.allocations.first(where: { $0.id == allocationId }) else {
            return "Not placed on a day"
        }
        return PlannerDates.label(PlannerDates.date(allocation.day), pattern: "EEEE, MMM d") + " · " + SpreadHours.text(allocation.hours) + "h for this responsibility"
    }

    // MARK: Loading and saving

    private func load() async {
        if await planner.send(["type": "readTaskContent", "roleId": roleId, "taskId": taskId]), let value = planner.details[taskId] {
            content = value
            loaded = true
        }
    }

    /// Save the whole block list after a short pause. The store is the only writer; the sheet never keeps a second copy.
    private func scheduleSave() {
        guard loaded, supported else { return }
        saveTask?.cancel()
        let snapshot = content
        saveTask = Task {
            try? await Task.sleep(nanoseconds: 450_000_000)
            guard !Task.isCancelled else { return }
            let encoded = try? JSONEncoder().encode(snapshot)
            guard let encoded, let object = try? JSONSerialization.jsonObject(with: encoded) else { return }
            _ = await planner.send(["type": "setTaskContent", "roleId": roleId, "taskId": taskId, "content": object])
        }
    }

    /// Done flushes the pending debounced block edit before dismissal. A quick Done/relaunch cannot
    /// drop the last keystroke, and failed saves keep the sheet open with its original draft.
    private func finishEditing() {
        saveTask?.cancel()
        let draft = content
        let newTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        Task {
            if loaded && supported {
                guard let bytes = try? JSONEncoder().encode(draft),
                      let object = try? JSONSerialization.jsonObject(with: bytes),
                      await planner.send(["type": "setTaskContent", "roleId": roleId, "taskId": taskId, "content": object]) else { return }
            }
            if !newTitle.isEmpty, newTitle != task?.text {
                guard await planner.send(["type": "editTask", "roleId": roleId, "taskId": taskId, "text": newTitle]) else { return }
            }
            dismiss()
        }
    }

    private func commitTitle() {
        let value = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty, value != task?.text else { return }
        Task { await planner.send(["type": "editTask", "roleId": roleId, "taskId": taskId, "text": value]) }
    }

    private func update(_ block: NativeContentBlock) {
        guard let index = content.blocks.firstIndex(where: { $0.id == block.id }) else { return }
        content.blocks[index] = block
        scheduleSave()
    }

    private func remove(_ id: String) {
        content.blocks.removeAll { $0.id == id }
        scheduleSave()
    }

    private func append(_ block: NativeContentBlock) {
        content.blocks.append(block)
        showFormats = false
        scheduleSave()
    }

    private func addPhoto(_ item: PhotosPickerItem) async {
        defer { photoPick = nil }
        guard let data = try? await item.loadTransferable(type: Data.self),
              let image = UIImage(data: data),
              let jpeg = image.jpegData(compressionQuality: 0.8) else { return }
        append(NativeContentBlock(type: "photo", src: "data:image/jpeg;base64," + jpeg.base64EncodedString()))
    }

    // MARK: Blocks

    private func blockSection(_ block: NativeContentBlock) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(label(for: block.type))
                    .font(.system(.footnote, weight: .medium))
                    .foregroundStyle(Spread.secondary)
                Spacer()
                if block.type == "notes" {
                    Button { expandedNote = block.id } label: {
                        Text("Expand").font(.system(.footnote, weight: .semibold)).foregroundStyle(Spread.accent).tapTarget(minWidth: 44)
                    }
                }
                Button { remove(block.id) } label: {
                    Text("Remove").font(.system(.footnote, weight: .semibold)).foregroundStyle(Spread.danger).tapTarget(minWidth: 44)
                }
                .accessibilityIdentifier("remove-block-\(block.id)")
            }
            switch block.type {
            case "notes": notesEditor(block)
            case "outline": outlineEditor(block)
            case "table": tableEditor(block)
            case "photo": photoView(block)
            default: EmptyView()
            }
        }
    }

    private func notesEditor(_ block: NativeContentBlock) -> some View {
        TextEditor(text: Binding(get: {
            content.blocks.first(where: { $0.id == block.id })?.text ?? ""
        }, set: { value in
            guard var current = content.blocks.first(where: { $0.id == block.id }) else { return }
            current.text = value
            update(current)
        }))
            .frame(minHeight: 120)
            .scrollContentBackground(.hidden)
            .padding(8)
            .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
            .accessibilityLabel("Notes")
            .accessibilityIdentifier("content-notes")
    }

    /// Notes opened full height (the React `expanded` note). Done returns to the block list.
    private func expandedNotes(_ block: NativeContentBlock) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Notes").font(.system(.footnote, weight: .medium)).foregroundStyle(Spread.secondary)
                Spacer()
                Button { expandedNote = nil } label: { Text("Done").font(.system(.subheadline, weight: .semibold)).tapTarget() }
            }
            TextEditor(text: Binding(get: {
            content.blocks.first(where: { $0.id == block.id })?.text ?? ""
        }, set: { value in
            guard var current = content.blocks.first(where: { $0.id == block.id }) else { return }
            current.text = value
            update(current)
        }))
                .frame(minHeight: 360)
                .scrollContentBackground(.hidden)
                .accessibilityLabel("Notes, expanded")
        }
    }

    private func outlineEditor(_ block: NativeContentBlock) -> some View {
        let items = block.items ?? []
        return VStack(alignment: .leading, spacing: 6) {
            ForEach(items.indices, id: \.self) { index in
                let item = items[index]
                HStack(spacing: 6) {
                    Text(outlineMarker(index: index, level: Int(item.level)))
                        .font(.system(.subheadline, weight: .medium)).foregroundStyle(Spread.secondary)
                        .frame(width: 34 + CGFloat(item.level) * 16, alignment: .trailing)
                    TextField(item.level == 0 ? "Point" : "Detail", text: Binding(get: {
                        guard let items = content.blocks.first(where: { $0.id == block.id })?.items,
                              items.indices.contains(index) else { return "" }
                        return items[index].text
                    }, set: { value in
                        guard var copy = content.blocks.first(where: { $0.id == block.id }),
                              copy.items?.indices.contains(index) == true else { return }
                        copy.items?[index].text = value
                        update(copy)
                    }), prompt: Spread.fieldPrompt(item.level == 0 ? "Point" : "Detail"), axis: .vertical)
                    .font(.system(.body))
                    .lineLimit(1...3)
                    .frame(minHeight: 44)
                    .accessibilityIdentifier("content-outline-\(index)")
                    Button {
                        guard var copy = content.blocks.first(where: { $0.id == block.id }),
                              copy.items?.indices.contains(index) == true else { return }
                        let level = copy.items?[index].level ?? 0
                        copy.items?[index].level = max(0, level - 1)
                        update(copy)
                    } label: { Image(systemName: "decrease.indent").tapTarget() }
                    .accessibilityLabel("Outdent")
                    Button {
                        guard var copy = content.blocks.first(where: { $0.id == block.id }),
                              copy.items?.indices.contains(index) == true else { return }
                        let level = copy.items?[index].level ?? 0
                        copy.items?[index].level = min(4, level + 1)
                        update(copy)
                    } label: { Image(systemName: "increase.indent").tapTarget() }
                    .accessibilityLabel("Indent")
                }
            }
            Button {
                guard var copy = content.blocks.first(where: { $0.id == block.id }) else { return }
                copy.items = (copy.items ?? []) + [NativeOutlineItem(id: UUID().uuidString, text: "", level: 0)]
                update(copy)
            } label: { Text("Add line").font(.system(.subheadline, weight: .semibold)).foregroundStyle(Spread.accent).tapTarget() }
        }
    }

    private func tableEditor(_ block: NativeContentBlock) -> some View {
        let cells = block.cells ?? [["", ""], ["", ""]]
        return ScrollView(.horizontal) {
            VStack(spacing: 6) {
                ForEach(cells.indices, id: \.self) { row in
                    let values = cells[row]
                    HStack(spacing: 6) {
                        ForEach(values.indices, id: \.self) { column in
                            TextField("Row \(row + 1), column \(column + 1)", text: Binding(get: {
                                guard let current = content.blocks.first(where: { $0.id == block.id }),
                                      let rows = current.cells, rows.indices.contains(row),
                                      rows[row].indices.contains(column) else { return "" }
                                return rows[row][column]
                            }, set: { text in
                                guard var current = content.blocks.first(where: { $0.id == block.id }),
                                      let rows = current.cells, rows.indices.contains(row),
                                      rows[row].indices.contains(column) else { return }
                                current.cells?[row][column] = text
                                update(current)
                            }), prompt: Spread.fieldPrompt("Row \(row + 1), column \(column + 1)"), axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .font(.system(.body))
                            .lineLimit(1...3)
                            .frame(width: 140)
                            .frame(minHeight: 44)
                            .accessibilityLabel("Row \(row + 1), column \(column + 1)")
                            .accessibilityIdentifier("content-cell-\(row)-\(column)")
                        }
                    }
                }
                HStack {
                    Button {
                        guard var copy = content.blocks.first(where: { $0.id == block.id }) else { return }
                        let latest = copy.cells ?? [["", ""], ["", ""]]
                        copy.cells = latest + [Array(repeating: "", count: latest.first?.count ?? 2)]
                        update(copy)
                    } label: { Text("Add row").font(.system(.subheadline, weight: .semibold)).tapTarget() }
                    Button {
                        guard var copy = content.blocks.first(where: { $0.id == block.id }) else { return }
                        copy.cells = (copy.cells ?? [["", ""], ["", ""]]).map { $0 + [""] }
                        update(copy)
                    } label: { Text("Add column").font(.system(.subheadline, weight: .semibold)).tapTarget() }
                }
            }
        }
    }

    private func photoView(_ block: NativeContentBlock) -> some View {
        Group {
            if let src = block.src, let comma = src.firstIndex(of: ","),
               let data = Data(base64Encoded: String(src[src.index(after: comma)...])), let image = UIImage(data: data) {
                Image(uiImage: image).resizable().scaledToFit().frame(maxHeight: 260)
                    .accessibilityLabel("Task photo")
            } else {
                Text("This photo could not be decoded. The original is preserved until you remove it.")
                    .font(Spread.footnote).foregroundStyle(Spread.secondary)
            }
        }
    }

    private var formatMenu: some View {
        VStack(alignment: .leading, spacing: 12) {
            if showFormats || content.blocks.isEmpty {
                VStack(spacing: 0) {
                    formatRow(type: "notes", label: "Notes", detail: "Write. I. or A. starts an outline.", icon: "icon-notes") {
                        append(NativeContentBlock(type: "notes", text: ""))
                    }
                    formatRow(type: "outline", label: "Outline", detail: "Numbered like a traditional outline.", icon: "icon-outline") {
                        append(NativeContentBlock(type: "outline", items: [NativeOutlineItem(id: UUID().uuidString, text: "", level: 0)]))
                    }
                    formatRow(type: "table", label: "Table", detail: "Rows and columns.", icon: "icon-table") {
                        append(NativeContentBlock(type: "table", cells: [["", ""], ["", ""]]))
                    }
                    PhotosPicker(selection: $photoPick, matching: .images) {
                        formatLabel(label: "Photo", detail: "A picture from this device.", icon: "icon-photo")
                    }
                    .accessibilityIdentifier("format-photo")
                }
                .background(Spread.canvas, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
            } else {
                Button { showFormats = true } label: {
                    HStack(spacing: 8) {
                        SpreadIcon(name: "icon-add", size: 22)
                        Text("Add").font(.system(.subheadline, weight: .semibold))
                    }
                    .foregroundStyle(Spread.accent).frame(minHeight: 44)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("add-block")
            }
        }
    }

    private func formatRow(type: String, label: String, detail: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) { formatLabel(label: label, detail: detail, icon: icon) }
            .buttonStyle(.plain)
            .accessibilityIdentifier("format-\(type)")
    }

    private func formatLabel(label: String, detail: String, icon: String) -> some View {
        HStack(spacing: 12) {
            SpreadIcon(name: icon, size: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text(label).font(.system(.body, weight: .semibold))
                Text(detail).font(Spread.footnote).foregroundStyle(Spread.secondary)
            }
            Spacer(minLength: 0)
        }
        .foregroundStyle(Spread.ink)
        .padding(.horizontal, 16).padding(.vertical, 12)
        .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
        .overlay(alignment: .top) { Rectangle().fill(Spread.line).frame(height: 0.5) }
    }

    private func label(for type: String) -> String {
        switch type {
        case "notes": return "Notes"
        case "outline": return "Outline"
        case "table": return "Table"
        case "photo": return "Photo"
        default: return "Content"
        }
    }

    /// Outline markers: I, II, III at level 0; A, B, C at level 1; 1, 2, 3 at level 2 and deeper (`formatOutlineLabel`).
    private func outlineMarker(index: Int, level: Int) -> String {
        switch level {
        case 0: return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][min(index, 9)] + "."
        case 1: return String(Character(UnicodeScalar(UInt8(65 + index % 26)))) + "."
        default: return "\(index + 1)."
        }
    }
}
#endif
