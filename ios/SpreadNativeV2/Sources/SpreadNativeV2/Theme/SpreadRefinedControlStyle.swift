#if os(iOS)
import SwiftUI

/// The refined control for the in-app timer: a raised, hairline-edged pill with a soft shadow and a pressed state.
/// `prominent` fills it with the accent gradient for the one action that matters now. `danger` tints the label red.
/// A disabled control dims as a whole, using the shared disabled token, so it never looks live.
struct SpreadRefinedControlStyle: ButtonStyle {
    var prominent = false
    var danger = false

    func makeBody(configuration: Configuration) -> some View {
        SpreadRefinedControlBody(configuration: configuration, prominent: prominent, danger: danger)
    }
}

private struct SpreadRefinedControlBody: View {
    let configuration: ButtonStyleConfiguration
    let prominent: Bool
    let danger: Bool
    @Environment(\.isEnabled) private var isEnabled

    var body: some View {
        configuration.label
            .foregroundStyle(prominent ? Spread.onAccent : (danger ? Spread.danger : Spread.ink))
            .background { pillFill }
            .overlay(Capsule().strokeBorder(prominent ? Color.clear : Spread.line, lineWidth: 1))
            .shadow(color: Spread.shadow, radius: 4, y: 2)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .opacity(isEnabled ? (configuration.isPressed ? 0.9 : 1) : Spread.disabledOpacity)
    }

    @ViewBuilder private var pillFill: some View {
        if prominent {
            Capsule().fill(Spread.accentGradient)
        } else {
            Capsule().fill(LinearGradient(colors: [Spread.elevated, Spread.inset], startPoint: .top, endPoint: .bottom))
        }
    }
}
#endif
