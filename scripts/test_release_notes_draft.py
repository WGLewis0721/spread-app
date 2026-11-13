"""No-network tests for the per-merge What's New draft. The GitHub and git calls are not exercised here."""
import unittest
from datetime import datetime, timezone

from release_notes_draft import (
    BODY_END,
    BODY_START,
    MAX_CHANGES,
    add_change,
    change_for,
    included_items,
    is_notes_change,
    local_date,
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

    def test_full_entry_refuses_a_line_so_none_is_dropped(self):
        data = catalog()
        new = {"id": "notes-abc1234", "version": "1.0", "date": "2026-11-12", "title": "Recent updates"}
        add_change(data, "line 0", new)
        for index in range(1, MAX_CHANGES):
            add_change(data, f"line {index}")
        self.assertEqual(len(data["releases"][0]["changes"]), MAX_CHANGES)
        with self.assertRaises(ValueError):
            add_change(data, "one too many")
        self.assertEqual(data["releases"][0]["changes"][0], "line 0")

    def test_a_new_entry_takes_the_next_line_after_a_full_one(self):
        data = catalog()
        first = {"id": "notes-abc1234", "version": "1.0", "date": "2026-11-12", "title": "Recent updates"}
        add_change(data, "line 0", first)
        for index in range(1, MAX_CHANGES):
            add_change(data, f"line {index}")
        second = {"id": "notes-def5678", "version": "1.0", "date": "2026-11-12", "title": "Recent updates"}
        add_change(data, "overflow line", second)
        self.assertEqual(data["releases"][0]["id"], "notes-def5678")
        self.assertEqual(data["releases"][0]["changes"], ["overflow line"])
        self.assertEqual(len(data["releases"][1]["changes"]), MAX_CHANGES)
        self.assertEqual(data["releases"][1]["changes"][0], "line 0")


class DateTests(unittest.TestCase):
    def test_entry_date_is_the_owners_calendar_day_not_utc(self):
        # 00:05 UTC on Nov 13 is 6:05 pm on Nov 12 in Chicago (Central Standard Time).
        self.assertEqual(local_date(datetime(2026, 11, 13, 0, 5, tzinfo=timezone.utc)), "2026-11-12")

    def test_morning_utc_is_the_same_day_in_chicago(self):
        self.assertEqual(local_date(datetime(2026, 11, 12, 15, 0, tzinfo=timezone.utc)), "2026-11-12")


class PendingBodyTests(unittest.TestCase):
    def test_included_items_round_trip_through_the_body(self):
        items = ["#184 Plan Ahead fixed days", "abc1234 Fix week spacing"]
        self.assertEqual(included_items(render_body(items)), items)

    def test_body_lists_every_merge_even_past_the_entry_limit(self):
        items = [f"#{n} merge {n}" for n in range(MAX_CHANGES + 2)]
        body = render_body(items)
        self.assertNotIn("no longer in it", body)
        self.assertEqual(included_items(body), items)
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
