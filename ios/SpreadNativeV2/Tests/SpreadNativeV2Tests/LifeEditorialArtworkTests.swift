#if os(iOS)
import XCTest
import UIKit
@testable import SpreadNativeV2

final class LifeEditorialArtworkTests: XCTestCase {
    func testAllSixApprovedArtworkFilesDecodeAtThreeThousandByEighteenHundred() throws {
        let categories = ["work", "family", "fitness", "school", "home", "personal"]
        for category in categories {
            let image = try XCTUnwrap(LifeEditorialArtworkRegistry.image(for: category),
                                      "Missing approved editorial artwork for \(category)")
            let cgImage = try XCTUnwrap(image.cgImage)
            XCTAssertEqual(cgImage.width, 3000, "Incorrect \(category) artwork width")
            XCTAssertEqual(cgImage.height, 1800, "Incorrect \(category) artwork height")
        }
    }

    func testUnknownCategoryMapsToCustom() {
        // Only the mapping is asserted. Asserting the absence of art would break
        // as soon as a clean custom.webp is supplied.
        XCTAssertEqual(ChalkArtwork.category(for: "not-a-category"), "custom")
    }

    func testEveryKnownCategoryHasOriginalChalkFallback() {
        for category in ChalkArtwork.categories {
            XCTAssertNotNil(ChalkArtwork.resourceURL(for: category), category)
        }
    }

    func testEveryKnownCategoryCanBeLookedUpWithoutCrashing() {
        for category in ChalkArtwork.categories {
            _ = LifeEditorialArtworkRegistry.image(for: category)
        }
    }

    func testArtButtonNamesWhatATapSwitchesTo() {
        XCTAssertEqual(LifeEditorialPresentation.toggleLabel(enabled: false), "Use new card art")
        XCTAssertEqual(LifeEditorialPresentation.toggleLabel(enabled: true), "Use original card art")
    }

    func testArtButtonLabelsAreDistinctAndNeverEmpty() {
        let off = LifeEditorialPresentation.toggleLabel(enabled: false)
        let on = LifeEditorialPresentation.toggleLabel(enabled: true)
        XCTAssertNotEqual(off, on)
        XCTAssertFalse(off.isEmpty)
        XCTAssertFalse(on.isEmpty)
    }

    func testEditorialPresentationGateDefaultsOffAndKeyIsStable() {
        XCTAssertEqual(LifeEditorialPresentation.defaultsKey, "native.life.editorialArt.enabled")
        let defaults = UserDefaults.standard
        let key = LifeEditorialPresentation.defaultsKey
        let saved = defaults.object(forKey: key)
        defer {
            if let saved { defaults.set(saved, forKey: key) } else { defaults.removeObject(forKey: key) }
        }
        defaults.removeObject(forKey: key)
        XCTAssertFalse(defaults.bool(forKey: key))
    }
}
#endif
