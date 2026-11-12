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

    /// Distinct release IDs prevent repeated popups for every Codemagic build
    /// when CFBundleVersion changes but the user-facing release has not.
    /// An unlisted app version does not trigger stale patch notes.
    static func shouldPresent(version: String, lastSeenID: String,
                              entries: [SpreadReleaseNote] = SpreadReleaseNotes.entries) -> Bool {
        guard let newest = newest(for: version, in: entries) else { return false }
        return newest.id != lastSeenID
    }

    static var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? ""
    }
}
