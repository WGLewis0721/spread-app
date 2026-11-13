import Foundation

/// Versioned, offline release notes shipped inside the signed app.
/// A new public release prepends one entry in Resources/ReleaseNotes.json.
struct SpreadReleaseNote: Decodable, Equatable, Identifiable {
    let id: String
    let version: String
    let date: String
    let title: String
    let changes: [String]
}

struct SpreadReleaseNotesDocument: Decodable {
    let formatVersion: Int
    let releases: [SpreadReleaseNote]
}

enum SpreadReleaseNotes {
    static let lastSeenKey = "native.whatsNew.lastSeenRelease"

    /// Never fetch the network or examine the user's tasks to build release notes.
    static let entries: [SpreadReleaseNote] = {
        guard let url = Bundle.module.url(forResource: "ReleaseNotes", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let document = try? JSONDecoder().decode(SpreadReleaseNotesDocument.self, from: data),
              document.formatVersion == 1 else { return [] }
        return document.releases
    }()

    static func newest(for version: String, in entries: [SpreadReleaseNote] = SpreadReleaseNotes.entries) -> SpreadReleaseNote? {
        entries.first(where: { $0.version == version })
    }

    /// Every entry newer than the last one the user saw, newest first, for one marketing
    /// version. Each build ships the notes it contains, so a build's changes open together.
    /// With nothing seen yet, or when the last-seen entry is gone, this is the newest day's notes.
    static func unseen(for version: String, lastSeenID: String,
                       in entries: [SpreadReleaseNote] = SpreadReleaseNotes.entries) -> [SpreadReleaseNote] {
        let current = entries.filter { $0.version == version }
        guard let newestEntry = current.first else { return [] }
        if let seen = current.firstIndex(where: { $0.id == lastSeenID }) {
            return Array(current[..<seen])
        }
        return current.filter { $0.date == newestEntry.date }
    }

    /// One list for a group of entries, so a build reads as a single card.
    static func combined(_ group: [SpreadReleaseNote]) -> SpreadReleaseNote? {
        guard let first = group.first else { return nil }
        return SpreadReleaseNote(id: first.id, version: first.version, date: first.date,
                                 title: first.title, changes: group.flatMap { $0.changes })
    }

    /// Distinct release IDs prevent repeated popups for every Codemagic build
    /// when CFBundleVersion changes but the user-facing release has not.
    /// An unlisted app version does not trigger stale patch notes.
    static func shouldPresent(version: String, lastSeenID: String,
                              entries: [SpreadReleaseNote] = SpreadReleaseNotes.entries) -> Bool {
        !unseen(for: version, lastSeenID: lastSeenID, in: entries).isEmpty
    }

    static var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? ""
    }
}
