"""Offline regression tests for the Studio Codemagic release orchestrator."""
import io
import json
import os
import tempfile
import unittest
from unittest.mock import patch

import studio_codemagic as cm


APP = "654321abcdef123456abcdef"
BUILD = "abcdef123456abcdef123456"
SHA = "a" * 40


class StudioCodemagicTests(unittest.TestCase):
    def test_only_one_exact_branch_workflow_and_commit(self):
        data = cm.start_payload(APP, SHA)
        self.assertEqual(data["branch"], "spread-studio")
        self.assertEqual(data["workflowId"], "spread-studio-testflight")
        self.assertEqual(data["environment"]["variables"]["EXPECTED_STUDIO_COMMIT"], SHA)
        self.assertNotIn("VITE_SPREAD_STUDIO", data["environment"]["variables"])
        self.assertNotIn("main", json.dumps(data))

    def test_bad_inputs_are_rejected_before_post(self):
        for sha in ("", "abc", "g" * 40, "a" * 39, "../etc/passwd"):
            with self.assertRaises(ValueError):
                cm.start_payload(APP, sha)
        with self.assertRaises(ValueError):
            cm.start_payload("../../escape", SHA)

    def test_status_is_read_from_v3_data_not_top_level(self):
        self.assertEqual(cm.status_from_result({"data": {"status": "finished"}}), "finished")
        with self.assertRaises(ValueError):
            cm.status_from_result({"status": "finished"})
        with self.assertRaises(ValueError):
            cm.status_from_result({"data": {"status": "success"}})

    def test_terminal_failures_are_never_considered_green(self):
        for state in cm.FAILED:
            with patch.object(cm, "api_json", return_value={"data": {"status": state}}):
                with self.assertRaisesRegex(RuntimeError, state):
                    cm.watch(APP, BUILD, "token", timeout_seconds=2, interval_seconds=0)

    def test_finished_build_exits_without_another_poll(self):
        with patch.object(cm, "api_json", return_value={"data": {"status": "finished"}}) as request:
            cm.watch(APP, BUILD, "token", timeout_seconds=2, interval_seconds=0)
            self.assertEqual(request.call_count, 1)
            self.assertEqual(request.call_args.args[0], cm.STATUS_ROOT + BUILD)

    def test_trigger_captures_build_id_and_trusted_link(self):
        with tempfile.TemporaryDirectory() as tmp:
            output_path = os.path.join(tmp, "output")
            with patch.dict(os.environ, {"GITHUB_OUTPUT": output_path}):
                with patch.object(cm, "api_json", return_value={"buildId": BUILD}) as request:
                    self.assertEqual(cm.trigger(APP, SHA, "fake-token"), BUILD)
                    self.assertEqual(request.call_args.args[0], cm.START_URL)
                    self.assertEqual(request.call_args.args[2], cm.start_payload(APP, SHA))
            with open(output_path, encoding="utf-8") as file:
                text = file.read()
            self.assertIn(f"build_id={BUILD}", text)
            self.assertIn(f"https://codemagic.io/app/{APP}/build/{BUILD}", text)

    def test_missing_build_id_rejects_response(self):
        for response in ({}, {"buildId": ""}, {"buildId": "../attacker"}):
            with self.assertRaises(ValueError):
                cm.build_id_from_result(response)


if __name__ == "__main__":
    unittest.main()
