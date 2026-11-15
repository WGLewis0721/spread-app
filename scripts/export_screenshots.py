#!/usr/bin/env python3
"""Name, validate and package Spread's automated App Store screenshots.

Input is one directory per device, produced by:
  xcrun xcresulttool export attachments --path <Device>.xcresult --output-path <dir>

Output (under --out):
  screenshots/<device-slug>/NN-slug.png   one PNG per expected state
  failures/<device-slug>/                 failure attachments, when a test failed
  manifest.json                           ordered capture list with sizes and hashes
  summary.txt                             counts, missing states, warnings
  <zip-name>                              screenshots, manifest, summary and failures

Exit status is 0 only when every expected state exists for every device, every PNG
has the expected pixel size, and no two states share identical bytes. The ZIP and
manifest are written even on failure, so a partial run still yields evidence.

Standard library only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import struct
import sys
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = "spread-screenshots/1"
BUNDLE_ID = "com.graymatter.spread"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
# Below this size a screen is probably blank or nearly so. Reported as a warning, not a failure.
SUSPICIOUSLY_SMALL_BYTES = 30_000
SLUG_PATTERN = re.compile(r"^(\d{2}-[a-z0-9-]+?)(?:_\d+_[0-9A-Fa-f-]+)?\.png$")


@dataclass(frozen=True)
class State:
    slug: str
    category: str
    title: str


# Single source of truth for the 20 expected captures. Keep in step with
# ios/App/SpreadNativeUITests/ScreenshotCaptureUITests.swift.
STATES: tuple[State, ...] = (
    State("01-life-wallet-stack", "life", "Life: six role cards in one wallet stack"),
    State("02-life-weekly-time-strip", "life", "Life: weekly time at a glance"),
    State("03-life-focused-card", "life", "Life: a focused card with Details and Tasks"),
    State("04-life-card-details", "life", "Life: card details"),
    State("05-life-card-tasks", "tasks", "Tasks: a role's task notebook"),
    State("06-life-task-details", "tasks", "Tasks: task details"),
    State("07-hours-weekly-time-expanded", "hours", "Hours: weekly time allocation"),
    State("08-hours-capacity-entry", "hours", "Hours: set weekly capacity"),
    State("09-hours-page", "hours", "Hours: the hours page"),
    State("10-week-calendar", "week", "Week: the calendar week"),
    State("11-week-month-overview", "week", "Week: month overview"),
    State("12-week-plan-ahead", "week", "Week: plan ahead"),
    State("13-more-overview", "navigation", "More: overview menu"),
    State("14-focus-timer", "navigation", "More: focus timer"),
    State("15-whats-new", "navigation", "More: what's new"),
    State("16-settings-appearance", "settings", "Settings: appearance"),
    State("17-settings-reminders", "settings", "Settings: reminders"),
    State("18-settings-profiles", "settings", "Settings: profiles"),
    State("19-editorial-card-fitness", "life", "Life artwork: Fitness"),
    State("20-editorial-card-school", "life", "Life artwork: School"),
)
EXPECTED_SLUGS = tuple(state.slug for state in STATES)


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "device"


def read_png_size(data: bytes) -> tuple[int, int]:
    """Return (width, height) from the IHDR chunk, or raise ValueError for a non-PNG."""
    if len(data) < 24 or data[:8] != PNG_SIGNATURE or data[12:16] != b"IHDR":
        raise ValueError("not a PNG file")
    return struct.unpack(">II", data[16:24])


def load_attachment_index(attachments_dir: Path) -> tuple[dict[str, tuple[Path, str]], list[tuple[Path, str]]]:
    """Map each screen slug to (file, test identifier). Also return failure attachments."""
    manifest_path = attachments_dir / "manifest.json"
    if not manifest_path.is_file():
        raise ValueError(f"no manifest.json in {attachments_dir}")
    try:
        groups = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ValueError(f"manifest.json is not valid JSON: {error}") from error
    if isinstance(groups, dict):
        groups = [groups]

    screens: dict[str, tuple[Path, str]] = {}
    failures: list[tuple[Path, str]] = []
    for group in groups:
        test_id = str(group.get("testIdentifier", "unknown test"))
        for attachment in group.get("attachments", []):
            exported = attachment.get("exportedFileName", "")
            suggested = attachment.get("suggestedHumanReadableName", exported)
            source = attachments_dir / exported
            if not source.is_file():
                continue
            if attachment.get("isAssociatedWithFailure"):
                failures.append((source, test_id))
                continue
            match = SLUG_PATTERN.match(suggested)
            if not match:
                continue
            slug = match.group(1)
            if slug in screens:
                raise ValueError(f"screen {slug} was exported more than once")
            screens[slug] = (source, test_id)
    return screens, failures


def export_device(label: str, attachments_dir: Path, expected_size: tuple[int, int], out: Path,
                  summary: dict) -> list[dict]:
    device_slug = slugify(label)
    target_dir = out / "screenshots" / device_slug
    target_dir.mkdir(parents=True, exist_ok=True)
    captures: list[dict] = []
    seen_hashes: dict[str, str] = {}

    try:
        screens, failures = load_attachment_index(attachments_dir)
    except ValueError as error:
        summary["errors"].append(f"{label}: {error}")
        summary["missing"].extend(f"{label}: {slug}" for slug in EXPECTED_SLUGS)
        return captures

    for order, state in enumerate(STATES, start=1):
        if state.slug not in screens:
            summary["missing"].append(f"{label}: {state.slug} ({state.title})")
            continue
        source, test_id = screens[state.slug]
        data = source.read_bytes()
        try:
            width, height = read_png_size(data)
        except ValueError as error:
            summary["errors"].append(f"{label}: {state.slug} is {error}")
            continue
        if (width, height) != expected_size:
            summary["errors"].append(
                f"{label}: {state.slug} is {width}x{height}, expected {expected_size[0]}x{expected_size[1]}")
            continue
        digest = hashlib.sha256(data).hexdigest()
        if digest in seen_hashes:
            summary["errors"].append(
                f"{label}: {state.slug} is byte-identical to {seen_hashes[digest]}; the screens did not differ")
            continue
        seen_hashes[digest] = state.slug
        if len(data) < SUSPICIOUSLY_SMALL_BYTES:
            summary["warnings"].append(f"{label}: {state.slug} is only {len(data)} bytes; check it is not blank")

        relative = f"screenshots/{device_slug}/{state.slug}.png"
        (out / relative).write_bytes(data)
        captures.append({
            "order": order,
            "device": label,
            "slug": state.slug,
            "category": state.category,
            "title": state.title,
            "file": relative,
            "width": width,
            "height": height,
            "sha256": digest,
            "test_identifier": test_id,
        })

    if failures:
        failure_dir = out / "failures" / device_slug
        failure_dir.mkdir(parents=True, exist_ok=True)
        for source, test_id in failures:
            shutil.copy2(source, failure_dir / source.name)
        summary["failure_attachments"].append(f"{label}: {len(failures)} failure screenshot(s) in failures/{device_slug}/")
    return captures


def write_zip(out: Path, zip_path: Path) -> None:
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name in ("manifest.json", "summary.txt"):
            archive.write(out / name, name)
        for folder in ("screenshots", "failures"):
            for path in sorted((out / folder).rglob("*")):
                if path.is_file():
                    archive.write(path, path.relative_to(out).as_posix())


def build_summary_text(summary: dict, captures: list[dict]) -> str:
    total = len(STATES) * len(summary["devices"])
    lines = [
        f"Captured {len(captures)} of {total} expected screenshots.",
        f"Devices: {', '.join(summary['devices']) or 'none'}",
        f"Commit: {summary['source']['commit'] or 'unknown'}  Branch: {summary['source']['branch'] or 'unknown'}",
        "",
    ]
    lines.append("Missing:" if summary["missing"] else "Missing: none")
    lines += [f"  - {item}" for item in summary["missing"]]
    lines.append("Errors:" if summary["errors"] else "Errors: none")
    lines += [f"  - {item}" for item in summary["errors"]]
    lines.append("Warnings:" if summary["warnings"] else "Warnings: none")
    lines += [f"  - {item}" for item in summary["warnings"]]
    if summary["failure_attachments"]:
        lines.append("Failure screenshots:")
        lines += [f"  - {item}" for item in summary["failure_attachments"]]
    return "\n".join(lines) + "\n"


def parse_input(value: str) -> tuple[str, Path, tuple[int, int]]:
    try:
        label_and_dir, size = value.rsplit(":", 1)
        label, directory = label_and_dir.split("=", 1)
        width, height = (int(part) for part in size.lower().split("x", 1))
    except ValueError as error:
        raise argparse.ArgumentTypeError(
            "expected LABEL=ATTACHMENTS_DIR:WIDTHxHEIGHT, e.g. 'iPhone 17 Pro Max=out/raw:1320x2868'") from error
    return label, Path(directory), (width, height)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", action="append", type=parse_input, required=True,
                        help="LABEL=ATTACHMENTS_DIR:WIDTHxHEIGHT; repeat for each device")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--zip-name", default="spread-app-store-screenshots.zip")
    parser.add_argument("--commit", default="")
    parser.add_argument("--branch", default="")
    parser.add_argument("--build-id", default="")
    args = parser.parse_args(argv)

    out: Path = args.out
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    (out / "screenshots").mkdir()
    (out / "failures").mkdir()

    summary: dict = {
        "devices": [label for label, _, _ in args.input],
        "source": {"commit": args.commit, "branch": args.branch, "build_id": args.build_id},
        "missing": [], "errors": [], "warnings": [], "failure_attachments": [],
    }
    captures: list[dict] = []
    for label, directory, size in args.input:
        captures += export_device(label, directory, size, out, summary)

    complete = not (summary["missing"] or summary["errors"])
    manifest = {
        "schema": SCHEMA,
        "status": "complete" if complete else "incomplete",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "app": {"bundle_id": BUNDLE_ID,
                "data": "DEBUG-only read-only PersonalPreviewFixture; no planner writes during capture"},
        "source": summary["source"],
        "devices": summary["devices"],
        "expected_per_device": len(STATES),
        "captures": captures,
        "missing": summary["missing"],
        "errors": summary["errors"],
        "warnings": summary["warnings"],
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (out / "summary.txt").write_text(build_summary_text(summary, captures), encoding="utf-8")
    write_zip(out, out / args.zip_name)

    print((out / "summary.txt").read_text(encoding="utf-8"), end="")
    return 0 if complete else 1


if __name__ == "__main__":
    sys.exit(main())
