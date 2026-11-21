"""No-network regression tests for the screenshot export and packaging script."""
import importlib.util
import json
from pathlib import Path
import re
import struct
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("export_screenshots", Path(__file__).with_name("export_screenshots.py"))
exporter = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = exporter
spec.loader.exec_module(exporter)

WIDTH, HEIGHT = 1320, 2868
DEVICE = "iPhone 17 Pro Max"


def make_png(width, height, salt):
    """A structurally valid PNG header with a unique payload, so each screen hashes differently."""
    ihdr = struct.pack(">II", width, height) + bytes([8, 6, 0, 0, 0])
    chunk = b"IHDR" + ihdr
    body = b"\x89PNG\r\n\x1a\n" + struct.pack(">I", len(ihdr)) + chunk + struct.pack(">I", 0)
    return body + (f"salt-{salt}-".encode() * 4000)


def write_export(directory, states=exporter.STATES, width=WIDTH, height=HEIGHT, failures=0, duplicate_bytes=False):
    """Write an xcresulttool-shaped attachments folder for the given states."""
    directory.mkdir(parents=True, exist_ok=True)
    attachments = []
    for index, state in enumerate(states):
        exported = f"{state.slug}_0_{index:08X}-0000-0000-0000-000000000000.png"
        salt = 0 if duplicate_bytes else index
        (directory / exported).write_bytes(make_png(width, height, salt))
        attachments.append({
            "exportedFileName": exported,
            "suggestedHumanReadableName": exported,
            "isAssociatedWithFailure": False,
        })
    for n in range(failures):
        name = f"Failure-{n}_0_FFFFFFFF-0000-0000-0000-00000000000{n}.png"
        (directory / name).write_bytes(make_png(width, height, 900 + n))
        attachments.append({"exportedFileName": name, "suggestedHumanReadableName": name,
                            "isAssociatedWithFailure": True})
    groups = [{"testIdentifier": f"ScreenshotCaptureUITests/test{index:02d}()", "attachments": [attachment]}
              for index, attachment in enumerate(attachments)]
    (directory / "manifest.json").write_text(json.dumps(groups), encoding="utf-8")
    return directory


def run(tmp, attachments, *extra):
    argv = ["--input", f"{DEVICE}={attachments}:{WIDTH}x{HEIGHT}", "--out", str(tmp / "out"), *extra]
    return exporter.main(argv)


class ExportScreenshotsTests(unittest.TestCase):
    def test_complete_export_names_orders_and_packages_every_state(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            raw = write_export(tmp / "raw")
            self.assertEqual(run(tmp, raw, "--zip-name", "shots.zip"), 0)
            out = tmp / "out"
            manifest = json.loads((out / "manifest.json").read_text())
            self.assertEqual(manifest["status"], "complete")
            self.assertEqual([c["slug"] for c in manifest["captures"]], list(exporter.EXPECTED_SLUGS))
            self.assertEqual([c["order"] for c in manifest["captures"]], list(range(1, 21)))
            self.assertTrue(all((out / c["file"]).is_file() for c in manifest["captures"]))
            self.assertEqual(manifest["captures"][0]["file"], "screenshots/iphone-17-pro-max/01-life-wallet-stack.png")
            with zipfile.ZipFile(out / "shots.zip") as archive:
                names = set(archive.namelist())
            self.assertIn("manifest.json", names)
            self.assertIn("summary.txt", names)
            self.assertIn("screenshots/iphone-17-pro-max/20-editorial-card-school.png", names)

    def test_missing_state_fails_but_still_writes_partial_package(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            states = [s for s in exporter.STATES if s.slug != "09-hours-page"]
            raw = write_export(tmp / "raw", states=states)
            self.assertEqual(run(tmp, raw), 1)
            manifest = json.loads((tmp / "out" / "manifest.json").read_text())
            self.assertEqual(manifest["status"], "incomplete")
            self.assertEqual(len(manifest["captures"]), 19)
            self.assertTrue(any("09-hours-page" in item for item in manifest["missing"]))
            self.assertTrue((tmp / "out" / "spread-app-store-screenshots.zip").is_file())

    def test_wrong_pixel_size_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            raw = write_export(tmp / "raw", width=1179, height=2556)
            self.assertEqual(run(tmp, raw), 1)
            manifest = json.loads((tmp / "out" / "manifest.json").read_text())
            self.assertEqual(manifest["captures"], [])
            self.assertTrue(any("expected 1320x2868" in item for item in manifest["errors"]))

    def test_identical_screens_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            raw = write_export(tmp / "raw", duplicate_bytes=True)
            self.assertEqual(run(tmp, raw), 1)
            manifest = json.loads((tmp / "out" / "manifest.json").read_text())
            self.assertTrue(any("byte-identical" in item for item in manifest["errors"]))

    def test_non_png_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            raw = write_export(tmp / "raw")
            victim = next(raw.glob("01-life-wallet-stack_*.png"))
            victim.write_bytes(b"<html>not a screenshot</html>")
            self.assertEqual(run(tmp, raw), 1)
            manifest = json.loads((tmp / "out" / "manifest.json").read_text())
            self.assertTrue(any("not a PNG" in item for item in manifest["errors"]))

    def test_failure_attachments_are_kept_separately(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            raw = write_export(tmp / "raw", failures=2)
            self.assertEqual(run(tmp, raw), 0)
            failure_files = sorted(p.name for p in (tmp / "out" / "failures" / "iphone-17-pro-max").iterdir())
            self.assertEqual(len(failure_files), 2)
            manifest = json.loads((tmp / "out" / "manifest.json").read_text())
            self.assertEqual(len(manifest["captures"]), 20)

    def test_two_devices_produce_separate_folders(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            first = write_export(tmp / "a")
            second = write_export(tmp / "b")
            argv = ["--input", f"{DEVICE}={first}:{WIDTH}x{HEIGHT}",
                    "--input", f"iPhone SE={second}:{WIDTH}x{HEIGHT}",
                    "--out", str(tmp / "out")]
            self.assertEqual(exporter.main(argv), 0)
            manifest = json.loads((tmp / "out" / "manifest.json").read_text())
            self.assertEqual(len(manifest["captures"]), 40)
            self.assertTrue((tmp / "out" / "screenshots" / "iphone-se").is_dir())


class SwiftStateParityTests(unittest.TestCase):
    """The Swift capture names must be exactly the Python state table, in order."""

    def test_swift_captures_match_export_states(self):
        source = (ROOT / "ios/App/SpreadNativeUITests/ScreenshotCaptureUITests.swift").read_text(encoding="utf-8")
        swift_slugs = re.findall(r'capture\("([0-9]{2}-[a-z0-9-]+)"\)', source)
        self.assertEqual(swift_slugs, list(exporter.EXPECTED_SLUGS))

    def test_every_swift_test_has_a_matching_capture(self):
        source = (ROOT / "ios/App/SpreadNativeUITests/ScreenshotCaptureUITests.swift").read_text(encoding="utf-8")
        tests = re.findall(r"func test(\d{2})\w*\(\)", source)
        self.assertEqual(len(tests), len(exporter.STATES))
        self.assertEqual(tests, [f"{n:02d}" for n in range(1, 21)])


if __name__ == "__main__":
    unittest.main()
