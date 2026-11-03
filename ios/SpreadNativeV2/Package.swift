// swift-tools-version: 5.9
import PackageDescription

// Isolated SwiftUI proof-of-value. iOS 17 remains the minimum; no new dependencies.
let package = Package(
    name: "SpreadNativeV2",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [.library(name: "SpreadNativeV2", targets: ["SpreadNativeV2"])],
    targets: [
        .target(name: "SpreadNativeV2", resources: [.copy("Resources/Chalk")]),
        .testTarget(name: "SpreadNativeV2Tests", dependencies: ["SpreadNativeV2"], resources: [.copy("Fixtures")])
    ]
)
