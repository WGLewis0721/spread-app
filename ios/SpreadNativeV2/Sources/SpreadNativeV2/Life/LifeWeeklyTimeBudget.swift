#if os(iOS)
import SwiftUI

/// Read-only Life preview of the authoritative Hours budget. All amounts come
/// directly from the planner snapshot; only Hours can change allocations.
struct LifeWeeklyTimeBudget: View {
    let roles: [Responsibility]
    let capacity: Double?
    let compact: Bool
    let expanded: Bool
    let onToggle: () -> Void
    let onSelectRole: (String) -> Void

    @ScaledMetric(relativeTo: .body) private var barHeight: CGFloat = 32
    @ScaledMetric(relativeTo: .body) private var compactBarHeight: CGFloat = 26
    @ScaledMetric(relativeTo: .caption) private var minimumRoleLabelWidth: CGFloat = 40
    @ScaledMetric(relativeTo: .caption) private var minimumAvailableLabelWidth: CGFloat = 54

    private var assigned: Double { LifeBudgetBarMath.assigned(roles) }
    private var hasCapacity: Bool { (capacity ?? 0) > 0 }
    private var capacityCopy: String {
        guard let capacity, capacity > 0 else { return "budgeted" }
        return "of " + SpreadHours.text(capacity) + "h budgeted"
    }
    private var available: Double? { LifeBudgetBarMath.available(capacity, assigned: assigned) }
    private var overBudget: Double {
        guard let capacity else { return 0 }
        return max(0, assigned - capacity)
    }
    private var positiveRoles: [Responsibility] { roles.filter { $0.hours > 0 } }

    var body: some View {
        Group {
            if compact { compactContent }
            else { fullContent }
        }
        .padding(.horizontal, compact ? 12 : 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Spread.cardFill, in: RoundedRectangle(cornerRadius: Spread.radiusCard, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Spread.radiusCard, style: .continuous)
            .strokeBorder(Spread.line, lineWidth: 1))
    }

    /// The compact card used on Life. It shows the same planner values as Hours, full width,
    /// and keeps the full-width tap action.
    private var compactContent: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("WEEKLY TIME")
                .font(.caption2.weight(.semibold))
                .tracking(1.2)
                .foregroundStyle(Spread.secondary)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(SpreadHours.text(assigned) + "h")
                    .font(.title3.bold())
                    .monospacedDigit()
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                Text(hasCapacity ? "of " + SpreadHours.text(capacity ?? 0) + "h" : "budgeted")
                    .font(.caption)
                    .foregroundStyle(Spread.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                Spacer(minLength: 0)
            }
            storageBar
            HStack(spacing: 4) {
                Text(hasCapacity
                    ? (overBudget > 0 ? SpreadHours.text(overBudget) + "h over budget"
                                      : SpreadHours.text(available ?? 0) + "h available")
                    : "Weekly hours not set")
                    .font(.caption2)
                    .foregroundStyle(overBudget > 0 ? Spread.danger : Spread.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                Spacer(minLength: 0)
                Button(action: onToggle) {
                    HStack(spacing: 3) {
                        ViewThatFits(in: .horizontal) {
                            Text(hasCapacity ? "Adjust hours" : "Set weekly hours")
                            Text(hasCapacity ? "Adjust" : "Set hours")
                        }
                        SpreadIcon(name: expanded ? "lucide-chevron-up" : "lucide-chevron-down", size: 19)
                    }
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Spread.accent)
                    .frame(minHeight: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(hasCapacity ? "Adjust hours" : "Set weekly hours")
                .accessibilityValue(expanded ? "Expanded" : "Collapsed")
                .accessibilityHint(expanded ? "Closes the weekly hours editor" : "Opens the weekly hours editor")
                .accessibilityIdentifier("life-budget-toggle")
            }
        }
    }

    private var fullContent: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 10) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("WEEKLY TIME")
                        .font(.caption2.weight(.semibold))
                        .tracking(1.7)
                        .foregroundStyle(Spread.secondary)

                    ViewThatFits(in: .horizontal) {
                        HStack(alignment: .firstTextBaseline, spacing: 5) {
                            Text(SpreadHours.text(assigned) + "h")
                                .font(.system(.title2, weight: .bold)).monospacedDigit()
                            Text(capacityCopy)
                                .font(.subheadline).foregroundStyle(Spread.secondary)
                        }
                        VStack(alignment: .leading, spacing: 0) {
                            Text(SpreadHours.text(assigned) + "h")
                                .font(.system(.title2, weight: .bold)).monospacedDigit()
                            Text(capacityCopy)
                                .font(.caption).foregroundStyle(Spread.secondary)
                        }
                    }
                }
                Spacer(minLength: 4)
                VStack(alignment: .trailing, spacing: 2) {
                    Text(!hasCapacity ? "—" : SpreadHours.text(overBudget > 0 ? overBudget : available ?? 0) + "h")
                        .font(.system(.title3, weight: .bold)).monospacedDigit()
                    Text(!hasCapacity ? "Set weekly hours" : (overBudget > 0 ? "Over budget" : "Available"))
                        .font(.caption).foregroundStyle(hasCapacity && overBudget > 0 ? Spread.danger : Spread.secondary)
                        .multilineTextAlignment(.trailing)
                }
            }

            storageBar

            HStack(spacing: 5) {
                Text("\(roles.count) Life \(roles.count == 1 ? "area" : "areas")")
                    .font(.caption2).foregroundStyle(Spread.secondary)
                Spacer(minLength: 8)
                Button(action: onToggle) {
                    HStack(spacing: 4) {
                        Text(hasCapacity ? "Adjust hours" : "Set weekly hours")
                        SpreadIcon(name: expanded ? "lucide-chevron-up" : "lucide-chevron-down", size: 19)
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Spread.accent)
                    .frame(minHeight: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(hasCapacity ? "Adjust hours" : "Set weekly hours")
                .accessibilityValue(expanded ? "Expanded" : "Collapsed")
                .accessibilityHint(expanded ? "Closes the weekly hours editor" : "Opens the weekly hours editor")
                .accessibilityIdentifier("life-budget-toggle")
            }
        }
    }

    private var storageBar: some View {
        GeometryReader { geometry in
            ZStack {
            if let capacity, capacity > 0 {
                let track = LifeBudgetBarMath.trackHours(assigned: assigned, capacity: capacity)
                HStack(spacing: 0) {
                    ForEach(positiveRoles) { role in
                        let width = LifeBudgetBarMath.width(hours: role.hours, track: track, totalWidth: geometry.size.width)
                        ZStack {
                            Color(hex: role.color)
                            LinearGradient(colors: [.white.opacity(0.16), .clear],
                                           startPoint: .top, endPoint: .bottom)
                            if width >= minimumRoleLabelWidth {
                                Text(SpreadHours.text(role.hours) + "h")
                                    .font(.caption.weight(.bold))
                                    .monospacedDigit()
                                    .foregroundStyle(LifeBudgetBarMath.ink(for: role.color))
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.85)
                                    .padding(.horizontal, 2)
                            }
                        }
                        .frame(width: width)
                        .clipped()
                    }
    
                    if let available, available > 0 {
                        let width = LifeBudgetBarMath.width(hours: available, track: track, totalWidth: geometry.size.width)
                        ZStack {
                            Spread.inset
                            LifeBudgetHatch()
                                .stroke(Spread.secondary.opacity(0.14), lineWidth: 5)
                            if width >= minimumAvailableLabelWidth {
                                Text(SpreadHours.text(available) + "h")
                                    .font(.caption.weight(.bold))
                                    .monospacedDigit()
                                    .foregroundStyle(Spread.ink)
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.85)
                                    .padding(.horizontal, 2)
                            }
                        }
                        .frame(width: width)
                        .clipped()
                    }
                }
                .frame(width: geometry.size.width, height: geometry.size.height, alignment: .leading)
                .background(Spread.inset)
                .clipShape(Capsule())
                .overlay(Capsule().strokeBorder(Spread.line, lineWidth: 1))
            } else {
                // A missing weekly capacity is unknown, not a 100%-filled
                // budget. Defer proportions until the user sets Hours.
                ZStack {
                    Spread.inset
                    LifeBudgetHatch()
                        .stroke(Spread.secondary.opacity(0.14), lineWidth: 5)
                    Text("Set weekly hours")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Spread.secondary)
                }
                .frame(width: geometry.size.width, height: geometry.size.height)
                .clipShape(Capsule())
                .overlay(Capsule().strokeBorder(Spread.line, lineWidth: 1))
            }
            Color.clear
                .contentShape(Rectangle())
                .onTapGesture(coordinateSpace: .local) { point in
                    guard let capacity, capacity > 0 else { onToggle(); return }
                    let track = LifeBudgetBarMath.trackHours(assigned: assigned, capacity: capacity)
                    let x = Double(max(0, min(point.x, geometry.size.width)) /
                                   max(1, geometry.size.width)) * track
                    var cursor = 0.0
                    for role in positiveRoles {
                        cursor += role.hours
                        if x <= cursor { onSelectRole(role.id); return }
                    }
                    onToggle()
                }
            }
        }
        .frame(height: compact ? compactBarHeight : max(32, barHeight))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(LifeBudgetBarMath.accessibilityLabel(roles: roles, capacity: capacity))
        .accessibilityAddTraits(.isButton)
        .accessibilityAction { onToggle() }
        .accessibilityIdentifier("life-budget-segments")
    }
}

/// Geometry is proportional to the *entire weekly capacity*, not just the
/// hours already assigned. Never stretch small segments to fit text labels.
enum LifeBudgetBarMath {
    static func assigned(_ roles: [Responsibility]) -> Double {
        roles.reduce(0) { $0 + max(0, $1.hours) }
    }

    static func available(_ capacity: Double?, assigned: Double) -> Double? {
        guard let capacity, capacity > 0 else { return nil }
        return max(0, capacity - assigned)
    }

    static func trackHours(assigned: Double, capacity: Double?) -> Double {
        max(1, max(assigned, capacity ?? 0))
    }

    static func width(hours: Double, track: Double, totalWidth: CGFloat) -> CGFloat {
        max(0, totalWidth) * CGFloat(max(0, hours) / max(1, track))
    }

    static func accessibilityLabel(roles: [Responsibility], capacity: Double?) -> String {
        let used = assigned(roles)
        var parts = ["Weekly time", SpreadHours.text(used) + " hours budgeted"]
        if let capacity, capacity > 0 {
            parts.append(SpreadHours.text(capacity) + " hours total")
            let difference = capacity - used
            parts.append(SpreadHours.text(abs(difference)) +
                         (difference < 0 ? " hours over budget" : " hours available"))
        } else {
            parts.append("Weekly capacity not set")
        }
        parts += roles.filter { $0.hours > 0 }.map {
            $0.name + ", " + SpreadHours.text($0.hours) + " hours"
        }
        parts.append("Adjust hours")
        return parts.joined(separator: ", ")
    }

    /// Choose contrasting ink for arbitrary user-configured role colors.
    static func ink(for hex: String) -> Color {
        let digits = hex.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "#", with: "")
        guard digits.count == 6, let rgb = UInt32(digits, radix: 16) else { return .white }
        func linear(_ channel: UInt32) -> Double {
            let value = Double(channel) / 255
            return value <= 0.04045 ? value / 12.92 : pow((value + 0.055) / 1.055, 2.4)
        }
        let lightness = 0.2126 * linear((rgb >> 16) & 0xFF) +
                        0.7152 * linear((rgb >> 8) & 0xFF) +
                        0.0722 * linear(rgb & 0xFF)
        return lightness > 0.179 ? .black : .white
    }
}

/// Restrained diagonal hatch for time still available, as in iPhone Storage.
/// Drawn in SwiftUI: no image asset, glass material, or animation dependency.
private struct LifeBudgetHatch: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        for x in stride(from: -rect.height, through: rect.width, by: CGFloat(14)) {
            path.move(to: CGPoint(x: x, y: rect.maxY))
            path.addLine(to: CGPoint(x: x + rect.height, y: rect.minY))
        }
        return path
    }
}
#endif
