#if os(iOS)
import SwiftUI

/// High priority (`important`) on any task row: one red "!" beside the task text, spoken as "High priority".
/// Shared by every surface so the marker reads the same everywhere (owner decision OD1). It marks the task only.
/// It never changes where the task is scheduled, and the spoken words carry the meaning without the colour.
struct TaskPriorityMark: View {
    var body: some View {
        Text("!")
            .font(.system(.caption, weight: .heavy))
            .foregroundStyle(Spread.danger)
            .frame(width: 20, height: 20)
            .overlay(Circle().strokeBorder(Spread.danger, lineWidth: 1.5))
            .accessibilityLabel("High priority")
    }
}
#endif
