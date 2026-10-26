#!/usr/bin/env python3
"""Approved GitHub Actions -> Codemagic API handoff for Studio internal TestFlight.

Only called after the workflow's source-SHA preflight and protected-environment
approval. The Codemagic workflow independently checks its checked-out SHA.
Never passes signing material or arbitrary build flags over the API.
"""
import argparse
import json
import os
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

START_URL = "https://api.codemagic.io/builds"
STATUS_ROOT = "https://codemagic.io/api/v3/builds/"
WORKFLOW = "spread-studio-testflight"
BRANCH = "spread-studio"
IN_PROGRESS = frozenset({"initializing", "queued", "preparing", "fetching", "testing", "building", "publishing", "finishing"})
FAILED = frozenset({"failed", "canceled", "timeout", "skipped"})
SUCCESS = "finished"
IDENTIFIER = re.compile(r"^[A-Za-z0-9_-]{12,64}$")
SHA = re.compile(r"^[a-f0-9]{40}$")


def start_payload(app_id: str, commit: str) -> dict:
    if not IDENTIFIER.fullmatch(app_id):
        raise ValueError("Invalid Codemagic app id")
    if not SHA.fullmatch(commit):
        raise ValueError("Expected the exact approved 40-character commit SHA")
    return {
        "appId": app_id,
        "workflowId": WORKFLOW,
        "branch": BRANCH,
        "environment": {
            "variables": {
                "EXPECTED_STUDIO_COMMIT": commit,
                "STUDIO_RELEASE_SOURCE": "github-actions-approved",
            }
        },
    }


def api_json(url: str, token: str, payload: dict | None = None) -> dict:
    if not token:
        raise ValueError("Missing CODEMAGIC_API_TOKEN")
    headers = {"x-auth-token": token, "Accept": "application/json"}
    data = None
    if payload is not None:
        data = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = Request(url, data=data, headers=headers, method="POST" if data else "GET")
    try:
        with urlopen(request, timeout=25) as response:
            result = json.load(response)
    except HTTPError as exc:
        # Do not print provider error bodies: avoid accidental token disclosure.
        raise RuntimeError(f"Codemagic API returned HTTP {exc.code}") from None
    except (URLError, TimeoutError) as exc:
        raise RuntimeError(f"Codemagic API request failed ({type(exc).__name__})") from None
    if not isinstance(result, dict):
        raise RuntimeError("Codemagic API response is not a JSON object")
    return result


def build_id_from_result(data: dict) -> str:
    build_id = data.get("buildId")
    if not isinstance(build_id, str) or not IDENTIFIER.fullmatch(build_id):
        raise ValueError("Codemagic did not return a valid buildId")
    return build_id


def status_from_result(data: dict) -> str:
    resource = data.get("data")
    status = resource.get("status") if isinstance(resource, dict) else None
    if not isinstance(status, str) or status not in IN_PROGRESS | FAILED | {SUCCESS}:
        raise ValueError("Unknown or missing Codemagic build status (fail closed)")
    return status


def build_url(app_id: str, build_id: str) -> str:
    if not IDENTIFIER.fullmatch(app_id) or not IDENTIFIER.fullmatch(build_id):
        raise ValueError("Invalid Codemagic build locator")
    return f"https://codemagic.io/app/{app_id}/build/{build_id}"


def trigger(app_id: str, sha: str, token: str) -> str:
    body = api_json(START_URL, token, start_payload(app_id, sha))
    build_id = build_id_from_result(body)
    if path := os.environ.get("GITHUB_OUTPUT"):
        with open(path, "a", encoding="utf-8") as out:
            out.write(f"build_id={build_id}\n")
            out.write(f"build_url={build_url(app_id, build_id)}\n")
    print(f"Codemagic Studio build started: {build_url(app_id, build_id)}")
    return build_id


def watch(app_id: str, build_id: str, token: str, timeout_seconds: int = 6900, interval_seconds: int = 30) -> None:
    build_url(app_id, build_id)  # Validate IDs before constructing a network request.
    end = time.monotonic() + timeout_seconds
    while time.monotonic() < end:
        status = status_from_result(api_json(STATUS_ROOT + build_id, token))
        print(f"Codemagic build {build_id}: {status}", flush=True)
        if status == SUCCESS:
            print(f"Build completed; check upload/processing in App Store Connect: {build_url(app_id, build_id)}")
            return
        if status in FAILED:
            raise RuntimeError(f"Codemagic build ended: {status} — {build_url(app_id, build_id)}")
        time.sleep(min(interval_seconds, max(0, end - time.monotonic())))
    raise RuntimeError(f"Codemagic build exceeded monitoring timeout — {build_url(app_id, build_id)}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("trigger", "watch"))
    parser.add_argument("--app-id", required=True)
    parser.add_argument("--sha")
    parser.add_argument("--build-id")
    args = parser.parse_args()
    token = os.environ.get("CODEMAGIC_API_TOKEN", "")
    try:
        if args.command == "trigger":
            if not args.sha:
                raise ValueError("Missing --sha")
            trigger(args.app_id, args.sha, token)
        else:
            if not args.build_id:
                raise ValueError("Missing --build-id")
            watch(args.app_id, args.build_id, token)
    except (ValueError, RuntimeError) as exc:
        print(f"Studio release gate failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
