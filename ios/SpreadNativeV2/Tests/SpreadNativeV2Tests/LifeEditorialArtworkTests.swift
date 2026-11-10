#if os(iOS)
import XCTest
import UIKit
@testable import SpreadNativeV2

final class LifeEditorialArtworkTests: XCTestCase {
    func testPersonalArtworkResolvesFromEditorialFolder() throws {
        let image = try XCTUnwrap(LifeEditorialArtworkRegistry.image(for: "personal"))
        let width = try XCTUnwrap(image.cgImage?.width)
        XCTAssertGreaterThan(width, 0)
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
