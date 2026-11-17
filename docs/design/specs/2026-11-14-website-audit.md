# Spec: Marketing website audit and fixes (W7)

> Part of the Spread design brain. Start at [../README.md](../README.md). Follow [../PLAN_SPEC_PROTOCOL.md](../PLAN_SPEC_PROTOCOL.md). Save as `docs/design/specs/YYYY-MM-DD-<slug>.md`.

> Summary: audit of the public website (landing page, privacy page, 404) against landing/DESIGN.md and the Gray Matter website workflow. Fixes contrast, no-JS content, page title and description, manifest name, skip link, 404 page, and support link. Owner decisions listed in section 7.

| | |
| --- | --- |
| Request | Finalize the marketing website for App Store review: audit, then fix defects and polish |
| Restated | For App Review and first visitors on phone and desktop: the website's copy, contrast, focus, metadata and error pages must be accurate and work at 390 to 1440 px in light and dark |
| Surface | Landing page (`/`), privacy page (`/privacy.html`), 404; no planner change |
| Size | M |
| Author | Claude Code session, 2026-11-14 |
| Status | Draft, implemented on branch `feat/website-audit-w7-20261114`; not merged; device checks owed |
| Governing docs read | landing/DESIGN.md (Composition, Colors, Modes, Motion, Guardrails); packs/landing-change.md; RULES_CARD.md; PLAN_SPEC_PROTOCOL.md; Gray Matter `app-design/WEBSITE_DESIGN_WORKFLOW.md`, `WEB_PLAYBOOK.md`, `DESIGN_SYSTEM.md`, `DESIGN_TO_BUILD_CONTRACT.md`, `UI_AUTOMATION_AND_EVIDENCE.md`, `SECURITY_AND_RELEASE.md` |

## 1. Problem

A visitor on a phone in dark mode opens thespreadapp.com. Small grey labels are hard to read, the tab title says only "Spread", a mistyped address shows a bare "Not Found", and a visitor without JavaScript sees an empty page. An App Review reviewer needs a working privacy link and a support link, and the installed-app name must be Spread.

## 2. Evidence and context

Measured on a production build (`npm run build`, `vite preview`), Playwright, Chromium, deviceScaleFactor 1.

| Finding | Evidence | Class |
| --- | --- | --- |
| Body text in "How it works" dimmed to about 1.7:1 when a step is inactive | Contrast scan, opacity 0.4 on inactive `li` | Broken |
| Faint grey `--site-faint` at 3.05:1 on paper, 2.3 to 3.4:1 on sage tiles | Contrast scan, light mode | Broken |
| Handwriting on sheet 3.7 to 4.4:1; dark faint 4.0 to 4.35:1 | Contrast scan | Broken |
| Server HTML has no heading or copy; content appears only after JavaScript boots | `curl` of `/` shows an empty `<body>` | Broken for no-JS and non-JS crawlers |
| Page title is "Spread"; description is the tagline | Served `<title>` and `<meta name="description">` | Inconsistent |
| Manifest name is "Grok App" while the page head says "Spread" | `/__grok/manifest.webmanifest` | Broken (installed-app name) |
| Unknown path shows only "Not Found" | Playwright text dump of `/nope` | Broken (error state) |
| No skip link; first Tab lands on the nav | Keyboard check | Inconsistent |
| Footer has no support link; privacy link is an absolute production URL | Source | Inconsistent |
| "Your planning never leaves" conflicts with the export and share features in the privacy policy | Copy against `public/privacy.html` | Inconsistent claim |
| Spread toggle changes its label while also using `aria-pressed` | Source | Polish |
| OG image `https://thespreadapp.com/og.jpg` (1200 by 630) is emitted for the production host | Injector run with `thespreadapp.com` | Verified, no change |
| Week-band "Sep 21 – Sep 27" | Scanner flags it, but the crown is a light gradient | False positive |
| No horizontal scroll at 390, 820, 1024 or 1440; no console errors in four widths, both modes, motion and reduced motion | Playwright | Verified |

Claims checked against the code: profile limit is 10 (`PROFILE_LIMIT`, `src/lib/spread/profiles.ts`); the "Join the TestFlight beta" link is `TESTFLIGHT_URL` set in merged PR #202; the 168-hour grid places 15 hours that sum to the stated role totals. The website makes no claim about Life Wallet Stack, Plan Ahead, focus timer, widgets or Dynamic Island, so nothing in those areas needed checking. No raster images are on the landing page except the 23 KB share card.

## 3. Goals, non-goals and budget

- **Goals:** every body text pair passes 4.5:1 and large text 3:1 in both modes; a no-JS visitor reads the heading and reaches privacy and support; the tab title and description name the product; the installed name is Spread; a 404 explains itself; a keyboard user can skip the nav; copy does not overstate privacy.
- **Non-goals:** no new product claim; no new colors or fonts; no change to the planner, store, sync, backup, cloud or `server/`; no server-side rendering of the landing (owner decision, section 7).
- **Appetite:** one focused PR, about two hours of work.

## 4. Rules that apply and exceptions needed

| Rule (document and section) | How this change touches it |
| --- | --- |
| landing/DESIGN.md "Colors" (fixed brand board) | Faint text uses a darker shade of brand graphite; handwriting uses deeper inks. Both are listed under Exceptions |
| landing/DESIGN.md "Motion" (inactive steps are a focus effect) | The dimming is removed from body text; the active step keeps its blue rule and label |
| landing/DESIGN.md "Guardrails" (copy in founder's voice) | Only existing copy is reused; the new meta description is built from the hero and "How it works" copy |
| RULES_CARD "Boundaries" (no planner change, no `server/`, only `applyTheme` writes `data-theme`) | Nothing in the planner or `server/` changed; no `data-theme` writes added |
| WEBSITE_DESIGN_WORKFLOW "Launch quality" and SECURITY_AND_RELEASE "Experience" | Skip link, focus, contrast, reduced motion, 404 and privacy and support links added or verified |
| Gray Matter "Only approved facts appear" | Website copy changes only tighten existing claims; the new 404 wording makes no product claim |

**Exceptions needed (owner decides, do not assume):**
1. **Faint text colour:** `--site-faint` is now `#5a5650` (light) and `#a39e92` (dark), and the handwriting inks are `#6e5a45` and `#5b6353`. These are shades, not new hues, chosen to pass AA on paper and sage. Confirm, or pick brand values and accept a lower contrast.
2. **Platform script on the public site:** the Grok head chrome still injects `https://grok.com/grok-app-builder/extensions.js` on every page (`scripts/grok-pwa-shared.mjs`). It is a third party that the privacy policy does not name. Not changed here, because it is platform tooling. Recommend removing it for thespreadapp.com.
3. **Privacy policy text:** `public/privacy.html` describes a "beta waitlist" that collects email. That feature is suspended, so the paragraph should be removed or reworded. Legal text is not edited here.
4. **Server-rendered landing:** the landing renders only after the store boots (`hydrated && ready`), so server HTML has no landing copy. This change adds a `<noscript>` fallback only. Full server rendering touches the shared planner boot gate and needs an owner decision.
5. **App Store link:** there is no App Store URL in the repo. The website still links to TestFlight (PR #202). Replace it when the App Store listing exists.

## 5. Options and the chosen concept

Size M: two options.

- **A (chosen):** fix in place. Adjust tokens, remove opacity dimming, add a `<noscript>` fallback, correct metadata, add a 404 component and a manifest name fallback to the site title.
- **B:** server-render the landing. More complete for crawlers, but it touches the shared boot gate and the planner's first paint. Rejected for this PR; listed in section 4.

### Experience and breadboard

- Landing: nav (skip link first) → hero → principle line → How it works (active step by blue rule and label) → week band → story → philosophy → privacy → start → footer (privacy, support, made by).
- No-JS: heading, one line, TestFlight, privacy and support links.
- 404: heading, one line, "Back to Spread" (44 px target).

### Platform behaviour

Widths 390, 820, 1024 and 1440; light and dark; reduced motion on and off; keyboard: skip link is the first Tab stop and appears on focus. Dark mode uses the existing dark block, with `--site-faint` added there.

## 6. Technical approach and verification

- **Where it lives:** `src/styles.css` (landing tokens and the skip link), `src/spread/screens/spread-app.tsx`, `src/spread/components/landing-sections.tsx`, `src/spread/components/landing-stack.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/router.tsx`, `src/lib/error-component.tsx`, `src/lib/og/site.json`, `scripts/grok-pwa-shared.mjs` and its test.
- **Store actions:** none. **Migration:** none. **Flags:** none.
- **Checks run:** `npm run typecheck`, `npm run lint` (0 errors; the 6 warnings are pre-existing and outside these files), `npm run build`, `node --test scripts/grok-pwa-plugin.test.mjs` (48 pass), and Playwright checks at four widths in two modes with reduced motion on and off (no horizontal scroll, no console errors). Contrast was checked in both modes with a scanner (see section 2). The scanner misreads gradients, so the one flagged crown is treated as a false positive.
- **Not tested:** `npm run test:spread` and `npm run test:scripts` as full suites (see the PR), `npm run docs:check` (see the PR), real iPhone or Android Safari, VoiceOver, live production (thespreadapp.com not fetched, because the preview host blocks it and the production build was not deployed), and the TestFlight link itself.

## 7. Owner decisions and open questions

| Question | Default | Owner |
| --- | --- | --- |
| Accept the shade values in section 4, item 1? | Yes | Owner |
| Remove the grok.com extensions script for thespreadapp.com? | Remove | Owner |
| Rewrite the privacy paragraph about the suspended waitlist? | Remove the paragraph | Owner |
| Server-render the landing? | Not now | Owner |
| Replace TestFlight with the App Store link when it exists? | Yes, then | Owner |

## 8. Self-check

- [x] The problem is one story, not a feature list.
- [x] Non-goals are written.
- [x] Governing documents are named and were read.
- [x] No new hue; exceptions are listed.
- [x] Nothing in the planner, store or `server/` changed.
- [x] Acceptance is observable: contrast scan, widths, no-JS text, title, manifest name, 404 text, skip link.
- [x] Owed checks are listed in section 6.
- [x] Every open question has a default and an owner.
