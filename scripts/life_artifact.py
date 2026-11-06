#!/usr/bin/env python3
"""Bind owner approval to the exact verification IPA, source and build record."""
import argparse
import hashlib
import json
from pathlib import Path
import re

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def validate(value, length):
    if not re.fullmatch(r"[0-9a-f]{" + str(length) + r"}", value):
        raise ValueError("Expected lowercase hexadecimal approval digest")
    return value

def create(ipa, source, record, manifest):
    validate(source, 40)
    data = {"schema": 1, "source": source, "ipa_sha256": digest(ipa),
            "build_record": json.loads(record.read_text())}
    manifest.write_text(json.dumps(data, sort_keys=True, indent=2) + "\n")

def verify(ipa, source, manifest, ipa_sha256, manifest_sha256, record):
    validate(source, 40)
    validate(ipa_sha256, 64)
    validate(manifest_sha256, 64)
    if digest(manifest) != manifest_sha256:
        raise ValueError("Manifest differs from owner-approved bytes")
    data = json.loads(manifest.read_text())
    if data["schema"] != 1 or data["source"] != source:
        raise ValueError("Manifest source/schema mismatch")
    if digest(ipa) != ipa_sha256 or data["ipa_sha256"] != ipa_sha256:
        raise ValueError("IPA differs from owner-approved bytes")
    build = data["build_record"]
    if not isinstance(build, dict) or not {"selected", "apple_latest", "codemagic_build"} <= build.keys():
        raise ValueError("Incomplete verified build record")
    record.write_text(json.dumps(build, sort_keys=True) + "\n")

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["create", "verify"])
    parser.add_argument("--ipa", type=Path, required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--record", type=Path, required=True)
    parser.add_argument("--ipa-sha256")
    parser.add_argument("--manifest-sha256")
    args = parser.parse_args()
    try:
        if args.action == "create":
            create(args.ipa, args.source, args.record, args.manifest)
        else:
            verify(args.ipa, args.source, args.manifest, args.ipa_sha256 or "", args.manifest_sha256 or "", args.record)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        parser.exit(1, f"[life-artifact] ERROR: {exc}\n")

if __name__ == "__main__":
    main()
