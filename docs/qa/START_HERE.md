# Spread QA — start here

This is the **project adapter** for a reusable QA process. The instructions and test-report format can be copied to other repositories by changing the project profile, not the testing principles.

## Ask in ordinary language

| Say | Route to |
| --- | --- |
| **QA: feature — [feature]** | Acceptance criteria → unit/integration checks → browser E2E → evidence |
| **QA: explore — [goal]** | Synthetic exploratory session, bounded to a test build; investigate findings independently |
| **QA: native — [flow]** | Maestro on a real iOS Simulator; report native-only findings |
| **QA: release — [target]** | Evidence from all required layers, outstanding risks and a release recommendation |

For each request, the agent must read [QA_STANDARD.md](QA_STANDARD.md) and [STACK.md](STACK.md), inspect the current code and existing tests, write expected behavior **before** execution, and produce a report using [REPORT_TEMPLATE.md](REPORT_TEMPLATE.md).

**Approval gate:** Testing and reporting are authorized. Fixing product code, merging, deploying, enabling paid cloud infrastructure or using real personal data require separate authorization.

## Current tool status

- **Playwright:** already configured in this repository (`playwright.config.ts`, `e2e/`, `.claude/agents/playwright-test-*.md`, and `.mcp.json`). The Playwright stack is executable where Node dependencies and browser binaries are installed. No new Playwright package is needed.
- **Maestro:** native iOS Simulator smoke flow at [`.maestro/01-launch-smoke.yaml`](../../.maestro/01-launch-smoke.yaml); **not device-verified**. See [MAESTRO.md](MAESTRO.md). The CLI/Xcode/simulator must be installed on a Mac before it can run.
- **UXAgent:** optional external research framework with a bounded launcher at [`scripts/qa/run-uxagent.sh`](../../scripts/qa/run-uxagent.sh). **Not installed, not run, and never a CI/release gate.** See [UXAGENT.md](UXAGENT.md); needs an explicit API key and opt-in.

## Fast commands

```sh
# Browser QA: build the installed-app web bundle, then run existing deterministic tests
npm ci
npm run export:ios
npx playwright install chromium webkit
npx playwright test e2e/responsibilities.spec.ts

# Check prerequisites without starting or paying for agents
bash scripts/qa/check-stack.sh

# Native simulator (Mac only, after installing and launching the actual iOS app)
maestro test .maestro/01-launch-smoke.yaml

# AI exploratory agent (opt-in, local test build ONLY)
# See UXAGENT.md before running. Runs cost money and may transmit test page content to a model.
```

The GitHub Actions workflow `.github/workflows/qa-browser.yml` runs a **targeted Playwright suite on relevant pull requests** and supports manual dispatch. It preserves traces/screenshots on failure. Passing this focused suite does not mean all behavior or native iOS is validated.

## Guardrails

- All personas, accounts and test data must be synthetic; no marketing quotes attributed to real customers.
- Use Playwright or other deterministic assertions for correctness; UXAgent's simulated preferences are hypotheses, not usability evidence.
- Maestro never uses `clearState` by default because this is a local-first app; resetting the app can permanently erase the test device's planner.
- Do not run the optional UXAgent against the production URL or anything containing authentic user data.
- Do not weaken failing assertions, silently skip failures, or misclassify test harness defects as app defects.
- Every failed behavior requires reproduction steps, expected/actual result, evidence, severity and affected environment.
