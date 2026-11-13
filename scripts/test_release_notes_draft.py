"""No-network tests for the per-merge What's New draft. The GitHub and git calls are not exercised here."""
import unittest

from release_notes_draft import (
    BODY_END,
    BODY_START,
    MAX_CHANGES,
    add_change,
    change_for,
    included_items,
    is_notes_change,
    marketing_version,
    plain_title,
    render_body,
    summary_bullet,
)

PR_BODY = """## Summary

- Plan Ahead schedules can save the days they plan, with `hours` on each day.
- A second summary bullet that must not be used.

## Not verified here

- Swift has not been compiled in this environment.
"""


def catalog(*changes):
    entry = {"id": "2026-11-11-life-week", "version": "1.0", "date": "2026-11-11", "title": "Old", "changes": list(changes)}
    return {"formatVersion": 1, "releases": [entry]}


class PlainTitleTests(unittest.TestCase):
    def test_strips_conventional_prefix_and_pr_number(self):
        self.assertEqual(plain_title("feat(ios): plan ahead fixed days (#184)"), "Plan ahead fixed days")

    def test_removes_code_ticks_and_capitalises(self):
        self.assertEqual(plain_title("fix: `Week` header spacing"), "Week header spacing")

    def test_empty_title_has_a_fallback(self):
        self.assertEqual(plain_title("chore(ios):   "), "Updated Spread")


class SummaryTests(unittest.TestCase):
    def test_first_bullet_under_summary_only(self):
        self.assertEqual(summary_bullet(PR_BODY),
                         "Plan Ahead schedules can save the days they plan, with hours on each day.")

    def test_bullets_outside_summary_are_ignored(self):
        self.assertIsNone(summary_bullet("## Not verified here\n\n- Only internal notes.\n"))

    def test_missing_body_has_no_bullet(self):
        self.assertIsNone(summary_bullet(None))

    def test_change_falls_back_to_title(self):
        self.assertEqual(change_for("feat(ios): new week view (#3)", "No summary here."), "New week view")


class NotesMergeTests(unittest.TestCase):
    def test_release_notes_pr_is_skipped_by_branch_or_title(self):
        self.assertTrue(is_notes_change("feat: anything", "release-notes/pending"))
        self.assertTrue(is_notes_change("chore(release-notes): What's New draft", "main"))

    def test_ordinary_merges_are_drafted(self):
        self.assertFalse(is_notes_change("feat(ios): plan ahead", "feature/plan-ahead"))


class AddChangeTests(unittest.TestCase):
    def test_new_entry_is_prepended_with_one_line(self):
        data = catalog()
        new = {"id": "notes-abc1234", "version": "1.0", "date": "2026-11-12", "title": "Recent updates"}
        add_change(data, "First line", new)
        self.assertEqual(data["releases"][0]["id"], "notes-abc1234")
        self.assertEqual(data["releases"][0]["changes"], ["First line"])
        self.assertEqual(data["releases"][1]["id"], "2026-11-11-life-week")

    def test_pending_entry_gains_lines_without_a_new_release(self):
        data = catalog()
        new = {"id": "notes-abc1234", "version": "1.0", "date": "2026-11-12", "title": "Recent updates"}
        add_change(data, "First line", new)
        add_change(data, "Second line")
        self.assertEqual(data["releases"][0]["changes"], ["First line", "Second line"])
        self.assertEqual(len(data["releases"]), 2)

    def test_lines_are_capped_and_the_oldest_is_dropped(self):
        data = catalog()
        new = {"id": "notes-abc1234", "version": "1.0", "date": "2026-11-12", "title": "Recent updates"}
        add_change(data, "line 0", new)
        for index in range(1, MAX_CHANGES + 3):
            add_change(data, f"line {index}")
        changes = data["releases"][0]["changes"]
        self.assertEqual(len(changes), MAX_CHANGES)
        self.assertEqual(changes[0], "line 3")
        self.assertEqual(changes[-1], f"line {MAX_CHANGES + 2}")


class PendingBodyTests(unittest.TestCase):
    def test_included_items_round_trip_through_the_body(self):
        items = ["#184 Plan Ahead fixed days", "abc1234 Fix week spacing"]
        self.assertEqual(included_items(render_body(items)), items)

    def test_body_notes_when_older_merges_left_the_note(self):
        items = [f"#{n} merge {n}" for n in range(MAX_CHANGES + 2)]
        body = render_body(items)
        self.assertIn("the 2 oldest merge(s) are no longer in it", body)
        self.assertIn(BODY_START, body)
        self.assertIn(BODY_END, body)

    def test_no_markers_means_nothing_included_yet(self):
        self.assertEqual(included_items("A body with no markers"), [])


class VersionTests(unittest.TestCase):
    def test_single_marketing_version_is_read(self):
        project = "MARKETING_VERSION = 1.0;\nMARKETING_VERSION = 1.0;\n"
        self.assertEqual(marketing_version(project), "1.0")

    def test_conflicting_versions_stop_the_draft(self):
        with self.assertRaises(SystemExit):
            marketing_version("MARKETING_VERSION = 1.0;\nMARKETING_VERSION = 2.0;\n")


if __name__ == "__main__":
    unittest.main()
