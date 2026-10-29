import SwiftUI
import SwiftData

enum ContactAction { case call, message, email, share, favorite, note, remove, select, group, reachedOut, snooze }

struct ContactFace: View {
    let contact: DeckContact
    let initialsOnly: Bool
    let focused: Bool
    let flipped: Bool
    let onAction: (DeckContact, ContactAction) -> Void
    var body: some View {
        ZStack(alignment: .bottomLeading) {
            GeometryReader { geometry in
                if !initialsOnly, let data = contact.portrait, let image = UIImage(data: data) {
                    Image(uiImage: image).resizable().scaledToFill().frame(width: geometry.size.width, height: geometry.size.height).clipped()
                } else {
                    ZStack {
                        Color(.secondarySystemBackground)
                        Text(contact.initials).font(.system(size: min(geometry.size.width * 0.36, 140), weight: .medium, design: .rounded)).foregroundStyle(.secondary)
                            .offset(y: -geometry.size.height * 0.1)
                    }
                }
            }
            LinearGradient(stops: [.init(color: .clear, location: 0.28), .init(color: .black.opacity(0.56), location: 0.52), .init(color: .black.opacity(0.86), location: 1)], startPoint: .top, endPoint: .bottom)
            VStack(alignment: .leading, spacing: 6) {
                if contact.isSample { Text("SAMPLE CONTACT").font(.caption2.weight(.semibold)).foregroundStyle(.white.opacity(0.8)) }
                Text(contact.name).font(.title.bold()).lineLimit(2).minimumScaleFactor(0.75)
                Text([contact.role, contact.company].filter { !$0.isEmpty }.joined(separator: " · ")).font(.subheadline).foregroundStyle(.white.opacity(0.85)).lineLimit(2)
                if focused {
                    HStack(spacing: 0) {
                        action("Call", "phone.fill", .call, disabled: contact.phone.isEmpty)
                        Spacer(minLength: 8)
                        action("Message", "message.fill", .message, disabled: contact.phone.isEmpty)
                        Spacer(minLength: 8)
                        action("Note", "note.text", .note)
                        Spacer(minLength: 8)
                        action("Share", "square.and.arrow.up", .share)
                    }.padding(.top, 16)
                }
            }.foregroundStyle(.white).padding(22)
            VStack {
                HStack {
                    Button { onAction(contact, .favorite) } label: {
                        Image(systemName: contact.favorite ? "star.fill" : "star").frame(width: 44, height: 44)
                    }.accessibilityLabel(contact.favorite ? "Remove favorite" : "Add favorite").accessibilityValue(contact.favorite ? "Favorite" : "Not favorite")
                    Spacer()
                    Menu {
                        Button("Select card", systemImage: "checkmark.circle") { onAction(contact, .select) }
                        Button("Add to deck", systemImage: "rectangle.stack.badge.plus") { onAction(contact, .group) }
                        Button("Mark reached out", systemImage: "checkmark") { onAction(contact, .reachedOut) }
                        Button("Suggest another day", systemImage: "moon") { onAction(contact, .snooze) }
                        Button("Remove from Contact Deck", systemImage: "trash", role: .destructive) { onAction(contact, .remove) }
                    } label: { Image(systemName: "ellipsis").frame(width: 44, height: 44) }.accessibilityLabel("Card options")
                }.buttonStyle(.bordered).buttonBorderShape(.circle).tint(.primary)
                Spacer()
            }.padding(14)
        }.background(Color(.secondarySystemBackground))
            .allowsHitTesting(focused && !flipped)
            .accessibilityHidden(flipped)
    }
    private func action(_ title: String, _ symbol: String, _ action: ContactAction, disabled: Bool = false) -> some View {
        Button { onAction(contact, action) } label: {
            VStack(spacing: 6) {
                Image(systemName: symbol).font(.body.weight(.medium)).frame(width: 46, height: 46).foregroundStyle(.primary).background(.regularMaterial, in: Circle())
                Text(title).font(.caption2)
            }
        }.buttonStyle(.plain).disabled(disabled).accessibilityLabel("\(title) \(contact.name)")
    }
}

struct ContactBack: View {
    @Bindable var contact: DeckContact
    let onAction: (DeckContact, ContactAction) -> Void
    let onClose: () -> Void
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack { Text(contact.name).font(.title2.bold()); Spacer(); Button(action: onClose) { Image(systemName: "arrow.uturn.backward").frame(width: 44, height: 44) }.accessibilityLabel("Flip back") }
                if !contact.phone.isEmpty { LabeledContent("Phone", value: contact.phone) }
                if !contact.email.isEmpty { LabeledContent("Email", value: contact.email) }
                if !contact.company.isEmpty { LabeledContent("Company", value: contact.company) }
                if !contact.city.isEmpty { LabeledContent("Location", value: contact.city) }
                Divider()
                Button { onAction(contact, .note) } label: {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Personal note", systemImage: "note.text")
                        Text(contact.note.isEmpty ? "Something to remember…" : contact.note).foregroundStyle(.secondary).multilineTextAlignment(.leading)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }.buttonStyle(.plain).accessibilityLabel("Edit personal note")
                Button("Share contact", systemImage: "square.and.arrow.up") { onAction(contact, .share) }.buttonStyle(.bordered)
                if let date = contact.lastReachedOut { Text("You marked a reach-out \(date.formatted(date: .abbreviated, time: .omitted)).").font(.caption).foregroundStyle(.secondary) }
            }.padding(24)
        }.background(Color(.secondarySystemGroupedBackground))
    }
}
