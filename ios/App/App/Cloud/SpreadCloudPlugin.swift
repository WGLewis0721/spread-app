import Capacitor
import Foundation
import SpreadCloudCore

/// The bridge between the web planner and the iCloud features. The planner owns every decision
/// about *what* to back up or merge; this only moves bytes, reports facts about iCloud, and keeps
/// this device's identity. Nothing runs unless the web app calls it, and the web app only calls
/// it when the matching `cloud.*` flag is on.
@objc(SpreadCloudPlugin)
public class SpreadCloudPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SpreadCloudPlugin"
    public let jsName = "SpreadCloud"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "backupWrite", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "backupList", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "backupRead", returnType: CAPPluginReturnPromise),
    ]

    private let io = DispatchQueue(label: "com.graymatter.spread.cloud.io", qos: .utility)
    private let accounts = AccountMonitor()
    private lazy var store = BackupStore(deviceId: DeviceIdentity.current())
    private static let iso: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    override public func load() {
        accounts.start { [weak self] in self?.notifyListeners("accountChanged", data: [:]) }
    }

    private func describe(_ listing: BackupListing) -> [String: Any] {
        var row: [String: Any] = [
            "deviceId": listing.deviceId,
            "name": listing.name,
            "createdAt": Self.iso.string(from: listing.createdAt),
            "bytes": listing.bytes,
            "uploaded": listing.uploaded,
            "downloaded": listing.downloaded,
            "own": listing.deviceId == store.deviceId,
        ]
        if let pin = listing.pin { row["pin"] = pin }
        if let error = listing.uploadError { row["uploadError"] = error }
        return row
    }

    private func fail(_ call: CAPPluginCall, _ error: Error) {
        let code: String
        switch error as? BackupError {
        case .some(.noSpace): code = "noSpace"
        case .some(.verificationFailed): code = "verificationFailed"
        case .some(.invalidArguments): code = "invalidArguments"
        case .some(.notFound): code = "notFound"
        case .some(.downloadTimedOut): code = "downloadTimedOut"
        case .none: code = "failed"
        }
        call.reject(error.localizedDescription, code, error)
    }

    /// Facts only. The web app turns them into the sentence the person reads.
    @objc func status(_ call: CAPPluginCall) {
        Task {
            let account = await accounts.snapshot()
            io.async { [self] in
                let own = store.list(ownOnly: true)
                var result: [String: Any] = [
                    "deviceId": store.deviceId,
                    "cloudKit": account.cloudKit,
                    "driveAvailable": account.driveAvailable,
                    "backupCount": own.count,
                ]
                if let newest = own.first(where: { $0.pin == nil }) {
                    result["lastBackupAt"] = Self.iso.string(from: newest.createdAt)
                    result["lastBackupUploaded"] = newest.uploaded
                    if let error = newest.uploadError { result["lastUploadError"] = error }
                }
                if let uploaded = own.first(where: { $0.uploaded && $0.pin == nil }) {
                    result["lastUploadedAt"] = Self.iso.string(from: uploaded.createdAt)
                }
                call.resolve(result)
            }
        }
    }

    @objc func backupWrite(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), let data = text.data(using: .utf8) else {
            call.reject("text is required", "invalidArguments")
            return
        }
        let pin = call.getString("pin")
        io.async { [self] in
            do {
                let result = try store.write(data, pin: pin)
                call.resolve([
                    "name": result.name,
                    "bytes": result.bytes,
                    "createdAt": Self.iso.string(from: result.createdAt),
                    "verified": result.verified,
                    "inICloudContainer": result.inICloudContainer,
                ])
            } catch {
                fail(call, error)
            }
        }
    }

    @objc func backupList(_ call: CAPPluginCall) {
        let ownOnly = call.getBool("ownOnly") ?? false
        io.async { [self] in
            call.resolve(["backups": store.list(ownOnly: ownOnly).map(describe)])
        }
    }

    @objc func backupRead(_ call: CAPPluginCall) {
        guard let device = call.getString("deviceId"), let name = call.getString("name") else {
            call.reject("deviceId and name are required", "invalidArguments")
            return
        }
        io.async { [self] in
            do {
                let data = try store.read(device: device, name: name)
                guard let text = String(data: data, encoding: .utf8) else { throw BackupError.verificationFailed }
                call.resolve(["text": text])
            } catch {
                fail(call, error)
            }
        }
    }
}
