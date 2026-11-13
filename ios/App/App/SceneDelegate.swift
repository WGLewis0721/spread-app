import UIKit
import Capacitor
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        // The obsolete debug fixture preview was removed; both Debug and Release launch the real native host.
        window?.rootViewController = SpreadContainerViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
        for context in connectionOptions.urlContexts { handleWidgetURL(context.url) }
    }

    private func handleWidgetURL(_ url: URL) {
        guard url.scheme == "spread" else { return }
        if url.host == "today" {
            UserDefaults.standard.set(true, forKey: "native.widget.openToday")
            NotificationCenter.default.post(name: Notification.Name("SpreadOpenToday"), object: nil)
        } else if url.host == "focus" {
            UserDefaults.standard.set(true, forKey: "native.widget.openFocus")
            NotificationCenter.default.post(name: Notification.Name("SpreadOpenFocus"), object: nil)
        } else if url.host == "life" {
            // spread://life?card=<id> opens that Life card. A missing or empty id is ignored.
            let card = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                .queryItems?.first(where: { $0.name == "card" })?.value
            guard let card, !card.isEmpty else { return }
            UserDefaults.standard.set(card, forKey: "native.widget.openLifeCard")
            NotificationCenter.default.post(name: Notification.Name("SpreadOpenLifeCard"), object: nil)
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts { handleWidgetURL(context.url) }
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
