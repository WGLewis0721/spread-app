// swift-tools-version: 5.9
import PackageDescription

// Native SwiftUI Spread. iOS 17 remains the minimum; no new dependencies.
// Resources: original authored Chalkboard art (unchanged), the 40 motion cutouts (unchanged) and
// the original Spread SVG icons in an asset catalog (template-tinted where the React app tinted them).
let package = Package(
    name: "SpreadNativeV2",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [.library(name: "SpreadNativeV2", targets: ["SpreadNativeV2"])],
    targets: [
        .target(
            name: "SpreadNativeV2",
            resources: [
                .copy("Resources/Chalk"),
                .copy("Resources/Motion"),
                .copy("Resources/Editorial"),
                .process("Resources/Icons.xcassets")
            ]
        ),
        .testTarget(name: "SpreadNativeV2Tests", dependencies: ["SpreadNativeV2"], resources: [.copy("Fixtures")])
    ]
)
