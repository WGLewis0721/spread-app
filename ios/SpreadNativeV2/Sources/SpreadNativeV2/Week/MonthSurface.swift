#if os(iOS)
import SwiftUI

/// The Month mode inside Week (`month-view.tsx`). Sunday-first, seven columns, leading and trailing days from
/// the neighbouring months in a quieter tone, role-colour dots for each responsibility placed that day, and
/// "+N" for any beyond three. Picking a day opens its week and returns to the Week surface.
struct MonthSurface: View {
    @ObservedObject var planner: LivePlanner
    let snapshot: PlannerSnapshot
    /// Any date inside the month being shown (the first of it, by convention).
    let anchor: Date
    let onPick: (String) -> Void

    private static let weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    private var calendar: Calendar { PlannerDates.calendar }

    private struct Cell: Identifiable {
        let id: String
        let date: Date
        let iso: String
        let day: Int
        let inMonth: Bool
    }

    private var cells: [Cell] {
        let first = calendar.date(from: calendar.dateComponents([.year, .month], from: anchor)) ?? anchor
        let daysInMonth = calendar.range(of: .day, in: .month, for: first)?.count ?? 30
        // Sunday is weekday 1 in the Gregorian calendar, so the lead count equals the grid column.
        let lead = calendar.component(.weekday, from: first) - 1
        let rows = Int((Double(lead + daysInMonth) / 7).rounded(.up))
        return (0..<(rows * 7)).map { index in
            let date = calendar.date(byAdding: .day, value: index - lead, to: first) ?? first
            let iso = PlannerDates.formatter.string(from: date)
            return Cell(
                id: iso,
                date: date,
                iso: iso,
                day: calendar.component(.day, from: date),
                inMonth: index >= lead && index < lead + daysInMonth
            )
        }
    }

    var body: some View {
        let today = PlannerDates.localISO()
        VStack(spacing: 8) {
            HStack(spacing: 6) {
                ForEach(Self.weekdays, id: \.self) { label in
                    Text(label)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Spread.secondary)
                        .frame(maxWidth: .infinity)
                        .accessibilityHidden(true)
                }
            }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 7), spacing: 6) {
                ForEach(cells) { cell in
                    dayCell(cell, isToday: cell.iso == today)
                }
            }
        }
        .padding(.horizontal, 4)
        .padding(.top, 16)
        .accessibilityIdentifier("month")
    }

    private func dayCell(_ cell: Cell, isToday: Bool) -> some View {
        let roles = snapshot.roles.filter { role in
            snapshot.allocations.contains { $0.day == cell.iso && $0.roleId == role.id && $0.hours > 0 }
        }
        let shownDots = roles.prefix(3)
        let extra = max(0, roles.count - 3)
        let label = PlannerDates.label(cell.date, pattern: "EEEE MMMM d")
        let count = roles.count
        return Button { onPick(cell.iso) } label: {
            VStack(spacing: 4) {
                Text("\(cell.day)")
                    .font(.system(size: 15, weight: .semibold))
                    .monospacedDigit()
                    .foregroundStyle(isToday ? Spread.onAccent : (cell.inMonth ? Spread.ink : Spread.tertiary))
                    .frame(width: 28, height: 28)
                    .background(isToday ? Spread.accent : Color.clear, in: Circle())
                HStack(spacing: 3) {
                    ForEach(Array(shownDots), id: \.id) { role in
                        Circle().fill(Color(hex: role.color)).frame(width: 6, height: 6)
                    }
                }
                .frame(height: 6)
                Text(extra > 0 ? "+\(extra)" : " ")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(Spread.secondary)
                    .frame(height: 12)
            }
            .frame(maxWidth: .infinity, minHeight: 56)
            .padding(.vertical, 4)
            .background(Spread.elevated, in: RoundedRectangle(cornerRadius: 16))
            .opacity(cell.inMonth ? 1 : 0.55)
            .contentShape(RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(isToday ? "Today, " : "")\(label). \(count == 0 ? "No responsibilities scheduled." : "\(count) \(count == 1 ? "responsibility" : "responsibilities") scheduled.")")
        .accessibilityAddTraits(isToday ? .isSelected : [])
        .accessibilityIdentifier("month-day-\(cell.iso)")
    }
}
#endif
