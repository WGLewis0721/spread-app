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
    /// Optional in the new opt-in Week; the Classic Month stays unchanged.
    var selectedRole: String? = nil
    var onSwipeMonth: ((Int) -> Void)? = nil
    var mondayFirst: Bool = false
    /// Opt-in Week only: shared with the seven-day strip so the open week morphs into its Month row.
    var morphNamespace: Namespace.ID? = nil

    /// Dots for every day of the month, from the planner (any week). Until they arrive, or if they cannot, the open
    /// week's own dots are drawn so the grid is never empty.
    @State private var marks: [String: NativeDayMark] = [:]

    private static let weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    private static let weekdayNames = ["Sun": "Sunday", "Mon": "Monday", "Tue": "Tuesday", "Wed": "Wednesday", "Thu": "Thursday", "Fri": "Friday", "Sat": "Saturday"]
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
        let weekday = calendar.component(.weekday, from: first) - 1
        let lead = mondayFirst ? (weekday + 6) % 7 : weekday
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
                ForEach(mondayFirst ? Array(Self.weekdays.dropFirst()) + [Self.weekdays[0]] : Self.weekdays, id: \.self) { label in
                    ViewThatFits(in: .horizontal) {
                        weekdayHeading(label, fullName: Self.weekdayNames[label] ?? label)
                        weekdayHeading(String(label.prefix(2)), fullName: Self.weekdayNames[label] ?? label)
                    }
                    .frame(maxWidth: .infinity)
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
        .simultaneousGesture(
            DragGesture(minimumDistance: 65).onEnded { gesture in
                guard let onSwipeMonth,
                      abs(gesture.translation.width) > abs(gesture.translation.height) * 1.6 else { return }
                onSwipeMonth(gesture.translation.width < 0 ? 1 : -1)
            }
        )
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("month")
        .task(id: marksKey) {
            // A failed refresh must fall back to the current snapshot, never keep
            // another month's/profile's cached marks. A superseded request may
            // finish after cancellation, so it must not replace the new result.
            marks = [:]
            let parts = PlannerDates.calendar.dateComponents([.year, .month], from: anchor)
            guard let year = parts.year, let month = parts.month else { return }
            if let fresh = await planner.monthMarks(year: year, month: month - 1, selectedRoleId: selectedRole),
               !Task.isCancelled { marks = fresh }
        }
    }

    private func weekdayHeading(_ text: String, fullName: String) -> some View {
        Text(text)
            .font(.system(.caption2, weight: .medium))
            .foregroundStyle(Spread.secondary)
            .fixedSize(horizontal: true, vertical: false)
            .accessibilityLabel(fullName)
            .accessibilityAddTraits(.isHeader)
    }

    /// Changes whenever the month shown, the profile, or the plan itself changes, so the dots follow edits.
    private var marksKey: String {
        let parts = PlannerDates.calendar.dateComponents([.year, .month], from: anchor)
        return "\(planner.state?.envelope.profileId ?? "")-\(parts.year ?? 0)-\(parts.month ?? 0)-\(planner.state?.revision ?? 0)-\(selectedRole ?? "")"
    }

    /// The dots for one day: the planner's answer when it has one, else the open week's own allocations.
    private func mark(for iso: String) -> NativeDayMark {
        if let known = marks[iso] { return known }
        var colors: [String] = []
        for role in snapshot.roles where snapshot.allocations.contains(where: { $0.day == iso && $0.roleId == role.id && $0.hours > 0 }) {
            colors.append(role.color)
        }
        if let selectedRole, let selected = snapshot.roles.first(where: { $0.id == selectedRole }),
           let index = colors.firstIndex(of: selected.color), index > 0 {
            colors.remove(at: index)
            colors.insert(selected.color, at: 0)
        }
        return NativeDayMark(colors: Array(colors.prefix(3)), extra: max(0, colors.count - 3))
    }

    private func dayCell(_ cell: Cell, isToday: Bool) -> some View {
        let dots: NativeDayMark = mark(for: cell.iso)
        let label = PlannerDates.label(cell.date, pattern: "EEEE MMMM d")
        let inOpenWeek = PlannerDates.weekKey(for: cell.date) == snapshot.weekKey
        let count = dots.count
        let extra = dots.extra
        return Button {
            onPick(cell.iso)
        } label: {
            VStack(spacing: 4) {
                Text("\(cell.day)")
                    .font(.system(.subheadline, weight: .semibold))
                    .monospacedDigit()
                    .lineLimit(1).minimumScaleFactor(0.6)
                    .foregroundStyle(isToday ? Spread.onAccent : (cell.inMonth ? Spread.ink : Spread.tertiary))
                    .frame(minWidth: 28, minHeight: 28)
                    .background(isToday ? Spread.accent : Color.clear, in: Circle())
                HStack(spacing: 3) {
                    ForEach(Array(dots.colors.enumerated()), id: \.offset) { _, color in
                        Circle().fill(Color(hex: color))
                            .frame(width: color == snapshot.roles.first(where: { $0.id == selectedRole })?.color ? 8 : 6,
                                   height: color == snapshot.roles.first(where: { $0.id == selectedRole })?.color ? 8 : 6)
                    }
                }
                .frame(height: 6)
                if extra > 0 {
                    Text("+\(extra)")
                        .font(.system(.caption, weight: .medium))
                        .foregroundStyle(Spread.secondary)
                        .frame(minHeight: 12)
                } else {
                    Color.clear.frame(height: 12).accessibilityHidden(true)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 56)
            .padding(.vertical, 4)
            .background(RoundedRectangle(cornerRadius: Spread.radiusRow, style: .continuous).fill(Spread.elevated))
            // The open week's seven days carry a blue hairline, so the way Week sits inside Month stays visible.
            .overlay(
                RoundedRectangle(cornerRadius: Spread.radiusRow, style: .continuous)
                    .strokeBorder(inOpenWeek ? Spread.accent.opacity(0.75) : Spread.line, lineWidth: inOpenWeek ? 1.5 : 0.5)
            )
            .contentShape(RoundedRectangle(cornerRadius: Spread.radiusRow, style: .continuous))
        }
        .buttonStyle(.spreadPress)
        .modifier(CalendarMorph(id: "calendar-day-\(cell.iso)", namespace: morphNamespace))
        .accessibilityLabel("\(isToday ? "Today, " : "")\(inOpenWeek ? "Open week, " : "")\(label). \(count == 0 ? "No responsibilities scheduled." : "\(count) \(count == 1 ? "responsibility" : "responsibilities") scheduled.")")
        .accessibilityAddTraits(isToday ? .isSelected : [])
        .accessibilityIdentifier("month-day-\(cell.iso)")
    }
}

/// Applies the Week strip / Month grid shared-geometry id only when a namespace is given (never in Classic).
private struct CalendarMorph: ViewModifier {
    let id: String
    let namespace: Namespace.ID?

    func body(content: Content) -> some View {
        if let namespace {
            content.matchedGeometryEffect(id: id, in: namespace)
        } else {
            content
        }
    }
}
#endif
