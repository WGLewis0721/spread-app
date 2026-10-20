# QA tool stack — reusable decision matrix

| Tool | Role | Spread installation status | What it cannot prove |
| --- | --- | --- | --- |
| **Playwright Test** | Reproducible browser E2E, cross-browser and responsive checks, traces | **Existing**: `@playwright/test`, `playwright.config.ts`, `e2e/`, `.mcp.json`, and Claude planner/generator/healer agent definitions | Native WKWebView behavior or human usability |
| **Maestro** | Real iOS Simulator UI flows and screenshots against installed Capacitor app | **Prepared** YAML at `.maestro/01-launch-smoke.yaml`; requires macOS/Xcode/Simulator/Java/Maestro CLI; not run here | App Store signing, physical iPhone behavior, CloudKit correctness |
| **neuhai/UXAgent** | LLM-driven synthetic exploratory journeys and candidate UX friction | **Optional integration**: guarded launcher; external checkout, `uv`, Chromium and Anthropic key required; not run here | Genuine user sentiment, deterministic correctness, release evidence |
| **Actual people** | Task success, comprehension, cognitive effort, preferences | Not automated; recruit participants and observe goals without teaching button sequences | Code/data invariants not measured |

## Selection rules

1. **Feature correctness:** written oracle → unit/integration → Playwright. Failures need a reproducible assertion.
2. **Native-specific issue:** dedicated Mac Simulator → Maestro. Never substitute browser emulation and call it an iPhone test.
3. **Unknown UI friction:** manual exploration or bounded UXAgent. Treat findings as hypotheses until independently verified. Conduct human UAT if user comprehension is the real question.
4. **Release:** aggregate evidence from independent layers; missing platform coverage is NOT TESTED.

## Automation and cost

- [Targeted PR + manual Playwright workflow](../../.github/workflows/qa-browser.yml) installs browsers and runs a focused existing browser suite; artifacts retained. It does not replace the full release checklist.
- Maestro runs locally for now; don't introduce macOS CI minutes or cloud service without approval.
- UXAgent never runs in CI; synthetic scenarios can incur model fees and expose the rendered test content to the model provider. API keys stay outside version control.

## Project profile (Spread)

- Source of truth: verified `main`, golden branches untouched.
- Local-first React app inside Capacitor; no mandatory account.
- Installed app bundle: `npm run export:ios` → `dist-ios`; web bundle alone is not native iOS.
- Native app ID: `com.graymatter.spread` (from `capacitor.config.json`).
- Existing browser fixtures: `e2e/fixtures.ts` freeze 2026-03-04, use a fake Capacitor bridge, block non-local requests, and create fresh synthetic devices.
- Highest-risk flows: responsibilities/hours consistency, week/date identity, tasks/rollover, local storage, restore, profiles, offline behavior.
- Refer to `AGENTS.project.md`, `README.md`, `docs/IOS_RELEASE.md`, and `APP_STORE_RELEASE_PLAN.md` before affecting the product or release gates.

## Reuse beyond Spread

Copy `QA_STANDARD.md`, `REPORT_TEMPLATE.md`, and the short QA command into another repository. Rewrite only this project's identity, entry URL, build/test commands, app ID, platforms, fixtures, and release gates. Do not copy Spread assumptions into another app.
