#!/usr/bin/env python3
"""Automatically bundle customer-facing What's New notes after merges to main.

Only an explicit "## What's New" section in a merged PR supplies customer copy.
Never expose commit titles, engineering fixes, or unreviewed summaries in the app.
This job changes only ReleaseNotes.json; an iOS build/release still requires approval.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
NOTES = ROOT / "ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/ReleaseNotes.json"
PROJECT = ROOT / "ios/App/App.xcodeproj/project.pbxproj"
NOTES_TIMEZONE = ZoneInfo("America/Chicago")
MAX_CHANGES = 8
MAX_LENGTH = 200
VERSION = re.compile(r"\bMARKETING_VERSION\s*=\s*([0-9]+(?:\.[0-9]+){1,2})\s*;")
HEADING = re.compile(r"^#{1,6}\s+(.+?)\s*$")
BULLET = re.compile(r"^[-*]\s+(.+?)\s*$")
SHA = re.compile(r"^[a-f0-9]{40}$")
INTERNAL = re.compile(
    r"\b(?:SwiftUI|WidgetKit|ActivityKit|Codemagic|Xcode|"
    r"CI|pipeline|provisioning|GitHub|App Group|compilation|compiler|"
    r"regression tests?|unit tests?|bundle identifiers?|"
    r"source code|pull requests?|PR\s*#\d+)\b",
    re.IGNORECASE,
)


def marketing_version(project_text: str) -> str:
    versions = set(VERSION.findall(project_text))
    if len(versions) != 1:
        raise ValueError(f"Expected one Xcode marketing version; got {sorted(versions)}")
    return versions.pop()


def local_date(now: datetime) -> str:
    return now.astimezone(NOTES_TIMEZONE).date().isoformat()


def plain_text(value: str) -> str:
    value = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", value)
    return " ".join(value.replace("**", "").replace("\x60", "").split()).strip()


def customer_changes(body: str | None) -> list[str]:
    """Use intentional customer copy only. Missing/technical copy is never published."""
    inside = False
    changes: list[str] = []
    for raw in (body or "").splitlines():
        line = raw.strip()
        heading = HEADING.match(line)
        if heading:
            inside = heading.group(1).strip().lower() in {"what's new", "whats new"}
            continue
        if not inside:
            continue
        bullet = BULLET.match(line)
        if not bullet:
            continue
        change = plain_text(bullet.group(1))
        if not change or INTERNAL.search(change):
            print(f"Skipping non-customer release-note line: {change!r}")
            continue
        if len(change) > MAX_LENGTH:
            raise ValueError(f"What's New line exceeds {MAX_LENGTH} characters")
        if change not in changes:
            changes.append(change)
    if len(changes) > MAX_CHANGES:
        raise ValueError(f"What's New may contain at most {MAX_CHANGES} items")
    return changes


def is_notes_change(title: str, head_ref: str) -> bool:
    return head_ref.startswith("release-notes/") or title.lower().startswith("chore(release-notes)")


def add_release(catalog: dict, commit: str, changes: list[str], version: str, day: str) -> bool:
    """Every merge gets a distinct ID, so dismissed notes can reappear after an update."""
    if not changes:
        return False
    note_id = "notes-" + commit[:12]
    if any(entry["id"] == note_id for entry in catalog["releases"]):
        return False
    catalog["releases"].insert(0, {
        "id": note_id,
        "version": version,
        "date": day,
        "title": "Recent updates",
        "changes": changes,
    })
    return True


def git(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args], cwd=ROOT, check=check, capture_output=True, text=True,
    )


def gh(path: str):
    result = subprocess.run(
        ["gh", "api", path], cwd=ROOT, check=True, capture_output=True, text=True,
    )
    return json.loads(result.stdout)


def merged_pr_for(repo: str, commit: str):
    merged = [
        pr for pr in gh(f"repos/{repo}/commits/{commit}/pulls")
        if pr.get("merged_at") and pr.get("base", {}).get("ref") == "main"
    ]
    return merged[0] if merged else None


def main() -> int:
    repo = os.environ["REPO"]
    git("config", "user.name", "github-actions[bot]")
    git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")

    # A rejected non-fast-forward push must never discard someone else's main changes.
    for attempt in range(3):
        git("fetch", "origin", "main")
        git("checkout", "-B", "main", "origin/main")
        catalog = json.loads(NOTES.read_text(encoding="utf-8"))
        cursor = catalog.get("lastProcessedCommit")
        if not isinstance(cursor, str) or not SHA.fullmatch(cursor):
            raise ValueError("Missing/invalid release-notes lastProcessedCommit")
        git("merge-base", "--is-ancestor", cursor, "HEAD")
        commits = git("rev-list", "--first-parent", "--reverse", f"{cursor}..HEAD").stdout.splitlines()
        version = marketing_version(PROJECT.read_text(encoding="utf-8"))
        day = local_date(datetime.now(timezone.utc))

        additions = 0
        for commit in commits:
            pr = merged_pr_for(repo, commit)
            if not pr or is_notes_change(pr["title"], pr["head"]["ref"]):
                continue
            changes = customer_changes(pr.get("body"))
            if add_release(catalog, commit, changes, version, day):
                additions += 1

        if not additions:
            print(f"No new customer-facing notes among {len(commits)} commits. No repository write.")
            return 0

        catalog["lastProcessedCommit"] = git("rev-parse", "HEAD").stdout.strip()
        NOTES.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

        # The bot must not push release metadata that fails the existing App Store gate.
        subprocess.run([sys.executable, "scripts/app-store-preflight.py"], cwd=ROOT, check=True)
        git("add", str(NOTES.relative_to(ROOT)))
        git("commit", "-m", f"chore(release-notes): sync {additions} customer update(s) [skip ci]")
        pushed = git("push", "origin", "HEAD:main", check=False)
        if pushed.returncode == 0:
            print(f"Committed {additions} user-facing note(s) directly to main.")
            return 0
        if "non-fast-forward" not in pushed.stderr and "fetch first" not in pushed.stderr:
            raise RuntimeError(f"Release-notes push blocked: {pushed.stderr.strip()}")
        print(f"main changed concurrently; retrying ({attempt + 1}/3)")

    raise RuntimeError("main moved during all three release-notes push attempts")


if __name__ == "__main__":
    sys.exit(main())
