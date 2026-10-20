# Reusable QA standard — v1

This is a **testing standard**, not a requirement to install any particular product. Spread uses existing Playwright infrastructure in the first phase.

## Workflow

1. Read authoritative requirements, the current verified baseline, existing tests, privacy expectations, and release constraints.
2. Write an independent **test oracle** before coding: expected visible result, relevant state/data invariants, and explicit failure cases.
3. Choose risk-based coverage: happy path, boundaries, invalid states, transitions, persistence, offline behavior, recovery, accessibility and layouts.
4. Reuse synthetic/isolated fixtures; never use authentic personal data or silently change production.
5. Run focused unit/integration checks and deterministic Playwright flows first. If exploring, convert important observations into reproducible browser assertions.
6. Investigate a failure before labeling it: application defect, automation defect, environment failure, undefined requirement or unverified risk.
7. Publish results with `REPORT_TEMPLATE.md`, exact commands and what **did not run**.

## Acceptance criteria

Write each requirement as **Given** initial state, **When** user action, **Then** observable outcome, **And** stored result, invariants, persistence, reversibility, and expected error handling. Proposals must be labeled rather than silently treated as implemented requirements.

## Evidence and honesty

Verified findings require a repeatable procedure with a failing assertion, source-code reproduction or captured evidence (screenshots, Playwright traces, logs, exact build/commit). Distinguish proven cause from suspected cause.

**Passing means only that the asserted cases passed**. Browser WebKit emulation is not a native iOS WKWebView test. Scripted personas are not actual human customers, and invented quotes must never be used as user testimonials.

## Severity and confidence

- **Blocker** — data loss, security failure or the central workflow cannot be used.
- **Major** — core behavior produces materially wrong results or consistently fails.
- **Minor** — degraded functionality with a feasible workaround.
- **Polish** — small interaction or visual mismatch.
- **Requirement gap** — not a defect until expected behavior is decided.

Also report **confirmed**, **reproduced once**, **suspected** or **not tested** separately from severity.

## Independence and release gates

QA may write or update isolated test-only code on a branch. Product fixes, merges, deployments and real-data testing require explicit authorization. Test changes may fix broken locators or timing, but never weaken an assertion to force green. Actual human usability evaluation remains a separate activity.

A release recommendation must account for the project's own requirements, known defects, device-specific tests and outstanding risks. Missing coverage is **NOT TESTED**, never PASS.
