import Foundation

public struct DialArc: Equatable, Identifiable, Sendable {
    public let id: String
    public let from: Double  // degrees clockwise from 12 o'clock
    public let to: Double
    public var span: Double { to - from }
}

public enum DialGeometry {
    public static let gapDegrees = 3.0

    /// Identical proportional segmentation to Studio's pure layouts.ts; a role with
    /// 0 hours retains a minimum visible segment, but that does not allocate hours.
    public static func arcs(for roles: [Responsibility]) -> [DialArc] {
        guard !roles.isEmpty else { return [] }
        let weights = roles.map { max($0.hours, 0.5) }
        let total = weights.reduce(0, +)
        let gap = roles.count > 1 ? Double(roles.count) * gapDegrees : 0
        let available = max(0, 360 - gap)
        var cursor = roles.count > 1 ? gapDegrees / 2 : 0
        return zip(roles, weights).map { role, weight in
            let span = min(359.9, weight / total * available)
            let arc = DialArc(id: role.id, from: cursor, to: cursor + span)
            cursor += span + (roles.count > 1 ? gapDegrees : 0)
            return arc
        }
    }

    public static func roleId(at angle: Double, arcs: [DialArc]) -> String? {
        guard angle.isFinite, let first = arcs.first else { return nil }
        let normalized = ((angle.truncatingRemainder(dividingBy: 360)) + 360)
            .truncatingRemainder(dividingBy: 360)
        return arcs.first(where: {
            normalized >= $0.from - gapDegrees / 2 &&
            normalized < $0.to + gapDegrees / 2
        })?.id ?? first.id
    }
}
