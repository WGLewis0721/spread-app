import Foundation

/// Backups are stored as `Backups/<deviceId>/<stamp>-<seq>[.<pin>].spreadbackup`.
///
/// Everything read back from iCloud is untrusted: another device wrote it, a person may have
/// renamed it in Files, and a damaged name must never turn into a path outside the backup folder.
/// So names and device ids are parsed against strict patterns and rejected otherwise.
public enum BackupNaming {
    public static let fileExtension = "spreadbackup"
    public static let rootFolder = "Backups"

    /// Accepts the UUIDs the app generates and nothing that could contain a path separator.
    public static func isValidDeviceId(_ value: String) -> Bool {
        guard value.count >= 8, value.count <= 64 else { return false }
        return value.unicodeScalars.allSatisfy { scalar in
            (scalar.value >= 48 && scalar.value <= 57)
                || (scalar.value >= 65 && scalar.value <= 90)
                || (scalar.value >= 97 && scalar.value <= 122)
                || scalar == "-"
        }
    }

    public static func isValidPinLabel(_ value: String) -> Bool {
        guard !value.isEmpty, value.count <= 32 else { return false }
        return value.unicodeScalars.allSatisfy { scalar in
            (scalar.value >= 97 && scalar.value <= 122) || (scalar.value >= 48 && scalar.value <= 57) || scalar == "-"
        }
    }

    private static func utcCalendar() -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        return calendar
    }

    public static func fileName(createdAt: Date, seq: Int, pin: String? = nil) -> String? {
        guard seq >= 0, seq <= 9_999_999 else { return nil }
        if let pin, !isValidPinLabel(pin) { return nil }
        let parts = utcCalendar().dateComponents([.year, .month, .day, .hour, .minute, .second], from: createdAt)
        guard let y = parts.year, let mo = parts.month, let d = parts.day, let h = parts.hour, let mi = parts.minute, let s = parts.second else {
            return nil
        }
        let stamp = String(format: "%04d%02d%02dT%02d%02d%02dZ", y, mo, d, h, mi, s)
        let sequence = String(format: "%07d", seq)
        let pinPart = pin.map { ".\($0)" } ?? ""
        return "\(stamp)-\(sequence)\(pinPart).\(fileExtension)"
    }

    public struct Parsed: Equatable {
        public let createdAt: Date
        public let seq: Int
        public let pin: String?
    }

    public static func parse(fileName: String) -> Parsed? {
        let suffix = ".\(fileExtension)"
        guard fileName.hasSuffix(suffix) else { return nil }
        let stem = String(fileName.dropLast(suffix.count))
        let pieces = stem.split(separator: ".", maxSplits: 1, omittingEmptySubsequences: false).map(String.init)
        let head = pieces[0]
        let pin: String? = pieces.count == 2 ? pieces[1] : nil
        if let pin, !isValidPinLabel(pin) { return nil }
        let chunks = head.split(separator: "-", omittingEmptySubsequences: false).map(String.init)
        guard chunks.count == 2, chunks[0].count == 16, chunks[1].count == 7 else { return nil }
        guard let seq = Int(chunks[1]), chunks[1].allSatisfy({ $0.isASCII && $0.isNumber }) else { return nil }
        let stamp = Array(chunks[0])
        guard stamp[8] == "T", stamp[15] == "Z" else { return nil }
        func number(_ range: Range<Int>) -> Int? {
            let text = String(stamp[range])
            guard text.allSatisfy({ $0.isASCII && $0.isNumber }) else { return nil }
            return Int(text)
        }
        guard let y = number(0..<4), let mo = number(4..<6), let d = number(6..<8),
              let h = number(9..<11), let mi = number(11..<13), let s = number(13..<15) else { return nil }
        var components = DateComponents()
        components.year = y; components.month = mo; components.day = d
        components.hour = h; components.minute = mi; components.second = s
        let calendar = utcCalendar()
        guard let date = calendar.date(from: components) else { return nil }
        // Reject impossible dates such as month 13 that `Calendar` would roll over.
        let back = calendar.dateComponents([.year, .month, .day, .hour, .minute, .second], from: date)
        guard back.year == y, back.month == mo, back.day == d, back.hour == h, back.minute == mi, back.second == s else { return nil }
        return Parsed(createdAt: date, seq: seq, pin: pin)
    }
}
