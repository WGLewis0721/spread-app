#if os(iOS)
import SwiftUI
import UIKit

/// A read-only export of the open week, produced by the store's dispatcher (`exportWeek`). The planner never
/// changes for an export, so nothing here is replay-protected or written back.
struct NativeExport: Decodable {
    let format: String
    let content: String
}

/// Print or PDF, Word, and plain text. The system print sheet offers "Save as PDF"; the share sheet carries
/// the Word file or the text. Nothing is written to Spread's own storage.
@MainActor
enum WeekExport {
    static func printWeek(html: String) {
        let info = UIPrintInfo(dictionary: nil)
        info.jobName = "Spread week"
        info.outputType = .general
        let controller = UIPrintInteractionController.shared
        controller.printInfo = info
        let formatter = UIMarkupTextPrintFormatter(markupText: html)
        formatter.perPageContentInsets = UIEdgeInsets(top: 54, left: 54, bottom: 54, right: 54)
        controller.printFormatter = formatter
        if UIDevice.current.userInterfaceIdiom == .phone {
            controller.present(animated: true, completionHandler: nil)
        } else if let top = topController(), let window = top.view.window {
            controller.present(from: window.bounds, in: window, animated: true, completionHandler: nil)
        }
    }

    static func share(_ items: [Any]) {
        guard let top = topController() else { return }
        let activity = UIActivityViewController(activityItems: items, applicationActivities: nil)
        activity.popoverPresentationController?.sourceView = top.view
        activity.popoverPresentationController?.sourceRect = CGRect(x: top.view.bounds.midX, y: top.view.bounds.maxY - 44, width: 1, height: 1)
        top.present(activity, animated: true)
    }

    /// Writes the Word file to the temporary directory (never Spread's storage) so the share sheet can hand it over.
    static func wordFile(base64: String) -> URL? {
        guard let data = Data(base64Encoded: base64) else { return nil }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("Spread week.docx")
        try? FileManager.default.removeItem(at: url)
        do {
            try data.write(to: url, options: .atomic)
            return url
        } catch {
            return nil
        }
    }

    private static func topController() -> UIViewController? {
        let windows = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\.windows)
        var top = (windows.first { $0.isKeyWindow } ?? windows.first)?.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        return top
    }
}
#endif
