#if os(iOS)
import SwiftUI

/// Read-only Life preview of the authoritative Hours budget. All amounts come
/// directly from the planner snapshot; only Hours can change allocations.
struct LifeWeeklyTimeBudget: View {
    let roles: [Responsibility]
    let capacity: Double?

    @ScaledMetric(relativeTo: .body) private var barHeight: CGFloat = 32

    private var assigned: Double { LifeBudgetBarMath.assigned(roles) }
    private var available: Double? { LifeBudgetBarMath.available(capacity, assigned: assigned) }
    private var overBudget: Double {
        guard let capacity else { return 0 }
        return max(0, assigned - capacity)
    }
    private var positiveRoles: [Responsibility] { roles.filter { $0.hours > 0 } }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
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
                            Text(capacity.map { "of " + SpreadHours.text($0) + "h budgeted" } ?? "budgeted")
                                .font(.subheadline).foregroundStyle(Spread.secondary)
                        }
                        VStack(alignment: .leading, spacing: 0) {
                            Text(SpreadHours.text(assigned) + "h")
                                .font(.system(.title2, weight: .bold)).monospacedDigit()
                            Text(capacity.map { "of " + SpreadHours.text($0) + "h budgeted" } ?? "budgeted")
                                .font(.caption).foregroundStyle(Spread.secondary)
                        }
                    }
                }
                Spacer(minLength: 4)
                VStack(alignment: .trailing, spacing: 2) {
                    Text(capacity == nil ? "—" : SpreadHours.text(overBudget > 0 ? overBudget : available ?? 0) + "h")
                        .font(.system(.title3, weight: .bold)).monospacedDigit()
                    Text(capacity == nil ? "Set weekly hours" : (overBudget > 0 ? "Over budget" : "Available"))
                        .font(.caption).foregroundStyle(overBudget > 0 ? Spread.danger : Spread.secondary)
                        .multilineTextAlignment(.trailing)
                }
            }

            storageBar

            HStack(spacing: 5) {
                Text("\(roles.count) Life \(roles.count == 1 ? "area" : "areas")")
                    .font(.caption2).foregroundStyle(Spread.secondary)
                Spacer(minLength: 8)
                Text(capacity == nil ? "Set weekly hours" : "Adjust hours")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Spread.accent)
                Image(systemName: "arrow.right")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Spread.accent)
                    .accessibilityHidden(true)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Spread.cardFill, in: RoundedRectangle(cornerRadius: Spread.radiusCard, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Spread.radiusCard, style: .continuous)
            .strokeBorder(Spread.line, lineWidth: 1))
    }

    private var storageBar: some View {
        GeometryReader { geometry in
            let track = LifeBudgetBarMath.trackHours(assigned: assigned, capacity: capacity)
            HStack(spacing: 0) {
                ForEach(positiveRoles) { role in
                    let width = LifeBudgetBarMath.width(hours: role.hours, track: track, totalWidth: geometry.size.width)
                    ZStack {
                        Color(hex: role.color)
                        LinearGradient(colors: [.white.opacity(0.16), .clear],
                                       startPoint: .top, endPoint: .bottom)
                        if width >= 40 {
                            Text(SpreadHours.text(role.hours) + "h")
                                .font(.system(size: width < 50 ? 11 : 13, weight: .bold))
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
                        if width >= 48 {
                            Text(SpreadHours.text(available) + "h")
                                .font(.system(size: width < 62 ? 11 : 13, weight: .bold))
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
        }
        .frame(height: max(32, barHeight))
        .accessibilityHidden(true)
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
