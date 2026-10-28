# Pointing AI tools at the design brain

> Part of the Spread design brain. Start at [README.md](README.md) for the map, the rules and what to read for which task.

Goal: any AI tool asked to plan or spec a Spread request reads the map, follows [PLAN_SPEC_PROTOCOL.md](PLAN_SPEC_PROTOCOL.md), and returns a spec in the [template](specs/TEMPLATE.md) shape.

There are two kinds of tool. Tools that **work inside the repository** read an instruction file automatically. Chat apps **do not see the repository**; they only know what you paste or attach.

Vendor features change. The file names below are the conventions each vendor documents as I know them; I did not re-verify them against current vendor documentation on 2026-10-28. Re-check when a tool stops following the instructions.

---

## 1. Tools that work inside the repository

Each of these files carries the same generated copy of the rules card ([RULES_CARD.md](RULES_CARD.md)), so the rules are in the tool's context from the first message without reading anything. The card points to the map, the protocol and the packs. Edit the card, then run `npm run docs:sync`; never edit the copies.

| Tool | Reads | What is in the repo |
| --- | --- | --- |
| Claude Code | `CLAUDE.md` | Pointer plus the generated rules card |
| Gemini CLI and Gemini Code Assist | `GEMINI.md` | Pointer plus the generated rules card |
| GitHub Copilot (chat, coding agent) | `.github/copilot-instructions.md` | Pointer plus the generated rules card |
| Codex, Cursor, Grok Build and other tools that read `AGENTS.md` | `AGENTS.md`, which tells them to follow `AGENTS.project.md` | Already in place |

Note on `AGENTS.md`: it is the Grok App Builder's generated contract and the platform may rewrite it. Do not put Spread rules in it. Its line "If `AGENTS.project.md` exists, it holds the user's project instructions" is what connects those tools to Spread.

---

## 2. Chat apps (ChatGPT, Claude.ai, Gemini, Grok)

They cannot read the repository unless you connect it. Do one of these, in order of reliability.

1. **Put the preamble below in the tool's standing instructions** so it applies to every request: a custom GPT's or ChatGPT Project's instructions, a Claude Project's instructions, a Gemini Gem's instructions, or Grok's custom or project instructions if it offers them.
2. **If the tool can fetch web pages,** the preamble's links work as they are. The repository is public, so the raw URLs resolve.
3. **If it cannot fetch pages,** attach `docs/design/RULES_CARD.md`, `docs/design/README.md`, the one pack for the request from `docs/design/packs/`, and for a spec `docs/design/specs/TEMPLATE.md`, as files, or paste them.
4. **Per request,** start with one line: `Plan this using the Spread design brain protocol:` followed by your request.

A tool that skips the reading step will produce a generic answer. The preamble tells it to say when it cannot fetch the documents, instead of guessing.

### Preamble (copy everything in the block)

```text
You are helping plan and spec work for Spread, a local-first weekly planner for iPhone and iPad
(Capacitor around a React app). The repository is github.com/WGLewis0721/spread-app.

When I ask for a plan, spec, design, redesign or UI review, do this before anything else:

1. Fetch and read, in this order, and stop as soon as you have what you need:
   - https://raw.githubusercontent.com/WGLewis0721/spread-app/main/docs/design/RULES_CARD.md (the rules, about 2 KB)
   - https://raw.githubusercontent.com/WGLewis0721/spread-app/main/docs/design/README.md (the map; use its task router, section 2)
   - the one pack the router names for my request, from .../docs/design/packs/ (for a plan or spec: spec-writing.md)
   - for a spec, also .../docs/design/specs/TEMPLATE.md
   Open a longer document only for the section the pack points to. Token values are in
   .../docs/design/tokens.json. The documents live under docs/design/ in the same repository;
   relative links in them resolve from there.
2. If you cannot fetch them, say so plainly and ask me to paste them. Do not answer from memory
   of Spread or of Apple's guidelines.
3. Follow the protocol's process and return one Markdown spec that follows TEMPLATE.md heading for
   heading. Cite the document and section for every rule you rely on.
4. Use only existing design tokens and patterns. Never invent a color, font, token or decorative
   style. If my request seems to need one, list it under "Exceptions needed" for me to decide.
5. Ask me at most one question, and only if you are blocked. Otherwise state your assumption
   and mark it [Assumption].
6. Say what you did not check. Do not claim anything works or passes unless it was run.
7. Write plainly, without em dashes.
```

---

## 3. Keeping it working

- Change the rules in one place: [RULES_CARD.md](RULES_CARD.md), then `npm run docs:sync`. Chat apps use this file's preamble instead. The pointer files stay a few lines plus the generated block.
- The docs check (`npm run docs:check`, also in `npm run test:scripts` and CI) fails if a link or pack pointer is broken, a design document is missing from the map, a copy of the card is stale, `tokens.json` is stale, or a tier is over its size budget.
- If a tool ignores the instructions, test it with a small request such as "spec a new empty state for the Week tray" and check that the answer names the documents it read.
