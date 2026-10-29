import SwiftUI
import SwiftData

struct DeckStage: View {
    let contacts: [DeckContact]
    let mode: BrowseMode
    @Binding var focusedID: UUID?
    @Binding var selected: Set<UUID>
    let initialsOnly: Bool
    let onAction: (DeckContact, ContactAction) -> Void
    let onGroup: (Set<UUID>) -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityVoiceOverEnabled) private var voiceOver
    @GestureState private var drag: CGSize = .zero
    @GestureState private var holding = false
    @State private var position = 0.0
    @State private var flippedID: UUID?
    @State private var grouping = false
    @State private var groupPoint: CGPoint?
    @State private var groupTranslation: CGSize = .zero
    @State private var frames: [UUID: CGRect] = [:]
    @State private var tick = 0
    @State private var focusScale = 1.0
    private var spring: Animation { reduceMotion ? .easeOut(duration: 0.16) : .spring(response: 0.42, dampingFraction: 0.84) }
    private var focus: Int { contacts.firstIndex(where: { $0.id == focusedID }) ?? 0 }
    private var visibleContacts: [IndexedContact] {
        guard !contacts.isEmpty else { return [] }
        return (max(0, focus - 3)..<min(contacts.count, focus + 4)).map { IndexedContact(index: $0, contact: contacts[$0]) }
    }
    private var scene: some View {
        GeometryReader { geometry in
            let width = min(geometry.size.width * 0.79, 430.0)
            let height = min(geometry.size.height * 0.78, 610.0)
            let stride = DeckPhysics.stride(for: mode, width: geometry.size.width)
            let displacement = Double(mode == .stack ? drag.height : drag.width) / Double(stride)
            let current = DeckPhysics.rubberBand(position - displacement, count: contacts.count)
            ZStack {
                ForEach(visibleContacts) { item in
                    let contact = item.contact
                    let distance = Double(item.index) - current
                        card(contact, distance: distance, width: width, height: height)
                            .background(GeometryReader { g in Color.clear.preference(key: CardFrames.self, value: [contact.id: g.frame(in: .named("deckStage"))]) })
                            .zIndex(grouping && selected.contains(contact.id) ? 200 : 100 - abs(distance))
                            .accessibilityHidden(item.index != focus)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .contentShape(Rectangle())
            .coordinateSpace(name: "deckStage")
            .onPreferenceChange(CardFrames.self) { frames = $0 }
            .gesture(groupGesture(in: geometry.size).exclusively(before: browseGesture(stride: stride)), including: flippedID == nil && !voiceOver ? .all : .subviews)
            .sensoryFeedback(.selection, trigger: tick)
            .onChange(of: current) { _, value in
                guard !grouping else { return }
                let index = min(contacts.count - 1, max(0, Int(value.rounded())))
                if contacts.indices.contains(index), focusedID != contacts[index].id {
                    focusedID = contacts[index].id; tick += 1
                }
            }
        }
    }
    var body: some View {
        scene.clipped()
        .mask { LinearGradient(stops: [.init(color: .black, location: 0), .init(color: .black, location: 0.92), .init(color: .clear, location: 1)], startPoint: .top, endPoint: .bottom) }
        .onAppear { position = Double(focus) }
        .task(id: focusedID) {
            guard !reduceMotion else { focusScale = 1; return }
            withAnimation(.spring(response: 0.18, dampingFraction: 0.84)) { focusScale = 1.012 }
            try? await Task.sleep(for: .milliseconds(80))
            guard !Task.isCancelled else { return }
            withAnimation(spring) { focusScale = 1 }
        }
        .onChange(of: contacts.map(\.id)) { _, _ in position = Double(focus); flippedID = nil }
        .onChange(of: mode) { _, _ in position = Double(focus); flippedID = nil }
        .onChange(of: focusedID) { _, _ in if drag == .zero && !grouping { withAnimation(spring) { position = Double(focus) } } }
        .onChange(of: selected) { _, value in if !value.isEmpty { flippedID = nil } }
        .onChange(of: holding) { _, active in
            if !active && grouping {
                withAnimation(spring) { grouping = false; groupTranslation = .zero }
                groupPoint = nil
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(mode.title) contact deck")
        .accessibilityAdjustableAction { direction in step(direction == .increment ? 1 : -1) }
        .accessibilityAction(named: "Next contact") { step(1) }
        .accessibilityAction(named: "Previous contact") { step(-1) }
    }
    @ViewBuilder private func card(_ contact: DeckContact, distance: Double, width: CGFloat, height: CGFloat) -> some View {
        let focused = contact.id == focusedID
        let d = reduceMotion ? 0 : distance
        let flipped = flippedID == contact.id
        let selectedCard = selected.contains(contact.id)
        let face = ContactFace(contact: contact, initialsOnly: initialsOnly, focused: focused, flipped: flipped, onAction: onAction)
        VStack(spacing: 7) {
            ZStack {
                face.opacity(flipped ? 0 : 1).rotation3DEffect(.degrees(flipped && !reduceMotion ? 180 : 0), axis: (0, 1, 0))
                ContactBack(contact: contact, onAction: onAction, onClose: { withAnimation(spring) { flippedID = nil } })
                    .opacity(flipped ? 1 : 0).rotation3DEffect(.degrees(flipped || reduceMotion ? 0 : -180), axis: (0, 1, 0)).allowsHitTesting(flipped).accessibilityHidden(!flipped)
            }
            .frame(width: width, height: height)
            .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
            .overlay { if selectedCard { RoundedRectangle(cornerRadius: 30).strokeBorder(.tint, lineWidth: 3) } }
            .shadow(color: .black.opacity(focused ? 0.22 : 0.08), radius: focused ? 22 : 9, y: focused ? 14 : 7)
            .onTapGesture {
                if !selected.isEmpty { if selectedCard { selected.remove(contact.id) } else { selected.insert(contact.id) } }
                else if !focused { focusedID = contact.id }
                else { withAnimation(spring) { flippedID = flipped ? nil : contact.id } }
            }
            .accessibilityElement(children: .contain)
            .accessibilityLabel(contact.name)
            .accessibilityHint("Double tap to flip. Actions include favorite, note and select.")
            .accessibilityAction(named: "Flip card") { withAnimation(spring) { flippedID = flipped ? nil : contact.id } }
            .accessibilityAction(named: "Select card") { selected.insert(contact.id) }
            .accessibilityAction(named: "Add note") { onAction(contact, .note) }
            .accessibilityIdentifier(focused ? "focusedCard" : "neighborCard")
            if mode == .flow && !reduceMotion {
                face.frame(width: width, height: height).clipShape(RoundedRectangle(cornerRadius: 30))
                    .scaleEffect(x: 1, y: -1)
                    .mask(alignment: .top) { LinearGradient(stops: [.init(color: .black.opacity(0.20), location: 0), .init(color: .clear, location: 0.22)], startPoint: .top, endPoint: .bottom) }
                    .frame(height: 55, alignment: .top).clipped().accessibilityHidden(true).allowsHitTesting(false)
            }
        }
        .scaleEffect(reduceMotion ? 1 : max(0.73, 1 - abs(d) * 0.065))
        .scaleEffect(focused && !reduceMotion ? focusScale : 1)
        .rotationEffect(.degrees(mode == .fan ? d * 12 : mode == .stack ? d * 0.7 : 0), anchor: mode == .fan ? .bottom : .center)
        .rotation3DEffect(.degrees(mode == .flow ? max(-57, min(57, -d * 54)) : 0), axis: (0, 1, 0), perspective: 0.45)
        .offset(x: mode == .stack ? d * 2 : d * Double(width) * (mode == .fan ? 0.31 : 0.42), y: mode == .stack ? d * 61 : mode == .fan ? abs(d) * 23 : 0)
        .opacity(reduceMotion ? (focused ? 1 : 0) : max(0, 1 - abs(d) * 0.25))
        .offset(grouping && selectedCard ? groupTranslation : .zero)
        .scaleEffect(grouping && selectedCard && !reduceMotion ? 1.025 : 1)
        .allowsHitTesting(abs(distance) < 2.5 && (!reduceMotion || focused))
    }
    private func browseGesture(stride: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: 12)
            .updating($drag) { value, state, transaction in
                guard !grouping, selected.isEmpty else { return }
                transaction.animation = nil
                state = value.translation
            }
            .onEnded { value in
                guard !grouping, selected.isEmpty, !contacts.isEmpty else { return }
                let translation = mode == .stack ? value.translation.height : value.translation.width
                let prediction = mode == .stack ? value.predictedEndTranslation.height : value.predictedEndTranslation.width
                let destination = DeckPhysics.destination(position: position, translation: translation, predicted: prediction, stride: stride, count: contacts.count)
                focusedID = contacts[destination].id
                withAnimation(spring) { position = Double(destination) }
                flippedID = nil
            }
    }
    // The maximum distance makes movement cancel the hold before browsing wins.
    // A second drag exists only after the long press succeeds.
    private func groupGesture(in size: CGSize) -> some Gesture {
        LongPressGesture(minimumDuration: 0.46, maximumDistance: 10)
            .sequenced(before: DragGesture(minimumDistance: 0, coordinateSpace: .named("deckStage")))
            .updating($holding) { value, state, _ in
                if case .second(true, _) = value { state = true }
            }
            .onChanged { value in
                switch value {
                case .second(true, let drag):
                    if !grouping {
                        grouping = true
                        let hit = drag.flatMap { value in
                            frames.filter { $0.value.contains(value.startLocation) }.keys.min { left, right in
                                abs((contacts.firstIndex { $0.id == left } ?? 0) - focus) < abs((contacts.firstIndex { $0.id == right } ?? 0) - focus)
                            }
                        } ?? focusedID
                        if let hit { selected.insert(hit) }
                        tick += 1
                    }
                    groupPoint = drag?.location
                    groupTranslation = drag?.translation ?? .zero
                default: break
                }
            }
            .onEnded { _ in
                defer { withAnimation(spring) { grouping = false; groupTranslation = .zero }; groupPoint = nil }
                guard hypot(groupTranslation.width, groupTranslation.height) > 26, let point = groupPoint, CGRect(origin: .zero, size: size).contains(point), let target = frames.first(where: { !selected.contains($0.key) && $0.value.contains(point) })?.key else { return }
                onGroup(selected.union([target]))
            }
    }
    private func step(_ direction: Int) {
        guard !contacts.isEmpty else { return }
        let next = min(contacts.count - 1, max(0, focus + direction))
        focusedID = contacts[next].id; flippedID = nil
        withAnimation(spring) { position = Double(next) }
        tick += 1
    }
}

private struct CardFrames: PreferenceKey {
    static var defaultValue: [UUID: CGRect] = [:]
    static func reduce(value: inout [UUID: CGRect], nextValue: () -> [UUID: CGRect]) { value.merge(nextValue(), uniquingKeysWith: { _, next in next }) }
}

private struct IndexedContact: Identifiable { let index: Int; let contact: DeckContact; var id: UUID { contact.id } }
