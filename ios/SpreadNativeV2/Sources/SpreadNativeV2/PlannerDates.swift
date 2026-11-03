import Foundation

enum PlannerDates {
    static var calendar: Calendar {
        var value = Calendar(identifier: .gregorian)
        value.timeZone = TimeZone(secondsFromGMT: 0)!
        return value
    }
    static func label(_ date: Date, pattern: String) -> String {
        let f = DateFormatter(); f.calendar = calendar; f.timeZone = calendar.timeZone
        f.locale = .current; f.dateFormat = pattern; return f.string(from: date)
    }
    struct MonthCell: Identifiable {
        let id: String
        let day: Int?
        let date: Date?
    }
    static func monthCells(weekKey: String) -> [MonthCell] {
        let base = date(weekKey)
        let first = calendar.date(from: calendar.dateComponents([.year, .month], from: base)) ?? base
        let range = calendar.range(of: .day, in: .month, for: first) ?? 1..<29
        let offset = (calendar.component(.weekday, from: first) + 5) % 7
        let blanks = (0..<offset).map { MonthCell(id: "blank-\(weekKey)-\($0)", day: nil, date: nil) }
        return blanks + range.map { day in
            let value = calendar.date(byAdding: .day, value: day - 1, to: first) ?? first
            return MonthCell(id: "date-" + formatter.string(from: value), day: day, date: value)
        }
    }
    static func weekKey(for date: Date) -> String {
        let offset = (calendar.component(.weekday, from: date) + 5) % 7
        return formatter.string(from: calendar.date(byAdding: .day, value: -offset, to: date) ?? date)
    }
    static let formatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(secondsFromGMT: 0)
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    static func date(_ iso: String) -> Date {
        formatter.date(from: iso) ?? Date(timeIntervalSince1970: 0)
    }

    static func weekISO(base: String, offset: Int) -> String {
        let shifted = calendar.date(byAdding: .day, value: offset * 7, to: date(base)) ?? date(base)
        return formatter.string(from: shifted)
    }

    static func dayISO(weekKey: String, index: Int) -> String {
        let day = calendar.date(byAdding: .day, value: index, to: date(weekKey)) ?? date(weekKey)
        return formatter.string(from: day)
    }

    static func weekday(weekKey: String, index: Int) -> String {
        let d = date(dayISO(weekKey: weekKey, index: index))
        return label(d, pattern: "EEE")
    }

    static func dayNumber(weekKey: String, index: Int) -> String {
        String(calendar.component(.day, from: date(dayISO(weekKey: weekKey, index: index))))
    }

    static func weekRange(base: String, offset: Int) -> String {
        let monday = date(weekISO(base: base, offset: offset))
        let sunday = calendar.date(byAdding: .day, value: 6, to: monday) ?? monday
        return "\(label(monday, pattern: "MMM d")) – \(label(sunday, pattern: "MMM d"))"
    }
}
