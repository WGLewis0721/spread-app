# QA prompt library

**Claude Code:** `/qa <request>`

**Codex or any coding agent:** `QA: <request>` (read repository QA routing in `AGENTS.project.md`).

### One-line prompts

- `QA: feature — weekly rollover; verify weekday/date changes, task assignments, persistence, and destination-week conflicts`
- `QA: browser — responsibilities and hours across desktop and mobile WebKit`
- `QA: native — smoke test the installed iOS Simulator app and inspect safe areas`
- `QA: explore — can a new user plan a week with two responsibilities without guidance?`
- `QA: usability — design a 5-participant real-user study; don't fabricate outcomes`
- `QA: release — assess the current branch for TestFlight promotion, listing what is still untested`

### Always-on execution contract

1. Inspect source, build, test fixtures and requirements.
2. State the expected outcome and test data before execution.
3. Run only suitable layers; don't confuse browser WebKit emulation with WKWebView.
4. Preserve evidence; differentiate confirmed bugs, test defects, UX hypotheses and feature requests.
5. Issue a QA report using `REPORT_TEMPLATE.md`. Fixes, merges and deployments are separately authorized.

**If a tool isn't installed or funded**, say NOT RUN and provide the next concrete setup step instead of declaring success.
