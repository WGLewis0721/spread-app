import SwiftData
import SwiftUI

/// Contact Deck's local recycle bin. Its records are copies imported into this app;
/// it never changes a contact in Apple's Contacts database.
struct RecentlyRemovedView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \DeckContact.name) private var records: [DeckContact]

    @State private var selecting = false
    @State private var selected: Set<UUID> = []
    @State private var pendingPermanentDeletion: Set<UUID> = []
    @State private var confirmPermanentDeletion = false
    @State private var error: String?

    private var removed: [DeckContact] {
        records.filter { $0.removedAt != nil }
    }

    var body: some View {
        NavigationStack {
            Group {
                if removed.isEmpty {
                    ContentUnavailableView("No removed cards", systemImage: "trash")
                } else if selecting {
                    ContactSelectionSpread(contacts: removed, selected: $selected, initialsOnly: false)
                } else {
                    List(removed) { contact in
                        HStack(spacing: 12) {
                            Button {
                                selected = [contact.id]
                                selecting = true
                            } label: {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(contact.name).foregroundStyle(.primary)
                                        .font(.body.weight(.medium))
                                    if let date = contact.removedAt {
                                        Text("Removed \(date, style: .date)")
                                            .font(.caption).foregroundStyle(.secondary)
                                    }
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .accessibilityHint("Select this card for restore or permanent deletion")

                            Button("Restore") { restore([contact.id]) }
                                .buttonStyle(.bordered)
                        }
                        .accessibilityIdentifier("removedContactRow")
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Recently removed")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if !removed.isEmpty {
                        Button(selecting ? "Cancel" : "Select") {
                            selected.removeAll()
                            selecting.toggle()
                        }
                        .accessibilityIdentifier("binSelect")
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .safeAreaInset(edge: .bottom) {
                if !removed.isEmpty {
                    if selecting {
                        selectionActions
                    } else {
                        Button(role: .destructive) {
                            requestPermanentDeletion(Set(removed.map(\.id)))
                        } label: {
                            Label("Empty Bin", systemImage: "trash")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .padding(.horizontal, 20)
                        .padding(.bottom, 10)
                        .accessibilityIdentifier("emptyBin")
                    }
                }
            }
            .confirmationDialog(
                "Delete \(pendingPermanentDeletion.count) card(s) permanently?",
                isPresented: $confirmPermanentDeletion,
                titleVisibility: .visible
            ) {
                Button("Delete Permanently", role: .destructive) {
                    permanentlyDelete(pendingPermanentDeletion)
                }
                Button("Cancel", role: .cancel) {
                    pendingPermanentDeletion.removeAll()
                }
            } message: {
                Text("These Contact Deck copies will be erased from this device and cannot be restored inside the app. Original contacts in Apple's Contacts app are not deleted.")
            }
            .alert("Couldn't save your changes", isPresented: Binding(
                get: { error != nil },
                set: { if !$0 { error = nil } }
            )) {
                Button("OK") { error = nil }
            } message: { Text(error ?? "") }
            .onChange(of: removed.map(\.id)) { _, ids in
                selected.formIntersection(Set(ids))
                if ids.isEmpty { selecting = false }
            }
        }
    }

    private var selectionActions: some View {
        HStack(spacing: 14) {
            Text("\(selected.count) selected")
                .font(.caption.monospacedDigit()).foregroundStyle(.secondary)
            Spacer()
            Button("Restore", systemImage: "arrow.uturn.backward") {
                restore(selected)
            }
            .disabled(selected.isEmpty)
            Button("Delete", systemImage: "trash", role: .destructive) {
                requestPermanentDeletion(selected)
            }
            .disabled(selected.isEmpty)
        }
        .buttonStyle(.bordered)
        .labelStyle(.titleAndIcon)
        .padding(12)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20))
        .padding(.horizontal, 14)
        .padding(.bottom, 10)
    }

    private func restore(_ ids: Set<UUID>) {
        guard !ids.isEmpty else { return }
        for contact in removed where ids.contains(contact.id) {
            contact.removedAt = nil
        }
        do {
            try context.save()
            selected.subtract(ids)
        } catch {
            context.rollback()
            self.error = error.localizedDescription
        }
    }

    private func requestPermanentDeletion(_ ids: Set<UUID>) {
        guard !ids.isEmpty else { return }
        // Never commit deletion on a swipe or a single selection tap.
        pendingPermanentDeletion = ids
        confirmPermanentDeletion = true
    }

    private func permanentlyDelete(_ ids: Set<UUID>) {
        guard !ids.isEmpty else { return }
        // Only delete records that are actually in this local recycle bin.
        for contact in removed where ids.contains(contact.id) {
            context.delete(contact)
        }
        do {
            try context.save()
            selected.subtract(ids)
            pendingPermanentDeletion.removeAll()
        } catch {
            context.rollback()
            self.error = error.localizedDescription
        }
    }
}
