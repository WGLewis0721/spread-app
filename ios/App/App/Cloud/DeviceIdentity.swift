import Foundation
import Security
import SpreadCloudCore

/// A random id that names this device in iCloud (backup folders now, sync later).
///
/// It lives in the Keychain as "this device only", so restoring one phone's backup onto another
/// phone, or signing in to iCloud Keychain elsewhere, does not copy it. Two devices that shared an
/// id would write into the same backup folder and look like one device to sync.
/// If the Keychain is unavailable a file excluded from device backups is used instead; either way
/// the id is cached so one launch never produces two.
enum DeviceIdentity {
    private static let service = "com.graymatter.spread.device"
    private static let account = "device-id"
    private static let lock = NSLock()
    private static var cached: String?

    static func current() -> String {
        lock.lock()
        defer { lock.unlock() }
        if let cached { return cached }
        let id = readKeychain() ?? readFile() ?? create()
        cached = id
        return id
    }

    private static func create() -> String {
        let id = UUID().uuidString
        if !writeKeychain(id) { writeFile(id) }
        return id
    }

    private static func baseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }

    private static func readKeychain() -> String? {
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let text = String(data: data, encoding: .utf8),
              BackupNaming.isValidDeviceId(text) else { return nil }
        return text
    }

    private static func writeKeychain(_ id: String) -> Bool {
        SecItemDelete(baseQuery() as CFDictionary)
        var query = baseQuery()
        query[kSecValueData as String] = Data(id.utf8)
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        return SecItemAdd(query as CFDictionary, nil) == errSecSuccess
    }

    private static func fileURL() -> URL? {
        guard let base = try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true) else { return nil }
        return base.appendingPathComponent("spread-device-id")
    }

    private static func readFile() -> String? {
        guard let url = fileURL(), let text = try? String(contentsOf: url, encoding: .utf8) else { return nil }
        return BackupNaming.isValidDeviceId(text) ? text : nil
    }

    private static func writeFile(_ id: String) {
        guard var url = fileURL() else { return }
        try? id.write(to: url, atomically: true, encoding: .utf8)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? url.setResourceValues(values)
    }
}
