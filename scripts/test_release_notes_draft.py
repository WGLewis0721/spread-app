"""Network-free tests for the automatic customer-facing What's New workflow."""

import json
import unittest
from datetime import datetime, timezone
from pathlib import Path

from release_notes_draft import (
    MAX_CHANGES,
    add_release,
    customer_changes,
    is_notes_change,
    local_date,
    marketing_version,
    plain_text,
)

ROOT = Path(__file__).resolve().parent.parent


def catalog():
    return {"formatVersion": 1, "releases": [
        {"id": "prior", "version": "1.0", "date": "2026-11-11",
         "title": "Previous updates", "changes": ["Already shipped"]}
    ]}


class CustomerNotesTests(unittest.TestCase):
    def test_requires_explicit_whats_new_section_not_commit_titles(self):
        self.assertEqual(customer_changes("## Summary\n- Fixed build signing\n"), [])
        self.assertEqual(customer_changes(None), [])
        self.assertEqual(customer_changes("## What's New\n- Set weekly hours directly in Life.\n"),
                         ["Set weekly hours directly in Life."])

    def test_plain_text_preserves_reader_language_without_markdown(self):
        self.assertEqual(
            customer_changes("## What's New\n- Add **tasks** from the \x60Week\x60 screen.\n"),
            ["Add tasks from the Week screen."],
        )
        self.assertEqual(plain_text("See [the Week](https://example.com)."),
                         "See the Week.")

    def test_skips_engineering_details_even_if_in_whats_new(self):
        body = (
            "## What's New\n"
            "- Keep your focus timer visible on the Lock Screen.\n"
            "- Fix Codemagic Xcode compilation for WidgetKit.\n"
            "- Improve GitHub CI pipeline.\n"
            "## Testing\n- This is internal only.\n"
        )
        self.assertEqual(customer_changes(body),
                         ["Keep your focus timer visible on the Lock Screen."])

    def test_no_duplicate_notes_and_respects_another_heading(self):
        self.assertEqual(customer_changes(
            "## What's New\n"
            "- See progress at a glance.\n"
            "- See progress at a glance.\n"
            "## Internal\n"
            "- Signing and provisioning details\n"
        ), ["See progress at a glance."])

    def test_rejects_overlong_and_excessive_notes(self):
        with self.assertRaises(ValueError):
            customer_changes("## What's New\n- " + "a" * 201)
        with self.assertRaises(ValueError):
            customer_changes("## What's New\n" +
                             "".join(f"- Change {i}\n" for i in range(MAX_CHANGES + 1)))

    def test_release_notes_merges_do_not_generate_new_notes(self):
        self.assertTrue(is_notes_change("chore(release-notes): sync updates",
                                        "release-notes/pending"))
        self.assertFalse(is_notes_change("feat(ios): Focus Timer", "feat/timer"))


class EntryTests(unittest.TestCase):
    def test_distinct_merges_get_distinct_release_ids_newest_first(self):
        data = catalog()
        one = "1" * 40
        two = "2" * 40
        self.assertTrue(add_release(data, one, ["Add a Focus Timer."], "1.0", "2026-11-12"))
        self.assertTrue(add_release(data, two, ["Show today's progress."], "1.0", "2026-11-12"))
        self.assertEqual([entry["id"] for entry in data["releases"][:2]],
                         ["notes-" + two[:12], "notes-" + one[:12]])
        self.assertEqual(data["releases"][0]["changes"], ["Show today's progress."])
        self.assertFalse(add_release(data, one, ["Add a Focus Timer."], "1.0", "2026-11-12"))

    def test_internal_merges_never_create_a_release_entry(self):
        data = catalog()
        self.assertFalse(add_release(data, "3" * 40, [], "1.0", "2026-11-12"))
        self.assertEqual(len(data["releases"]), 1)

    def test_release_file_has_a_cursor_that_can_be_replayed_safely(self):
        data = json.loads((ROOT / "ios/SpreadNativeV2/Sources/SpreadNativeV2/"
                          "Resources/ReleaseNotes.json").read_text())
        self.assertRegex(data["lastProcessedCommit"], r"^[a-f0-9]{40}$")


class ConfigurationTests(unittest.TestCase):
    def test_workflow_uses_git_main_without_creating_pending_pr(self):
        workflow = (ROOT / ".github/workflows/release-notes-draft.yml").read_text()
        script = (ROOT / "scripts/release_notes_draft.py").read_text()
        self.assertIn("fetch-depth: 0", workflow)
        self.assertIn("pull-requests: read", workflow)
        self.assertIn('"HEAD:main"', script)
        self.assertNotIn("gh pr create", script)
        self.assertNotIn("release-notes/pending", script)

    def test_marketing_version_is_unique(self):
        self.assertEqual(marketing_version("MARKETING_VERSION = 1.0;\n" * 4), "1.0")
        with self.assertRaises(ValueError):
            marketing_version("MARKETING_VERSION = 1.0;\nMARKETING_VERSION = 1.1;")

    def test_dates_follow_central_calendar(self):
        self.assertEqual(local_date(datetime(2026, 11, 13, 0, 5, tzinfo=timezone.utc)),
                         "2026-11-12")


if __name__ == "__main__":
    unittest.main()
