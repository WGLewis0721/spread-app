# Spread documentation map

Use this as the single index for cross-product documentation. The verified `main` source is the implementation baseline; documents and old acceptance records do not override it.

## Active starting points

| Need | Authoritative entry point |
| --- | --- |
| Product overview and commands | [Root README](../README.md) |
| Milestone direction | [Roadmap](../ROADMAP.md) (original milestone boxes are historical) |
| UX, Wallet/Life/Classic, device layouts and motion | [Design brain](design/README.md), [Tactile Precision](design/tactile-precision/README.md) |
| App Store architecture and release gates | [Release plan](../APP_STORE_RELEASE_PLAN.md), [App Review checklist](APP_STORE_REVIEW_CHECKLIST.md) |
| Build and candidate verification | [iOS runbook](IOS_RELEASE.md) (older sections explicitly marked historical) |
| Local-first/iCloud architecture and rollout gates | [iCloud plan](ICLOUD_PLAN.md) |
| Current native source verification | [Life acceptance record](evidence/life-ios-implementation/acceptance.md), [tactile evidence](evidence/tactile-precision/README.md) (each tied to a specific source SHA) |
| Repo maintenance and branch housekeeping | [November 7 branch audit](maintenance/2026-11-07-repository-audit.md) | 
| Automated vs manual iOS acceptance | [Workflow execution policy](maintenance/WORKFLOW_RUN_POLICY.md) |

## Historical material

Older `SPREAD_*`, `CLAUDE_*` and `SWIFTUI_*` root handoffs, dated `design/specs/` requests, `docs/evidence/` records and old PR QA notes are **provenance**, not competing active instructions. Keep links intact until their dependencies have been checked. Do not rerun a completed implementation simply because an old handoff uses imperative wording. The [dated spec index](design/specs/README.md) records status; the [design authority map](design/README.md) controls active visual guidance.

## Document hygiene

1. One owner per fact: update the existing active document and link to it; do not write a second current specification.
2. Date candidate-specific status and include its full SHA, test environment and unavailable evidence. Never silently promote historical test results to `main`.
3. For obsolete content, remove unsupported assertions from active entry points first. Retain audit evidence and historical decisions until references and rollback needs are checked.
4. Changes travel on a PR. Run `npm run docs:check`, the relevant source checks, and link validation before owner-approved squash merge. Do not edit or delete golden/release checkpoints.

Source cleanup here changes documentation only. It is not an iOS release authorization.
