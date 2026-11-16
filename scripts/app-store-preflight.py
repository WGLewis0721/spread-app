#!/usr/bin/env python3
"""Read-only App Store technical preflight for Spread. No external dependencies.

This is not proof of App Store approval, actual device behavior, or store metadata.
"""
from __future__ import annotations

import argparse
from datetime import date
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
            self.ipad_orientations(info)
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
        self.required_reasons(root, privacy)
        self.release_notes(root)
        self.device_family(root)
        self.plist(self.file(root, "ios/App/SpreadWidget/Info.plist"), "Widget Info.plist")
        self.check("App icon", (root / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png").is_file(),
                   "1024px app icon source must exist; visually inspect it")
        paths = [root / path for path in (
            "src/lib/spread/native.ts",
            "src/lib/spread/store.ts",
            "src/spread/screens/spread-app.tsx",
        )]
        if all(path.is_file() for path in paths):
            native, store, app = (path.read_text(encoding="utf-8") for path in paths)
            self.check("Native review access", "isNativeApp" in native and "NATIVE_LICENSE" in store
                       and "readLicense()" in store
                       and ("isNativeApp() ? NATIVE_LICENSE : null" in store
                            or "isInstalledPlanner() ? NATIVE_LICENSE : null" in store),
                       "Installed app must not require web beta approval")
            self.check("Native entry", "<WeekScreen />" in app, "Installed app opens straight into the planner")
        else:
            self.check("Native entry source", False, "Missing native, store, or app source")

    # Required-reason APIs the native code is known to call, and the reason each needs.
    # A manifest that omits one draws Apple's ITMS-91053 warning on upload.
    REASON_APIS = (
        (r"\bUserDefaults\b", "NSPrivacyAccessedAPICategoryUserDefaults", None),
        (r"UserDefaults\(suiteName", "NSPrivacyAccessedAPICategoryUserDefaults", "1C8F.1"),
        (r"\bsystemUptime\b", "NSPrivacyAccessedAPICategorySystemBootTime", None),
    )

    def undeclared_reasons(self, privacy, sources):
        """Names of required-reason APIs used in `sources` that `privacy` does not declare."""
        declared = {}
        for entry in (privacy or {}).get("NSPrivacyAccessedAPITypes") or []:
            if isinstance(entry, dict):
                declared.setdefault(entry.get("NSPrivacyAccessedAPIType"), set()).update(
                    reason for reason in entry.get("NSPrivacyAccessedAPITypeReasons") or []
                    if isinstance(reason, str))
        missing = []
        for pattern, category, reason in self.REASON_APIS:
            if not any(re.search(pattern, text) for text in sources):
                continue
            if category not in declared or (reason and reason not in declared[category]):
                missing.append(f"{category}{' ' + reason if reason else ''}")
        return missing

    def required_reasons(self, root, app_privacy):
        """The app and the widget extension each ship their own manifest for the APIs they call."""
        def swift(*folders):
            return [path.read_text(encoding="utf-8", errors="replace")
                    for folder in folders for path in sorted((root / folder).rglob("*.swift"))]
        if app_privacy is not None:
            missing = self.undeclared_reasons(
                app_privacy, swift("ios/App/App", "ios/SpreadNativeV2/Sources"))
            self.check("App required-reason coverage", not missing,
                       "Undeclared: " + ", ".join(missing) if missing
                       else "Every required-reason API the app calls is declared")
        widget = self.plist(self.file(root, "ios/App/SpreadWidget/PrivacyInfo.xcprivacy"),
                            "Widget PrivacyInfo.xcprivacy")
        if widget is None:
            return
        project = self.file(root, "ios/App/App.xcodeproj/project.pbxproj") or b""
        resources = re.search(rb"/\* Widget resources \*/ = \{[^\n]*", project)
        file_ids = re.findall(
            rb"(\w+) /\* [^*]* \*/ = \{ isa = PBXFileReference;[^\n]*path = PrivacyInfo\.xcprivacy;", project)
        build_ids = [build for build, ref in re.findall(
            rb"(\w+) /\* [^*]* \*/ = \{ ?isa = PBXBuildFile; fileRef = (\w+)", project) if ref in file_ids]
        embedded = bool(resources) and any(build in resources.group(0) for build in build_ids)
        missing = self.undeclared_reasons(widget, swift("ios/App/SpreadWidget"))
        self.check("Widget privacy manifest", embedded and not missing
                   and widget.get("NSPrivacyTracking") is False,
                   "Undeclared: " + ", ".join(missing) if missing
                   else "The widget extension embeds its own manifest" if embedded
                   else "PrivacyInfo.xcprivacy must be in the widget target's resources")

    def release_notes(self, root):
        """Ensure the version shipping from Xcode has a current, valid offline update note."""
        raw = self.file(root, "ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/ReleaseNotes.json")
        project = self.file(root, "ios/App/App.xcodeproj/project.pbxproj")
        if raw is None or project is None:
            return
        try:
            catalog = json.loads(raw)
            releases = catalog["releases"]
            if catalog.get("formatVersion") != 1 or not isinstance(releases, list) or not releases:
                raise ValueError("Expected a nonempty formatVersion 1 release catalog")
            ids = set()
            for item in releases:
                if not isinstance(item, dict):
                    raise ValueError("Every release must be an object")
                release_id = item.get("id")
                version = item.get("version")
                title = item.get("title")
                changes = item.get("changes")
                if not isinstance(release_id, str) or not re.fullmatch(r"[a-zA-Z0-9._-]{1,80}", release_id):
                    raise ValueError("Invalid release ID")
                if release_id in ids:
                    raise ValueError("Repeated release ID")
                ids.add(release_id)
                if not isinstance(version, str) or not re.fullmatch(r"\d+(?:\.\d+){1,2}", version):
                    raise ValueError("Invalid release version")
                if not isinstance(title, str) or not 1 <= len(title.strip()) <= 100:
                    raise ValueError("Invalid release title")
                if not isinstance(changes, list) or not 1 <= len(changes) <= 8 or not all(
                    isinstance(change, str) and 1 <= len(change.strip()) <= 200 for change in changes
                ):
                    raise ValueError("Release changes must be one to eight short, plain-language items")
                date.fromisoformat(item["date"])
            versions = set(re.findall(r"\bMARKETING_VERSION\s*=\s*([0-9]+(?:\.[0-9]+){1,2})\s*;",
                                      project.decode("utf-8")))
            if len(versions) != 1:
                raise ValueError("Expected a single Xcode marketing version")
            marketing_version = versions.pop()
            if releases[0]["version"] != marketing_version:
                raise ValueError("Latest release notes must match Xcode marketing version " + marketing_version)
        except (ValueError, TypeError, KeyError, UnicodeDecodeError) as error:
            self.check("Bundled release notes", False, str(error))
            return
        self.check("Bundled release notes", True,
                   "Current version " + marketing_version + "; " + str(len(releases)) + " releases, unique IDs")

    def device_family(self, root):
        """Retain both previously supported device families for updates to the existing App Store app."""
        project = self.file(root, "ios/App/App.xcodeproj/project.pbxproj")
        if project is None:
            return
        text = project.decode("utf-8", errors="replace")
        families = re.findall(r'TARGETED_DEVICE_FAMILY\s*=\s*"?([^";]*)"?\s*;', text)
        targets = len(re.findall(r"PRODUCT_BUNDLE_IDENTIFIER\s*=", text))
        values = [",".join(part.strip() for part in value.split(",")) for value in families]
        self.check("Universal build targets",
                   targets > 0 and len(families) == targets and all(value == "1,2" for value in values),
                   f"{len(families)} of {targets} target configurations set TARGETED_DEVICE_FAMILY; "
                   "every one must preserve iPhone and iPad (1,2) to avoid Apple error 90101")

    def ipad_orientations(self, info):
        """Restore the four iPad orientations of the last iPhone+iPad build (build 72)."""
        expected = {
            "UIInterfaceOrientationPortrait",
            "UIInterfaceOrientationPortraitUpsideDown",
            "UIInterfaceOrientationLandscapeLeft",
            "UIInterfaceOrientationLandscapeRight",
        }
        orientations = info.get("UISupportedInterfaceOrientations~ipad")
        self.check("iPad orientations",
                   isinstance(orientations, list) and len(orientations) == 4
                   and set(orientations) == expected,
                   "App Info.plist must preserve all four previously supported iPad orientations")

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
                    self.check("Built device family", info.get("UIDeviceFamily") == [1, 2],
                               "The signed binary must retain UIDeviceFamily 1,2 (iPhone and iPad)")
                    self.check("Built export disclosure",
                               isinstance(info.get("ITSAppUsesNonExemptEncryption"), bool),
                               "Validate the declared encryption exemption")
                manifest = root + "PrivacyInfo.xcprivacy"
                privacy = self.plist(archive.read(manifest), "IPA privacy manifest") if manifest in names else None
                self.check("IPA privacy manifest", privacy is not None,
                           "App-level privacy manifest must be embedded")
                widget = root + "PlugIns/SpreadWidget.appex/"
                if any(name.startswith(widget) for name in names):
                    embedded = widget + "PrivacyInfo.xcprivacy"
                    parsed = (self.plist(archive.read(embedded), "IPA widget privacy manifest")
                              if embedded in names else None)
                    self.check("IPA widget privacy manifest", parsed is not None,
                               "The widget extension must embed its own privacy manifest")
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
