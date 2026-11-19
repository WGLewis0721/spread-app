extension PlannerSnapshot {
    /// A new install starts with default Life areas, so "untouched" means nothing a person did: no weekly
    /// hours set, no hours placed on days and no tasks.
    var isUntouchedFirstRun: Bool {
        allocations.isEmpty && tasks.isEmpty && life?.capacityHours == nil
    }
}

/// Read-only milestones in the actual weekly plan.
enum LifeFirstWeekStep: Equatable {
    static let handledKey = "native.life.firstWeekHandled"
    static let pendingProfileKey = "native.life.firstWeekPendingProfile"
    /// Launches that reached a loaded plan. It is stored on the device and removed with the app, so 0 means a
    /// new install or a reinstall.
    static let launchCountKey = "native.app.launchCount"

    case area
    case hours(String)
    case days(String)
    case task(String)
    case complete

    static func next(in snapshot: PlannerSnapshot, preferredRoleID: String? = nil) -> Self {
        let roles = snapshot.roles
        let role = roles.first { $0.id == preferredRoleID }
            ?? roles.first { snapshot.placedHours(for: $0.id) > 0 && !snapshot.tasks(for: $0.id).isEmpty }
            ?? roles.first { snapshot.placedHours(for: $0.id) > 0 }
            ?? roles.first { $0.hours > 0 }
            ?? roles.first
        guard let role else { return .area }
        guard (snapshot.life?.capacityHours ?? 0) > 0, role.hours > 0 else { return .hours(role.id) }
        guard snapshot.placedHours(for: role.id) > 0 else { return .days(role.id) }
        return snapshot.tasks(for: role.id).isEmpty ? .task(role.id) : .complete
    }

    var roleID: String? {
        switch self {
        case .hours(let id), .days(let id), .task(let id): return id
        case .area, .complete: return nil
        }
    }

    var chapter: LifeFirstWeekChapter {
        switch self {
        case .area: return .area
        case .hours: return .hours
        case .days: return .days
        case .task: return .task
        case .complete: return .complete
        }
    }
}

enum LifeFirstWeekChapter: Int, CaseIterable, Hashable {
    case welcome, area, hours, days, task, complete

    var title: String {
        switch self {
        case .welcome: return "Make room for what matters."
        case .area: return "What matters in your week?"
        case .hours: return "Choose your weekly hours"
        case .days: return "Give that time a place"
        case .task: return "Add one thing to do"
        case .complete: return "Your week has a starting point."
        }
    }

    var message: String {
        switch self {
        case .welcome: return "Add a Life area, give it some time, and plan one task."
        case .area: return "Add one Life area, such as Home, Work, or Health."
        case .hours: return "Choose how much time you want to plan and give your Life area a share."
        case .days: return "Pick a day for some of the hours you set aside."
        case .task: return "Pick one thing you want to get done this week."
        case .complete: return "Your time and task are saved. Keep planning whenever you’re ready."
        }
    }

    var actionTitle: String {
        switch self {
        case .welcome: return "Get started"
        case .area: return "Add Life"
        case .hours: return "Set weekly hours"
        case .days: return "Plan days"
        case .task: return "Open Tasks"
        case .complete: return "View Week"
        }
    }
}

#if os(iOS)
import SwiftUI

struct LifeFirstWeekStory: View {
    let chapter: LifeFirstWeekChapter
    let onAction: () -> Void
    let onSkip: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityVoiceOverEnabled) private var voiceOver
    @AccessibilityFocusState private var readingHeading: Bool
    @State private var readingIndex: Int?
    @State private var forward = true

    private var page: Int { readingIndex ?? chapter.rawValue }
    private var scene: LifeFirstWeekChapter { LifeFirstWeekChapter(rawValue: page) ?? chapter }
    private var reviewing: Bool { page < chapter.rawValue }
    private var count: Int { LifeFirstWeekChapter.allCases.count }
    private var category: String {
        switch scene {
        case .area, .days: return "home"
        case .hours, .task: return "work"
        case .welcome, .complete: return "personal"
        }
    }

    var body: some View {
        GeometryReader { viewport in
            VStack(spacing: 0) {
                header
                ScrollView {
                    VStack(alignment: .leading, spacing: Spread.space3) {
                        Text(scene.title)
                            .font(.system(.largeTitle, design: .serif).bold())
                            .accessibilityAddTraits(.isHeader)
                            .accessibilityFocused($readingHeading)
                            .accessibilityIdentifier("life-first-week-title")
                        Text(scene.message)
                            .font(.body)
                    }
                    .frame(maxWidth: 620, minHeight: max(0, viewport.size.height * 0.49), alignment: .bottomLeading)
                    .padding(.horizontal, Spread.space6)
                    .padding(.vertical, Spread.space4)
                    .frame(maxWidth: .infinity)
                }
                .id(page)
                .transition(.asymmetric(
                    insertion: .offset(x: forward ? 24 : -24, y: 0).combined(with: .opacity),
                    removal: .opacity
                ))
                .clipped()
                .contentShape(Rectangle())
                .simultaneousGesture(SpatialTapGesture().onEnded { tap in
                    guard !voiceOver else { return }
                    if tap.location.x < viewport.size.width * 0.22 { move(-1) }
                    if tap.location.x > viewport.size.width * 0.78 { move(1) }
                })
                .safeAreaInset(edge: .bottom, spacing: 0) { controls }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background {
            LifeStoryBackdrop(category: category, tint: Color(hex: PalettePanel.categoryColors[category] ?? Spread.roleFallbackHex))
        }
        .foregroundStyle(.white)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("life-first-week-story")
        .onAppear { readingHeading = true }
        .onChange(of: page) { _, _ in readingHeading = true }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: Spread.space2) {
            LifeStoryProgress(count: count) { index in
                index < page || scene == .complete && index == page ? 1 : index == page ? 0.60 : 0
            }
            HStack {
                Text("Your first week")
                    .font(Spread.headline)
                    .accessibilityValue("Story \(page + 1) of \(count)")
                Spacer(minLength: Spread.space2)
                Button(action: onSkip) {
                    Text(chapter == .complete ? "Close" : "Skip")
                        .padding(.horizontal, Spread.space2)
                        .frame(minHeight: Spread.minimumTarget)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("life-first-week-skip")
            }
        }
        .padding(Spread.space4)
        .background(Spread.artGround)
    }

    private var controls: some View {
        VStack(spacing: Spread.space1) {
            Button {
                if reviewing { move(1) }
                else { onAction() }
            } label: {
                Text(reviewing ? "Next" : chapter.actionTitle)
                    .font(Spread.headline)
                    .multilineTextAlignment(.center)
                    .padding(Spread.space3)
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .foregroundStyle(Spread.onAccent)
                    .background(Spread.accentGradient, in: Capsule())
            }
            .buttonStyle(.spreadPress)
            .accessibilityIdentifier(reviewing ? "life-first-week-story-next" : "life-first-week-action")
            if page > 0 {
                Button { move(-1) } label: {
                    Label("Back", systemImage: "chevron.backward")
                        .frame(minHeight: Spread.minimumTarget)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("life-first-week-story-back")
            }
        }
        .padding(Spread.space4)
        .frame(maxWidth: 680)
        .frame(maxWidth: .infinity)
        .background(Spread.artGround)
    }

    private func move(_ delta: Int) {
        let target = page + delta
        guard (0...chapter.rawValue).contains(target) else { return }
        forward = delta > 0
        withAnimation(SpreadMotion.resolved(SpreadMotion.lifeWeekPage, reduceMotion: reduceMotion)) {
            readingIndex = target == chapter.rawValue ? nil : target
        }
    }
}

struct LifeFirstWeekPrompt: View {
    let title: String
    let message: String
    let actionTitle: String
    let onAction: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spread.space2) {
            Text(title)
                .font(.title3.bold())
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier("life-first-week-title")
            Text(message)
                .font(.body)
                .foregroundStyle(LifePalette.secondary)
            ViewThatFits(in: .horizontal) {
                HStack(spacing: Spread.space3) {
                    primaryAction
                    dismissAction
                }
                .fixedSize(horizontal: true, vertical: false)
                VStack(alignment: .leading, spacing: Spread.space1) {
                    primaryAction
                    dismissAction
                }
            }
        }
        .padding(Spread.space4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .lifeSurface()
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("life-first-week-guide")
    }

    private var primaryAction: some View {
        Button(action: onAction) {
            Text(actionTitle).font(.body.weight(.semibold))
                .frame(minWidth: Spread.minimumTarget, minHeight: Spread.minimumTarget)
                .padding(.horizontal, Spread.space2)
        }
        .foregroundStyle(Spread.onAccent)
        .background(Spread.accentGradient, in: Capsule())
        .buttonStyle(.spreadPress)
        .accessibilityIdentifier("life-first-week-action")
    }

    private var dismissAction: some View {
        Button(action: onDismiss) {
            Text("Skip guide").font(.body)
                .frame(minWidth: Spread.minimumTarget, minHeight: Spread.minimumTarget)
        }
        .buttonStyle(.spreadPress)
        .foregroundStyle(LifePalette.ink)
        .accessibilityIdentifier("life-first-week-skip")
    }
}
#endif
