import Capacitor
import UIKit

/// The web view controller, with Spread's own plugin registered. Plugins that live in the app
/// target (rather than an npm package) are registered here.
final class SpreadBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SpreadCloudPlugin())
    }
}
