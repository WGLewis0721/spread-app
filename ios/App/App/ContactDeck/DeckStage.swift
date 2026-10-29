import SwiftUI

enum DeckDropAction {
    case group, remove
}

/// The regular card carousel remains the browse surface.
/// A long press lifts the focused card, reveals contextual drop bins, and never deletes on release.
struct DeckStage: View {
    let contacts: [DeckContact]
    let mode: BrowseMode
    @Binding var focusedID: UUID?
    @Binding var selected: Set<UUID>
    @Binding var isSelecting: Bool
    let initialsOnly: Bool
    let onAction: (DeckContact, ContactAction) -> Void
    let onDropAction: (DeckDropAction, Set<UUID>) -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityVoiceOverEnabled) private var voiceOver
    @GestureState private var drag: CGSize = .zero
    @State private var position: Double = 0
    @State private var flippedID: UUID?
    @State private var liftedID: UUID?
    @State private var liftTranslation: CGSize = .zero
    @State private var dropHover: DeckDropAction?
    @State private var tick = 0

    private var focus: Int { contacts.firstIndex(where: { $0.id == focusedID }) ?? 0 }
    private var snap: Animation {
        reduceMotion ? .easeOut(duration: 0.12) : .interactiveSpring(response: 0.32, dampingFraction: 0.88)
    }
    private var visibleContacts: [IndexedContact] {
        guard !contacts.isEmpty else { return [] }
        return (max(0, focus - 4)..<min(contacts.count, focus + 5))
            .map { IndexedContact(index: $0, contact: contacts[$0]) }
    }

    var body: some View {
        GeometryReader { geometry in
            let width = min(geometry.size.width * 0.79, 430.0)
            let height = min(geometry.size.height * 0.78, 610.0)
            let stride = DeckPhysics.stride(for: mode, width: geometry.size.width)
            let displacement = Double(mode == .stack ? drag.height : drag.width) / Double(stride)
            let current = DeckPhysics.rubberBand(position - displacement, count: contacts.count)

            ZStack {
                ForEach(visibleContacts) { item in
                    let distance = Double(item.index) - current
                    card(item.contact, distance: distance, width: width, height: height)
                        .zIndex(liftedID == item.contact.id ? 300 : 100 - abs(distance))
                        .accessibilityHidden(item.index != focus)
                }
                if liftedID != nil {
                    HStack(spacing: 14) {
                        bin("Group", symbol: "rectangle.stack.badge.plus", action: .group, highlighted: dropHover == .group)
                        bin("Remove", symbol: "trash", action: .remove, highlighted: dropHover == .remove)
                    }
                    .padding(.horizontal, 16)
                    .frame(maxHeight: .infinity, alignment: .bottom)
                    .padding(.bottom, 10)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                    .zIndex(500)
                    .allowsHitTesting(false)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .contentShape(Rectangle())
            .coordinateSpace(name: "deckStage")
            .gesture(liftGesture(in: geometry.size).exclusively(before: browseGesture(stride: stride)),
                     including: flippedID == nil && !voiceOver ? .all : .subviews)
            .sensoryFeedback(.selection, trigger: tick)
        }
        // Keep the focus constant during dragging. Changing it on every frame was
        // restarting animations and invalidating the virtualized card window.
        .onAppear { position = Double(focus) }
        .onChange(of: contacts.map(\.id)) { _, _ in
            position = Double(focus)
            flippedID = nil
        }
        .onChange(of: mode) { _, _ in
            position = Double(focus)
            flippedID = nil
        }
        .onChange(of: focusedID) { _, _ in
            guard liftedID == nil else { return }
            withAnimation(snap) { position = Double(focus) }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(Text(mode.title + " contact deck"))
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: step(1)
            case .decrement: step(-1)
            @unknown default: break
            }
        }
        .accessibilityAction(named: Text("Next contact")) { step(1) }
        .accessibilityAction(named: Text("Previous contact")) { step(-1) }
    }

    private func bin(_ label: String, symbol: String, action: DeckDropAction, highlighted: Bool) -> some View {
        HStack(spacing: 8) {
            Image(systemName: symbol).font(.title3.weight(.semibold))
            Text(label).font(.subheadline.weight(.semibold))
        }
        .frame(maxWidth: .infinity)
        .frame(height: 72)
        .foregroundStyle(action == .remove ? (highlighted ? Color.white : Color.red) : (highlighted ? Color.white : Color.accentColor))
        .background {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(highlighted ? (action == .remove ? Color.red : Color.accentColor) : Color(.secondarySystemBackground))
        }
        .overlay {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .strokeBorder(highlighted ? Color.primary.opacity(0.20) : Color.secondary.opacity(0.20), lineWidth: 1)
        }
        .scaleEffect(highlighted && !reduceMotion ? 1.04 : 1)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: highlighted)
        .accessibilityLabel(label + " drop bin")
    }

    @ViewBuilder private func card(_ contact: DeckContact, distance: Double, width: CGFloat, height: CGFloat) -> some View {
        let focused = contact.id == focusedID
        let flipped = flippedID == contact.id
        let isSelected = selected.contains(contact.id)
        let isLifted = liftedID == contact.id
        let face = ContactFace(contact: contact, initialsOnly: initialsOnly, focused: focused, flipped: flipped, onAction: onAction)

        VStack(spacing: 7) {
            ZStack {
                face.opacity(flipped ? 0 : 1)
                    .rotation3DEffect(.degrees(flipped && !reduceMotion ? 180 : 0), axis: (0, 1, 0))
                ContactBack(contact: contact, onAction: onAction, onClose: { withAnimation(snap) { flippedID = nil } })
                    .opacity(flipped ? 1 : 0)
                    .rotation3DEffect(.degrees(flipped || reduceMotion ? 0 : -180), axis: (0, 1, 0))
                    .allowsHitTesting(flipped)
                    .accessibilityHidden(!flipped)
            }
            .frame(width: width, height: height)
            .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
            .overlay {
                if isSelected || isLifted {
                    RoundedRectangle(cornerRadius: 30, style: .continuous)
                        .strokeBorder(Color.accentColor.opacity(0.45), lineWidth: 8)
                        .blur(radius: 6)
                        .padding(-2)
                        .allowsHitTesting(false)
                    RoundedRectangle(cornerRadius: 30, style: .continuous)
                        .strokeBorder(Color.accentColor, lineWidth: 3)
                        .allowsHitTesting(false)
                    VStack {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 30, weight: .semibold))
                                .symbolRenderingMode(.palette)
                                .foregroundStyle(Color.white, Color.accentColor)
                                .padding(14)
                            Spacer()
                        }
                        Spacer()
                    }
                    .allowsHitTesting(false)
                }
            }
            .shadow(color: isLifted ? Color.accentColor.opacity(0.38) : .black.opacity(focused ? 0.22 : 0.08),
                    radius: isLifted ? 26 : focused ? 18 : 7, y: isLifted ? 16 : focused ? 12 : 6)
            .onTapGesture {
                if !selected.isEmpty {
                    if isSelected { selected.remove(contact.id) } else { selected.insert(contact.id) }
                } else if !focused {
                    focusedID = contact.id
                } else {
                    withAnimation(snap) { flippedID = flipped ? nil : contact.id }
                }
            }
            .accessibilityElement(children: .contain)
            .accessibilityLabel(contact.name)
            .accessibilityHint("Double tap to flip. Long press to select or drag into an action bin.")
            .accessibilityAction(named: "Flip card") { withAnimation(snap) { flippedID = flipped ? nil : contact.id } }
            .accessibilityAction(named: "Select card") { selected.insert(contact.id); isSelecting = true }
            .accessibilityAction(named: "Group card") { onDropAction(.group, [contact.id]) }
            .accessibilityAction(named: "Review removal") { onDropAction(.remove, [contact.id]) }
            .accessibilityIdentifier(focused ? "focusedCard" : "neighborCard")

            // Rendering every mirrored portrait on every drag frame is expensive.
            if mode == .flow && !reduceMotion && abs(distance) < 1.6 {
                face.frame(width: width, height: height)
                    .clipShape(RoundedRectangle(cornerRadius: 30))
                    .scaleEffect(x: 1, y: -1)
                    .mask(alignment: .top) {
                        LinearGradient(stops: [.init(color: .black.opacity(0.20), location: 0),
                                               .init(color: .clear, location: 0.22)],
                                       startPoint: .top, endPoint: .bottom)
                    }
                    .frame(height: 55, alignment: .top)
                    .clipped()
                    .accessibilityHidden(true)
                    .allowsHitTesting(false)
            }
        }
        .scaleEffect(reduceMotion ? 1 : max(0.73, 1 - abs(distance) * 0.065))
        .scaleEffect(isLifted && !reduceMotion ? 1.045 : 1)
        .rotationEffect(.degrees(mode == .fan ? distance * 12 : mode == .stack ? distance * 0.7 : 0),
                        anchor: mode == .fan ? .bottom : .center)
        .rotation3DEffect(.degrees(mode == .flow ? max(-57, min(57, -distance * 54)) : 0),
                          axis: (0, 1, 0), perspective: 0.45)
        .offset(x: mode == .stack ? distance * 2 : distance * Double(width) * (mode == .fan ? 0.31 : 0.42),
                y: mode == .stack ? distance * 61 : mode == .fan ? abs(distance) * 23 : 0)
        .opacity(reduceMotion ? (focused ? 1 : 0) : max(0, 1 - abs(distance) * 0.25))
        .offset(isLifted ? liftTranslation : .zero)
        .allowsHitTesting(abs(distance) < 2.5 && (!reduceMotion || focused))
        .animation(reduceMotion ? nil : .spring(response: 0.21, dampingFraction: 0.72), value: isLifted)
    }

    private func browseGesture(stride: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: 8)
            .updating($drag) { value, state, transaction in
                guard liftedID == nil, selected.isEmpty else { return }
                transaction.animation = nil
                state = value.translation
            }
            .onEnded { value in
                guard liftedID == nil, selected.isEmpty, !contacts.isEmpty else { return }
                let translation = mode == .stack ? value.translation.height : value.translation.width
                let prediction = mode == .stack ? value.predictedEndTranslation.height : value.predictedEndTranslation.width
                let destination = DeckPhysics.destination(position: position, translation: translation,
                                                          predicted: prediction, stride: stride, count: contacts.count)
                flippedID = nil
                // Exactly one commit and one snap per gesture.
                withAnimation(snap) {
                    position = Double(destination)
                    focusedID = contacts[destination].id
                }
                tick += 1
            }
    }

    private func liftGesture(in size: CGSize) -> some Gesture {
        LongPressGesture(minimumDuration: 0.42, maximumDistance: 11)
            .sequenced(before: DragGesture(minimumDistance: 0, coordinateSpace: .named("deckStage")))
            .onChanged { value in
                guard case .second(true, let movement) = value, let focusedID else { return }
                if liftedID == nil {
                    liftedID = focusedID
                    flippedID = nil
                    tick += 1
                }
                guard let movement else { return }
                liftTranslation = movement.translation
                let point = movement.location
                if point.y > size.height - 120 && point.y < size.height && point.x > 0 && point.x < size.width {
                    dropHover = point.x < size.width / 2 ? .group : .remove
                } else {
                    dropHover = nil
                }
            }
            .onEnded { value in
                defer {
                    withAnimation(snap) { liftedID = nil; liftTranslation = .zero; dropHover = nil }
                }
                guard case .second(true, let movement) = value, let contactID = liftedID else { return }
                if let movement, movement.translation.height > 36, let action = dropHover {
                    onDropAction(action, [contactID])
                } else {
                    selected.insert(contactID)
                    withAnimation(snap) { isSelecting = true }
                }
            }
    }

    private func step(_ direction: Int) {
        guard !contacts.isEmpty else { return }
        let next = min(contacts.count - 1, max(0, focus + direction))
        flippedID = nil
        withAnimation(snap) { position = Double(next); focusedID = contacts[next].id }
        tick += 1
    }
}

private struct IndexedContact: Identifiable {
    let index: Int
    let contact: DeckContact
    var id: UUID { contact.id }
}
