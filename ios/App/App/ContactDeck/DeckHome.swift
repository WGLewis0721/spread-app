import SwiftUI
import SwiftData
import Contacts

struct DeckHome: View {
    /// A return action is provided only by the embedded Spread Studio preview.
    var onBack: (() -> Void)? = nil
    @Environment(\.modelContext) private var context
    @Environment(\.openURL) private var openURL
    @Environment(PurchaseStore.self) private var purchase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Query(sort: \DeckContact.name) private var records: [DeckContact]
    @Query(sort: \ContactDeck.name) private var decks: [ContactDeck]
    @AppStorage("contactdeck.onboarded") private var onboarded = false
    @AppStorage("contactdeck.mode") private var mode: BrowseMode = .flow
    @AppStorage("contactdeck.initials") private var initialsOnly = false
    @State private var focusedID: UUID?
    @State private var query = ""
    @State private var search = false
    @State private var selected: Set<UUID> = []
    @State private var selecting = false
    @State private var collection = "all"
    @State private var sheet: HomeSheet?
    @State private var noteContact: DeckContact?
    @State private var pendingRemove: Set<UUID> = []
    @State private var reviewingRemoval = false
    @State private var groupIDs: Set<UUID> = []
    @State private var groupName = ""
    @State private var orderedIDs: [UUID] = []
    @State private var undoIDs: Set<UUID> = []
    @State private var previousOrder: [UUID]?
    @State private var toast: String?
    @State private var error: String?
    @State private var shareURL: URL?
    @State private var pendingOnboardingImport = false
    private var testing: Bool { onBack != nil || ProcessInfo.processInfo.arguments.contains("--uitesting") }
    private var all: [DeckContact] { records.filter { $0.removedAt == nil } }
    private var contacts: [DeckContact] {
        let result = all.filter { c in
            (collection == "all" || (collection == "favorites" && c.favorite) || (collection == "reconnect" && c.reconnectDue(now: Date())) || c.deckIDs.contains(collection)) && c.matches(query)
        }
        guard !orderedIDs.isEmpty else { return result }
        let positions = Dictionary(uniqueKeysWithValues: orderedIDs.enumerated().map { ($1, $0) })
        return result.sorted { (positions[$0.id] ?? Int.max) < (positions[$1.id] ?? Int.max) }
    }
    private var collectionTitle: String {
        switch collection { case "all": "All contacts"; case "favorites": "Favorites"; case "reconnect": "A little hello"; default: decks.first(where: { $0.id == collection })?.name ?? "All contacts" }
    }
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack {
                    Menu {
                        Button("All contacts") { choose("all") }
                        Button("Favorites", systemImage: "star") { choose("favorites") }
                        Button("A little hello", systemImage: "hand.wave") { choose("reconnect") }
                        ForEach(decks) { deck in Button(deck.name) { choose(deck.id) } }
                    } label: { HStack(spacing: 5) { Text(collectionTitle).font(.subheadline.weight(.semibold)); Image(systemName: "chevron.down").font(.caption) } }
                    Spacer()
                    Text(selecting ? "\(selected.count) selected" : "\((contacts.firstIndex(where: { $0.id == focusedID }) ?? -1) + 1) / \(contacts.count)")
                        .font(.caption.monospacedDigit()).foregroundStyle(.secondary)
                }.padding(.horizontal, 24).padding(.top, 10)
                if contacts.isEmpty {
                    ContentUnavailableView {
                        Label(collection == "reconnect" ? "All caught up" : "Your people, right here", systemImage: collection == "reconnect" ? "hand.wave" : "rectangle.stack")
                    } description: { Text(collection == "reconnect" ? "Come back another day. There's no streak to keep." : "Add a contact, try the sample deck, or choose another collection.") }
                    actions: {
                        Button("Add contacts") { sheet = .importContacts }
                        if all.isEmpty { Button("Try sample deck") { seedSamples() } }
                    }
                } else if selecting {
                    ContactSelectionSpread(contacts: contacts, selected: $selected,
                                           initialsOnly: purchase.unlocked && initialsOnly)
                        .transition(.opacity.combined(with: .scale(scale: 0.97)))
                } else {
                    DeckStage(contacts: contacts, mode: mode, focusedID: $focusedID,
                              selected: $selected, isSelecting: $selecting,
                              initialsOnly: purchase.unlocked && initialsOnly,
                              onAction: action, onDropAction: droppedCard)
                        .transition(.opacity)
                }
                if selecting { selectionBar }
                else if let due = all.first(where: { $0.reconnectDue(now: Date()) }), collection == "all" {
                    Button { choose("reconnect"); focusedID = due.id } label: {
                        Label("A little hello to \(due.name.split(separator: " ").first.map(String.init) ?? due.name)?", systemImage: "hand.wave")
                            .font(.subheadline).lineLimit(1).padding(.vertical, 10)
                    }.buttonStyle(.plain).foregroundStyle(.secondary).padding(.horizontal, 20)
                }
                if !selecting {
                    Picker("Deck view", selection: $mode) {
                        ForEach(BrowseMode.allCases) { mode in Label(mode.title, systemImage: mode.symbol).tag(mode) }
                    }.pickerStyle(.segmented).padding(.horizontal, 28).padding(.bottom, 12)
                        .accessibilityIdentifier("modePicker")
                }
            }
            .background(Color(.systemBackground))
            .navigationTitle("Contact Deck").navigationBarTitleDisplayMode(.large)
            .toolbar {
                if let onBack {
                    ToolbarItem(placement: .topBarLeading) {
                        Button(action: onBack) { Label("Back to Spread", systemImage: "chevron.left") }
                            .accessibilityIdentifier("backToSpread")
                    }
                }
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button(selecting ? "Done" : "Select", systemImage: selecting ? "checkmark" : "checkmark.circle") {
                        if selecting {
                            selected.removeAll()
                            selecting = false
                        } else {
                            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.23)) { selecting = true }
                        }
                    }.accessibilityIdentifier("selectCards")
                    if !selecting {
                        Button("Search", systemImage: "magnifyingglass") { search = true }.accessibilityIdentifier("search")
                        Menu {
                        Button("Add contacts", systemImage: "person.crop.circle.badge.plus") { sheet = .importContacts }
                        Button("Shuffle", systemImage: "shuffle") { previousOrder = orderedIDs; withAnimation(reduceMotion ? .easeOut(duration: 0.16) : .spring(response: 0.42, dampingFraction: 0.84)) { orderedIDs = all.map(\.id).shuffled() }; toast = "Deck shuffled" }
                        Button("Sort by name", systemImage: "textformat.abc") { orderedIDs = [] }
                        Button("Select focused card", systemImage: "checkmark.circle") {
                            if let focusedID { selected.insert(focusedID) }
                            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.23)) { selecting = true }
                        }
                        Button("Recently removed", systemImage: "trash") { sheet = .removed }
                        Button("Settings", systemImage: "gearshape") { sheet = .settings }
                        } label: { Label("Deck options", systemImage: "ellipsis.circle") }
                    }
                }
            }
            .sheet(isPresented: $search, onDismiss: { query = "" }) { searchSheet }
            .sheet(item: $sheet) { item in
                switch item {
                case .importContacts: ContactPicker(onPick: importContacts)
                case .unlock: UnlockView()
                case .settings: settingsSheet
                case .group: groupSheet
                case .removed: removedSheet
                }
            }
            .sheet(item: $noteContact) { contact in NoteEditor(contact: contact, onSave: { save(); noteContact = nil }) }
            .sheet(isPresented: Binding(get: { shareURL != nil }, set: { if !$0 { if let shareURL { try? FileManager.default.removeItem(at: shareURL) }; shareURL = nil } })) { if let shareURL { NativeShare(items: [shareURL]) } }
            .confirmationDialog("Remove \(pendingRemove.count) card(s) from Contact Deck?", isPresented: $reviewingRemoval, titleVisibility: .visible) {
                Button("Remove \(pendingRemove.count) card(s)", role: .destructive) { removeReviewed() }
                Button("Keep contacts", role: .cancel) { pendingRemove = [] }
            } message: {
                Text(records.filter { pendingRemove.contains($0.id) }.map(\.name).joined(separator: ", ") + "\nYour iPhone contacts stay unchanged. Restore these cards any time in Recently removed.")
            }
            .alert("Couldn't save that change", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) { Button("OK") { error = nil } } message: { Text(error ?? "") }
            .safeAreaInset(edge: .bottom) {
                if let toast {
                    HStack { Text(toast).font(.callout); Spacer(); Button("Undo") { undo() } }.padding().background(.regularMaterial, in: RoundedRectangle(cornerRadius: 18)).padding(.horizontal)
                }
            }
            .fullScreenCover(isPresented: Binding(get: { !onboarded && !testing }, set: { if !$0 { onboarded = true } }), onDismiss: { if pendingOnboardingImport { pendingOnboardingImport = false; sheet = .importContacts } }) {
                OnboardingView(onSamples: { seedSamples(); onboarded = true }, onImport: { pendingOnboardingImport = true; onboarded = true })
            }
            .task { if testing && all.isEmpty { seedSamples() }; if onBack != nil { onboarded = true }; if focusedID == nil { focusedID = contacts.first?.id } }
            .onChange(of: contacts.map(\.id)) { _, ids in
                if !ids.contains(focusedID ?? UUID()) { focusedID = ids.first }
                selected.formIntersection(Set(ids))
            }
            .preferredColorScheme(nil) // iOS Settings controls Light, Dark, and Automatic.
        }
    }
    private var selectionBar: some View {
        HStack {
            Text("\(selected.count) selected").font(.subheadline)
            Spacer()
            Button("Group") { beginGrouping(selected) }
            Button("Remove", role: .destructive) { pendingRemove = selected; reviewingRemoval = true }
            Button("Done") { selected = [] }
        }.padding().background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20)).padding(.horizontal, 18)
    }
    private var searchSheet: some View {
        NavigationStack {
            List(contacts) { contact in
                Button { focusedID = contact.id; search = false } label: {
                    VStack(alignment: .leading) { Text(contact.name).foregroundStyle(.primary); Text(contact.phone.isEmpty ? contact.company : contact.phone).font(.subheadline).foregroundStyle(.secondary) }
                }
            }.searchable(text: $query, prompt: "Name, number or company").navigationTitle("Find someone")
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { search = false } } }
        }
    }
    private var settingsSheet: some View {
        NavigationStack {
            Form {
                Section("Your deck") {
                    Text("Local to this device. No Contact Deck account.")
                    Button("Add contacts") { sheet = .importContacts }
                    Button("Try sample deck") { seedSamples(); sheet = nil }
                }
                if onBack != nil {
                    Section("Studio preview") {
                        Text("All Contact Deck features are available to try. No purchase or subscription is required.")
                        Toggle("Show initials only", isOn: $initialsOnly)
                    }
                } else {
                    Section("Complete") {
                        if purchase.unlocked { Toggle("Initials card style", isOn: $initialsOnly) }
                        else { Text("12 contacts and all three views are free."); Button("One-time unlock") { sheet = .unlock } }
                        Button("Restore purchases") { Task { await purchase.restore() } }
                        if let message = purchase.message { Text(message).foregroundStyle(.secondary) }
                    }
                }
                Section("Sync") { Text("iCloud sync is not available in this review build. Your deck stays on this device.").foregroundStyle(.secondary) }
                Section("Privacy") { Text("Calls and messages open their system apps. A handoff is never recorded as a completed conversation. Notes and favorites stay in this app. Contact Deck never edits or deletes the address book.").font(.callout) }
            }.navigationTitle("Settings").toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { sheet = nil } } }
        }
    }
    private var groupSheet: some View {
        NavigationStack {
            Form {
                Section("New deck") { TextField("Deck name", text: $groupName); Button("Create deck") {
                    let name = groupName.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !name.isEmpty else { return }
                    let deck = ContactDeck(name: String(name.prefix(35))); context.insert(deck); addToDeck(deck)
                }.disabled(groupName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) }
                Section("Add to existing") { ForEach(decks) { deck in Button(deck.name) { addToDeck(deck) } } }
            }.navigationTitle("Group \(groupIDs.count) cards").toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { sheet = nil } } }
        }
    }
    private var removedSheet: some View {
        NavigationStack {
            List(records.filter { $0.removedAt != nil }) { contact in HStack { Text(contact.name); Spacer(); Button("Restore") { contact.removedAt = nil; save() } } }
                .overlay { if records.allSatisfy({ $0.removedAt == nil }) { ContentUnavailableView("No removed cards", systemImage: "trash") } }
                .navigationTitle("Recently removed").toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { sheet = nil } } }
        }
    }
    private func choose(_ value: String) { collection = value; query = ""; selected = []; focusedID = contacts.first?.id }
    private func beginGrouping(_ ids: Set<UUID>) { groupIDs = ids; groupName = ""; sheet = .group }
    private func addToDeck(_ deck: ContactDeck) {
        for contact in records where groupIDs.contains(contact.id) && !contact.deckIDs.contains(deck.id) { contact.deckIDs.append(deck.id) }
        save(); selected = []; collection = deck.id; sheet = nil
    }
    private func seedSamples() {
        guard !records.contains(where: \.isSample) else { return }
        let samples = SampleContacts.make()
        for contact in samples { context.insert(contact) }
        save(); focusedID = samples.first?.id
    }
    private func importContacts(_ incoming: [CNContact]) {
        var remaining = purchase.unlocked ? Int.max : max(0, PurchaseStore.freeLimit - all.count)
        var reachedLimit = false
        for source in incoming {
            if let existing = records.first(where: { $0.sourceIdentifier == source.identifier && !source.identifier.isEmpty }) {
                if existing.removedAt != nil, remaining > 0 { existing.removedAt = nil; remaining -= 1 }
                continue
            }
            guard remaining > 0 else { reachedLimit = true; continue }
            let name = CNContactFormatter.string(from: source, style: .fullName) ?? source.organizationName
            guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { continue }
            let contact = DeckContact(name: name, role: source.jobTitle, company: source.organizationName, phone: source.phoneNumbers.first?.value.stringValue ?? "", email: source.emailAddresses.first.map { String($0.value) } ?? "")
            contact.sourceIdentifier = source.identifier
            if source.isKeyAvailable(CNContactThumbnailImageDataKey) { contact.portrait = source.thumbnailImageData }
            context.insert(contact); remaining -= 1
        }
        save()
        // A limit is explained only after an explicit import, never during play.
        if reachedLimit { error = "Your deck has 12 contacts. Unlock Complete in Settings to add everyone." }
    }
    private func action(_ contact: DeckContact, _ action: ContactAction) {
        switch action {
        case .favorite: contact.favorite.toggle(); save()
        case .note: noteContact = contact
        case .select: selected.insert(contact.id)
        case .group: beginGrouping([contact.id])
        case .remove: pendingRemove = [contact.id]; reviewingRemoval = true
        case .reachedOut: contact.lastReachedOut = Date(); save()
        case .snooze: contact.snoozedUntil = Date().addingTimeInterval(7 * 86_400); save()
        case .share: share(contact)
        case .call, .message, .email:
            guard !contact.isSample else { error = "This is a fictional sample contact. Add your own contacts to call or message."; return }
            let digits = contact.phone.filter { $0.isNumber || $0 == "+" }
            let scheme = action == .call ? "tel:" : action == .message ? "sms:" : "mailto:"
            let destination = action == .email ? contact.email : digits
            if let url = URL(string: scheme + destination), !destination.isEmpty { openURL(url) { accepted in if !accepted { error = "The system couldn't open that action on this device." } } }
        }
    }
    private func removeReviewed() {
        undoIDs = pendingRemove; previousOrder = nil
        for contact in records where pendingRemove.contains(contact.id) { contact.removedAt = Date() }
        save(); selected = []; pendingRemove = []; toast = "Cards removed"
    }
    private func undo() {
        if let previousOrder { orderedIDs = previousOrder; self.previousOrder = nil }
        else { for contact in records where undoIDs.contains(contact.id) { contact.removedAt = nil }; save(); undoIDs = [] }
        toast = nil
    }
    private func save() { do { try context.save() } catch { context.rollback(); self.error = "Your previous saved deck was kept. \(error.localizedDescription)" } }
    private func share(_ contact: DeckContact) {
        do {
            let card = CNMutableContact(); card.givenName = contact.name; card.organizationName = contact.company
            if !contact.phone.isEmpty { card.phoneNumbers = [CNLabeledValue(label: CNLabelPhoneNumberMobile, value: CNPhoneNumber(stringValue: contact.phone))] }
            if !contact.email.isEmpty { card.emailAddresses = [CNLabeledValue(label: CNLabelWork, value: contact.email as NSString)] }
            let data = try CNContactVCardSerialization.data(with: [card])
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("contact-\(contact.id.uuidString).vcf")
            try data.write(to: url, options: [.atomic, .completeFileProtection]); shareURL = url
        } catch { self.error = "The contact couldn't be shared. Please try again." }
    }
}

private enum HomeSheet: String, Identifiable { case importContacts, unlock, settings, group, removed; var id: String { rawValue } }

private struct NoteEditor: View {
    let contact: DeckContact
    let onSave: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""
    var body: some View {
        NavigationStack {
            Form { Section(contact.name) { TextEditor(text: $text).frame(minHeight: 180).accessibilityLabel("Personal note") } }
                .navigationTitle("Personal note").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) { Button("Save") { contact.note = String(text.prefix(4000)); onSave() } }
                }.onAppear { text = contact.note }
        }
    }
}

private struct OnboardingView: View {
    let onSamples: () -> Void
    let onImport: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Spacer()
            Image(systemName: "rectangle.on.rectangle.angled").font(.system(size: 64)).foregroundStyle(.tint).accessibilityHidden(true)
            Text("Your people.\nA little closer.").font(.largeTitle.bold())
            Text("Swipe to browse. Tap to flip. Hold to organize.").font(.title3).foregroundStyle(.secondary)
            Text("Private on your device. No account, no setup tour.").foregroundStyle(.secondary)
            Spacer()
            Button("Try the deck", action: onSamples).buttonStyle(.borderedProminent).controlSize(.large).frame(maxWidth: .infinity).accessibilityIdentifier("tryDeck")
            Button("Choose my contacts", action: onImport).frame(maxWidth: .infinity).padding(.bottom)
        }.padding(32)
    }
}

private struct NativeShare: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController { UIActivityViewController(activityItems: items, applicationActivities: nil) }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
