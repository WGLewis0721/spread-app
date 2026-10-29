# Visual evidence

`before-after.jpg` contains unretouched 393×852 browser captures, arranged in columns Stack/Fan/Flow and rows Before/After. Before is takeover commit `e1f8869`; After is the working implementation in commit `60c8364`. Screenshots were captured with identical fictional contacts and the approved offline portrait fallback, with network portraits stubbed in both versions. This is browser rendering evidence, not a claim of native appearance or physical-device FPS.

Native simulator screenshots and the XCTest result bundle are attached to the **Contact Deck native simulator** workflow. Browser matrix screenshots are attached to the **Contact Deck interaction preview** workflow. The native target's generated Xcode project is now included as source. No production deployment or TestFlight upload was made.
