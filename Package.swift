// swift-tools-version:5.1
import PackageDescription

let package = Package(
    name: "HCVimeoVideoExtractor",
    platforms: [
        .iOS(.v9)
    ],
    products: [
        .library(
            name: "HCVimeoVideoExtractor", 
            targets: ["HCVimeoVideoExtractor"]
        )
    ],
    targets: [
        .target(
            name: "HCVimeoVideoExtractor",
            dependencies: [],
            path: "HCVimeoVideoExtractor/Classes"
        )
    ],
    swiftLanguageVersions: [.v5]
)
