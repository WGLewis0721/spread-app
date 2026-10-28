import Capacitor
import Foundation
import WidgetKit

/// Copies a tiny snapshot of today (counts and hours, titles only if the owner opted in) into the
/// App Group container so the widget extension can read it. The web app builds the snapshot and
/// only calls this on device. This file is new on purpose: the storage mirror is not touched.
@objc(SpreadWidgetPlugin)
public class SpreadWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SpreadWidgetPlugin"
    public let jsName = "SpreadWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "write", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
    ]

    static let groupID = "group.com.graymatter.spread"
    static let fileName = "widget-snapshot.json"
    static let maxBytes = 2048

    private static func fileURL() -> URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID)?.appendingPathComponent(fileName)
    }

    @objc func write(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), let data = json.data(using: .utf8), data.count <= Self.maxBytes else {
            call.reject("Snapshot missing or too large.")
            return
        }
        // Refuse anything that is not the agreed shape, so a bug in the web app cannot put free text here.
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              object["version"] as? Int == 1,
              object["date"] is String, object["done"] is Int, object["total"] is Int, object["hours"] is NSNumber else {
            call.reject("Snapshot has the wrong shape.")
            return
        }
        guard let url = Self.fileURL() else {
            call.reject("App Group unavailable.")
            return
        }
        do {
            try data.write(to: url, options: [.atomic, .completeFileProtection])
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve()
        } catch {
            call.reject("Couldn't write the widget snapshot.")
        }
    }

    @objc func clear(_ call: CAPPluginCall) {
        if let url = Self.fileURL() { try? FileManager.default.removeItem(at: url) }
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
