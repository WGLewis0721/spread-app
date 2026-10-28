# Plan and spec protocol

> Part of the Spread design brain. Start at [README.md](README.md) for the map, the rules and what to read for which task.

**Who this is for:** any person or AI tool (Claude, ChatGPT, Grok, Gemini, Codex, Copilot, Cursor) asked to make a plan or spec sheet for a Spread request.
**What it does:** fixes the process and the output, so every tool starts from the same documents and returns the same shape of answer.
**Template to fill in:** [specs/TEMPLATE.md](specs/TEMPLATE.md).

Written 2026-10-28.

---

## 1. Where this comes from

Evidence tags: **[Apple]** read on a developer.apple.com page. **[ShapeUp]** read in Basecamp's Shape Up book. **[Industry]** from a survey of company design-doc templates, not a primary source. **[Repo]** from Spread's own docs. **[Rec]** adapted by me for Spread.

| Practice | Source | How the protocol uses it |
| --- | --- | --- |
| Frame the problem as a specific story before proposing anything | [ShapeUp] Pitch: Problem | Spec section 1 |
| Set the budget up front: "how much time we want to spend", which constrains the solution, rather than estimating afterward | [ShapeUp] Pitch: Appetite | Spec size S, M or L in section 3 below |
| Describe the solution at a level of abstraction that is concrete but does not over-specify the design. Use breadboards (places, affordances, connections) and fat-marker sketches, not high-fidelity mocks | [ShapeUp] Pitch: Solution, Breadboards and fat marker sketches | Spec section 5; tokens carry the visual detail |
| Name rabbit holes and no-gos | [ShapeUp] Pitch | Spec sections 3 and 8 |
| Goals and non-goals, alternatives considered, risks, testing and rollout, open questions | [Industry] Google, Uber, Monzo, HashiCorp and others | Spec sections 3, 5, 8, 9, 10 |
| A mobile design doc adds UI and UX, architecture changes, library dependencies, security, testing and rollout, and accessibility | [Industry] Uber's mobile template | Spec sections 6 and 7 |
| Sketch several distinct directions first (Apple's team narrowed to four: list, grid, map, gallery) instead of starting from one idea | [Apple] WWDC14 session 223 | Spec section 5: at least three options for size L |
| Before prototyping ask: what needs to be more real, what can we fake, where will they use it | [Apple] WWDC14 session 223 | Spec section 9 prototype plan |
| When showing people ask: do you know how to do this, is it easy, how can we make it better. Do not argue or defend | [Apple] WWDC14 session 223 | Spec section 9 test questions |
| Prototypes are cheap and disposable; fidelity matches the question; test on the target device in the target environment | [Apple] WWDC14 session 223 | Spec section 9 |
| Apple's design resources are organized as learn the principles, read the HIG, gather the toolbox (SF Symbols, templates), prototype, then draw on community examples. It is not a strict linear process | [Apple] Design Pathway | The map links the Apple pages to read |

Not read, so not relied on: WWDC25 "Design foundations from idea to interface" (359), WWDC17 "Essential design principles" (802) and WWDC18 "The qualities of great design" (801). The Design Pathway lists them. Read them before extending this protocol.

---

## 2. The process (follow in order)

1. **Restate the request in one sentence**, including who it is for and on which surface (planner, landing page, a device). If you cannot, ask the owner one question. Otherwise do not ask; write your assumption in the spec and mark it `[Assumption]`.
2. **Read the map:** [README.md](README.md). Use its router (section 1) to pick the governing documents. Read them. Do not rely on memory of Spread; the documents change.
3. **Classify the size** (section 3 below). It sets how much of the template to fill in.
4. **Frame the problem and the budget.** One concrete story, then the non-goals.
5. **List the rules that apply** from README section 3 and the governing documents, and say which part of the request touches each. If the request needs something a rule forbids (a new color, font, decorative style, glass or blur in the planner, a change to a do-not-touch path), do not quietly design around it. Write it under "Exceptions needed" for the owner to decide.
6. **Explore options** (size L: at least three distinct directions; size M: two). Distinct means different structure or interaction, not different colors. Describe each in a few lines, then choose one and say why. Record the rejected ones.
7. **Describe the experience** as a breadboard: the places (screens, sheets, states), the affordances in each, and how they connect. Add every state: empty, loading, error, overflow, offline, first run, undo.
8. **Describe the platform behavior:** widths, orientation, safe areas, Dark Mode, Dynamic Type or text zoom, Reduce Motion, Reduce Transparency, Increase Contrast, VoiceOver, haptics, tap and keyboard alternatives for any drag.
9. **Describe the technical approach:** where the change lives, which store actions it uses, what it must not touch, whether it needs a flag, no data migration for UI work.
10. **Write acceptance criteria** a person can observe, and the verification plan from README section 3.
11. **Plan the prototype and the test.** Say what must be real and what can be faked, where it will be used, and the three questions to ask a tester.
12. **List risks, rabbit holes and open questions,** each with a proposed default and who decides.
13. **Run the self-check** in section 5 below, then deliver.

---

## 3. Size

| Size | When | Fill in |
| --- | --- | --- |
| **S** | A tweak inside an existing pattern: copy, spacing within a token, one state | Sections 1, 4, 7, 9 and the self-check. One page at most |
| **M** | A new behavior or a new use of an existing component | Sections 1 to 10, two options |
| **L** | A new screen or component, anything touching several surfaces or devices, anything that proposes an exception to a rule | Everything, at least three options, a prototype plan and a rollout and rollback plan |

If unsure, choose the larger size.

---

## 4. Output contract

- One Markdown document that follows [specs/TEMPLATE.md](specs/TEMPLATE.md) heading for heading. Keep the numbering so reviewers can compare specs.
- Cite the document for every rule you rely on, by path and section, for example `planner/SPREAD_DESIGN_SYSTEM.md` "Rules a change must keep".
- Use only existing tokens (`--canvas`, `--elevated`, `--ink`, `--secondary`, `--tertiary`, `--line`, `--fill`, `--accent`, `--on-accent`, `--danger`, `--caution`, `--scrim`, `--shadow`) and existing patterns. Never invent a hex value, a font or a token name. If a value is missing, say so under open questions.
- Mark every claim with an evidence tag when it is not from this repo: `[Apple]`, `[3P]`, `[Rec]`. Mark guesses `[Assumption]`.
- Say what was not checked. Do not write that something works, passes or ships unless it was run.
- Do not write code in a spec unless a few lines are needed to remove ambiguity.
- No em dashes. Plain, direct sentences.
- **Where to save:** `docs/design/specs/YYYY-MM-DD-<short-slug>.md`. A tool that cannot write to the repository returns the spec as one Markdown block and says the owner should save it at that path.
- If the spec records a decision, also update the document the decision changes and the decision log in [README.md](README.md) section 8.

---

## 5. Self-check before delivering

- [ ] The problem is one specific story, not a feature list.
- [ ] Non-goals and rabbit holes are written.
- [ ] Every governing document is named and was actually read.
- [ ] No new color, font or decorative style appears, unless listed under Exceptions needed.
- [ ] A task still goes on its own role's day only; every drag has a tap and keyboard path; Undo is covered; nothing claims iCloud works.
- [ ] Every state is described, including empty, error and offline.
- [ ] Widths 390, 820, 1024 (and 1366 for iPad, 1440 for the landing page), both modes, and the accessibility settings are in the verification plan.
- [ ] Acceptance criteria are observable, not "code exists".
- [ ] Device checks that cannot be done in a browser are listed as owed.
- [ ] Open questions each have a default and an owner.
- [ ] Nothing in the do-not-touch list is modified, and the landing page and planner are not mixed.

---

## 6. Handing off to implementation

- A spec is not approval to merge. Release authority stays with the owner (README section 3, Code boundaries).
- Implementation follows the repo flow: a branch, focused tests added to the explicit lists, the checks in README section 3, and a pull request into `main`.
- Prototype first when the open question is about feel (a gesture, a transition, how a sheet behaves). Throw the prototype away; write the real version afterward [Apple].
- When the work lands, update the governing documents and the map in the same change.
