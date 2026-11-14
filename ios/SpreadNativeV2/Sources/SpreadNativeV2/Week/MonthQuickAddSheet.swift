#if os(iOS)
import SwiftUI

/// Add from Month without leaving the calendar or changing the user's selected Week day.
/// The cross-week action is atomic in the existing planner store.
struct MonthQuickAddSheet: View {
    @ObservedObject var planner: LivePlanner
    let roleId: String
    let day: String

    @Environment(\.dismiss) private var dismiss
    @FocusState private var focused: Bool
    @State private var title = ""
    @State private var saving = false

    private var roleName: String {
        planner.snapshot?.roles.first(where: { $0.id == roleId })?.name ?? "Responsibility"
    }

    var body: some View {
        SpreadSheetStack {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 8) {
                    SpreadIcon(name: "lucide-calendar-plus", size: 20)
                        .foregroundStyle(Spread.accent)
                    Text(PlannerDates.label(PlannerDates.date(day), pattern: "EEEE, MMMM d"))
                        .font(.system(.headline, weight: .semibold))
                }
                Text("Add to \(roleName)")
                    .font(.system(.subheadline, weight: .medium))
                    .foregroundStyle(Spread.secondary)
                TextField("What needs to get done?", text: $title)
                    .focused($focused)
                    .submitLabel(.done)
                    .onSubmit { Task { await save() } }
                    .textInputAutocapitalization(.sentences)
                    .padding(.horizontal, 12)
                    .frame(minHeight: 48)
                    .background(Spread.elevated, in: RoundedRectangle(cornerRadius: 12))
                    .accessibilityIdentifier("month-quick-add-title")
                Text("If there are no allocated hours for this responsibility that day, the task is saved to that week's To Place.")
                    .font(Spread.caption)
                    .foregroundStyle(Spread.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                Button {
                    Task { await save() }
                } label: {
                    Text(saving ? "Saving…" : "Save task")
                        .font(.system(.subheadline, weight: .semibold))
                        .foregroundStyle(Spread.onAccent)
                        .frame(maxWidth: .infinity, minHeight: 50)
                        .background(Spread.accent, in: Capsule())
                }
                .buttonStyle(.plain)
                .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || saving)
                .accessibilityIdentifier("month-quick-add-save")
                Spacer(minLength: 0)
            }
            .padding(16)
            .navigationTitle("Add task")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .onAppear { focused = true }
        // A container identifier otherwise replaces its children's own identifiers.
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("month-quick-add-sheet")
    }

    private func save() async {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !saving, !roleId.isEmpty else { return }
        saving = true
        let saved = await planner.send(["type": "addTaskForDay", "roleId": roleId, "day": day, "text": trimmed])
        saving = false
        if saved {
            SpreadHaptics.selection()
            dismiss()
        }
    }
}
#endif
