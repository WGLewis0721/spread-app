#if os(iOS)
import SwiftUI

/// All-role overdue tray. The engine owns classification and eligibility;
/// this surface only selects items, previews the result, and confirms the valid subset.
struct OverdueSelectionTray: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let rows: [NativeOverdueTask]
    let currentDay: String
    let weekDays: [String]

    @State private var selection: Set<String> = []
    @State private var targetDay: String = ""
    @State private var preview: [NativeBulkPreview] = []
    @State private var showingPreview = false
    @State private var preparing = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var groupedRoles: [Responsibility] {
        snapshot.roles.filter { role in rows.contains { $0.hatId == role.id } }
    }
    private var selectedIDs: [String] { rows.map(\.id).filter { selection.contains($0) } }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Overdue").font(.system(.headline, weight: .semibold))
                Spacer()
                Button(selection.count == rows.count ? "Deselect all" : "Select all") {
                    selection = selection.count == rows.count ? [] : Set(rows.map(\.id))
                }
                .font(.system(.footnote, weight: .semibold))
                .frame(minHeight: 44)
                .accessibilityIdentifier("overdue-select-all")
            }
            ForEach(groupedRoles) { role in
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        RoleBadge(category: role.category == "custom" ? nil : role.category,
                                  color: role.color, size: 22)
                        Text(role.name).font(.system(.subheadline, weight: .semibold))
                        Spacer()
                        Text("\(rows.filter { $0.hatId == role.id }.count)")
                            .font(Spread.caption).foregroundStyle(Spread.secondary)
                    }
                    ForEach(rows.filter { $0.hatId == role.id }) { item in
                        Button {
                            if selection.contains(item.id) { selection.remove(item.id) }
                            else { selection.insert(item.id) }
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: selection.contains(item.id) ? "checkmark.circle.fill" : "circle")
                                    .font(.system(.title3)).foregroundStyle(Spread.accent)
                                    .frame(width: 40, height: 44)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.task.text).font(.system(.subheadline))
                                        .foregroundStyle(Spread.ink).multilineTextAlignment(.leading)
                                    Text(PlannerDates.label(PlannerDates.date(item.day), pattern: "MMM d"))
                                        .font(Spread.caption).foregroundStyle(Spread.secondary)
                                }
                                Spacer(minLength: 0)
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("overdue-task-\(item.id)")
                    }
                }
                .padding(8)
                .background(Spread.inset, in: RoundedRectangle(cornerRadius: 12))
            }
            if !selection.isEmpty {
                Text("Reschedule \(selection.count) selected")
                    .font(.system(.subheadline, weight: .semibold))
                HStack(spacing: 2) {
                    ForEach(weekDays, id: \.self) { iso in
                        Button {
                            targetDay = iso
                        } label: {
                            VStack(spacing: 2) {
                                Text(PlannerDates.label(PlannerDates.date(iso), pattern: "EEEEE"))
                                Text(PlannerDates.label(PlannerDates.date(iso), pattern: "d"))
                            }
                            .font(.system(.caption2, weight: .medium))
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .background(targetDay == iso ? Spread.accent.opacity(0.18) : Color.clear,
                                        in: RoundedRectangle(cornerRadius: 10))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(PlannerDates.label(PlannerDates.date(iso), pattern: "EEEE MMM d"))
                        .accessibilityAddTraits(targetDay == iso ? .isSelected : [])
                        .accessibilityIdentifier("overdue-target-\(iso)")
                    }
                }
                Button {
                    Task { await preparePreview() }
                } label: {
                    Label("Review reschedule", systemImage: "calendar.badge.clock")
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .foregroundStyle(Spread.accent)
                        .spreadChip(selected: true)
                }
                .buttonStyle(.plain)
                .disabled(preparing || targetDay.isEmpty)
                .accessibilityIdentifier("overdue-preview")
            }
        }
        .padding(12)
        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
        .onAppear { if targetDay.isEmpty { targetDay = currentDay } }
        .onChange(of: currentDay) { _, newDay in targetDay = newDay }
        .onChange(of: rows.map(\.id)) { _, ids in selection = selection.intersection(Set(ids)) }
        .sheet(isPresented: $showingPreview) { previewSheet }
        .accessibilityIdentifier("overdue-selection-tray")
    }

    private var previewSheet: some View {
        SpreadSheetStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    let eligible = preview.filter(\.eligible)
                    let blocked = preview.filter { !$0.eligible }
                    Text("\(eligible.count) can move · \(blocked.count) need attention")
                        .font(.system(.headline, weight: .semibold))
                    Text("Only eligible tasks will be moved. The others remain on their original days.")
                        .font(Spread.callout).foregroundStyle(Spread.secondary)
                    ForEach(preview) { item in
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: item.eligible ? "checkmark.circle" : "exclamationmark.circle")
                                .foregroundStyle(item.eligible ? Spread.accent : Spread.caution)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(rows.first(where: { $0.id == item.taskId })?.task.text ?? "Task")
                                    .font(.system(.subheadline, weight: .medium))
                                Text(item.eligible ? "Can move" : (item.error ?? "Cannot move"))
                                    .font(Spread.caption).foregroundStyle(Spread.secondary)
                            }
                            Spacer(minLength: 0)
                        }
                        .padding(10)
                        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: 12))
                    }
                    Button("Move \(eligible.count) eligible tasks") {
                        Task { await commitPreview() }
                    }
                    .disabled(eligible.isEmpty || preparing)
                    .frame(maxWidth: .infinity, minHeight: 50)
                    .spreadChip(selected: true)
                    .accessibilityIdentifier("overdue-confirm-valid")
                }
                .padding(16)
            }
            .navigationTitle("Review reschedule")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showingPreview = false }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private func preparePreview() async {
        guard !preparing, !selectedIDs.isEmpty, !targetDay.isEmpty else { return }
        preparing = true
        let response = await planner.previewOverdueMove(taskIds: selectedIDs, targetDay: targetDay,
                                                        today: PlannerDates.localISO())
        preparing = false
        guard let response else { planner.error = "Could not review these tasks. Nothing was moved."; return }
        preview = response
        showingPreview = true
    }

    private func commitPreview() async {
        // Move exactly what the person reviewed and confirmed: the eligible rows of this preview.
        // Sending the whole selection would let a planner change made after the preview move more.
        let reviewed = preview.filter(\.eligible).map(\.taskId)
        guard !preparing, !reviewed.isEmpty else { return }
        preparing = true
        let ok = await planner.send(["type": "bulkMoveOverdue", "taskIds": reviewed,
                                     "targetDay": targetDay, "today": PlannerDates.localISO()])
        preparing = false
        if ok {
            selection.removeAll()
            showingPreview = false
        }
    }
}
#endif
