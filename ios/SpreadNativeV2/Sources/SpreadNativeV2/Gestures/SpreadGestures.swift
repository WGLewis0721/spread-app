#if os(iOS)
import SwiftUI
import UniformTypeIdentifiers

/// Everything that can be dragged on the Week surface. Each case carries identity only; the drop handler
/// asks the store to act, and the store decides whether the change is allowed.
struct SpreadDragPayload: Codable, Transferable, Hashable {
    enum Kind: String, Codable { case spread, allocation, task }
    let kind: Kind
    let roleId: String
    /// Allocation ID for `.allocation`, task ID for `.task`, empty for `.spread`.
    let itemId: String
    /// Display text for the drag preview and VoiceOver announcements.
    let label: String

    static var transferRepresentation: some TransferRepresentation {
        CodableRepresentation(contentType: .data)
    }

    static func spread(roleId: String, label: String) -> SpreadDragPayload {
        SpreadDragPayload(kind: .spread, roleId: roleId, itemId: "", label: label)
    }
    static func allocation(id: String, roleId: String, label: String) -> SpreadDragPayload {
        SpreadDragPayload(kind: .allocation, roleId: roleId, itemId: id, label: label)
    }
    static func task(id: String, roleId: String, label: String) -> SpreadDragPayload {
        SpreadDragPayload(kind: .task, roleId: roleId, itemId: id, label: label)
    }
}

/// Clamps and steps hours as the store does: half-hour steps, never below zero, at most one week's 168 hours.
enum SpreadHours {
    static func clamp(_ value: Double) -> Double {
        let halves = (value * 2).rounded() / 2
        return min(168, max(0, halves))
    }

    static func text(_ value: Double) -> String {
        Int(exactly: value) != nil ? String(Int(value)) : String(format: "%.1f", value)
    }

    static func spoken(_ value: Double) -> String {
        "\(text(value)) \(value == 1 ? "hour" : "hours")"
    }
}

/// Places `followStyle(shift)` from spread-app.tsx: the week follows a little with the finger and fades.
struct WeekFollow: ViewModifier {
    let shift: CGFloat
    let enabled: Bool

    func body(content: Content) -> some View {
        content
            .offset(x: enabled ? max(-40, min(40, shift * 0.62)) : 0)
            .opacity(enabled ? 1 - min(0.55, abs(Double(shift)) / 110) : 1)
    }
}
#endif
