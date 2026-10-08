import CloudKit
import Foundation

/// What iCloud allows right now. Read on demand; changes are announced through `onChange`.
struct AccountSnapshot {
    /// "available", "noAccount", "restricted", "couldNotDetermine", "temporarilyUnavailable" or "unknown".
    let cloudKit: String
    /// iCloud Drive (the document container) is usable: signed in and Spread is allowed to use it.
    let driveAvailable: Bool
}

final class AccountMonitor {
    private var observers: [NSObjectProtocol] = []

    func snapshot() async -> AccountSnapshot {
        let drive = FileManager.default.ubiquityIdentityToken != nil
        let state: String
        do {
            let status = try await CKContainer(identifier: SpreadCloudConfig.containerId).accountStatus()
            switch status {
            case .available: state = "available"
            case .noAccount: state = "noAccount"
            case .restricted: state = "restricted"
            case .couldNotDetermine: state = "couldNotDetermine"
            case .temporarilyUnavailable: state = "temporarilyUnavailable"
            @unknown default: state = "unknown"
            }
        } catch {
            state = "couldNotDetermine"
        }
        return AccountSnapshot(cloudKit: state, driveAvailable: drive)
    }

    func start(onChange: @escaping () -> Void) {
        guard observers.isEmpty else { return }
        let center = NotificationCenter.default
        observers.append(center.addObserver(forName: .CKAccountChanged, object: nil, queue: .main) { _ in onChange() })
        observers.append(center.addObserver(forName: NSNotification.Name.NSUbiquityIdentityDidChange, object: nil, queue: .main) { _ in onChange() })
    }

    func stop() {
        for observer in observers { NotificationCenter.default.removeObserver(observer) }
        observers.removeAll()
    }

    deinit { stop() }
}
