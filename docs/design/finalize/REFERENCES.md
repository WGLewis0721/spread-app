# Spread | Reference and Inspiration Register (publish finalize)

> Part of the Spread design brain. Start at [../README.md](../README.md). Folder index: [README.md](README.md). Machine-readable source of truth: [references.json](references.json).

> Summary: 37 sources. 15 were opened in full, 7 in part, and 15 not at all. Nothing marked `false` is relied on for a claim.

Only sources this lane opened are marked `inspected: true`. `partial` means only some sections were read, and the note says which. Anything not opened is `false`, even if a document cites it.

## Sources

| # | Source | Path or URL | Category | Inspected | What was used, and what was not |
| --- | --- | --- | --- | --- | --- |
| 1 | Gray Matter `app-design/README.md` | github.com/WGLewis0721/graymattertechllc- (cloned to /tmp/gm, `app-design/`) | platform / process | true | The workflow order and the gate list. |
| 2 | Gray Matter `UPGRADE_AND_CORRECTIVE_WORKFLOW.md` | same | process | true | Corrections record fields, before/after rule, release gate on open corrections. |
| 3 | Gray Matter `DESIGN_TO_BUILD_CONTRACT.md` | same | process | true | Stage vocabulary (planned, designed, implemented, verified) and the screens.json authority rule. |
| 4 | Gray Matter `UI_AUTOMATION_AND_EVIDENCE.md` | same | process | true | Failure classification and "pass totals for the actual run". |
| 5 | Gray Matter `SECURITY_AND_RELEASE.md` | same | process | true | Experience release gate and ship-in-stages list. |
| 6 | Gray Matter `IOS_PLAYBOOK.md` | same | platform | partial | First 2.6 KB of 4.5 KB: native stack, editorial identity pointer, interaction standard. |
| 7 | Gray Matter `TACTILE_MOTION_AND_DEVICE_QA.md` | same | process | partial | First 2.6 KB of 6.7 KB: glide, snap and settle; semantic haptics. |
| 8 | Gray Matter `UX_REVIEW_AND_SPEC_PROTOCOL.md` | same | process | partial | First 2.6 KB of 6.3 KB: seven fundamentals and UX-law lenses. |
| 9 | Gray Matter `DESIGN_SYSTEM.md` | same | process | partial | First 2.6 KB of 5.0 KB: semantic token roles. |
| 10 | Gray Matter `WEB_PLAYBOOK.md` | same | platform | false | Not opened. |
| 11 | Gray Matter `WEBSITE_DESIGN_WORKFLOW.md` | same | process | false | Not opened. |
| 12 | Gray Matter `EDITORIAL_CARD_AND_ARTWORK.md` | same | process | false | Not opened. Relevant to Life artwork; the native board covers it for now. |
| 13 | Gray Matter `CREATIVE_ASSET_PRODUCTION.md`, `ANIMATED_MEDIA_PIPELINE.md`, `OBJECT_FIRST_NATIVE_PATTERNS.md`, `NATIVE_UI_REFERENCES.md`, `LIBRARY_CATALOG.md`, `AI_WORKFLOW.md` | same | process | false | Not opened. |
| 14 | Gray Matter `templates/SCREEN_MAP.md`, `SCREEN_SPEC.md`, `UPGRADE_AUDIT.md`, `REFERENCES.md`, `CORRECTIVE_ACTION.md`, `DESIGN_QA.md`, `RELEASE_CHECKLIST.md`, `BRAND_BOARD.md`, `UI_KIT.md` | same, `templates/` | template | true | Mapped onto this folder: SCREEN_MAP.md, UPGRADE_AUDIT.md, REFERENCES.md, corrections, RELEASE_CHECKLIST.md. Brand board and UI kit templates were read for the native proof rules. |
| 15 | Gray Matter `templates/DECISION_LOG.md`, `DESIGN_CHANGE_SPEC.md`, `ASSET_JOB_MANIFEST.md`, `PREBUILD_PLAN.md`, `PROJECT_BRIEF.md`, `WEBSITE_BRIEF.md`, `FEATURE_SPEC.md` | same, `templates/` | template | false | Not opened. Spread's own decision and spec templates apply (docs/design/DECISIONS.md and specs/TEMPLATE.md, not opened here). |
| 16 | Spread `CLAUDE.md` and `AGENTS.project.md` | repo root | owner rules | true | Binding rules, boundaries and verify steps. |
| 17 | Spread design map `docs/design/README.md` | repo | owner docs | true | Router, folder map, budgets. The docs:check rules were read by grep and excerpts of `scripts/design-docs.mjs`. |
| 18 | Spread `docs/design/landing/DESIGN.md` | repo | owner docs | true | Landing composition, motion, modes. Read through the Process section. |
| 19 | Spread `docs/design/packs/landing-change.md` | repo | owner docs | true | Landing checklist. |
| 20 | Spread `docs/design/planner/SPREAD_NATIVE_BRAND_BOARD.md` | repo | owner docs | partial | Read by grep and selected amendment lines (Nov 4 to Nov 11). Full read still owed. |
| 21 | Spread `docs/design/platforms/IOS27_BEHAVIOR_AUDIT.md` | repo | owner docs | false | Not opened. It is the release gate for native; owed before any native verdict. |
| 22 | Spread `docs/APP_STORE_REVIEW_CHECKLIST.md` | repo | owner docs | true | Automated and manual App Review gates. Linked from RELEASE_CHECKLIST.md. |
| 23 | Spread `APP_STORE_RELEASE_PLAN.md` | repo | owner docs | partial | Header, direction (lines 40-75), release package and release sections (136-160). |
| 24 | Spread publish master plan `docs/design/specs/2026-11-14-publish-finalize-plan.md` | branch `claude/happy-feynman-an60e6` (PR #209) | owner plan | true | Lane E scope, owner goals, skills table, Gray Matter to Spread mapping. |
| 25 | Spread `docs/design/README.md` section 5 | repo | owner docs | partial | Studio section only. `DECISIONS.md` and `specs/TEMPLATE.md` were not opened. |
| 26 | Spread `docs/evidence/` | repo | evidence | false | Bash access was denied for this path in this session. Its contents are unknown here. |
| 27 | Spread `docs/IOS_RELEASE.md` and `docs/ICLOUD_PLAN.md` | repo | owner docs | false | Not opened. |
| 28 | Spread native source (`ios/SpreadNativeV2/Sources`, `ios/App/SpreadWidget`) | repo | implementation | true | Inventory, line counts, copy, token and reachability checks by grep and targeted reads. Not compiled. |
| 29 | Spread landing source (`src/spread/**`, `src/lib/links.ts`, `src/lib/spread/model.ts`, `profiles.ts`, `cloud-flags.ts`) | repo | implementation | true | Landing structure, copy, colors, links. |
| 30 | Apple Human Interface Guidelines | developer.apple.com/design/human-interface-guidelines | platform | false | Referenced by the owner docs. Not fetched in this session. |
| 31 | Apple App Review Guidelines | developer.apple.com/app-store/review/guidelines | platform | false | Referenced by the App Store checklist. Not fetched. |
| 32 | WCAG 2.2 | w3.org/TR/WCAG22 | accessibility | false | Referenced by Gray Matter. Not fetched. Contrast checks were not run. |
| 33 | Lucide icons and license | `ios/SpreadNativeV2/Sources/SpreadNativeV2/Resources/LUCIDE_LICENSE.txt` | license | false | Present in repo; not opened in this pass. Icon set is used for `SpreadIcons`. |
| 34 | Inter variable (Spread Sans) | `public/fonts/inter-latin.woff2` | typography | false | Font license not reviewed. |
| 35 | Playwright (preinstalled) | local tool | tooling | true | Used for the landing captures (not a design reference). |
| 36 | design:design-critique, design:accessibility-review, design:ux-copy skills | claude.ai skills | tooling | false | SearchSkills returned no matches in this session. Not used. |
| 37 | 21st.dev MCP | not connected | tooling | false | Not available in this session. Not used. |

## Inspiration synthesis

- **Observed patterns worth applying.** From Gray Matter: the corrections record and the release gate on open items. From the Spread brand board: one focal object per section and the restraint rule. From the Life amendments: undoable deletion instead of confirmation for Life cards.
- **Patterns rejected or conflicting.** Liquid Glass, metal Crown, doodle art on Life, and gradient meshes are excluded by `CLAUDE.md`. Gray Matter's React and website patterns do not translate to SwiftUI.
- **Chosen original direction.** Unchanged: solid paper and navy-style surfaces, editorial Life artwork, Chalk for Classic.
- **Licensed assets and substitutions.** The Lucide set is in the repo under its license file. The Inter font license was not reviewed here. No new assets were added in this pass.
- **Owner approval and date.** Pending. The owner should confirm this register at the same time as the four open corrections.

**Never invent inspection of a source or license rights.** Items marked `false` above were not opened, and nothing in this file depends on them.
