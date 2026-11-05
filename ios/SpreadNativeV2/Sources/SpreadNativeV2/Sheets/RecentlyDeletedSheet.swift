#if os(iOS)
import SwiftUI

/// Recoverable task deletion: no Swift-side storage. Every restore/erase is an
/// acknowledged command to the existing local-first planner store.
struct RecentlyDeletedSheet: View {
    @ObservedObject var planner: LivePlanner
    @Environment(\.dismiss) private var dismiss
    @State private var rows: [NativeDeletedTask] = []
    @State private var selected: Set<String> = []
    @State private var selecting = false
    @State private var busy = false
    @State private var confirmingDelete = false
    @State private var loaded = false
    @State private var loadFailed = false

    var body: some View {
        SpreadSheetStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Tasks can be recovered for 30 days. Restored tasks return to To Place in their original responsibility and week.")
                        .font(Spread.callout).foregroundStyle(Spread.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                    if !loaded {
                        ProgressView().frame(maxWidth: .infinity, minHeight: 100)
                    } else if loadFailed {
                        VStack(spacing: 10) {
                            Text("Recently Deleted could not be read. Nothing was removed.")
                                .font(Spread.callout).foregroundStyle(Spread.secondary)
                                .multilineTextAlignment(.center)
                            Button("Try again") { Task { await reload() } }
                                .frame(minHeight: 44)
                                .accessibilityIdentifier("deleted-retry")
                        }
                        .frame(maxWidth: .infinity, minHeight: 160)
                    } else if rows.isEmpty {
                        ContentUnavailableView("Nothing recently deleted", systemImage: "trash",
                                               description: Text("Tasks you delete will appear here for 30 days."))
                            .frame(maxWidth: .infinity, minHeight: 200)
                    } else {
                        HStack {
                            Text("\(rows.count) \(rows.count == 1 ? "task" : "tasks")")
                                .font(Spread.caption).foregroundStyle(Spread.secondary)
                            Spacer()
                            Button(selecting ? "Done" : "Select") {
                                selecting.toggle()
                                if !selecting { selected.removeAll() }
                            }
                            .frame(minHeight: 44)
                            .accessibilityIdentifier("deleted-select")
                        }
                        VStack(spacing: 0) {
                            ForEach(rows) { row in
                                rowView(row)
                                if row.id != rows.last?.id { Divider().padding(.leading, 12) }
                            }
                        }
                        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
                        if selecting {
                            Button(selected.count == rows.count ? "Deselect all" : "Select all") {
                                if selected.count == rows.count { selected.removeAll() }
                                else { selected = Set(rows.map(\.id)) }
                            }
                            .frame(minHeight: 44)
                            .accessibilityIdentifier("deleted-select-all")
                            HStack(spacing: 12) {
                                Button("Restore \(selected.count)") { Task { await restoreSelected() } }
                                    .disabled(selected.isEmpty || busy)
                                    .frame(maxWidth: .infinity, minHeight: 48)
                                    .spreadChip(selected: !selected.isEmpty)
                                    .accessibilityIdentifier("deleted-restore-selected")
                                Button("Delete permanently", role: .destructive) {
                                    confirmingDelete = true
                                }
                                .disabled(selected.isEmpty || busy)
                                .font(.system(.footnote, weight: .semibold))
                                .frame(maxWidth: .infinity, minHeight: 48)
                                .accessibilityIdentifier("deleted-delete-selected")
                            }
                        } else {
                            Button("Empty Recently Deleted", role: .destructive) {
                                selected = Set(rows.map(\.id))
                                confirmingDelete = true
                            }
                            .frame(maxWidth: .infinity, minHeight: 48)
                            .accessibilityIdentifier("deleted-empty-all")
                        }
                    }
                }
                .frame(maxWidth: 620)
                .padding(16)
                .frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
            .navigationTitle("Recently Deleted")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .confirmationDialog("Permanently delete \(selected.count) \(selected.count == 1 ? "task" : "tasks")?",
                                isPresented: $confirmingDelete, titleVisibility: .visible) {
                Button("Delete permanently", role: .destructive) { Task { await deleteSelected() } }
                Button("Cancel", role: .cancel) { if !selecting { selected.removeAll() } }
            } message: {
                Text("This cannot be undone. These tasks will be removed from this device's planner data and backups made afterward.")
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .task { await reload() }
        // A container identifier otherwise replaces its children's own identifiers.
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("recently-deleted-sheet")
    }

    private func rowView(_ row: NativeDeletedTask) -> some View {
        let roleName = planner.snapshot?.roles.first(where: { $0.id == row.hatId })?.name ?? "Removed responsibility"
        let date = Date(timeIntervalSince1970: row.deletedAt / 1000)
        let remain = max(0, Int(ceil(date.addingTimeInterval(30 * 86400).timeIntervalSinceNow / 86400)))
        return HStack(spacing: 10) {
            if selecting {
                Button {
                    if selected.contains(row.id) { selected.remove(row.id) } else { selected.insert(row.id) }
                } label: {
                    Image(systemName: selected.contains(row.id) ? "checkmark.circle.fill" : "circle")
                        .font(.system(.title3))
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(selected.contains(row.id) ? "Deselect \(row.task.text)" : "Select \(row.task.text)")
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(row.task.text.isEmpty ? "Untitled task" : row.task.text)
                    .font(.system(.subheadline, weight: .medium))
                    .foregroundStyle(Spread.ink).lineLimit(3)
                Text("\(roleName) · \(row.weekKey) · \(remain)d left")
                    .font(Spread.caption).foregroundStyle(Spread.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if !selecting {
                Button("Restore") { Task { await restore([row.id]) } }
                    .font(.system(.subheadline, weight: .semibold))
                    .disabled(busy)
                    .frame(minHeight: 44)
                    .accessibilityIdentifier("deleted-restore-\(row.id)")
            }
        }
        .padding(.horizontal, 12)
        .frame(minHeight: 64)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("deleted-item-\(row.id)")
    }

    private func reload() async {
        // A failed read is not an empty list: saying "Nothing recently deleted" would look like loss.
        if let fetched = await planner.recentlyDeletedTasks() { rows = fetched; loadFailed = false }
        else { loadFailed = true }
        loaded = true
    }

    private func restore(_ ids: [String]) async {
        guard !busy else { return }
        busy = true
        for id in ids {
            guard await planner.send(["type": "restoreDeletedTask", "taskId": id]) else { break }
        }
        await reload()
        busy = false
        selected.removeAll()
    }

    private func restoreSelected() async { await restore(Array(selected)) }

    private func deleteSelected() async {
        guard !busy, !selected.isEmpty else { return }
        busy = true
        _ = await planner.send(["type": "permanentlyDeleteTasks", "taskIds": Array(selected)])
        await reload()
        selected.removeAll()
        busy = false
    }
}
#endif
