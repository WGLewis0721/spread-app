# Spread design brain

The one place to start for anything about how Spread looks, feels or adapts to a device. It maps every design document, says which one governs which task, and keeps the rules and open decisions that cut across documents in one list.

**Audience:** developers and GenAI agents. If you are an agent, read this file first, follow the router in section 1, then read only the documents it names. Do not look for design guidance anywhere else, and do not create design documents outside this folder.

**Product model, for context:** Responsibilities, then Hours, then Week, then Tasks. Spread is a local-first weekly planner (Capacitor around a React app). The planner and the public landing page have separate design rules.

Last reorganized: 2026-10-28.

---

## 1. Task router: what to read

| If you are doing... | Read first | Then, if needed |
| --- | --- | --- |
| Any planner screen: Week, Spread, Month, sheets, toasts, task rows, the Crown | [planner/SPREAD_DESIGN_SYSTEM.md](planner/SPREAD_DESIGN_SYSTEM.md) | [platforms/APPLE_DESIGN_PRINCIPLES.md](platforms/APPLE_DESIGN_PRINCIPLES.md) |
| The public landing page (`UnlockScreen`, `landing-*` components, "Landing page only" CSS) | [landing/DESIGN.md](landing/DESIGN.md) | Frozen reference `golden/2026-09-28-full-landing-modes` |
| Making the UI feel native to Apple platforms: materials, color, sheets, motion | [platforms/APPLE_DESIGN_PRINCIPLES.md](platforms/APPLE_DESIGN_PRINCIPLES.md) | The Apple pages listed at the end of each device guide |
| iPhone layout, safe areas, dark palette, haptics, drag and drop, App Store screenshots | [platforms/SPREAD_IPHONE_BUILD_GUIDE.md](platforms/SPREAD_IPHONE_BUILD_GUIDE.md) (also the shared baseline for every device) | |
| iPad layout, multitasking, pointer and keyboard | [platforms/SPREAD_IPAD_BUILD_GUIDE.md](platforms/SPREAD_IPAD_BUILD_GUIDE.md) | iPhone guide, sections 1 and 9 |
| iPhone Duo, fold, reserved regions, vertical bars | [platforms/SPREAD_IPHONE_DUO_BUILD_GUIDE.md](platforms/SPREAD_IPHONE_DUO_BUILD_GUIDE.md) | iPad guide |
| App icon, UI action icons, category badges | [brand/ICON_HANDOFF.md](brand/ICON_HANDOFF.md) | Files in `public/icons/` |
| Why a planner behavior exists, or what was verified and what was deferred | [planner/SPREAD_UNIFIED_UX_IMPLEMENTATION.md](planner/SPREAD_UNIFIED_UX_IMPLEMENTATION.md) (spec plus result matrix; historical) | `ROADMAP.md` |
| Wallpaper-driven personalization (Studio) | Section 6 below: it lives on a branch | |
| A change that touches both planner and landing | Both of the first two rows, and keep them separate: landing work never changes the planner | |

If a task fits no row, add one here as part of the change.

---

## 2. Folder map

```
docs/design/
  README.md                     this map (start here)
  planner/                      rules for the app itself
    SPREAD_DESIGN_SYSTEM.md       tokens, patterns, motion, moving things without dragging, rules a change must keep
    SPREAD_UNIFIED_UX_IMPLEMENTATION.md   the Unified UX plan and its PASS/FAIL result matrix
  landing/                      rules for the public site
    DESIGN.md                     brand board, type scale, sections, motion, modes, guardrails
  platforms/                    per device and Apple guidance
    APPLE_DESIGN_PRINCIPLES.md    first principles, materials, color, sheets, what reads as amateur
    SPREAD_IPHONE_BUILD_GUIDE.md  iPhone plus the shared baseline (toolchain, Capacitor, repo rules, dark palette, tests)
    SPREAD_IPAD_BUILD_GUIDE.md    iPad
    SPREAD_IPHONE_DUO_BUILD_GUIDE.md   iPhone Duo
  brand/
    ICON_HANDOFF.md               which icon file is used where (the SVGs stay in public/icons/)
```

| Document | Governs | Status | Authority |
| --- | --- | --- | --- |
| planner/SPREAD_DESIGN_SYSTEM.md | Planner visuals and patterns | Current. Includes the 2026-10-08 HIG polish decisions and the reference lock | Highest for planner UI |
| landing/DESIGN.md | Landing page | Current. Direction `spread-landing-2026-09-28`, frozen as `golden/2026-09-28-full-landing-modes` | Highest for the landing page only. Never use it for planner decisions |
| planner/SPREAD_UNIFIED_UX_IMPLEMENTATION.md | Planner UX pass: undo, Not today, view memory, haptics, free-time suggestion, rollover, offline, status honesty | Historical spec and result record. Section 5 on Duo is superseded by the Duo guide | Evidence of what was verified, not a design authority |
| platforms/SPREAD_*_BUILD_GUIDE.md | Device behavior and submission | Research notes from 2026-10-21 with evidence tags. Several items are recommendations not yet adopted (for example the dark palette in iPhone guide section 6a) | Advisory. `[Repo]` items are binding, `[Apple]` items are facts, `[3P]` and `[Rec]` are leads |
| platforms/APPLE_DESIGN_PRINCIPLES.md | Native feel on Apple platforms | New 2026-10-28. Built from the Materials and Adopting Liquid Glass pages; Sheets read through a mirror | Advisory, subordinate to the planner design system |
| brand/ICON_HANDOFF.md | Icon files and placement | Current | Highest for icon files |

### When documents disagree

1. What ships: `src/styles.css` tokens, `ROLE_COLORS` and hat colors in `src/lib/spread/model.ts`, and the running app.
2. The governing design document for the surface (planner or landing).
3. Repo rules in the device guides (`[Repo]`).
4. Apple documentation (`[Apple]`).
5. Third-party and recommendation items (`[3P]`, `[Rec]`).
6. Historical plans and result records.

A lower item never overrides a higher one. If you find a conflict, fix the lower document in the same change.

---

## 3. Rules that always hold

Collected from [planner/SPREAD_DESIGN_SYSTEM.md](planner/SPREAD_DESIGN_SYSTEM.md), `AGENTS.project.md` and [the iPhone guide section 1](platforms/SPREAD_IPHONE_BUILD_GUIDE.md). Those documents are the source; this list is the quick check.

**Look**
- Do not add colors, fonts or decorative styles. Use a token (`--canvas`, `--elevated`, `--ink`, `--secondary`, `--tertiary`, `--line`, `--fill`, `--accent`, `--on-accent`, `--danger`, `--caution`, `--scrim`, `--shadow`) or reuse a pattern.
- Role colors are data. They mark which role something belongs to and nothing else. Status is never color alone; every state also has words.
- Card is `rounded-3xl bg-elevated`. Touch targets are at least 44 px.
- Week has three distinct kinds of thing: solid day cards, a dashed To place tray, and tinted Free time chips. Nothing that is not a day may look like a day.
- Keep the Crown, the Spread/Week/Month semantics, the hour bank and the quiet default palette (the reference lock).
- Landing: one focal object per section made of real product parts, no gradient meshes, glassmorphism, floating blobs, fake dashboards or stock imagery, keep the founder's copy. Both modes, with dark values in the `[data-site-theme="dark"]` block.

**Behavior**
- A task goes on a day for its own role only.
- Every drag has a tap equivalent and a keyboard equivalent. Anything done by drag, "Not today" or a tap on a day offers Undo.
- Nothing may claim iCloud is working. Cloud behavior stays behind its `cloud.*` flag.
- Motion uses existing classes only. Reduced motion removes movement. Haptics: one light tap on completing a task, iPhone app only.

**Code boundaries**
- All task changes go through `store.ts` actions and `commit`. No second store. Select plain values in selectors, never objects built in the selector.
- No data migration for UI work. Convenience state lives under a key that does not start with `spread.`.
- Landing work never changes the planner. Never modify a `golden/*` branch; branch from it.
- Do not touch: `src/lib/spread/` cloud, sync, backup, merge, restore, pins, consent, safety, rollback, native-mirror and schema files; `ios/App/App/Cloud/**`; `ios/App/SpreadCloudCore/**`; `server/`.

**Verification**
- Check 390, 820 and 1024 wide (add 1366 for iPad and 1440 for the landing page), light and dark, with reduced motion on.
- No horizontal page scroll at any width.
- Typecheck, lint and tests are necessary but not a substitute for visual and device checks. Never mark something done because code exists.
- Add every new test file to the explicit `test:spread` list and raise `--min`.

---

## 4. Open design decisions

Gathered from the documents. Resolve one here and in its source document together.

| Decision | Where it is described |
| --- | --- |
| Completion haptic: light impact (current) or notification success; make haptics optional in-app | [iPhone guide sections 5 and 10](platforms/SPREAD_IPHONE_BUILD_GUIDE.md) |
| Dynamic Type: honor system text size or not | iPhone guide sections 6 and 10 |
| Dark base: `#121212` or true black; surface elevation tokens; dimmed text tokens; role colors measured on the base | iPhone guide section 6a |
| Landing palette in dark mode: give sage, peach and paper dark variants or keep it light only | iPhone guide section 6a |
| Health role color across app, site and film (blue in the app, `#5856D6` in the film; teal `#30B0C7` proposed for the icon set) | iPhone guide sections 8 and 10; [brand/ICON_HANDOFF.md](brand/ICON_HANDOFF.md) |
| Privacy manifest audit (affects review, touches design only through disclosures) | iPhone guide section 10 |
| Material (blur, translucency) in the planner, given the "no glassmorphism" rule | [platforms/APPLE_DESIGN_PRINCIPLES.md](platforms/APPLE_DESIGN_PRINCIPLES.md) section 4 |
| Whether `prefers-reduced-transparency` and `prefers-contrast` work in the WKWebView | APPLE_DESIGN_PRINCIPLES.md section 3 |
| iPad: physical device pass, multiple windows, menu bar and shortcuts, pixel-diff harness | [iPad guide section 9](platforms/SPREAD_IPAD_BUILD_GUIDE.md) |
| Duo: web chrome versus native vertical bars; fold handling for web sheets and the To place tray; fold-state plugin; physical Duo test; Duo screenshots | [Duo guide section 12](platforms/SPREAD_IPHONE_DUO_BUILD_GUIDE.md) |
| Xcode 27.1 final or beta | iPhone guide section 10 |

---

## 5. Where the design truth lives in code

- Tokens and planner styles: `src/styles.css` (`:root`, `[data-theme="dark"]`, and the "Landing page only" block).
- Role colors: `ROLE_COLORS` and hat `color` in `src/lib/spread/model.ts`.
- Theme: `applyTheme` in `src/lib/spread/store.ts` writes `data-theme` (`light`, `dark`, or removed for system). Nothing else may write it.
- Landing: `src/spread/screens/spread-app.tsx` (`UnlockScreen`), `src/spread/components/landing-*.tsx`.
- Icons: `public/icons/`.
- Fonts: `public/fonts/inter-latin.woff2` (Spread Sans).

---

## 6. Studio (wallpaper-driven personalization)

Studio is not on `main`. It is developed on the branch `spread-studio` (draft PR #93) behind the build flag `VITE_SPREAD_STUDIO`, which defaults to off. Its documents are in `docs/spread-studio/` on that branch: product spec, architecture, design amendment, research decisions, wallpaper language, delivery plan and handoff notes.

- When Studio is merged, move `docs/spread-studio/` to `docs/design/studio/` in the same pull request and add its rows to the router and folder map above.
- As documented on that branch, the only design-rule exception is narrow: with the flag on, a validated per-profile appearance may override scoped semantic colors, local system font stacks, material paint and control geometry, all inside `[data-studio-appearance]`. Flag-off output must stay identical to the golden baseline. The exception does not authorize merging, enabling or releasing.
- Studio must follow [platforms/APPLE_DESIGN_PRINCIPLES.md](platforms/APPLE_DESIGN_PRINCIPLES.md): the image decides a tint, a dim, a material thickness and a mode; the layout never changes with the image.

---

## 7. Design-adjacent material that stays where it is

These are not design rules, or they are bound to scripts that write to fixed paths.

| What | Where | Why it stays |
| --- | --- | --- |
| User-testing report, coverage matrix and per-persona screenshots | `user-testing/` | `scripts/e2e/coverage.mjs` reads and writes these paths |
| Launch film workspace (creative direction, production, Remotion sources) | `tools/launch-video/` | Separate workspace with its own tooling and docs |
| Release and App Store process: release plan, roadmap, TestFlight runbook, review checklist and notes | `APP_STORE_RELEASE_PLAN.md`, `ROADMAP.md`, `docs/IOS_RELEASE.md`, `docs/IOS_AUTOMATION.md`, `docs/APP_STORE_REVIEW_CHECKLIST.md`, `docs/APP_REVIEW_NOTES.md` | Process, not design |
| iCloud, beta access, waitlist API, audits | `docs/ICLOUD_PLAN.md`, `docs/BETA_ACCESS.md`, `docs/WAITLIST_API.md`, `docs/audits/` | Data and ops, not design |
| Test plan stubs | `e2e/plans/` | Test tooling |
| Project instructions for agents | `AGENTS.project.md`, `AGENTS.md` | Point here for design |
| Promo status, storyboard and production plan; end-state spec; Studio review | The Claude Project "Spread-app-design" (not in git) | Working documents outside the repo |

---

## 8. Keeping the brain healthy

- New design information goes in this folder, in the document whose scope it matches. If none fits, add a document in the right subfolder and a row to sections 1 and 2.
- Do not put design rules in `AGENTS.project.md`, `README.md` or `ROADMAP.md`. Link here instead.
- Keep file names stable. Other documents and branches link to them.
- Mark claims with the evidence tags used by the device guides: `[Apple]`, `[Repo]`, `[3P]`, `[Rec]`.
- Record a decision in the document it changes, with its date, and remove it from section 4 when it is resolved.
- When a document is superseded, say so at its top and name its replacement. Do not delete the history.
- Each document starts with a link back to this file. Keep it.
- The root `DESIGN.md` is only a pointer to [landing/DESIGN.md](landing/DESIGN.md). Do not add content to it.

### Decision log

| Date | Decision | Where |
| --- | --- | --- |
| 2026-09-28 | Landing direction frozen as `golden/2026-09-28-full-landing-modes` | landing/DESIGN.md |
| 2026-10-08 | HIG polish for the planner: Crown, capacity bar, edit mode, Week empty days, Month Today marker, global arrows | planner/SPREAD_DESIGN_SYSTEM.md |
| 2026-10-21 | Device build guides researched (iPhone, iPad, Duo) | platforms/ |
| 2026-10-27 | Narrow Studio design exception, flag-gated, on the Studio branch only | Section 6 |
| 2026-10-28 | All design documents consolidated under `docs/design/`; Apple design principles added | This file |
