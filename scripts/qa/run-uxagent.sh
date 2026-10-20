#!/usr/bin/env bash
# Opt-in AI simulation against a local disposable build; no production URL accepted.
set -euo pipefail
if [[ "${QA_ENABLE_LLM:-}" != "1" ]]; then
  echo "UXAgent is paid/agentic. Set QA_ENABLE_LLM=1 only after reviewing docs/qa/UXAGENT.md." >&2
  exit 2
fi
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "ANTHROPIC_API_KEY is required; do not store it in the repository." >&2
  exit 2
fi
agent_dir="${QA_UXAGENT_DIR:-../UXAgent}"
if [[ ! -f "$agent_dir/pyproject.toml" ]]; then
  echo "UXAgent checkout not found at $agent_dir. See docs/qa/UXAGENT.md." >&2
  exit 2
fi
url="${QA_URL:-http://127.0.0.1:8197}"
case "$url" in
  http://127.0.0.1:8197|http://localhost:8197) ;;
  *) echo "Only the local disposable 8197 test build is allowed; received $url" >&2; exit 2 ;;
esac
steps="${QA_MAX_STEPS:-12}"
if [[ ! "$steps" =~ ^[0-9]+$ ]] || (( steps < 1 || steps > 20 )); then
  echo "QA_MAX_STEPS must be 1..20." >&2
  exit 2
fi
intent="${QA_INTENT:-Create a simple weekly plan with two responsibilities and place work on a day}"
if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required; see the upstream UXAgent installation guide." >&2
  exit 2
fi
echo "WARNING: Synthetic browser agent may access external links. Run only with disposable data and network isolation."
echo "Launching at $url for <= $steps steps. Model charges may apply."
(
  cd "$agent_dir"
  HEADLESS="${HEADLESS:-true}" uv run -m src.simulated_web_agent.main --intent "$intent" --start-url "$url" --max-steps "$steps"
)
