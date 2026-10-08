// swift-tools-version: 5.9
import PackageDescription

// Pure logic for Spread's iCloud backup: file naming, path safety and retention. It imports
// nothing but Foundation, so it builds and its tests run anywhere (including CI on Linux).
let package = Package(
    name: "SpreadCloudCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "SpreadCloudCore", targets: ["SpreadCloudCore"])
    ],
    targets: [
        .target(name: "SpreadCloudCore"),
        .testTarget(name: "SpreadCloudCoreTests", dependencies: ["SpreadCloudCore"])
    ]
)
