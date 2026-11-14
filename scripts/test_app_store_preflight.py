"""No-network regression tests for Spread's release preflight."""
import importlib.util
import json
from pathlib import Path
import plistlib
import sys
import tempfile
import unittest
from zipfile import ZipFile

path = Path(__file__).with_name("app-store-preflight.py")
spec = importlib.util.spec_from_file_location("app_store_preflight", path)
preflight = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = preflight
spec.loader.exec_module(preflight)


class PreflightTests(unittest.TestCase):
    def test_missing_source_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            checks = preflight.Checks()
            checks.source(Path(tmp))
            self.assertTrue(any(not ok for _, ok, _ in checks.items))

    def test_offline_bundle_requires_every_referenced_asset(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "index.html").write_text('<script src="/assets/app.js"></script>')
            checks = preflight.Checks()
            checks.bundle(root)
            self.assertFalse(checks.items[0][1])
            (root / "assets").mkdir()
            (root / "assets/app.js").write_text("/* bundled */")
            checks = preflight.Checks()
            checks.bundle(root)
            self.assertTrue(all(ok for _, ok, _ in checks.items))

    def test_widget_extension_plist_has_embeddable_identity(self):
        root = Path(__file__).resolve().parent.parent
        widget_plist = plistlib.loads(
            (root / "ios/App/SpreadWidget/Info.plist").read_bytes()
        )
        expected = {
            "CFBundleIdentifier": "$(PRODUCT_BUNDLE_IDENTIFIER)",
            "CFBundleExecutable": "$(EXECUTABLE_NAME)",
            "CFBundleName": "$(PRODUCT_NAME)",
            "CFBundlePackageType": "XPC!",
            "CFBundleShortVersionString": "$(MARKETING_VERSION)",
            "CFBundleVersion": "$(CURRENT_PROJECT_VERSION)",
        }
        for key, value in expected.items():
            with self.subTest(key=key):
                self.assertEqual(widget_plist.get(key), value)
        self.assertEqual(
            widget_plist["NSExtension"]["NSExtensionPointIdentifier"],
            "com.apple.widgetkit-extension",
        )

        # Both extension configurations must retain a valid app-prefixed ID
        # and match the host app's marketing version.
        project = (root / "ios/App/App.xcodeproj/project.pbxproj").read_text()
        widget_configs = [
            line for line in project.splitlines()
            if "/* Widget Debug */" in line or "/* Widget Release */" in line
        ]
        self.assertEqual(len(widget_configs), 2)
        for config in widget_configs:
            self.assertIn(
                "PRODUCT_BUNDLE_IDENTIFIER = com.graymatter.spread.widget;",
                config,
            )
            self.assertIn("MARKETING_VERSION = 1.0;", config)
            self.assertIn("INFOPLIST_FILE = SpreadWidget/Info.plist;", config)

    def test_ipa_metadata_and_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            ipa = Path(tmp) / "Spread.ipa"
            with ZipFile(ipa, "w") as bundle:
                bundle.writestr("Payload/App.app/Info.plist", plistlib.dumps({
                    "CFBundleIdentifier": "com.graymatter.spread",
                    "CFBundleVersion": "10",
                    "CFBundleShortVersionString": "1.0",
                    "ITSAppUsesNonExemptEncryption": False,
                    "UIDeviceFamily": [1],
                }))
                bundle.writestr("Payload/App.app/PrivacyInfo.xcprivacy",
                                plistlib.dumps({"NSPrivacyTracking": False}))
            checks = preflight.Checks()
            checks.ipa(ipa)
            self.assertTrue(checks.items)
            self.assertTrue(all(ok for _, ok, _ in checks.items))

    def test_signed_ipa_must_declare_iphone_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            for label, family in (("universal", [1, 2]), ("missing", None)):
                with self.subTest(family=label):
                    info = {
                        "CFBundleIdentifier": "com.graymatter.spread",
                        "CFBundleVersion": "10",
                        "CFBundleShortVersionString": "1.0",
                        "ITSAppUsesNonExemptEncryption": False,
                    }
                    if family is not None:
                        info["UIDeviceFamily"] = family
                    ipa = Path(tmp) / f"{label}.ipa"
                    with ZipFile(ipa, "w") as bundle:
                        bundle.writestr("Payload/App.app/Info.plist", plistlib.dumps(info))
                        bundle.writestr("Payload/App.app/PrivacyInfo.xcprivacy",
                                        plistlib.dumps({"NSPrivacyTracking": False}))
                    checks = preflight.Checks()
                    checks.ipa(ipa)
                    results = {name: ok for name, ok, _ in checks.items}
                    self.assertFalse(results["Built device family"])

    def test_every_build_target_must_be_iphone_only(self):
        def device_family_passes(lines):
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                project = root / "ios/App/App.xcodeproj/project.pbxproj"
                project.parent.mkdir(parents=True)
                project.write_text("".join(lines), encoding="utf-8")
                checks = preflight.Checks()
                checks.device_family(root)
                return checks.items[-1][1]

        target = "PRODUCT_BUNDLE_IDENTIFIER = com.graymatter.spread;\n"
        self.assertTrue(device_family_passes([
            target, "TARGETED_DEVICE_FAMILY = 1;\n",
            target, 'TARGETED_DEVICE_FAMILY = "1";\n',
        ]))
        self.assertFalse(device_family_passes([target, 'TARGETED_DEVICE_FAMILY = "1,2";\n']))
        self.assertFalse(device_family_passes([
            target, "TARGETED_DEVICE_FAMILY = 1;\n",
            target,
        ]), "A target without a device family cannot ship")
        self.assertFalse(device_family_passes([
            target, "TARGETED_DEVICE_FAMILY = 1;\n",
            target, "TARGETED_DEVICE_FAMILY = 2;\n",
        ]))
        self.assertFalse(device_family_passes([]), "An empty project fails closed")

    def test_info_plist_must_not_declare_ipad_keys(self):
        checks = preflight.Checks()
        checks.ipad_keys({
            "UISupportedInterfaceOrientations": ["UIInterfaceOrientationPortrait"],
            "UISupportedInterfaceOrientations~ipad": ["UIInterfaceOrientationPortrait"],
        }, "Test plist")
        self.assertFalse(checks.items[-1][1])
        checks = preflight.Checks()
        checks.ipad_keys({"UISupportedInterfaceOrientations": ["UIInterfaceOrientationPortrait"]}, "Test plist")
        self.assertTrue(checks.items[-1][1])

    def test_committed_app_and_widget_are_iphone_only(self):
        root = Path(__file__).resolve().parent.parent
        checks = preflight.Checks()
        checks.device_family(root)
        self.assertTrue(checks.items[-1][1], checks.items[-1][2])
        app_info = plistlib.loads((root / "ios/App/App/Info.plist").read_bytes())
        widget_info = plistlib.loads((root / "ios/App/SpreadWidget/Info.plist").read_bytes())
        for label, info in (("iOS Info.plist", app_info), ("Widget Info.plist", widget_info)):
            with self.subTest(plist=label):
                checks = preflight.Checks()
                checks.ipad_keys(info, label)
                self.assertTrue(checks.items[-1][1], checks.items[-1][2])
        self.assertEqual(app_info["UISupportedInterfaceOrientations"], [
            "UIInterfaceOrientationPortrait",
            "UIInterfaceOrientationLandscapeLeft",
            "UIInterfaceOrientationLandscapeRight",
        ])

    def test_release_notes_are_valid_and_version_matched(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            notes = root / "ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/ReleaseNotes.json"
            project = root / "ios/App/App.xcodeproj/project.pbxproj"
            notes.parent.mkdir(parents=True)
            project.parent.mkdir(parents=True)
            project.write_text("MARKETING_VERSION = 1.0;\\nMARKETING_VERSION = 1.0;\\n")
            catalog = {
                "formatVersion": 1,
                "releases": [{"id": "test-1", "version": "1.0", "date": "2026-11-11",
                              "title": "What's new", "changes": ["A feature improved."]}],
            }
            notes.write_text(json.dumps(catalog))
            checks = preflight.Checks()
            checks.release_notes(root)
            self.assertEqual(checks.items[-1][1], True, checks.items[-1][2])
            catalog["releases"][0]["version"] = "0.9"
            notes.write_text(json.dumps(catalog))
            checks = preflight.Checks()
            checks.release_notes(root)
            self.assertFalse(checks.items[-1][1], "Old version release notes cannot ship")
            catalog["releases"][0]["version"] = "1.0"
            catalog["releases"].append(dict(catalog["releases"][0]))
            notes.write_text(json.dumps(catalog))
            checks = preflight.Checks()
            checks.release_notes(root)
            self.assertFalse(checks.items[-1][1], "Duplicate release IDs cannot ship")

    def test_release_notes_cannot_be_empty_or_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "ios/App/App.xcodeproj").mkdir(parents=True)
            (root / "ios/App/App.xcodeproj/project.pbxproj").write_text("MARKETING_VERSION = 1.0;")
            checks = preflight.Checks()
            checks.release_notes(root)
            self.assertTrue(any(not ok for _, ok, _ in checks.items))

    def test_bad_ipa_is_blocking(self):
        with tempfile.TemporaryDirectory() as tmp:
            ipa = Path(tmp) / "Bad.ipa"
            with ZipFile(ipa, "w") as bundle:
                bundle.writestr("Payload/App.app/Info.plist", plistlib.dumps({
                    "CFBundleIdentifier": "com.invalid.example",
                    "CFBundleVersion": "$(CURRENT_PROJECT_VERSION)",
                    "CFBundleShortVersionString": "1.0",
                }))
            checks = preflight.Checks()
            checks.ipa(ipa)
            self.assertGreaterEqual(sum(not ok for _, ok, _ in checks.items), 3)



        checks = preflight.Checks()
        self.assertIsNone(checks.plist(b"not-a-plist", "broken"))
        self.assertFalse(checks.items[0][1])


version_path = Path(__file__).with_name("ios_build_number.py")
version_spec = importlib.util.spec_from_file_location("ios_build_number", version_path)
versioner = importlib.util.module_from_spec(version_spec)
sys.modules[version_spec.name] = versioner
version_spec.loader.exec_module(versioner)


class BuildNumberTests(unittest.TestCase):
    def test_apple_build_12_codemanic_9_selects_13(self):
        self.assertEqual(versioner.select_build("12", "9"), 13)

    def test_apple_queries_remain_authoritative_as_versions_increase(self):
        self.assertEqual(versioner.select_build("18", "11"), 19)
        self.assertEqual(versioner.select_build("12", "21"), 21)
        self.assertEqual(versioner.select_build("0", "1"), 13)

    def test_invalid_apple_or_workflow_values_fail_closed(self):
        for value in ("", "null", "error", "-1", "12.0", "12 13"):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    versioner.select_build(value, "9")
        with self.assertRaises(ValueError):
            versioner.select_build("12", "0")

    def test_change_both_xcode_build_settings(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = Path(tmp) / "project.pbxproj"
            project.write_text("CURRENT_PROJECT_VERSION = 1;\nOTHER_SETTING = YES;\nCURRENT_PROJECT_VERSION = 2;\n")
            versioner.patch_project(project, 13)
            self.assertEqual(project.read_text().count("CURRENT_PROJECT_VERSION = 13;"), 2)
            self.assertIn("OTHER_SETTING = YES;", project.read_text())

    def test_widget_extension_uses_same_build_number_as_app(self):
        # Use the committed Xcode project: two App and two WidgetKit configurations.
        source = Path(__file__).resolve().parent.parent / "ios/App/App.xcodeproj/project.pbxproj"
        original = source.read_text(encoding="utf-8")
        self.assertEqual(original.count("CURRENT_PROJECT_VERSION = "), 4)
        with tempfile.TemporaryDirectory() as tmp:
            project = Path(tmp) / "project.pbxproj"
            project.write_text(original, encoding="utf-8")
            versioner.patch_project(project, 57)
            updated = project.read_text(encoding="utf-8")
            self.assertEqual(updated.count("CURRENT_PROJECT_VERSION = 57;"), 4)
            self.assertEqual(updated.count("PRODUCT_BUNDLE_IDENTIFIER = com.graymatter.spread;"), 2)
            self.assertEqual(updated.count("PRODUCT_BUNDLE_IDENTIFIER = com.graymatter.spread.widget;"), 2)
            self.assertEqual(
                updated,
                __import__("re").sub(r"CURRENT_PROJECT_VERSION = [0-9]+;",
                                     "CURRENT_PROJECT_VERSION = 57;", original),
            )

    def test_malformed_widget_versions_fail_without_writing(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = Path(tmp) / "project.pbxproj"
            base = (
                "PRODUCT_BUNDLE_IDENTIFIER = com.graymatter.spread;\\n"
                "CURRENT_PROJECT_VERSION = 1;\\n"
            ) * 2 + (
                "PRODUCT_BUNDLE_IDENTIFIER = com.graymatter.spread.widget;\\n"
                "CURRENT_PROJECT_VERSION = 1;\\n"
            ) * 2
            for malformed in (
                base + "CURRENT_PROJECT_VERSION = 1;\\n",
                base.replace("CURRENT_PROJECT_VERSION = 1;\\n", "", 1),
                base.replace("PRODUCT_BUNDLE_IDENTIFIER = com.graymatter.spread.widget;\\n", "", 1),
            ):
                with self.subTest(malformed=malformed):
                    project.write_text(malformed, encoding="utf-8")
                    with self.assertRaises(ValueError):
                        versioner.patch_project(project, 57)
                    self.assertEqual(project.read_text(encoding="utf-8"), malformed)

    def test_unexpected_project_shape_is_not_partially_written(self):
        with tempfile.TemporaryDirectory() as tmp:
            project = Path(tmp) / "project.pbxproj"
            content = "CURRENT_PROJECT_VERSION = 1;\n"
            project.write_text(content)
            with self.assertRaises(ValueError):
                versioner.patch_project(project, 13)
            self.assertEqual(project.read_text(), content)

    def test_signed_ipa_must_match_and_be_newer_than_apple(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            record = root / "selected.json"
            record.write_text('{"selected": 13, "apple_latest": 12, "codemagic_build": 9}')
            ipa = root / "App.ipa"
            with ZipFile(ipa, "w") as archive:
                archive.writestr(
                    "Payload/App.app/Info.plist",
                    plistlib.dumps({
                        "CFBundleIdentifier": "com.graymatter.spread",
                        "CFBundleVersion": "13",
                        "CFBundleShortVersionString": "1.0",
                    }),
                )
            self.assertEqual(versioner.verify_ipa(ipa, record, "12"), 13)
            with self.assertRaisesRegex(ValueError, "not higher"):
                versioner.verify_ipa(ipa, record, "13")

    def test_signed_ipa_with_wrong_build_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            record = root / "selected.json"
            record.write_text('{"selected": 13, "apple_latest": 12}')
            ipa = root / "App.ipa"
            with ZipFile(ipa, "w") as archive:
                archive.writestr(
                    "Payload/App.app/Info.plist",
                    plistlib.dumps({
                        "CFBundleIdentifier": "com.graymatter.spread",
                        "CFBundleVersion": "9",
                    }),
                )
            with self.assertRaisesRegex(ValueError, "does not match"):
                versioner.verify_ipa(ipa, record, "12")


if __name__ == "__main__":
    unittest.main()
