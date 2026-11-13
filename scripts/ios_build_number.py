#!/usr/bin/env python3
"""Fail-closed App Store Connect build-number selection and signed-IPA verification.

Codemagic BUILD_NUMBER is *not* Apple's latest uploaded CFBundleVersion.
No credentials or user data are read or stored by this helper.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import plistlib
import re
from zipfile import ZipFile

# This application has already uploaded build 12 for its 1.0 train.
# Keep a defensive floor while the live App Store Connect query remains authoritative.
KNOWN_MINIMUM_NEXT_BUILD = 13


def decimal(value: str, label: str, *, allow_zero: bool = False) -> int:
    value = value.strip()
    if re.fullmatch(r"(?:0|[1-9][0-9]*)", value, re.ASCII) is None:
        raise ValueError(f"{label} must be a plain nonnegative integer; got {value!r}")
    number = int(value)
    if not allow_zero and number == 0:
        raise ValueError(f"{label} must be positive")
    return number


def select_build(latest_apple: str, codemagic_build: str) -> int:
    latest = decimal(latest_apple, "latest Apple build", allow_zero=True)
    workflow = decimal(codemagic_build, "Codemagic BUILD_NUMBER")
    return max(KNOWN_MINIMUM_NEXT_BUILD, latest + 1, workflow)


def patch_project(path: Path, selected: int) -> None:
    before = path.read_text(encoding="utf-8")
    # The app has Debug/Release versions. A WidgetKit extension adds two more.
    # All bundled executables must use the same selected App Store build number.
    widget_targets = len(re.findall(
        r"\\bPRODUCT_BUNDLE_IDENTIFIER = com\\.graymatter\\.spread\\.widget;",
        before,
    ))
    app_targets = len(re.findall(
        r"\\bPRODUCT_BUNDLE_IDENTIFIER = com\\.graymatter\\.spread;",
        before,
    ))
    if widget_targets:
        if widget_targets != 2 or app_targets != 2:
            raise ValueError(
                "Expected two App and two SpreadWidget build configurations; no changes made"
            )
        expected = 4
    else:
        expected = 2  # Preserve support for the original two-configuration app.
    after, changes = re.subn(
        r"CURRENT_PROJECT_VERSION = [0-9]+;",
        f"CURRENT_PROJECT_VERSION = {selected};",
        before,
    )
    if changes != expected:
        raise ValueError(
            f"Expected {expected} CURRENT_PROJECT_VERSION settings, found {changes}; no changes made"
        )
    path.write_text(after, encoding="utf-8")


def extract_ipa_build(ipa: Path) -> str:
    with ZipFile(ipa) as archive:
        plist_paths = [
            name for name in archive.namelist()
            if re.fullmatch(r"Payload/[^/]+\.app/Info\.plist", name)
        ]
        if len(plist_paths) != 1:
            raise ValueError(f"Expected one main application Info.plist in IPA, found {len(plist_paths)}")
        metadata = plistlib.loads(archive.read(plist_paths[0]))
    if metadata.get("CFBundleIdentifier") != "com.graymatter.spread":
        raise ValueError("Signed IPA has the wrong bundle identifier")
    return str(metadata.get("CFBundleVersion", ""))


def verify_ipa(ipa: Path, record: Path, latest_apple: str) -> int:
    latest = decimal(latest_apple, "latest Apple build before publishing", allow_zero=True)
    saved = json.loads(record.read_text(encoding="utf-8"))
    selected = decimal(str(saved["selected"]), "recorded build number")
    recorded_apple = decimal(str(saved["apple_latest"]), "recorded Apple build", allow_zero=True)
    actual = extract_ipa_build(ipa)
    if actual != str(selected):
        raise ValueError(f"Signed IPA CFBundleVersion={actual!r} does not match selected {selected}")
    if selected <= recorded_apple or selected <= latest:
        raise ValueError(
            f"Build {selected} is not higher than Apple's latest build {max(latest, recorded_apple)}; "
            "start a new build after the other upload finishes"
        )
    return selected


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    actions = parser.add_subparsers(dest="action", required=True)
    setter = actions.add_parser("set")
    setter.add_argument("--latest-apple", required=True)
    setter.add_argument("--codemagic-build", required=True)
    setter.add_argument("--project", type=Path, required=True)
    setter.add_argument("--record", type=Path, required=True)
    checker = actions.add_parser("verify")
    checker.add_argument("--latest-apple", required=True)
    checker.add_argument("--ipa", type=Path, required=True)
    checker.add_argument("--record", type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.action == "set":
            selected = select_build(args.latest_apple, args.codemagic_build)
            patch_project(args.project, selected)
            args.record.write_text(
                json.dumps({
                    "selected": selected,
                    "apple_latest": decimal(args.latest_apple, "latest Apple build", allow_zero=True),
                    "codemagic_build": decimal(args.codemagic_build, "Codemagic BUILD_NUMBER"),
                }) + "\n",
                encoding="utf-8",
            )
            print(f"App Store Connect build: {args.latest_apple}; selected CFBundleVersion: {selected}")
        else:
            selected = verify_ipa(args.ipa, args.record, args.latest_apple)
            print(f"Verified signed IPA CFBundleVersion: {selected} (Apple latest: {args.latest_apple})")
    except (OSError, ValueError, KeyError, plistlib.InvalidFileException) as exc:
        parser.exit(1, f"[build-number] ERROR: {exc}\n")


if __name__ == "__main__":
    main()
