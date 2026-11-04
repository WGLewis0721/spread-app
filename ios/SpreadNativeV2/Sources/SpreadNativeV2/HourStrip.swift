import Foundation

/// Widths for the Spread summary's hour strip: one segment per responsibility, sized by its hours.
///
/// The earlier strip gave every segment the same width, so it said nothing about hours. Here each segment
/// takes a share of the row proportional to its hours, but never less than `minimum` points (the 44 pt
/// touch target) while that is possible. When even equal segments cannot all reach the minimum, the row
/// falls back to equal widths so every segment stays reachable.
public enum HourStrip {
    public static func widths(hours: [Double], available: Double, spacing: Double, minimum: Double) -> [Double] {
        let count = hours.count
        guard count > 0 else { return [] }
        let room = max(0, available - spacing * Double(count - 1))
        guard room > 0 else { return Array(repeating: 0, count: count) }
        if minimum * Double(count) >= room { return Array(repeating: room / Double(count), count: count) }

        let weights: [Double] = hours.map { $0.isFinite ? max(0, $0) : 0 }
        var pinned = [Bool](repeating: false, count: count)

        // Pin every segment whose proportional share falls under the minimum, then share what is left among the
        // others. Pinning can push another segment under the minimum, so repeat (at most `count` times).
        for _ in 0..<count {
            let pinnedCount = pinned.filter { $0 }.count
            let freeCount = count - pinnedCount
            guard freeCount > 0 else { break }
            let freeRoom = room - Double(pinnedCount) * minimum
            var freeWeight: Double = 0
            for index in 0..<count where !pinned[index] { freeWeight += weights[index] }
            var changed = false
            for index in 0..<count where !pinned[index] {
                let share = freeWeight > 0 ? freeRoom * weights[index] / freeWeight : freeRoom / Double(freeCount)
                if share < minimum { pinned[index] = true; changed = true }
            }
            if !changed { break }
        }

        let pinnedCount = pinned.filter { $0 }.count
        let freeCount = count - pinnedCount
        let freeRoom = room - Double(pinnedCount) * minimum
        var freeWeight: Double = 0
        for index in 0..<count where !pinned[index] { freeWeight += weights[index] }
        var result = [Double](repeating: minimum, count: count)
        for index in 0..<count where !pinned[index] {
            result[index] = freeWeight > 0 ? freeRoom * weights[index] / freeWeight : freeRoom / Double(max(1, freeCount))
        }
        return result
    }
}
