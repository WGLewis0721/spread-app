#if os(iOS)
import SwiftUI

struct PlannerNavigationItem: Identifiable {
    let id: String
    let title: String
    let icon: String
}

/// The same navigation component adapts to usable width in Classic and Life.
/// It changes presentation only; it never sends a planner mutation.
struct PlannerNavigationRail: View {
    let items: [PlannerNavigationItem]
    let selected: String
    @Binding var expanded: Bool
    let onSelect: (String) -> Void
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private var labelsVisible: Bool { expanded || typeSize.isAccessibilitySize }

    var body: some View {
        VStack(spacing: 8) {
            ScrollView {
                VStack(spacing: 8) {
                    ForEach(items) { item in
                        Button { if selected != item.id { onSelect(item.id) } } label: {
                            VStack(spacing: 5) {
                                HStack(spacing: 4) {
                                    SpreadIcon(name: item.icon, size: 22)
                                    if selected == item.id {
                                        Image(systemName: "checkmark").font(.caption.bold())
                                    }
                                }
                                if labelsVisible {
                                    Text(item.title).font(.caption)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }
                            .frame(maxWidth: .infinity, minHeight: 52)
                            .padding(.vertical, 4)
                            .foregroundStyle(selected == item.id ? Spread.ink : Spread.secondary)
                            .background(selected == item.id ? Spread.fill : .clear,
                                        in: RoundedRectangle(cornerRadius: 14))
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.spreadPress)
                        .accessibilityLabel(item.title)
                        .accessibilityAddTraits(selected == item.id ? .isSelected : [])
                        .accessibilityIdentifier("planner-nav-\(item.id)")
                    }
                }
            }.scrollIndicators(.hidden)
            Button {
                SpreadHaptics.selection()
                withAnimation(reduceMotion ? nil : SpreadTactile.glide) { expanded.toggle() }
            } label: {
                Image(systemName: expanded ? "sidebar.left" : "sidebar.right")
                    .frame(maxWidth: .infinity, minHeight: 44).contentShape(Rectangle())
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel(expanded ? "Condense navigation" : "Expand navigation")
            .accessibilityIdentifier("planner-navigation-toggle")
        }
        .padding(8)
        .frame(width: labelsVisible ? 144 : 72)
        .background(Spread.elevated)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("planner-navigation-rail")
    }
}
#endif
