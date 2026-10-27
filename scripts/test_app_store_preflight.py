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

    def test_native_eager_web_auth_is_a_release_blocker(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            client = root / "src/lib/auth/client.ts"
            client.parent.mkdir(parents=True)
            client.write_text("export const authClient = createAuthClient({});")
            checks = preflight.Checks()
            checks.source(root)
            matched = [ok for name, ok, _ in checks.items if name == "Native auth startup"]
            self.assertEqual(matched, [False])
            client.write_text("export function getAuthClient() { return createAuthClient({}); }")
            checks = preflight.Checks()
            checks.source(root)
            matched = [ok for name, ok, _ in checks.items if name == "Native auth startup"]
            self.assertEqual(matched, [True])


        checks = preflight.Checks()
        self.assertIsNone(checks.plist(b"not-a-plist", "broken"))
        self.assertFalse(checks.items[0][1])


if __name__ == "__main__":
    unittest.main()
