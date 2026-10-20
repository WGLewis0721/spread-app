# UXAgent — opt-in simulated exploration

**Status: integration instructions + a guarded runner; UXAgent is NOT vendored, installed, executed or authorized to spend model credits.**

Reference: [neuhai/UXAgent](https://github.com/neuhai/UXAgent) (MIT); the upstream project uses `uv`, Python Playwright/Chromium and an Anthropic API key. Read its README and inspect dependencies before executing remote code.

## Install outside the app repository

```sh
git clone https://github.com/neuhai/UXAgent.git ../UXAgent
cd ../UXAgent
uv sync
uv run playwright install chromium
cd ../spread-app
```

For reproducibility in an actual deployment, pin a reviewed UXAgent commit and review its lockfile. Avoid adding third-party agent code to Spread's production dependencies.

## Run only against an isolated local app build

In one terminal (with `dist-ios` already exported):

```sh
npm run export:ios
node scripts/e2e/serve-bundle.mjs
```

In another terminal:

```sh
export ANTHROPIC_API_KEY=...     # put in local secret store or shell; never commit
export QA_UXAGENT_DIR=../UXAgent
export QA_ENABLE_LLM=1          # explicit opt-in; model charges can occur
export QA_INTENT="Plan a work week with two responsibilities and place a task on Wednesday"
bash scripts/qa/run-uxagent.sh
```

The launcher allows only local `http://127.0.0.1:8197` or `http://localhost:8197` targets, requires explicit opt-in, limits the step count (default 12; hard max 20), and checks an Anthropic key is present. **The upstream UXAgent may still navigate to links outside that origin**; those boundaries in the launcher are NOT a browser network sandbox. For strict network isolation, add browser request interception to the agent or block outbound traffic with an external sandbox.

## Interpretation

UXAgent is an **exploratory simulator**, not a human usability tester or test oracle. It can suggest friction points and create screenshots/logs, but each alleged defect requires independent deterministic reproduction. Never use generated “quotes” as genuine customer feedback.

Do not point UXAgent at production, a logged-in account, user-supplied personal data, real messages, finance data, or real iCloud content. Do not give the agent permission to submit forms, delete data, create purchases or use irreversible actions outside disposable fixtures.

Keep model output artifacts in the external UXAgent `runs/` directory, outside application source control.
