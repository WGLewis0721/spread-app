#if os(iOS)
import SwiftUI

/// The Life area choice in Plan Ahead. The row draws the chosen area's own name and colour dot, the same
/// identity the budget chips and weekly-time bar show, instead of a system Picker's value label. Choosing
/// only changes the selection the caller owns; nothing is written here. At accessibility sizes the name
/// moves under the title rather than being clipped.
struct LifeAreaMenuRow: View {
    let title: String
    @Binding var selection: String
    let roles: [Responsibility]

    private var chosen: Responsibility? {
        roles.first { $0.id == selection }
    }

    var body: some View {
        Menu {
            ForEach(roles) { role in
                Button {
                    selection = role.id
                } label: {
                    Text(role.name)
                }
            }
        } label: {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: Spread.space2) {
                    titleText
                    Spacer(minLength: Spread.space2)
                    valueText
                    chevron
                }
                VStack(alignment: .leading, spacing: Spread.space1) {
                    HStack(spacing: Spread.space2) {
                        titleText
                        Spacer(minLength: Spread.space2)
                        chevron
                    }
                    valueText
                }
            }
            .frame(maxWidth: .infinity, minHeight: Spread.minimumTarget, alignment: .leading)
            .contentShape(Rectangle())
        }
        .accessibilityLabel(title)
        .accessibilityValue(chosen?.name ?? "Not chosen")
        .accessibilityHint("Opens the Life areas to choose from")
    }

    private var titleText: some View {
        Text(title)
            .foregroundStyle(Spread.ink)
    }

    private var chevron: some View {
        SpreadIcon(name: "lucide-chevron-down", size: 16)
            .foregroundStyle(Spread.secondary)
    }

    @ViewBuilder private var valueText: some View {
        if let chosen {
            HStack(spacing: Spread.space1) {
                Circle()
                    .fill(Color(hex: chosen.color))
                    .frame(width: 10, height: 10)
                Text(chosen.name)
                    .foregroundStyle(Spread.secondary)
                    .multilineTextAlignment(.trailing)
            }
        } else {
            Text("Choose a Life area")
                .foregroundStyle(Spread.secondary)
        }
    }
}
#endif
