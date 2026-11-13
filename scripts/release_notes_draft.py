#!/usr/bin/env python3
"""Draft one What's New line for every merge to main, in one pending release-notes PR.

Runs from .github/workflows/release-notes-draft.yml on each push to main. It never publishes:
the pending PR has to be merged, and the note only reaches users in the next signed build.
Each line is drafted from the merged PR's first summary bullet, so the reviewer must rewrite
it in plain English and check it against what was verified on a device before merging.
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
# The owner's calendar day. The runner clock is UTC, which is a day ahead after 6 pm Central.
NOTES_TIMEZONE = ZoneInfo("America/Chicago")
NOTES = ROOT / "ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/ReleaseNotes.json"
PROJECT = ROOT / "ios/App/App.xcodeproj/project.pbxproj"
PENDING_BRANCH = "release-notes/pending"
PENDING_TITLE = "chore(release-notes): What's New draft for review"
ENTRY_TITLE = "Recent updates"
MAX_CHANGES = 8
MAX_LENGTH = 200
BODY_START = "<!-- included:start -->"
BODY_END = "<!-- included:end -->"
CONVENTIONAL = re.compile(
    r"^(feat|fix|chore|docs|refactor|test|perf|ci|build|style)(\([^)]*\))?!?:\s*", re.IGNORECASE
)
PR_NUMBER_SUFFIX = re.compile(r"\s*\(#\d+\)\s*$")
BULLET = re.compile(r"^[-*]\s+")
VERSION = re.compile(r"\bMARKETING_VERSION\s*=\s*([0-9]+(?:\.[0-9]+){1,2})\s*;")


def plain_text(text: str) -> str:
    """Drop markdown emphasis and code ticks, which read badly in the app."""
    return text.replace("`", "").replace("**", "").strip()


def plain_title(title: str) -> str:
    """Turn a commit or PR title such as 'feat(ios): plan ahead (#12)' into a sentence."""
    text = PR_NUMBER_SUFFIX.sub("", CONVENTIONAL.sub("", title.strip())).strip()
    text = plain_text(text)
    if text:
        text = text[0].upper() + text[1:]
    return (text or "Updated Spread")[:MAX_LENGTH]


def summary_bullet(body: str | None) -> str | None:
    """The first bullet under a '## Summary' heading, or None when there is none."""
    in_summary = False
    for raw in (body or "").splitlines():
        line = raw.strip()
        if line.startswith("#"):
            in_summary = line.lstrip("#").strip().lower() == "summary"
            continue
        if in_summary and BULLET.match(line):
            text = plain_text(BULLET.sub("", line))
            if text:
                return text[:MAX_LENGTH]
    return None


def change_for(title: str, body: str | None) -> str:
    """One line for a merge: the PR's summary bullet if it has one, otherwise its title."""
    return summary_bullet(body) or plain_title(title)


def is_notes_change(title: str, head_ref: str) -> bool:
    """True for merges that are themselves the release-notes PR, so they never draft a note."""
    return head_ref.startswith("release-notes/") or title.startswith("chore(release-notes)")


def marketing_version(project_text: str) -> str:
    versions = set(VERSION.findall(project_text))
    if len(versions) != 1:
        raise SystemExit(f"Expected one Xcode marketing version, found {sorted(versions)}")
    return versions.pop()


def add_change(catalog: dict, change: str, new_entry: dict | None = None) -> None:
    """Append one line to the pending entry, which is the first release.

    When new_entry is given, it is inserted first and starts with no lines. The caller starts
    a new entry whenever the pending one is full, so no line is dropped and every entry stays
    within the preflight limit of MAX_CHANGES lines.
    """
    releases = catalog["releases"]
    if new_entry is not None:
        releases.insert(0, {**new_entry, "changes": []})
    pending = releases[0]
    if len(pending["changes"]) >= MAX_CHANGES:
        raise ValueError("The pending entry is full; start a new entry before adding a line")
    pending["changes"] = pending["changes"] + [change]


def included_items(body: str | None) -> list[str]:
    """The merges already listed in the pending PR body, in order."""
    if not body or BODY_START not in body or BODY_END not in body:
        return []
    block = body.split(BODY_START, 1)[1].split(BODY_END, 1)[0]
    return [line[2:] for line in block.splitlines() if line.startswith("- ")]


def render_body(included: list[str]) -> str:
    lines = [
        "Automatic draft: one What's New line per merge to `main`, taken from the merged PR's first summary bullet.",
        "",
        "Before merging this PR, rewrite each line in plain English, remove anything internal, and check every claim "
        "against what was verified on a device. Merging publishes these lines with the next signed build.",
    ]
    lines += ["", "Merges included:", BODY_START, *(f"- {item}" for item in included), BODY_END]
    return "\n".join(lines) + "\n"


def local_date(now: datetime) -> str:
    """The date in the owner's timezone, for the entry's date."""
    return now.astimezone(NOTES_TIMEZONE).date().isoformat()


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=ROOT, check=True, text=True, capture_output=True).stdout


def gh_api(path: str, method: str = "GET", fields: dict[str, str] | None = None):
    cmd = ["gh", "api", "-X", method, path]
    for key, value in (fields or {}).items():
        cmd += ["-f", f"{key}={value}"]
    output = subprocess.run(cmd, cwd=ROOT, check=True, text=True, capture_output=True).stdout
    return json.loads(output) if output.strip() else None


def main() -> int:
    repo = os.environ["REPO"]
    sha = os.environ["SHA"]
    owner = repo.split("/", 1)[0]

    merged = [pr for pr in (gh_api(f"repos/{repo}/commits/{sha}/pulls") or [])
              if pr.get("merged_at") and pr["base"]["ref"] == "main"]
    if merged:
        pr = merged[0]
        if is_notes_change(pr["title"], pr["head"]["ref"]):
            print(f"Skipping: {pr['title']} is a release-notes change.")
            return 0
        item = f"#{pr['number']} {pr['title']}"
        change = change_for(pr["title"], pr.get("body"))
    else:
        message = gh_api(f"repos/{repo}/commits/{sha}")["commit"]["message"].splitlines()[0]
        if is_notes_change(message, ""):
            print(f"Skipping: {message} is a release-notes change.")
            return 0
        item = f"{sha[:7]} {message}"
        change = plain_title(message)

    open_pending = gh_api(f"repos/{repo}/pulls?state=open&head={owner}:{PENDING_BRANCH}") or []
    pending = open_pending[0] if open_pending else None

    git("config", "user.name", "github-actions[bot]")
    git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
    if pending:
        git("fetch", "origin", PENDING_BRANCH)
        git("checkout", "-B", PENDING_BRANCH, f"origin/{PENDING_BRANCH}")
    else:
        git("checkout", "-B", PENDING_BRANCH, sha)

    catalog = json.loads(NOTES.read_text(encoding="utf-8"))
    starts_entry = not pending or len(catalog["releases"][0]["changes"]) >= MAX_CHANGES
    new_entry = None
    if starts_entry:
        new_entry = {
            "id": f"notes-{sha[:7]}",
            "version": marketing_version(PROJECT.read_text(encoding="utf-8")),
            "date": local_date(datetime.now(timezone.utc)),
            "title": ENTRY_TITLE,
        }
    add_change(catalog, change, new_entry)
    NOTES.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Never push a note the preflight would reject, since the build would fail on it.
    subprocess.run([sys.executable, "scripts/app-store-preflight.py"], cwd=ROOT, check=True)

    included = included_items(pending.get("body") if pending else None) + [item]
    git("add", str(NOTES.relative_to(ROOT)))
    git("commit", "-m", f"chore(release-notes): draft What's New line for {sha[:7]}")
    if pending:
        git("push", "origin", PENDING_BRANCH)
        gh_api(f"repos/{repo}/pulls/{pending['number']}", "PATCH", {"body": render_body(included)})
        print(f"Updated pending PR #{pending['number']}.")
    else:
        git("push", "--force", "origin", PENDING_BRANCH)
        created = gh_api(f"repos/{repo}/pulls", "POST", {
            "title": PENDING_TITLE,
            "head": PENDING_BRANCH,
            "base": "main",
            "body": render_body(included),
        })
        print(f"Opened pending PR #{created['number']}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
