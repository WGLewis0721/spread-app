import Capacitor
import Foundation
import SwiftData
import SwiftUI
import UIKit

/// Only used by Spread Studio's internal iOS preview. The native deck is an isolated full-screen
/// overlay with its own SwiftData store; it never reads or writes Spread's planner state.
@objc(SpreadContactDeckPlugin)
public final class SpreadContactDeckPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SpreadContactDeckPlugin"
    public let jsName = "SpreadContactDeck"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise)
    ]

    @objc public func open(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self, let presenter = self.bridge?.viewController else {
                call.reject("The native Spread view is unavailable.")
                return
            }
            guard presenter.presentedViewController == nil else {
                call.reject("Close the current screen before opening Contact Deck.")
                return
            }
            do {
                let folder = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
                    .appendingPathComponent("ContactDeckStudio", isDirectory: true)
                try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                let fileURL = folder.appendingPathComponent("ContactDeckStudio.store")
                let configuration = ModelConfiguration(url: fileURL, cloudKitDatabase: .none)
                let container = try ModelContainer(for: DeckContact.self, ContactDeck.self, configurations: configuration)
                // No StoreKit transaction, subscription, purchase or separate app identity in
                // the embedded review experience. The independent product retains its own store.
                let preview = PurchaseStore(studioPreview: true)
                let deck = DeckHome(onBack: { [weak presenter] in
                    presenter?.dismiss(animated: true)
                })
                .modelContainer(container)
                .environment(preview)
                let controller = UIHostingController(rootView: deck)
                controller.modalPresentationStyle = .fullScreen
                presenter.present(controller, animated: true) {
                    call.resolve()
                }
            } catch {
                call.reject("Contact Deck could not open its local data store: \(error.localizedDescription)")
            }
        }
    }
}
