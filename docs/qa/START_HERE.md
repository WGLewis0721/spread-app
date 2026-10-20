# Spread QA — Playwright only

This is the **project adapter** for a reusable testing process. The test design rules and report template can be reused in other repositories by replacing the project-specific test commands and requirements.

## Ask normally, or use one command

| Request | What the QA agent should do |
| --- | --- |
| `QA: feature — [feature]` | Define acceptance criteria; inspect existing tests; add focused Playwright coverage and run it |
| `QA: explore — [user goal]` | Use Playwright browser tools to explore a disposable build, record friction, and verify candidate defects |
| `QA: regression — [changed feature]` | Identify affected behaviors, run relevant automated tests, and report gaps |
| `QA: release — [target]` | Summarize browser evidence and explicitly name the release gates Playwright cannot verify |

**Claude Code:** `/qa [your request]`. **Codex or ChatGPT:** write `QA: [your request]`. The agent must read [QA_STANDARD.md](QA_STANDARD.md), [STACK.md](STACK.md), and [REPORT_TEMPLATE.md](REPORT_TEMPLATE.md) before testing.

**Approval gate:** You may inspect and test on a separate branch. Fixing application code, merging, deploying or using real user data require separate authorization.

## What's already available

- `@playwright/test` and `playwright.config.ts` (desktop Chromium and mobile WebKit emulation).
- `e2e/` contains isolated synthetic fixtures, existing browser tests and persona simulations.
- `.claude/agents/playwright-test-*.md` and `.mcp.json` already provide Playwright planner, generator and healer support.
- [GitHub Actions QA workflow](../../.github/workflows/qa-browser.yml) runs a focused Playwright suite for relevant pull requests and allows manual runs; HTML reports and failure artifacts are uploaded.
- No other testing service, API key, account or paid model setup is needed.

## How to run Playwright locally (optional)

You do **not** need to run these commands when asking an agent to test the repository.

```sh
npm ci
npm run export:ios
npx playwright install chromium webkit
npx playwright test e2e/responsibilities.spec.ts
```

For the existing full E2E suite, after exporting the bundle: `npx playwright test`. This is more extensive than the focused pull-request job and its status must be reported separately.

## Important limits

- Browser WebKit emulation **is not** native iOS WKWebView, and cannot establish physical-device keyboard, safe-area, share sheet, haptics or CloudKit behavior.
- Scripted personas and AI-led exploratory testing are **not** real human usability or acceptance testing.
- Passing tests prove only their explicit assertions; report uncovered requirements and untested cases.
- Never change or weaken a failing assertion merely to produce a pass.
- Preserve reproducible steps, expected/actual results, screenshots/traces, device/browser, severity and confidence for findings.
