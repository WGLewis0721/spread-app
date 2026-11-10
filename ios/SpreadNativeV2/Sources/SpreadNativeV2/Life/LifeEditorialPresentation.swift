import Foundation

/// Reversible presentation gate for the editorial Life cards.
/// Off (default): the original golden face, geometry and details.
/// On: the editorial face, the artwork registry and the seven-day detail list.
/// Enable for testing with the launch argument `-native.life.editorialArt.enabled YES`
/// or `defaults write`. Presentation only: no planner, store or storage access.
enum LifeEditorialPresentation {
    static let defaultsKey = "native.life.editorialArt.enabled"
}
