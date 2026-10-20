#!/usr/bin/env python3
"""Browser-only persona journeys for the installed Spread bundle.

This is intentionally a small data-driven extension of the existing iOS bridge
smoke tests, not a second E2E framework. Each synthetic persona starts in its
own empty Chromium BrowserContext. No request may leave localhost. The fake
Capacitor bridge is the same one used by native_e2e.py.

These are regression scenarios, NOT actual human usability interviews.
They do not validate real WKWebView, iCloud, touch-hold drag or the App Store app.
"""
import json
import os
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
SHOTS = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/spread-shots")
SHOTS.mkdir(parents=True, exist_ok=True)
INIT = (HERE / "native-init.js").read_text()
URL = "http://127.0.0.1:8097/"

# Names/tasks are fictional. Share behavior patterns rather than duplicating
# a new test implementation for every occupation.
PERSONAS = [
    ("Dana Whitfield", ["Work", "Family", "Self", "Robotics Club"], "Grade physics labs", "Prepare Wednesday lab", 2, 1, False),
    ("Marcus Bell", ["Production", "Home", "Self"], "Tech rehearsal", "Finish scenery", 4, 1, True),
    ("Priya Nair", ["Work", "Home", "Self"], "Update executive calendar", "Rebook travel", 1, 1, False),
    ("Tyrone Reeves", ["Film", "Practice", "Family", "Self"], "Review game film", "Prepare recruiting notes", 4, 2, False),
    ("Elena Voss", ["Lab Runs", "Coursework", "Thesis Writing", "Self", "Home"], "Book instrument", "Write thesis section", 2, 1, False),
    ("Grace Okafor", ["Work", "Home", "Self", "Bakery"], "Parent conferences", "Pack pastry orders", 3, 1, False),
    ("Hannah Lindqvist", ["Homeschool", "Homestead", "Family", "Self"], "Teach fractions", "Feed the goats", 0, 1, False),
    ("Ravi Menon", ["Work", "Hack Team", "Self"], "Code review", "Mentor hackathon team", 5, 3, False),
    ("Jaylen Carter", ["Classes", "Chapter", "Social", "Self"], "Study for midterms", "Prepare philanthropy event", 1, 1, True),
    ("Renata Alvarez", ["Work", "Family", "Self"], "File motion", "Prepare court hearing", 0, 2, False),
    ("Naomi Feld", ["Clients", "Admin", "Self", "Home"], "Client sessions", "Write session notes", 2, 1, False),
    ("Walt Henderson", ["Work", "Family", "Self", "Anniversary Trip"], "Handle plumbing calls", "Plan anniversary dinner", 3, 10, False),
]

def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

def required(condition, message):
    if not condition:
        raise AssertionError(message)

def rename(page, old, new):
    if old == new:
        return
    field = page.get_by_role("textbox", name=f"{old} name")
    field.fill(new)
    field.press("Enter")
    page.get_by_role("textbox", name=f"{new} name").wait_for()

def add_spread(page, name):
    page.get_by_role("button", name="New Spread").click()
    page.get_by_placeholder("Parent, shop, study").fill(name)
    page.get_by_role("button", name="Save spreads").click()
    page.get_by_role("textbox", name=f"{name} name").wait_for()

def role_section(page, name):
    return page.locator('section[id^="spread-role-"]').filter(
        has=page.get_by_role("textbox", name=f"{name} name")
    )

def add_task(page, name, title):
    section = role_section(page, name)
    expand = section.get_by_role("button", name=f"Show tasks for {name}")
    if expand.count():
        expand.click()
    field = section.locator('input[placeholder="What matters most here?"], input[placeholder="Add a task"]')
    field.fill(title)
    field.press("Enter")
    section.get_by_role("checkbox", name=f"Mark done: {title}").wait_for()

def set_hours(page, name, target):
    control = page.get_by_role("button", name=re.compile(r"^" + re.escape(name) + r", .+ hours\. Adjust$"))
    current = int(re.search(r", (\d+) hours", control.get_attribute("aria-label")).group(1))
    control.click()
    direction = "Increase" if current < target else "Decrease"
    for _ in range(abs(target - current)):
        page.get_by_role("button", name=f"{direction} {name} hours").click()
    page.get_by_role("button", name="Done adjusting hours").click()
    required(page.get_by_role("button", name=re.compile(
        r"^" + re.escape(name) + r", " + str(target) + r" hours\. Adjust$"
    )).count() == 1, f"{name}: hour value did not update to {target}")

def select_and_place(page, name, task, day_index):
    page.get_by_role("tab", name="Week").click()
    page.locator('button[data-drag="spread"]').filter(
        has_text=re.compile(r"^" + re.escape(name) + r"\s")
    ).click()
    day = page.locator("section[data-day]").nth(day_index)
    day.get_by_role("button", name=f"Add {name}").click()
    required(day.get_by_role("button", name=f"Move {name}").count() == 1,
             f"{name}: no placed allocation on selected day")
    item = page.locator(f'ul[aria-label="{name} tasks to place"] > li').filter(has_text=task)
    item.get_by_role("button", name="Place").click()
    page.get_by_role("list", name=f"Days for {task}").get_by_role("button").first.click()
    required(item.count() == 0, f"{task}: still in To place after placing")

def check_persona(browser, persona):
    name, spreads, complete_task, open_task, day, weeks_ahead, stress = persona
    marker = slug(name)
    fs = {}
    errors = []
    external = []
    mobile = marker in {"dana-whitfield", "priya-nair", "grace-okafor", "hannah-lindqvist", "jaylen-carter", "walt-henderson"}
    context = browser.new_context(
        viewport={"width": 393 if mobile else 1280, "height": 852 if mobile else 800},
        device_scale_factor=2 if mobile else 1,
        is_mobile=mobile,
        has_touch=mobile,
        reduced_motion="reduce",
    )
    context.expose_function("__fsRead", lambda path: fs.get(path))
    context.expose_function("__fsWrite", lambda path, data, enc: fs.__setitem__(path, data))
    context.add_init_script(INIT)
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    def gate(route):
        if route.request.url.startswith((URL, "data:", "blob:")):
            route.continue_()
        else:
            external.append(route.request.url)
            route.abort()
    page.route("**/*", gate)
    try:
        page.goto(URL, wait_until="domcontentloaded")
        page.get_by_role("tab", name="Spread").wait_for()
        required(page.get_by_role("tabpanel").get_attribute("aria-labelledby") == "planner-tab-spread",
                 "App did not open in Spread view")
        for old, new in zip(("Work", "Home", "Health"), spreads[:3]):
            rename(page, old, new)
        for custom in spreads[3:]:
            add_spread(page, custom)
        required(page.get_by_text(f"across {len(spreads)} spreads").count() == 1,
                 "Wrong number of spreads after setup")
        page.screenshot(path=str(SHOTS / f"{marker}-setup.png"))

        add_task(page, spreads[0], complete_task)
        add_task(page, spreads[0], open_task)
        page.get_by_role("checkbox", name=f"Mark done: {complete_task}").click()
        required(page.get_by_role("checkbox", name=f"Mark not done: {complete_task}").count() == 1,
                 "Completing a task did not change its state")
        if stress:
            set_hours(page, spreads[0], 40)
            set_hours(page, spreads[1], 8)
            set_hours(page, spreads[2], 0)
            required(page.get_by_text("If the hours don’t fit, something is lying.").count() == 1,
                     "Overcommitment above 45 hours was not announced")
        select_and_place(page, spreads[0], open_task, day)
        page.screenshot(path=str(SHOTS / f"{marker}-full-week.png"))

        page.get_by_role("button", name="Next week").click()
        page.get_by_role("button", name="Previous week").click()
        page.get_by_role("tab", name="Spread").click()
        required(page.get_by_role("checkbox", name=f"Mark not done: {complete_task}").count() == 1,
                 "Week navigation lost completed task")
        # Rollover copies the current week forward with tasks reopened.
        page.get_by_role("button", name="Rollover").click()
        if page.get_by_text("Replace next week?").count():
            page.get_by_role("alertdialog").get_by_role("button", name="Replace").click()
        required(page.get_by_role("checkbox", name=f"Mark done: {complete_task}").count() == 1,
                 "Rollover did not reopen completed task in following week")

        # Test longer navigation without relying on week identifiers or store internals.
        page.get_by_role("tab", name="Week").click()
        for _ in range(1, weeks_ahead):
            page.get_by_role("button", name="Next week").click()
        page.get_by_role("button", name="Back to this week").click() if page.get_by_role("button", name="Back to this week").count() else None
        page.get_by_role("tab", name="Spread").click()
        page.reload(wait_until="domcontentloaded")
        page.get_by_role("textbox", name=f"{spreads[0]} name").wait_for()
        required(not errors, f"Unexpected JavaScript errors: {errors}")
        required(not external, f"Attempted non-local requests: {external}")
        page.screenshot(path=str(SHOTS / f"{marker}-rollover.png"))
        print(f"PASS {name}: setup, tasks, placement, week navigation, rollover"
              + (", overcommit" if stress else "") + f", {weeks_ahead} week horizon")
        return {"persona": name, "status": "pass", "browser": "mobile Chromium" if mobile else "desktop Chromium",
                "weeks_ahead": weeks_ahead, "overcommit": stress}
    except Exception as error:
        page.screenshot(path=str(SHOTS / f"{marker}-failure.png"), full_page=True)
        print(f"FAIL {name}: {error}")
        return {"persona": name, "status": "fail", "error": str(error),
                "browser": "mobile Chromium" if mobile else "desktop Chromium"}
    finally:
        context.close()

def main():
    with sync_playwright() as playwright:
        options = {"executable_path": os.environ["PW_CHROME"]} if os.environ.get("PW_CHROME") else {}
        browser = playwright.chromium.launch(**options)
        try:
            results = [check_persona(browser, persona) for persona in PERSONAS]
        finally:
            browser.close()
    (SHOTS / "journey-results.json").write_text(json.dumps(results, indent=2))
    failures = [r for r in results if r["status"] != "pass"]
    print(f"\n{len(results) - len(failures)}/{len(results)} persona journeys passed")
    sys.exit(1 if failures else 0)

if __name__ == "__main__":
    main()
