#if os(iOS)
import SwiftUI

/// All-role overdue tray, hosted by LifeOverdueSheet. The engine owns classification and eligibility;
/// this surface only selects items, previews the result, and confirms the valid subset.
struct OverdueSelectionTray: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let rows: [NativeOverdueTask]
    let currentDay: String
    let weekDays: [String]
    /// Runs after a confirmed move succeeds, so the host can close. The Life notice then offers Undo.
    var onMoved: () -> Void = {}

    @State private var selection: Set<String> = []
    @State private var targetDay: String = ""
    @State private var preview: [NativeBulkPreview] = []
    /// The plan revision the person reviewed. Confirming sends it, so a plan that changed since refuses the move.
    @State private var reviewRevision: Int?
    @State private var showingPreview = false
    @State private var preparing = false
    /// Why the last review or move did not complete. Nothing moved while this is set.
    @State private var message: String?
    @AccessibilityFocusState private var messageFocused: Bool

    private var groupedRoles: [Responsibility] {
        snapshot.roles.filter { role in rows.contains { $0.hatId == role.id } }
    }
    private var selectedIDs: [String] { rows.map(\.id).filter { selection.contains($0) } }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Choose tasks to move").font(.system(.subheadline, weight: .semibold))
                Spacer()
                Button(selection.count == rows.count ? "Deselect all" : "Select all") {
                    selection = selection.count == rows.count ? [] : Set(rows.map(\.id))
                }
                .font(.system(.footnote, weight: .semibold))
                .frame(minHeight: 44)
                .accessibilityIdentifier("overdue-select-all")
            }
            if let message {
                Label { Text(message).font(.system(.subheadline)).foregroundStyle(Spread.ink) } icon: {
                    Image(systemName: "exclamationmark.circle").foregroundStyle(Spread.caution)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(10)
                .background(Spread.inset, in: RoundedRectangle(cornerRadius: 12))
                .accessibilityFocused($messageFocused)
                .accessibilityIdentifier("overdue-message")
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
                                SpreadIcon(name: selection.contains(item.id) ? "lucide-circle-check" : "lucide-circle", size: 22)
                                    .foregroundStyle(Spread.accent)
                                    .frame(width: 40, height: 44)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.task.text).font(.system(.subheadline))
                                        .foregroundStyle(Spread.ink).multilineTextAlignment(.leading)
                                    Text(PlannerDates.label(PlannerDates.date(item.day), pattern: "MMM d"))
                                        .font(Spread.caption).foregroundStyle(Spread.secondary)
                                }
                                Spacer(minLength: 0)
                            }
                            .frame(minHeight: 44)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityValue(selection.contains(item.id) ? "Selected" : "Not selected")
                        .accessibilityAddTraits(selection.contains(item.id) ? .isSelected : [])
                        .accessibilityIdentifier("overdue-task-\(item.id)")
                    }
                }
                .padding(8)
                .background(Spread.inset, in: RoundedRectangle(cornerRadius: 12))
            }
            if !selection.isEmpty {
                Text("\(selection.count) selected · choose a day")
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
                            .font(.system(.caption2, weight: targetDay == iso ? .bold : .medium))
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .background(targetDay == iso ? Spread.accent.opacity(0.18) : Color.clear,
                                        in: RoundedRectangle(cornerRadius: 10))
                            // Selected is shown by weight and an outline too, not by tint alone.
                            .overlay(RoundedRectangle(cornerRadius: 10)
                                .strokeBorder(targetDay == iso ? Spread.accent : Color.clear, lineWidth: 1.5))
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
                    Label { Text("Review reschedule") } icon: { SpreadIcon(name: "lucide-calendar-clock", size: 18) }
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .foregroundStyle(Spread.accent)
                        .spreadChip(selected: true)
                }
                .buttonStyle(.plain)
                .disabled(preparing || targetDay.isEmpty)
                .opacity(preparing || targetDay.isEmpty ? 0.4 : 1)
                .accessibilityIdentifier("overdue-preview")
            }
        }
        .padding(12)
        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
        .onAppear { if targetDay.isEmpty { targetDay = currentDay } }
        .onChange(of: currentDay) { _, newDay in targetDay = newDay }
        .onChange(of: rows.map(\.id)) { _, ids in selection = selection.intersection(Set(ids)) }
        .sheet(isPresented: $showingPreview) { previewSheet }
        // A container identifier otherwise replaces its children's own identifiers.
        .accessibilityElement(children: .contain)
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
                                .accessibilityHidden(true)
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
                    if eligible.isEmpty {
                        Text("None of these tasks can move to that day.")
                            .font(Spread.callout).foregroundStyle(Spread.secondary)
                    }
                    Button("Move \(eligible.count) eligible \(eligible.count == 1 ? "task" : "tasks")") {
                        Task { await commitPreview() }
                    }
                    .disabled(eligible.isEmpty || preparing)
                    .opacity(eligible.isEmpty || preparing ? 0.4 : 1)
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
        message = nil
        // Read the revision before the review, so the review is pinned to the plan it was built from.
        let revisionBefore = planner.state?.revision
        let fetched = await planner.previewOverdueMove(taskIds: selectedIDs, targetDay: targetDay,
                                                       today: PlannerDates.localISO())
        preparing = false
        guard let lines = fetched, let revision = revisionBefore else {
            fail("Couldn't review these tasks. Nothing was moved.")
            return
        }
        preview = lines
        reviewRevision = revision
        showingPreview = true
    }

    private func commitPreview() async {
        // Move exactly what the person reviewed and confirmed: the eligible rows of this preview,
        // at the revision they were reviewed at. A plan changed since then refuses the move.
        let reviewed = preview.filter(\.eligible).map(\.taskId)
        guard !preparing, !reviewed.isEmpty, let revision = reviewRevision else { return }
        preparing = true
        let ok = await planner.send(["type": "bulkMoveOverdue", "taskIds": reviewed,
                                     "targetDay": targetDay, "today": PlannerDates.localISO()],
                                    expectedRevision: revision)
        preparing = false
        showingPreview = false
        if ok {
            selection.removeAll()
            message = nil
            onMoved()
        } else {
            fail("Nothing was moved. Your plan may have changed. Review the tasks again.")
        }
    }

    private func fail(_ text: String) {
        message = text
        messageFocused = true
    }
}
#endif
