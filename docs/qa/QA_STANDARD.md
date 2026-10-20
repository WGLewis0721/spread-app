# Reusable QA standard — v1

Apply this to all apps, substituting project configuration and applicable platforms.

## Order of operations

1. Read the repository's authoritative requirements, baseline branch, existing tests, and privacy/release rules.
2. Define an independently checkable **oracle** before scripting: expected visible behavior, data invariants and negative conditions.
3. Build a risk-based test matrix: happy path, boundaries, invalid inputs, state transitions, persistence, navigation, accessibility, offline/recovery and platform-specific behavior.
4. Reuse project test fixtures. Keep tests independent; clean or synthetic state only. Do not touch production or personal data.
5. Execute the narrowest reliable tests first, then cross-screen E2E, then exploratory and native checks.
6. Investigate each failure: application defect, test defect, environment defect, requirement gap or unverified risk.
7. Report outcomes using `REPORT_TEMPLATE.md`, including tests **not run** and exact commands.

## Acceptance criteria

Write each requirement as: **Given** initial data/state; **When** observable action; **Then** user-visible and stored result; **And** invariants, persistence, reversibility and expected failures. Label invented expectations as proposals rather than current facts.

## Evidence

A finding is **verified** only with a repeatable path plus captured evidence or a source-code/test reproduction. Attach screenshots, Playwright traces, Maestro recordings, logs, failing assertion and relevant commit/build. Cite code paths when diagnosing implementation causes.

A test passing means *its assertions passed*, not that the entire feature or app is validated. Never report fictional persona utterances as actual user research.

## Severity versus confidence

- **Blocker** — severe data integrity/security failure or critical journey inaccessible.
- **Major** — central workflow broken or materially incorrect.
- **Minor** — degraded workflow with practical workaround.
- **Polish** — visual or small interaction problem.
- **Unknown requirement** — not a defect until product behavior is defined.

Also report confidence: **confirmed**, **reproduced once**, **suspected**, or **untested**. Rank remediation by impact, prevalence, recoverability and user exposure, not by persona count.

## Separation of duties

- The QA agent may propose tests and write isolated test-only code on a branch.
- Application fixes need explicit approval; proposed code changes and confirmed failures must remain distinguishable.
- Automated repairs may update broken test locators/waits, but must not alter product requirements or weaken expected results to force green.
- Real UAT uses representative human participants with task goals, not click scripts. Synthetic-agent runs support exploration and hypotheses only.

## Release gates

Release requires the repository's project-specific gates, including critical test passes, no unresolved release-blocking defects, representative physical-device checks where applicable and explicit release authorization. If a layer could not run, report **NOT TESTED**, never PASS.
