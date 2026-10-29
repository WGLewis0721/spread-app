import StoreKit
import SwiftUI

@MainActor @Observable
final class PurchaseStore {
    static let productID = "com.graymatter.contactdeck.complete"
    private let studioPreview: Bool
    init(studioPreview: Bool = false) {
        self.studioPreview = studioPreview
        unlocked = studioPreview
    }
    static let freeLimit = 12
    private(set) var product: Product?
    private(set) var unlocked = false
    private(set) var busy = false
    var message: String?
    private var updates: Task<Void, Never>?
    func start() async {
        if studioPreview { unlocked = true; return }
        guard updates == nil else { return }
        updates = Task { [weak self] in
            for await result in StoreKit.Transaction.updates {
                guard let self else { return }
                if case .verified(let transaction) = result, transaction.productID == Self.productID {
                    await self.refresh()
                    await transaction.finish()
                }
            }
        }
        await refresh()
        await load()
    }
    func load() async {
        if studioPreview { return }
        do { product = try await Product.products(for: [Self.productID]).first }
        catch { message = "The App Store is unavailable. Your deck still works." }
    }
    func refresh() async {
        if studioPreview { unlocked = true; return }
        var entitled = false
        for await result in StoreKit.Transaction.currentEntitlements {
            if case .verified(let transaction) = result, transaction.productID == Self.productID, transaction.revocationDate == nil { entitled = true }
        }
        unlocked = entitled
    }
    func buy() async {
        guard !studioPreview else { return }
        guard !busy, let product else { return }
        busy = true; message = nil
        defer { busy = false }
        do {
            switch try await product.purchase() {
            case .success(.verified(let transaction)):
                await refresh(); await transaction.finish()
            case .success(.unverified): message = "This purchase couldn't be verified. Please restore purchases."
            case .pending: message = "Purchase awaiting approval. You can keep browsing."
            case .userCancelled: break
            @unknown default: break
            }
        } catch { message = "Purchase couldn't finish. Please try again." }
    }
    func restore() async {
        guard !studioPreview else { return }
        guard !busy else { return }
        busy = true; message = nil
        defer { busy = false }
        do { try await AppStore.sync(); await refresh(); if !unlocked { message = "No Complete purchase was found for this Apple Account." } }
        catch { message = "Restore couldn't finish. Please try again." }
    }
}

struct UnlockView: View {
    @Environment(PurchaseStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 24) {
                Image(systemName: "rectangle.stack.fill").font(.largeTitle).foregroundStyle(.tint)
                Text("Your people.\nRoom for everyone.").font(.largeTitle.bold())
                Text("Keep all three views free. Unlock unlimited contacts and a quiet initials card style with one purchase.").foregroundStyle(.secondary)
                Label("One payment. No subscription.", systemImage: "checkmark.circle")
                Label("Your contacts stay on your device.", systemImage: "lock")
                Spacer(minLength: 8)
                if let message = store.message { Text(message).font(.callout).accessibilityIdentifier("purchaseMessage") }
                Button {
                    Task { await store.buy(); if store.unlocked { dismiss() } }
                } label: {
                    HStack { Spacer(); if store.busy { ProgressView() }; Text(store.product.map { "Unlock Complete · \($0.displayPrice)" } ?? "Price unavailable"); Spacer() }
                }.buttonStyle(.borderedProminent).controlSize(.large).disabled(store.product == nil || store.busy)
                if store.product == nil { Button("Retry App Store") { Task { await store.load() } }.frame(maxWidth: .infinity) }
                Button("Restore purchases") { Task { await store.restore(); if store.unlocked { dismiss() } } }.frame(maxWidth: .infinity).disabled(store.busy)
            }.padding(28)
            .navigationTitle("Contact Deck Complete").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } } }
        }
    }
}
