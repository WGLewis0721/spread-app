import Capacitor
import UIKit
import SwiftUI
import SpreadNativeV2
import WebKit

/// Keep the original WebKit planner alive as the sole engine and persistence owner.
/// SwiftUI owns presentation only. Backup/restore remains the established React workflow.
final class SpreadBridgeViewController: CAPBridgeViewController {
    private var nativeHost: UIHostingController<SpreadLiveRoot>?
    fileprivate var isShowingNative: Bool { nativeHost != nil }
    private var planner: LivePlanner?
    private var startup: Task<Void, Never>?
    private var resumeButton: UIButton?
    private var readyHandler: PlannerReadyHandler?

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SpreadCloudPlugin())
        let handler = PlannerReadyHandler(owner: self)
        readyHandler = handler
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "spreadPlannerReady")
        webView?.configuration.userContentController.add(handler, name: "spreadPlannerReady")
        #if DEBUG
        let launchArguments = ProcessInfo.processInfo.arguments
        if launchArguments.contains("-SpreadDisableMirror") {
            webView?.configuration.userContentController.addUserScript(WKUserScript(source: "window.__SpreadDisableMirror = true;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        // Debug-only fault injection for the installed-app failed-save test. The first localStorage
        // write of a planner key whose value contains the marker throws QuotaExceededError, exactly
        // what a full disk does. Later writes pass, so the real "Retry saving" path can recover.
        if let index = launchArguments.firstIndex(of: "-SpreadFailSaveMarker"), launchArguments.indices.contains(index + 1),
           let encoded = try? JSONEncoder().encode(launchArguments[index + 1]), let literal = String(data: encoded, encoding: .utf8) {
            let script = """
            (function () {
              var marker = \(literal), left = 1, proto = Storage.prototype, original = proto.setItem;
              proto.setItem = function (key, value) {
                if (left > 0 && String(key).indexOf('spread') === 0 && String(value).indexOf(marker) !== -1) {
                  left -= 1;
                  throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
                }
                return original.apply(this, arguments);
              };
            })();
            """
            webView?.configuration.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        #endif
        startup = Task { @MainActor [weak self] in
            for _ in 0..<60 {
                guard let self, !Task.isCancelled else { return }
                if let webView = self.webView {
                    let ready = try? await webView.callAsyncJavaScript(
                        "return Boolean(window.SpreadNativeHost)", arguments: [:], in: nil, contentWorld: .page)
                    if ready as? Bool == true {
                        self.openNative()
                        return
                    }
                }
                try? await Task.sleep(nanoseconds: 500_000_000)
            }
            // Never obscure the established recovery surface if engine startup fails.
        }
    }
    @MainActor fileprivate func engineChanged() {
        if nativeHost != nil { Task { await planner?.refresh() } }
        else { openNative() }
    }
    @MainActor fileprivate func openNative() {
        guard nativeHost == nil, let webView, let stage = parent else { return }
        let model = planner ?? LivePlanner { [weak webView] message in
            guard let webView else { throw NSError(domain: "Spread", code: 2) }
            let value = try await webView.callAsyncJavaScript(
                "if (!window.SpreadNativeHost) throw new Error('Planner unavailable'); return await window.SpreadNativeHost.exchange(message);",
                arguments: ["message": message], in: nil, contentWorld: .page)
            guard let text = value as? String else { throw NSError(domain: "Spread", code: 3) }
            return text
        }
        webView.endEditing(true)
        webView.accessibilityElementsHidden = true
        webView.isUserInteractionEnabled = false
        planner = model
        let host = UIHostingController(rootView: SpreadLiveRoot(planner: model, recovery: { [weak self] in self?.openRecovery() }))
        host.overrideUserInterfaceStyle = .dark
        stage.addChild(host)
        host.view.translatesAutoresizingMaskIntoConstraints = false
        stage.view.addSubview(host.view)
        NSLayoutConstraint.activate([
            host.view.topAnchor.constraint(equalTo: stage.view.topAnchor), host.view.bottomAnchor.constraint(equalTo: stage.view.bottomAnchor),
            host.view.leadingAnchor.constraint(equalTo: stage.view.leadingAnchor), host.view.trailingAnchor.constraint(equalTo: stage.view.trailingAnchor)
        ])
        host.didMove(toParent: stage)
        nativeHost = host
        stage.setNeedsStatusBarAppearanceUpdate()
        resumeButton?.removeFromSuperview()
    }
    @MainActor private func openRecovery() {
        webView?.accessibilityElementsHidden = false
        webView?.isUserInteractionEnabled = true
        nativeHost?.willMove(toParent: nil)
        nativeHost?.view.removeFromSuperview()
        nativeHost?.removeFromParent()
        nativeHost = nil
        parent?.setNeedsStatusBarAppearanceUpdate()
        let button = UIButton(type: .system)
        button.setTitle("Return to native Spread", for: .normal)
        button.backgroundColor = .secondarySystemBackground
        button.layer.cornerRadius = 12
        button.addTarget(self, action: #selector(resumeNative), for: .touchUpInside)
        button.translatesAutoresizingMaskIntoConstraints = false
        let stage = parent?.view ?? view!
        stage.addSubview(button)
        NSLayoutConstraint.activate([
            button.bottomAnchor.constraint(equalTo: stage.safeAreaLayoutGuide.bottomAnchor, constant: -8),
            button.centerXAnchor.constraint(equalTo: stage.centerXAnchor), button.heightAnchor.constraint(greaterThanOrEqualToConstant: 44),
            button.widthAnchor.constraint(greaterThanOrEqualToConstant: 220)
        ])
        resumeButton = button
    }
    @objc private func resumeNative() { openNative() }
    deinit { startup?.cancel() }
}

private final class PlannerReadyHandler: NSObject, WKScriptMessageHandler {
    weak var owner: SpreadBridgeViewController?
    init(owner: SpreadBridgeViewController) { self.owner = owner }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.webView?.url?.scheme == "capacitor", message.webView?.url?.host == "localhost" else { return }
        Task { @MainActor [weak self] in self?.owner?.engineChanged() }
    }
}

/// Capacitor's root view is WKWebView. Native UI must be a sibling, never its descendant.
final class SpreadContainerViewController: UIViewController {
    private let engine = SpreadBridgeViewController()
    override var preferredStatusBarStyle: UIStatusBarStyle { engine.isShowingNative ? .lightContent : engine.preferredStatusBarStyle }
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        addChild(engine)
        engine.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(engine.view)
        NSLayoutConstraint.activate([
            engine.view.topAnchor.constraint(equalTo: view.topAnchor),
            engine.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            engine.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            engine.view.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        engine.didMove(toParent: self)
    }
}
