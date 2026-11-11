import Foundation

/// Reversible presentation gate for the editorial Life cards.
/// Off (default): the main-head presentation, unchanged: GeometryReader artwork with Chalk
/// art, the original face, geometry and details. No editorial file is read.
/// On: the layered artwork base, the editorial art registry, the focus scroll and the
/// seven-day detail list.
/// Enable for testing with the launch argument `-native.life.editorialArt.enabled YES`
/// or `defaults write`. Presentation only: no planner, store or storage access.
enum LifeEditorialPresentation {
    static let defaultsKey = "native.life.editorialArt.enabled"
}
