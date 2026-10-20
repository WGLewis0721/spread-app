# QA stack — Playwright-only project profile

## Tool

**Playwright Test** is the only automated UI framework in this first phase. Spread already has `@playwright/test`, `playwright.config.ts`, `e2e/`, `.mcp.json`, and Playwright-specific Claude planner, generator, and healer instructions. No extra dependencies or accounts are required.

### Existing setup

| Capability | Where | Notes |
| --- | --- | --- |
| Browser projects | `playwright.config.ts` | Desktop Chromium and simulated iPhone 14 WebKit |
| Synthetic isolation | `e2e/fixtures.ts` | Fake Capacitor bridge, fixed clock (2026-03-04), fresh state, outbound requests blocked |
| Browser tests | `e2e/*.spec.ts` | Responsibilities and persona journeys, among others |
| Playwright agents | `.claude/agents/playwright-test-*.md`, `.mcp.json` | Plan → generate → investigate failing tests; no additional installation in repo |
| CI | `.github/workflows/qa-browser.yml` | Relevant PR changes + manual dispatch, focused scenarios, failure artifacts |

### Running it

```sh
npm ci
npm run export:ios
npx playwright install chromium webkit
npx playwright test e2e/responsibilities.spec.ts
# or: npx playwright test
```

The browser run tests the installed-app **web bundle with a fake native bridge**. It does not test a signed iPhone binary or native system APIs.

## Test routing

1. **Feature:** identify the independent expected outcome (test oracle), inspect source and existing tests, run unit/integration tests as appropriate and use Playwright for user-visible end-to-end assertions.
2. **Regression:** test affected journeys, boundary inputs, persistence and prior defect reproductions.
3. **Exploration:** drive browser interactions using Playwright, collect hypotheses, and confirm defects with deterministic assertions and reproducible evidence.
4. **Release review:** aggregate test status while explicitly marking native iOS and human usability coverage **NOT TESTED** unless separate evidence exists.

The QA agent must not alter production behavior, merge or deploy without authorization. An agent is not a substitute for genuine user testing.

## Spread project specifics

- Source of truth: verified `main`; preserve `golden/*`.
- Local-first React app packaged through Capacitor, no mandatory account.
- Browser-tested installed-app bundle: `npm run export:ios` → `dist-ios`.
- Critical workflows: responsibilities → hours → week → tasks; allocation math, date identity and rollover; profiles, undo, offline, storage, backup/restore.
- Read `AGENTS.project.md`, `README.md` and applicable release documentation before making claims or changing tests.

## Portable pattern

Copy `QA_STANDARD.md`, `REPORT_TEMPLATE.md` and the short QA command into another repository. Replace this profile with that project's technologies, test fixtures, build commands, requirements, privacy boundaries and release gates.
