#!/usr/bin/env bash
# Prints capability, not proof that native/agent tests have been run.
set -eu
printf '%s\n' 'Spread QA tool prerequisites'
printf 'Node: '; if command -v node >/dev/null 2>&1; then node --version; else echo 'MISSING'; fi
printf 'Playwright: '; if [ -f node_modules/.bin/playwright ]; then node_modules/.bin/playwright --version; else echo 'NOT INSTALLED LOCALLY (run npm ci)'; fi
printf 'Maestro: '; if command -v maestro >/dev/null 2>&1; then maestro --version; else echo 'NOT INSTALLED'; fi
printf 'Java: '; if command -v java >/dev/null 2>&1; then java -version 2>&1 | head -n 1; else echo 'NOT INSTALLED'; fi
printf 'uv: '; if command -v uv >/dev/null 2>&1; then uv --version; else echo 'NOT INSTALLED'; fi
printf 'UXAgent checkout: '; if [ -f "${QA_UXAGENT_DIR:-../UXAgent}/pyproject.toml" ]; then echo 'PRESENT (not execution-verified)'; else echo 'NOT FOUND'; fi
printf 'Anthropic key: '; if [ -n "${ANTHROPIC_API_KEY:-}" ]; then echo 'AVAILABLE (value hidden)'; else echo 'NOT SET'; fi
printf '%s\n' 'iOS Simulator and UXAgent model sessions require separate verification.'
