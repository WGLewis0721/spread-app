#if os(iOS)
import SwiftUI

/// What the Life week knows about overdue tasks. `.failed` is never shown as "nothing overdue":
/// only a successful read reports an empty list.
enum LifeOverdueLoad {
    case loading
    case failed
    case loaded([NativeOverdueTask])
}

/// Overdue tasks are unfinished tasks on a day before today. The engine decides what can move.
/// This sheet shows designed loading, failed and empty states, and hands loaded rows to OverdueSelectionTray.
struct LifeOverdueSheet: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    let load: LifeOverdueLoad
    let onRetry: () -> Void
    let onMoved: () -> Void

    @Environment(\.dismiss) private var dismiss

    private var weekDays: [String] { LifeCalendarRules.week(snapshot.weekKey) }
    /// Today when it falls in the open week; otherwise the week's first day.
    private var defaultDay: String {
        let today = PlannerDates.localISO()
        return weekDays.contains(today) ? today : (weekDays.first ?? snapshot.weekKey)
    }

    var body: some View {
        SpreadSheetStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    content
                }
                .padding(16)
            }
            .navigationTitle("Overdue tasks")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("life-overdue-sheet")
    }

    @ViewBuilder private var content: some View {
        switch load {
        case .loading:
            stateMessage(heading: "Checking overdue tasks…", detail: nil)
        case .failed:
            stateMessage(heading: "Couldn't check overdue tasks", detail: "Your plan hasn't changed. Try again.")
            Button {
                onRetry()
            } label: {
                Text("Try again")
                    .font(.system(.subheadline, weight: .semibold))
                    .frame(maxWidth: .infinity, minHeight: 50)
                    .spreadChip(selected: true)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("life-overdue-retry")
        case .loaded(let rows):
            if rows.isEmpty {
                stateMessage(heading: "Nothing overdue", detail: "Unfinished tasks from earlier days appear here.")
            } else {
                OverdueSelectionTray(planner: planner, snapshot: snapshot, rows: rows,
                                     currentDay: defaultDay, weekDays: weekDays, onMoved: onMoved)
            }
        }
    }

    private func stateMessage(heading: String, detail: String?) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(heading).font(.system(.headline, weight: .semibold))
            if let detail = detail {
                Text(detail).font(Spread.callout).foregroundStyle(Spread.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}
#endif
