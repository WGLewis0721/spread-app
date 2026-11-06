import json
from pathlib import Path
import tempfile
import unittest
from life_artifact import create, verify, digest

class ArtifactApprovalTests(unittest.TestCase):
    def test_exact_bytes_and_record_roundtrip(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            ipa, record, manifest, restored = [root / name for name in ["signed.ipa", "record.json", "manifest.json", "restored.json"]]
            ipa.write_bytes(b"exact reviewed signed artifact")
            record.write_text(json.dumps(dict(selected=19, apple_latest=18, codemagic_build=4)))
            source = "a" * 40
            create(ipa, source, record, manifest)
            approved_ipa, approved_manifest = digest(ipa), digest(manifest)
            verify(ipa, source, manifest, approved_ipa, approved_manifest, restored)
            self.assertEqual(json.loads(record.read_text()), json.loads(restored.read_text()))
            for mutate in ["ipa", "manifest", "source"]:
                with self.subTest(mutate=mutate):
                    old_ipa, old_manifest = ipa.read_bytes(), manifest.read_bytes()
                    if mutate == "ipa": ipa.write_bytes(b"rebuilt")
                    if mutate == "manifest": manifest.write_bytes(b"{}")
                    with self.assertRaises(ValueError):
                        verify(ipa, "b"*40 if mutate == "source" else source, manifest, approved_ipa, approved_manifest, restored)
                    ipa.write_bytes(old_ipa)
                    manifest.write_bytes(old_manifest)

if __name__ == "__main__":
    unittest.main()
