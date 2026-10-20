# Playwright QA prompts — short and reusable

You do **not** have to remember a script.

**Claude Code:** `/qa weekly rollover`

**ChatGPT / Codex:** `QA: test weekly rollover`

Both should route through the permanent instructions in `AGENTS.project.md` and the QA standard.

## Examples

| Say | Test intent |
| --- | --- |
| `QA: test weekly rollover` | Expected behavior, destination dates, copied allocations/tasks, save/reload and conflicts |
| `QA: test the hours math` | Boundaries, allocations, remaining hours, invalid values and persistence |
| `QA: test task placement on mobile` | WebKit touch emulation, placement, removal, Undo, responsive clipping |
| `QA: explore first-time onboarding` | Automated browser exploration; flag UX hypotheses and reproducible defects |
| `QA: regression-check this PR` | Changed paths, impacted journeys, Playwright tests and evidence |
| `QA: is this ready for TestFlight?` | Browser test report **plus explicit native/manual evidence gaps**, not an unsupported launch approval |

## Agent execution contract

1. Inspect current code, relevant requirements and tests; define Given/When/Then criteria.
2. Reuse `e2e/fixtures.ts` and existing test helpers; do not create duplicate frameworks.
3. Run appropriate deterministic tests in Chromium and WebKit against synthetic local test data.
4. Capture screenshot/trace/error evidence for failures; independently distinguish bugs from automation problems or undefined behavior.
5. Report test counts, exact commands, acceptance criteria, limitations, severity and confidence using `REPORT_TEMPLATE.md`.
6. Product fixes, merges, deployment and any testing against real accounts or data require separate permission.

No Maestro, UXAgent, vendor integration, API key or paid model configuration is part of this setup.
