import SwiftUI

/// A Photos-style selection spread that only exists while Select mode is active.
/// Drag across cards to select or deselect a contiguous range; tap toggles one card.
struct ContactSelectionSpread: View {
    let contacts: [DeckContact]
    @Binding var selected: Set<UUID>
    let initialsOnly: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var cardFrames: [UUID: CGRect] = [:]
    @State private var dragStartID: UUID?
    @State private var dragBase: Set<UUID> = []
    @State private var dragAdds = true

    private let gap: CGFloat = 10
    private var columns: [GridItem] {
        [GridItem(.flexible(), spacing: gap),
         GridItem(.flexible(), spacing: gap),
         GridItem(.flexible(), spacing: gap)]
    }

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Label("Slide across cards to select", systemImage: "hand.draw")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                Spacer(minLength: 4)
                Button(selected.count == contacts.count ? "Clear" : "Select All") {
                    if selected.count == contacts.count { selected.removeAll() }
                    else { selected = Set(contacts.map(\.id)) }
                }
                .font(.caption.weight(.semibold))
                .accessibilityIdentifier("selectAllCards")
            }
            .padding(.horizontal, 20)

            ScrollView {
                LazyVGrid(columns: columns, spacing: gap) {
                    ForEach(contacts) { contact in
                        tile(contact)
                            .background {
                                GeometryReader { geometry in
                                    Color.clear.preference(
                                        key: SelectionTileFrames.self,
                                        value: [contact.id: geometry.frame(in: .named("contactSelectionGrid"))])
                                }
                            }
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 16)
            }
            .coordinateSpace(name: "contactSelectionGrid")
            .onPreferenceChange(SelectionTileFrames.self) { cardFrames = $0 }
            .simultaneousGesture(selectionDrag)
        }
        .background(Color(.systemBackground))
        .accessibilityIdentifier("contactSelectionSpread")
    }

    private func tile(_ contact: DeckContact) -> some View {
        let marked = selected.contains(contact.id)
        return Button {
            if marked { selected.remove(contact.id) }
            else { selected.insert(contact.id) }
        } label: {
            GeometryReader { geometry in
                ZStack(alignment: .bottomLeading) {
                    if !initialsOnly, let data = contact.portrait, let image = UIImage(data: data) {
                        Image(uiImage: image).resizable().scaledToFill()
                            .frame(width: geometry.size.width, height: geometry.size.height)
                            .clipped()
                    } else {
                        Color(.secondarySystemGroupedBackground)
                        Text(contact.initials)
                            .font(.system(size: 36, weight: .medium, design: .rounded))
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }

                    LinearGradient(colors: [.clear, .black.opacity(0.65)],
                                   startPoint: .center, endPoint: .bottom)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(contact.name).font(.caption2.weight(.semibold))
                            .lineLimit(2).minimumScaleFactor(0.8)
                        Text(contact.phone.isEmpty ? contact.company : contact.phone)
                            .font(.system(size: 9)).lineLimit(1)
                    }
                    .foregroundStyle(.white)
                    .padding(8)

                    VStack {
                        HStack {
                            Spacer()
                            Image(systemName: marked ? "checkmark.circle.fill" : "circle")
                                .font(.title3.weight(.semibold))
                                .symbolRenderingMode(.palette)
                                .foregroundStyle(marked ? Color.white : Color.white,
                                                 marked ? Color.accentColor : Color.black.opacity(0.25))
                                .padding(7)
                        }
                        Spacer()
                    }
                }
            }
            .frame(height: 166)
            .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .strokeBorder(marked ? Color.accentColor : Color.secondary.opacity(0.18),
                                  lineWidth: marked ? 3 : 1)
            }
            .scaleEffect(marked && !reduceMotion ? 0.965 : 1)
            .animation(reduceMotion ? nil : .spring(response: 0.2, dampingFraction: 0.8), value: marked)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(contact.name)
        .accessibilityValue(marked ? "Selected" : "Not selected")
        .accessibilityHint("Double tap to toggle selection. Slide across cards to select several.")
        .accessibilityIdentifier("selectionCard")
    }

    private var selectionDrag: some Gesture {
        DragGesture(minimumDistance: 6, coordinateSpace: .named("contactSelectionGrid"))
            .onChanged { gesture in
                guard !contacts.isEmpty else { return }
                if dragStartID == nil {
                    guard let start = hit(gesture.startLocation) else { return }
                    dragStartID = start
                    dragBase = selected
                    dragAdds = !selected.contains(start)
                }
                guard let start = dragStartID else { return }
                guard let first = contacts.firstIndex(where: { $0.id == start }) else { return }

                // Keep the previous cell when the finger crosses a gap between cards.
                guard let lastID = hit(gesture.location),
                      let last = contacts.firstIndex(where: { $0.id == lastID }) else { return }
                let range = min(first, last)...max(first, last)
                let ids = Set(range.map { contacts[$0].id })
                if dragAdds { selected = dragBase.union(ids) }
                else { selected = dragBase.subtracting(ids) }
            }
            .onEnded { _ in
                dragStartID = nil
                dragBase = []
            }
    }

    private func hit(_ point: CGPoint) -> UUID? {
        cardFrames.first(where: { $0.value.contains(point) })?.key
    }
}

private struct SelectionTileFrames: PreferenceKey {
    static var defaultValue: [UUID: CGRect] = [:]
    static func reduce(value: inout [UUID: CGRect], nextValue: () -> [UUID: CGRect]) {
        value.merge(nextValue(), uniquingKeysWith: { _, next in next })
    }
}
