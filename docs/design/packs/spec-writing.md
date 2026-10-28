# Pack: writing a plan or spec

> Part of the Spread design brain. Start at [../README.md](../README.md). Tier 2 pack: a digest, not the source. The rules card applies on top.

**Use when:** you are asked for a plan, spec sheet, redesign, UI review or "how should we do X". Output goes to `docs/design/specs/YYYY-MM-DD-<slug>.md`. A chat tool without file access returns one Markdown block and says where to save it.

## Facts to work from

**Process (short form).**
1. Restate the request in one sentence: who, which surface (planner, landing page, a device). Ask the owner one question only if blocked; otherwise write an `[Assumption]`.
2. Read the rules card, the map, then the pack for the surface. Open a long document only by the section the pack names.
3. Pick a size. S: a tweak inside a pattern, one page. M: a new behavior or new use of a component, two options. L: a new screen, several surfaces, or any exception to a rule, three distinct options plus prototype and rollback plans. If unsure, take the larger.
4. Frame the problem as one specific story, then non-goals and an appetite (what it is worth).
5. List the rules that apply and which part of the request touches each. If the request needs a new color, font, decorative style, blur or glass in the planner, or a do-not-touch path, put it under "Exceptions needed" for the owner. Never design around it silently.
6. Options: distinct means different structure or interaction, not different colors. Choose one, record the rejected ones and why.
7. Breadboard: places (screens, sheets, states), affordances, connections. Every state: empty, first run, loading, error, overflow, offline, undo, refused action.
8. Platform: widths, orientation, safe areas, appearance, accessibility settings, VoiceOver, input, haptics, a tap and keyboard path for every drag.
9. Technical approach: where it lives, store actions, flag and default, what it must not touch, dependencies, what leaves the device.
10. Acceptance criteria as observable "Given, when, then". Verification plan. Device checks listed as owed.
11. Prototype plan when feel is the question: what must be real, what can be faked, where used, three tester questions (do you know how to do this, is it easy, how can we make it better). The prototype is thrown away.
12. Risks, rabbit holes and open questions, each with a default and an owner.
13. Self-check, then deliver.

**Output contract.** Follow `specs/TEMPLATE.md` heading for heading and keep its numbering. Cite document and section for every rule. Use only existing tokens and patterns; never invent a hex value, font or token name. Tag non-repo claims `[Apple]`, `[3P]`, `[Rec]` and guesses `[Assumption]`. Say what was not checked; do not claim anything passes unless it was run. No code unless a few lines remove ambiguity. No em dashes. A spec is not approval to merge.

**Self-check.**
- [ ] The problem is a story, not a feature list; non-goals and rabbit holes written.
- [ ] Every governing document named was actually read, by section.
- [ ] No new color, font or decorative style, unless listed under Exceptions.
- [ ] A task stays on its own role's day; every drag has a tap and keyboard path; Undo covered; nothing claims iCloud works.
- [ ] Every state described; widths and both modes in the plan; accessibility settings listed.
- [ ] Acceptance criteria are observable, not "code exists".
- [ ] Device checks that need hardware are listed as owed.
- [ ] Open questions each have a default and an owner.
- [ ] Nothing in the do-not-touch list is modified; planner and landing page are not mixed.

## Read deeper only if needed
- `PLAN_SPEC_PROTOCOL.md#1. Where this comes from`: the sources behind each step.
- `PLAN_SPEC_PROTOCOL.md#3. Size`: what to fill in for S, M and L.
- `PLAN_SPEC_PROTOCOL.md#4. Output contract`: the full output rules.
- `specs/TEMPLATE.md#5. Options and the chosen concept`: the options and breadboard shape.
