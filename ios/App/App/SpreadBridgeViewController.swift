import Capacitor
import UIKit
import SwiftUI
import SpreadNativeV2
import WebKit

/// Keep the original WebKit planner alive as the sole engine and persistence owner.
/// SwiftUI owns presentation only. Backup/restore remains the established React workflow.
final class SpreadBridgeViewController: CAPBridgeViewController {
    private var nativeHost: UIHostingController<SpreadLiveRoot>?
    private var planner: LivePlanner?
    private var startup: Task<Void, Never>?
    private var resumeButton: UIButton?

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SpreadCloudPlugin())
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
    @MainActor private func openNative() {
        guard nativeHost == nil, let webView else { return }
        let model = planner ?? LivePlanner { [weak webView] message in
            guard let webView else { throw NSError(domain: "Spread", code: 2) }
            let value = try await webView.callAsyncJavaScript(
                "if (!window.SpreadNativeHost) throw new Error('Planner unavailable'); return await window.SpreadNativeHost.exchange(message);",
                arguments: ["message": message], in: nil, contentWorld: .page)
            guard let text = value as? String else { throw NSError(domain: "Spread", code: 3) }
            return text
        }
        planner = model
        let host = UIHostingController(rootView: SpreadLiveRoot(planner: model, recovery: { [weak self] in self?.openRecovery() }))
        addChild(host)
        host.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(host.view)
        NSLayoutConstraint.activate([
            host.view.topAnchor.constraint(equalTo: view.topAnchor), host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor), host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        host.didMove(toParent: self)
        nativeHost = host
        resumeButton?.removeFromSuperview()
    }
    @MainActor private func openRecovery() {
        nativeHost?.willMove(toParent: nil)
        nativeHost?.view.removeFromSuperview()
        nativeHost?.removeFromParent()
        nativeHost = nil
        let button = UIButton(type: .system)
        button.setTitle("Return to native Spread", for: .normal)
        button.backgroundColor = .secondarySystemBackground
        button.layer.cornerRadius = 12
        button.addTarget(self, action: #selector(resumeNative), for: .touchUpInside)
        button.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(button)
        NSLayoutConstraint.activate([
            button.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -8),
            button.centerXAnchor.constraint(equalTo: view.centerXAnchor), button.heightAnchor.constraint(greaterThanOrEqualToConstant: 44),
            button.widthAnchor.constraint(greaterThanOrEqualToConstant: 220)
        ])
        resumeButton = button
    }
    @objc private func resumeNative() { openNative() }
    deinit { startup?.cancel() }
}
