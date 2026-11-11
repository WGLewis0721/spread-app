"""No-network regression tests for Spread's release preflight."""
import importlib.util
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

    def test_ipa_metadata_and_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            ipa = Path(tmp) / "Spread.ipa"
            with ZipFile(ipa, "w") as bundle:
                bundle.writestr("Payload/App.app/Info.plist", plistlib.dumps({
                    "CFBundleIdentifier": "com.graymatter.spread",
                    "CFBundleVersion": "10",
                    "CFBundleShortVersionString": "1.0",
                    "ITSAppUsesNonExemptEncryption": False,
                }))
                bundle.writestr("Payload/App.app/PrivacyInfo.xcprivacy",
                                plistlib.dumps({"NSPrivacyTracking": False}))
            checks = preflight.Checks()
            checks.ipa(ipa)
            self.assertTrue(checks.items)
            self.assertTrue(all(ok for _, ok, _ in checks.items))

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
