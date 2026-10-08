import Foundation

/// Integrity check for a synced item's payload. A record whose payload file is missing, truncated
/// or altered must be refused, never read as an empty item (which would erase the local copy).
public enum PayloadCheck {
    /// Largest payload we will send. CloudKit assets allow far more; this keeps one item sane.
    public static let maxBytes = 1_000_000

    /// FNV-1a 64-bit over the UTF-8 bytes, as 16 hex digits. Not a security feature: it catches
    /// truncation and corruption. It needs no framework, so it also runs under `swift test` on Linux.
    public static func hash(_ text: String) -> String {
        var h: UInt64 = 0xcbf29ce484222325
        for byte in text.utf8 {
            h ^= UInt64(byte)
            h = h &* 0x100000001b3
        }
        let hex = String(h, radix: 16)
        return String(repeating: "0", count: 16 - hex.count) + hex
    }

    public enum Verdict: Equatable {
        case ok(String)
        case missing
        case mismatch
    }

    /// `text` is nil when the asset could not be read.
    public static func verify(text: String?, expectedHash: String?) -> Verdict {
        guard let text else { return .missing }
        guard let expectedHash, expectedHash == hash(text) else { return .mismatch }
        return .ok(text)
    }

    public static func fits(_ text: String) -> Bool { text.utf8.count <= maxBytes }
}
