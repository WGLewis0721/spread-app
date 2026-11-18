/// Read-only milestones in the actual weekly plan.
enum LifeFirstWeekStep: Equatable {
    static let handledKey = "native.life.firstWeekHandled"

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
}

#if os(iOS)
import SwiftUI

struct LifeFirstWeekPrompt: View {
    let title: String
    let message: String
    let actionTitle: String
    var dismissTitle: String? = "Skip guide"
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
            if let dismissTitle {
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: Spread.space3) {
                        primaryAction
                        dismissAction(dismissTitle)
                    }
                    .fixedSize(horizontal: true, vertical: false)
                    VStack(alignment: .leading, spacing: Spread.space1) {
                        primaryAction
                        dismissAction(dismissTitle)
                    }
                }
            } else {
                primaryAction
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

    private func dismissAction(_ label: String) -> some View {
        Button(action: onDismiss) {
            Text(label).font(.body)
                .frame(minWidth: Spread.minimumTarget, minHeight: Spread.minimumTarget)
        }
        .buttonStyle(.spreadPress)
        .foregroundStyle(LifePalette.ink)
        .accessibilityIdentifier("life-first-week-skip")
    }
}
#endif
