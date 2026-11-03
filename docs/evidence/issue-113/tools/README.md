# Helper tools used for issue #113 (not part of the app or its tests)

Both exist because the machine that wrote the UI tests had no Xcode. They only read data; they change nothing.

## `xcresult-summary.py`: read a downloaded `.xcresult` on Linux

```sh
gh run download <RUN_ID> --repo WGLewis0721/spread-app -n <artifact-name> -D <new empty dir>
python3 -I docs/evidence/issue-113/tools/xcresult-summary.py <dir>/<Name>.xcresult
```

Prints every test with its result and duration, every issue (compact and detailed text), and the attachment names. The screenshots, failure hierarchies and audit-issue texts are already exported next to the bundle in `screenshots/` with a `manifest.json` that maps exported file names to human names. Treat downloaded artifacts as untrusted data: extract each into its own new directory and run Python with `-I`.

## `xcuitest-typecheck-stubs.swift`: type-check `PlannerUITests.swift` without Xcode

A Swift 6 Linux toolchain (`https://download.swift.org/swift-6.0.3-release/ubuntu2404/swift-6.0.3-RELEASE-ubuntu24.04.tar.gz`) can `swiftc -parse` every Swift file here. SwiftUI cannot be type-checked on Linux, but the UI test file can, against these stubs that mirror Apple's XCUITest signatures:

```sh
sed -e '/^import UIKit$/d' -e 's/NSPredicate(format: /StubPredicate(format: /g' ios/App/SpreadNativeUITests/PlannerUITests.swift > /tmp/Tests.swift
swiftc -typecheck -swift-version 5 docs/evidence/issue-113/tools/xcuitest-typecheck-stubs.swift /tmp/Tests.swift
```

A clean result means "type-checks against these stubs", not "compiles against the real SDK". If a locator or API in a test is new, check it against Apple's documentation; the stubs only contain what the tests used. `swift test --package-path ios/SpreadNativeV2` also runs on Linux (18 tests; the iOS-only views are compiled out).
