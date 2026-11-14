# Finalize evidence (publish finalize)

> Part of the Spread design brain. Start at [../README.md](../README.md). The router row for this folder is in the map.

> Summary: evidence and registers for the publish finalize program. It maps Gray Matter's gates onto Spread's existing documents. It holds the screen inventory, the design diagnosis, the references, the corrections, the release checklist, and the landing captures. Nothing here is verified on device, and nothing claims a release.

## Files

| File | What it is |
| --- | --- |
| [SCREEN_MAP.md](SCREEN_MAP.md) | Human screen map and implementation coverage |
| [screens.json](screens.json) | Machine-readable inventory of 48 surfaces; authoritative for what exists |
| [UPGRADE_AUDIT.md](UPGRADE_AUDIT.md) | Design diagnosis per surface and ranked improvements |
| [REFERENCES.md](REFERENCES.md) and [references.json](references.json) | Sources, with `inspected` set only for sources actually opened |
| [corrections.json](corrections.json) and [corrections/](corrections/) | Open corrections, one record each |
| [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) | The Gray Matter release template, filled for Spread. Verdict NO-GO |
| `evidence/landing/before/`, `after/` | Playwright captures of the landing page, with `report-*.json` |

This folder also indexes `TOKEN_AUDIT.md`, which the design-system lane (lane A, PR #211) adds. It is not on this branch yet, so it is named here without a link.

## Gray Matter gate to Spread home

| Gray Matter gate | Spread home |
| --- | --- |
| Brief and screen inventory | `SCREEN_MAP.md` and `screens.json` |
| Brand board | `../planner/SPREAD_NATIVE_BRAND_BOARD.md` (existing) |
| UI kit | `../ui-kit/UI_KIT.md` and `Theme/SpreadTheme.swift` |
| Upgrade audit | `UPGRADE_AUDIT.md` |
| References | `REFERENCES.md` |
| Corrections | `corrections.json` and `corrections/` |
| Release checklist | `RELEASE_CHECKLIST.md`, linking [docs/APP_STORE_REVIEW_CHECKLIST.md](../../APP_STORE_REVIEW_CHECKLIST.md) |

## How the evidence is produced

- The landing captures come from a Playwright script that scrolls to four section stops at each width and mode, waits for the scroll-driven states to settle, and saves each stop as a WebP. Overflow, theme, console errors and page height are recorded per combination in the report. Full-page stitching was tried and dropped: the sticky How it works section repeats at each seam, so the stitched image would misrepresent the page.
- Native evidence is not produced here. It requires a candidate SHA, a physical iPhone run, and screenshots from that run.

## Honesty rules used in these files

- A surface is `verified` only with device or test evidence tied to a revision. Currently none is.
- `inspected: true` means the source was opened in this session. Partial reads are `partial`, with the portion stated.
- A correction closes only with changed files, regression evidence and a named reviewer.
