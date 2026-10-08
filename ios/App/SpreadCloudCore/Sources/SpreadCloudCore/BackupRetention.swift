import Foundation

public struct BackupEntry: Equatable {
    public let name: String
    public let createdAt: Date
    public let pin: String?
    public let bytes: Int

    public init(name: String, createdAt: Date, pin: String?, bytes: Int) {
        self.name = name
        self.createdAt = createdAt
        self.pin = pin
        self.bytes = bytes
    }
}

public struct RetentionPolicy {
    public var dailyDays: Int = 7
    public var weeklyDays: Int = 35
    public var monthlyDays: Int = 120
    public var pinnedDays: Int = 30
    /// Soft ceiling for one device's folder. Never forces out the newest backup.
    public var maxBytes: Int = 200 * 1024 * 1024

    public init() {}
}

/// Decides which of one device's backups may be deleted. It only ever answers for the device's
/// own folder: callers pass the device's entries and never another device's.
public enum BackupRetention {
    public static func namesToDelete(entries: [BackupEntry], now: Date, policy: RetentionPolicy = RetentionPolicy()) -> Set<String> {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        let ordered = entries.sorted { $0.createdAt > $1.createdAt }
        var keep = Set<String>()

        // The newest regular backup is never removed, whatever else happens.
        if let newest = ordered.first(where: { $0.pin == nil }) { keep.insert(newest.name) }

        func ageDays(_ entry: BackupEntry) -> Double { now.timeIntervalSince(entry.createdAt) / 86_400 }

        for entry in ordered where entry.pin != nil && ageDays(entry) <= Double(policy.pinnedDays) {
            keep.insert(entry.name)
        }

        // Newest per bucket, walking from the newest backup so the newest of each bucket wins.
        var seenDay = Set<String>(), seenWeek = Set<String>(), seenMonth = Set<String>()
        for entry in ordered where entry.pin == nil {
            let age = ageDays(entry)
            let c = calendar.dateComponents([.year, .month, .day, .weekOfYear, .yearForWeekOfYear], from: entry.createdAt)
            let day = "\(c.year ?? 0)-\(c.month ?? 0)-\(c.day ?? 0)"
            let week = "\(c.yearForWeekOfYear ?? 0)-W\(c.weekOfYear ?? 0)"
            let month = "\(c.year ?? 0)-\(c.month ?? 0)"
            if age <= Double(policy.dailyDays), seenDay.insert(day).inserted { keep.insert(entry.name) }
            if age <= Double(policy.weeklyDays), seenWeek.insert(week).inserted { keep.insert(entry.name) }
            if age <= Double(policy.monthlyDays), seenMonth.insert(month).inserted { keep.insert(entry.name) }
        }

        var doomed = Set(ordered.map(\.name)).subtracting(keep)

        // Over the size ceiling: drop the oldest regular backups that are still kept, but never the newest.
        var total = ordered.filter { !doomed.contains($0.name) }.reduce(0) { $0 + $1.bytes }
        if total > policy.maxBytes {
            let newestName = ordered.first(where: { $0.pin == nil })?.name
            for entry in ordered.reversed() where entry.pin == nil && entry.name != newestName && !doomed.contains(entry.name) {
                if total <= policy.maxBytes { break }
                doomed.insert(entry.name)
                total -= entry.bytes
            }
        }
        return doomed
    }
}
