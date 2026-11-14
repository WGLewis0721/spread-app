#if os(iOS)
import SwiftUI

/// A single responsibility selector shared by Spread and the focused Week/Month surface.
/// Changing selection is presentation state; the planner store stays the sole task writer.
struct ResponsibilitySidebar: View {
    let snapshot: PlannerSnapshot
    @Binding var selectedRole: String?
    let expanded: Bool
    let onAdd: () -> Void
    let onToggle: () -> Void
    var onSelected: ((String) -> Void)? = nil
    var horizontal = false

    private func weeklyCompletion(_ roleId: String) -> Double {
        let tasks = snapshot.tasks.filter { $0.roleId == roleId }
        guard !tasks.isEmpty else { return 0 }
        return Double(tasks.filter(\.done).count) / Double(tasks.count)
    }

    var body: some View {
        let layout = horizontal ? AnyLayout(HStackLayout(spacing: 5)) : AnyLayout(VStackLayout(spacing: 5))
        let items = horizontal ? AnyLayout(HStackLayout(spacing: 6)) : AnyLayout(VStackLayout(spacing: 6))
        return layout {
            ScrollView(horizontal ? .horizontal : .vertical) {
                items {
                    ForEach(snapshot.roles) { role in
                        Button {
                            selectedRole = role.id
                            onSelected?(role.id)
                            SpreadHaptics.selection()
                        } label: {
                            VStack(spacing: 4) {
                                ZStack {
                                    Circle()
                                        .stroke(Color(hex: role.color).opacity(0.20), lineWidth: 2)
                                    Circle()
                                        .trim(from: 0, to: weeklyCompletion(role.id))
                                        .stroke(Color(hex: role.color),
                                                style: StrokeStyle(lineWidth: 2, lineCap: .round))
                                        .rotationEffect(.degrees(-90))
                                    RoleBadge(category: role.category == "custom" ? nil : role.category,
                                              color: role.color, size: 26)
                                }
                                .frame(width: 42, height: 42)
                                if expanded {
                                    Text(role.name)
                                        .font(.system(.caption2, weight: .semibold))
                                        .foregroundStyle(Spread.ink)
                                        .lineLimit(2)
                                        .minimumScaleFactor(0.8)
                                        .multilineTextAlignment(.center)
                                }
                            }
                            .frame(maxWidth: .infinity, minHeight: expanded ? 74 : 52)
                            .frame(width: horizontal ? 52 : nil)
                            .background(role.id == selectedRole ? Color(hex: role.color).opacity(0.14) : Color.clear,
                                        in: RoundedRectangle(cornerRadius: 12))
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(role.name)
                        .accessibilityValue("\(Int(weeklyCompletion(role.id) * 100)) percent complete")
                        .accessibilityAddTraits(role.id == selectedRole ? .isSelected : [])
                        .accessibilityIdentifier("focus-role-\(role.id)")
                    }
                }
            }
            .scrollIndicators(.hidden)
            Button(action: onAdd) {
                SpreadIcon(name: "icon-add", size: 20).font(.system(.headline, weight: .medium))
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .frame(width: horizontal ? 44 : nil)
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel("Add responsibility")
            .accessibilityIdentifier("sidebar-add-role")

            Button(action: onToggle) {
                Image(systemName: expanded ? "chevron.left.2" : "chevron.right.2")
                    .font(.system(.subheadline, weight: .semibold))
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .frame(width: horizontal ? 44 : nil)
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel(expanded ? "Condense sidebar" : "Expand sidebar")
            .accessibilityIdentifier("sidebar-expand-collapse")
        }
        .frame(height: horizontal ? 60 : nil)
        .padding(4)
        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: 18))
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("responsibility-sidebar")
    }
}
#endif
