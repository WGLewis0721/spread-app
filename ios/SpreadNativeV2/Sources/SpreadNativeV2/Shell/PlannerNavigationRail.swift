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
        VStack(spacing: Spread.space2) {
            ScrollView {
                VStack(spacing: Spread.space2) {
                    ForEach(items) { item in
                        Button { if selected != item.id { onSelect(item.id) } } label: {
                            VStack(spacing: 5) {
                                HStack(spacing: Spread.space1) {
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
                            .padding(.vertical, Spread.space1)
                            .foregroundStyle(selected == item.id ? Spread.ink : Spread.secondary)
                            .background(selected == item.id ? Spread.fill : .clear,
                                        in: RoundedRectangle(cornerRadius: Spread.radiusControl))
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
                // The same Lucide panel-left as the Classic navigation toggle (ICON_HANDOFF); the label carries the state.
                SpreadIcon(name: "lucide-panel-left", size: 20)
                    .frame(maxWidth: .infinity, minHeight: Spread.minimumTarget).contentShape(Rectangle())
            }
            .buttonStyle(.spreadPress)
            .accessibilityLabel(expanded ? "Condense navigation" : "Expand navigation")
            .accessibilityIdentifier("planner-navigation-toggle")
        }
        .padding(Spread.space2)
        .frame(width: labelsVisible ? 144 : 72)
        .background(Spread.elevated)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("planner-navigation-rail")
    }
}
#endif
