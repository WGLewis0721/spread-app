#!/usr/bin/env python3
"""Read-only App Store technical preflight for Spread. No external dependencies.

This is not proof of App Store approval, actual device behavior, or store metadata.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import plistlib
import re
import sys
from zipfile import ZipFile, BadZipFile

BUNDLE_ID = "com.graymatter.spread"


class Checks:
    def __init__(self):
        self.items = []

    def check(self, name, ok, detail):
        self.items.append((name, bool(ok), detail))

    def file(self, root, relative):
        try:
            return (root / relative).read_bytes()
        except OSError:
            self.check(relative, False, "Missing or unreadable")
            return None

    def plist(self, data, label):
        if data is None:
            return None
        try:
            parsed = plistlib.loads(data)
        except (ValueError, TypeError, OverflowError, plistlib.InvalidFileException):
            self.check(label, False, "Invalid property list")
            return None
        if not isinstance(parsed, dict):
            self.check(label, False, "Expected dictionary")
            return None
        return parsed

    def source(self, root):
        raw = self.file(root, "capacitor.config.json")
        if raw:
            try:
                config = json.loads(raw)
            except (ValueError, UnicodeDecodeError):
                self.check("Capacitor config", False, "Invalid JSON")
            else:
                self.check("Bundle identifier", config.get("appId") == BUNDLE_ID, "Must match App Store ID")
                self.check("Offline package", config.get("webDir") == "dist-ios", "Must bundle local web assets")
                self.check("Storage origin", config.get("server", {}).get("hostname") == "localhost"
                           and config.get("ios", {}).get("scheme") == "App",
                           "Do not change established localStorage origin")
        info = self.plist(self.file(root, "ios/App/App/Info.plist"), "iOS Info.plist")
        if info is not None:
            self.check("Info.plist identifier", info.get("CFBundleIdentifier") in
                       (BUNDLE_ID, "$(PRODUCT_BUNDLE_IDENTIFIER)"), "Expected Spread bundle ID or Xcode substitution")
            self.check("Export-compliance key", isinstance(info.get("ITSAppUsesNonExemptEncryption"), bool),
                       "The declared value must still match actual encryption use")
            desc = info.get("NSCameraUsageDescription", "")
            self.check("Camera purpose string", isinstance(desc, str) and len(desc.strip()) >= 20
                       and not re.search(r"todo|placeholder|lorem ipsum", desc, re.I),
                       "Explain why camera access is requested")
            self.check("Visible app name", info.get("CFBundleDisplayName") == "Spread", "Unexpected display name")
        privacy = self.plist(self.file(root, "ios/App/App/PrivacyInfo.xcprivacy"), "PrivacyInfo.xcprivacy")
        if privacy is not None:
            self.check("Tracking declaration", isinstance(privacy.get("NSPrivacyTracking"), bool),
                       "Tracking declaration required")
            self.check("Collected-data declaration", isinstance(privacy.get("NSPrivacyCollectedDataTypes"), list),
                       "An empty list is correct only if the app truly collects no data")
            categories = privacy.get("NSPrivacyAccessedAPITypes")
            valid = isinstance(categories, list) and all(
                isinstance(entry, dict)
                and isinstance(entry.get("NSPrivacyAccessedAPIType"), str)
                and isinstance(entry.get("NSPrivacyAccessedAPITypeReasons"), list)
                and bool(entry["NSPrivacyAccessedAPITypeReasons"])
                and all(isinstance(reason, str) and reason.strip()
                        for reason in entry["NSPrivacyAccessedAPITypeReasons"])
                for entry in categories
            )
            self.check("Required-reason declarations", valid, "Each declared API requires a reason")
        self.check("App icon", (root / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png").is_file(),
                   "1024px app icon source must exist; visually inspect it")
        # Web-only Better Auth construction during module import can crash a Capacitor origin.
        # Studio already uses lazy initialization; require the same safety on every release path.
        auth_client = root / "src/lib/auth/client.ts"
        if auth_client.is_file():
            auth_text = auth_client.read_text(encoding="utf-8")
            eager_auth = re.search(r"\b(?:export\s+)?const\s+authClient\s*=\s*createAuthClient\s*\(", auth_text)
            self.check("Native auth startup", eager_auth is None,
                       "Do not eagerly create the web auth client on a native app origin")
        else:
            self.check("Native auth startup", False, "Missing web auth client source")
        paths = [root / path for path in (
            "src/lib/spread/native.ts",
            "src/lib/spread/store.ts",
            "src/spread/components/use-beta-gate.ts",
            "src/spread/screens/spread-app.tsx",
        )]
        if all(path.is_file() for path in paths):
            native, store, gate, app = (path.read_text(encoding="utf-8") for path in paths)
            self.check("Native review access", "isNativeApp" in native and "NATIVE_LICENSE" in store
                       and "readLicense()" in store
                       and ("isNativeApp() ? NATIVE_LICENSE : null" in store
                            or "isInstalledPlanner() ? NATIVE_LICENSE : null" in store),
                       "Installed app must not require web beta approval")
            self.check("Web beta isolation", ("if (native) return" in gate or "if (isNativeApp()) return" in gate)
                       and "<WeekScreen />" in app, "Native entry skips the web beta status check")
        else:
            self.check("Native entry source", False, "Missing native, store, gate, or app source")

    def bundle(self, path):
        index = path / "index.html"
        if not index.is_file():
            self.check("Offline bundle", False, f"Missing {index}")
            return
        html = index.read_text(encoding="utf-8")
        references = re.findall(r"""(?:src|href)=["'](/[^"'#?]+)["']""", html)
        missing = [ref for ref in references if not (path / ref.lstrip("/")).is_file()]
        self.check("Offline bundle references", not missing,
                   "Missing: " + ", ".join(missing[:8]) if missing else f"{len(references)} paths resolved")
        self.check("No web-only script", "https://grok.com/grok-app-builder/extensions.js" not in html,
                   "Installed app must not depend on Grok script")

    def ipa(self, path):
        try:
            with ZipFile(path) as archive:
                names = archive.namelist()
                roots = {name.split(".app/")[0] + ".app/" for name in names
                         if name.startswith("Payload/") and ".app/Info.plist" in name}
                if len(roots) != 1:
                    self.check("IPA bundle structure", False, "Expected one Payload/*.app/Info.plist")
                    return
                root = roots.pop()
                info = self.plist(archive.read(root + "Info.plist"), "IPA Info.plist")
                if info is not None:
                    self.check("Signed bundle ID", info.get("CFBundleIdentifier") == BUNDLE_ID,
                               "Unexpected IPA bundle identifier")
                    self.check("Signed version/build",
                               bool(info.get("CFBundleShortVersionString"))
                               and bool(info.get("CFBundleVersion"))
                               and "$" not in str(info.get("CFBundleVersion")),
                               "Build number must be resolved")
                    self.check("Built export disclosure",
                               isinstance(info.get("ITSAppUsesNonExemptEncryption"), bool),
                               "Validate the declared encryption exemption")
                manifest = root + "PrivacyInfo.xcprivacy"
                privacy = self.plist(archive.read(manifest), "IPA privacy manifest") if manifest in names else None
                self.check("IPA privacy manifest", privacy is not None,
                           "App-level privacy manifest must be embedded")
        except (OSError, BadZipFile, KeyError) as error:
            self.check("IPA readable", False, str(error))

    def report(self):
        lines = [f"{'PASS' if ok else 'FAIL'} {name}: {detail}" for name, ok, detail in self.items]
        print("\n".join(lines))
        failed = sum(not ok for _, ok, _ in self.items)
        print(f"App Store technical preflight: {len(self.items)-failed} passed; {failed} failed")
        summary = os.environ.get("GITHUB_STEP_SUMMARY")
        if summary:
            with open(summary, "a", encoding="utf-8") as stream:
                stream.write(f"\n### App Store preflight\n\n**{len(self.items)-failed} passed; {failed} failed.**\n")
                stream.writelines(f"- {line}\n" for line in lines)
                stream.write("\nStatic scanning does not verify Apple metadata or device QA.\n")
        return 1 if failed else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--bundle", type=Path, help="Generated dist-ios directory")
    parser.add_argument("--ipa", type=Path, help="Signed IPA to inspect read-only")
    args = parser.parse_args(argv)
    checks = Checks()
    checks.source(args.root)
    if args.bundle is not None:
        checks.bundle(args.bundle)
    if args.ipa is not None:
        checks.ipa(args.ipa)
    return checks.report()


if __name__ == "__main__":
    sys.exit(main())
