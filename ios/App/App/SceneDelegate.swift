import UIKit
import Capacitor
#if DEBUG
import SwiftUI
import SpreadNativeV2
#endif

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        #if DEBUG
        // Opt-in, fixture-only native preview: Edit Scheme > Run > Arguments.
        // The default and all Release launches continue into the approved Capacitor app.
        if ProcessInfo.processInfo.arguments.contains("-SpreadNativeV2Preview") {
            window?.rootViewController = UIHostingController(rootView: SpreadNativeV2Preview())
        } else {
            window?.rootViewController = SpreadBridgeViewController()
        }
        #else
        window?.rootViewController = SpreadBridgeViewController()
        #endif
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
