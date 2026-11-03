#if os(iOS)
import SwiftUI
import PhotosUI
import UIKit

struct NativeOutlineItem: Codable, Identifiable { var id: String; var text: String; var level: Int }
struct NativeContentBlock: Codable, Identifiable {
    var id = UUID().uuidString
    var type: String
    var text: String?
    var items: [NativeOutlineItem]?
    var cells: [[String]]?
    var src: String?
}
struct NativeTaskContent: Codable { var blocks: [NativeContentBlock] = [] }
struct NativeTaskDetail: Decodable { let taskId: String; let content: NativeTaskContent }

/// Edits the complete original content in memory, then sends it through setTaskContent.
/// Nothing is written until Save is acknowledged by the existing planner store.
struct NativeTaskContentEditor: View {
    @ObservedObject var planner: LivePlanner
    let task: PlannerTask
    @Environment(\.dismiss) private var dismiss
    @State private var content = NativeTaskContent()
    @State private var loaded = false
    @State private var loadedRevision: Int?
    @State private var loadedSessionId: String?
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var error: String?
    var body: some View {
        Form {
            if !loaded {
                ProgressView("Opening task content…")
                Button("Try again") { Task { await load() } }
            } else {
                ForEach($content.blocks) { $block in
                    Section {
                        blockEditor($block)
                        Button("Remove \(block.type)", role: .destructive) { content.blocks.removeAll { $0.id == block.id } }
                    }
                }
                Section("Add content") {
                    Button("Notes") { content.blocks.append(NativeContentBlock(type: "notes", text: "")) }
                    Button("Outline") { content.blocks.append(NativeContentBlock(type: "outline", items: [NativeOutlineItem(id: UUID().uuidString, text: "", level: 0)])) }
                    Button("Table") { content.blocks.append(NativeContentBlock(type: "table", cells: [["", ""], ["", ""]])) }
                    PhotosPicker(selection: $selectedPhoto, matching: .images) { Label("Photo", systemImage: "photo") }.frame(minHeight: 44)
                }
            }
        }
        .navigationTitle("Notes and attachments")
        .toolbar { ToolbarItem(placement: .topBarTrailing) {
            Button("Save") { Task { await save() } }.disabled(!loaded || planner.busy)
        }}
        .task { await load() }
        .onChange(of: selectedPhoto) { _, photo in
            guard let photo else { return }
            Task {
            do {
                guard let data = try await photo.loadTransferable(type: Data.self), let image = UIImage(data: data), let jpeg = image.jpegData(compressionQuality: 0.8) else { throw NSError(domain: "Spread", code: 1) }
                content.blocks.append(NativeContentBlock(type: "photo", src: "data:image/jpeg;base64," + jpeg.base64EncodedString()))
            } catch { self.error = "The photo could not be opened. Choose another image." }
            selectedPhoto = nil
        }}
        .alert("Task content", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) { Button("OK") { error = nil } } message: { Text(error ?? "") }
    }
    @ViewBuilder private func blockEditor(_ block: Binding<NativeContentBlock>) -> some View {
        switch block.wrappedValue.type {
        case "notes":
            TextEditor(text: Binding(get: { block.wrappedValue.text ?? "" }, set: { block.wrappedValue.text = $0 }))
                .frame(minHeight: 120).accessibilityLabel("Notes")
        case "outline":
            ForEach((block.wrappedValue.items ?? []).indices, id: \.self) { index in
                TextField("Outline line", text: Binding(get: { block.wrappedValue.items?[index].text ?? "" }, set: { block.wrappedValue.items?[index].text = $0 }), axis: .vertical)
                    .padding(.leading, CGFloat(block.wrappedValue.items?[index].level ?? 0) * 8)
                Stepper("Indent \(block.wrappedValue.items?[index].level ?? 0)", value: Binding(get: { block.wrappedValue.items?[index].level ?? 0 }, set: { block.wrappedValue.items?[index].level = $0 }), in: 0...4)
            }
            Button("Add line") { block.wrappedValue.items?.append(NativeOutlineItem(id: UUID().uuidString, text: "", level: 0)) }
        case "table":
            ScrollView(.horizontal) {
                VStack {
                    ForEach((block.wrappedValue.cells ?? []).indices, id: \.self) { row in
                        HStack {
                            ForEach((block.wrappedValue.cells?[row] ?? []).indices, id: \.self) { column in
                                TextField("Row \(row + 1), column \(column + 1)", text: Binding(get: { block.wrappedValue.cells?[row][column] ?? "" }, set: { block.wrappedValue.cells?[row][column] = $0 }))
                                    .textFieldStyle(.roundedBorder).frame(width: 140, height: 44)
                            }
                        }
                    }
                }
            }
            Button("Add row") { block.wrappedValue.cells?.append(Array(repeating: "", count: block.wrappedValue.cells?.first?.count ?? 2)) }
            Button("Add column") {
                guard var cells = block.wrappedValue.cells else { return }
                for index in cells.indices { cells[index].append("") }; block.wrappedValue.cells = cells
            }
        case "photo":
            if let src = block.wrappedValue.src, let comma = src.firstIndex(of: ","), let data = Data(base64Encoded: String(src[src.index(after: comma)...])), let image = UIImage(data: data) {
                Image(uiImage: image).resizable().scaledToFit().frame(maxHeight: 260).accessibilityLabel("Task photo")
            } else { Text("This photo could not be decoded. The original is preserved until you remove it.") }
        default:
            Text("This content requires a newer version of Spread. It will be preserved.")
        }
    }
    private func load() async {
        if await planner.send(["type": "readTaskContent", "roleId": task.roleId, "taskId": task.id]), let existing = planner.details[task.id] { content = existing; loadedRevision = planner.state?.revision; loadedSessionId = planner.state?.sessionId; loaded = true }
    }
    private func save() async {
        guard loadedRevision == planner.state?.revision, loadedSessionId == planner.state?.sessionId else {
            error = "This plan changed while you were editing. Copy any unsaved text, then reopen the task before saving."; return
        }
        do {
            let data = try JSONEncoder().encode(content)
            let object = try JSONSerialization.jsonObject(with: data)
            if await planner.send(["type": "setTaskContent", "roleId": task.roleId, "taskId": task.id, "content": object]) { dismiss() }
        } catch { self.error = "The task content could not be prepared for saving." }
    }
}
#endif
