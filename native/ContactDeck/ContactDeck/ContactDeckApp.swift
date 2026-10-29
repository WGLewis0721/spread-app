import SwiftUI
import SwiftData

@main
struct ContactDeckApp: App {
    @State private var purchase = PurchaseStore()
    private let container: ModelContainer?
    private let storageError: String?
    init() {
        do {
            let testing = ProcessInfo.processInfo.arguments.contains("--uitesting") || ProcessInfo.processInfo.arguments.contains("--onboarding")
            if ProcessInfo.processInfo.arguments.contains("--onboarding") { UserDefaults.standard.set(false, forKey: "contactdeck.onboarded") }
            container = try ModelContainer(for: DeckContact.self, ContactDeck.self, configurations: ModelConfiguration(isStoredInMemoryOnly: testing, cloudKitDatabase: .none))
            storageError = nil
        } catch {
            container = nil
            storageError = error.localizedDescription
        }
    }
    var body: some Scene {
        WindowGroup {
            if let container {
                DeckHome().modelContainer(container).environment(purchase)
                    .task { await purchase.start() }
            } else {
                ContentUnavailableView("Your deck couldn't open", systemImage: "externaldrive.badge.exclamationmark", description: Text("Your saved contacts have been kept. Close and reopen Contact Deck.\n\(storageError ?? "Storage unavailable")"))
                    .padding()
            }
        }
    }
}
