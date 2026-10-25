# Spread Studio — launch instructions for the five Grok bots and Claude

**2026-10-25.** This document supplies ready-to-use external-agent commands. ChatGPT created the GitHub branches and issues but **did not directly invoke Grok or Claude**. No issue should be treated as assigned to or running in an external provider until manually launched and acknowledged.

## Copy to the five-bot Grok team orchestrator

> Implement all four planned Spread Studio milestones using five independent coding bots in parallel. Repository: `WGLewis0721/spread-app`. Reference branch: `spread-studio`; main/golden are protected. Start by reading `docs/spread-studio/README.md`, `SPRINT_2026-10-25.md`, `PRODUCT.md`, `ARCHITECTURE.md`, `DELIVERY_PLAN.md`, `RETRIEVAL_PROTOCOL.md`, plus `AGENTS.project.md`; inspect the actual code and relevant tests before implementing. Do not invent APIs or claim untested features. The user explicitly rejected premade themes; build user-controlled image/background, colors, surfaces, materials, typography and optional local AI assistance.
>
> Assign: Bot 1 issue #72 to branch `studio-g1-studio-ui` (UI and previews); Bot 2 issue #73 to `studio-g2-asset-storage` (image handling, palette, persistent settings); Bot 3 issue #74 to `studio-g3-renderer` (appearance renderer, accessibility); Bot 4 issue #75 to `studio-g4-apple-ai` (Swift Foundation Models bridge, actual local model, fallbacks); Bot 5 issue #76 to `studio-g5-siri` (foreground App Intents, Shortcuts, proper lifecycle). Do not edit another bot's owned modules without coordinating interface changes. Each bot creates a **draft PR targeting `spread-studio`**, including tests, visual evidence if applicable, flags and rollback. Do not merge anything or deploy without express owner authorization.
>
> Coordinate types early: versioned `AppearanceV1`, `AssetRef`, `StudioDraft`, `AIAvailability`, `StudioIntent`. Reuse React/Zustand planner and current local-first storage. Artwork stays local; no image data in localStorage; no AI-generated JS/CSS; model proposals cannot auto-save. Preserve existing `data-theme` for system/light/dark. Native features must build only on applicable devices/OS; manual Studio works on all supported devices. Resolve existing design-system constraints through a proposed explicit amendment, not a silent violation.
>
> Delivery order is G2 + G3 contract → G1 real-screen composition → phase 1/2 integration → G4 proposal bridge → G5 Siri → QA. The completion gates are user-visible and verified, not merely code written. Run `npm run test:spread`, `npm run typecheck`, `npm run lint`, relevant web/iOS builds; compare with baseline. Require device testing for actual local model and Siri claims. Report every bot's PR, test results and blockers. Nothing in this prompt authorizes merge or deployment.

## Copy to Claude (independent principal reviewer)

> Review an accelerated implementation of Spread Studio in `WGLewis0721/spread-app` across GitHub issues #72–#76 and their draft PRs. Use issue #77 for your independent review and integration gate report. Read current main, `AGENTS.project.md`, all `docs/spread-studio/*` source-grounding rules, existing `profiles.ts`, `store.ts`, `model.ts`, `native-mirror.ts`, `backup.ts`, `schema.ts`, `src/styles.css`, current tests and Apple/Capacitor official docs. Detect conflicts between the bots' contracts and Xcode project edits. Inspect exact diffs and test logs. Do not invent pass/fail evidence. Do not merge or deploy. Deliver: PR-by-PR changes requested, data integrity and security findings, actual visual fidelity against user-controlled (not premade) customization, test/physical-device matrix, proposed integration order and a reasoned go/no-go for 25%, 50%, 75%, and 100% gates. Require new explicit owner authorization before merges/deployments.

## Links

- [Coordination and roles](SPRINT_2026-10-25.md)
- [Studio master plan](DELIVERY_PLAN.md)
- [Issue #72: UI](https://github.com/WGLewis0721/spread-app/issues/72)
- [Issue #73: Assets and persistence](https://github.com/WGLewis0721/spread-app/issues/73)
- [Issue #74: Visual renderer](https://github.com/WGLewis0721/spread-app/issues/74)
- [Issue #75: Apple local AI](https://github.com/WGLewis0721/spread-app/issues/75)
- [Issue #76: Siri integration](https://github.com/WGLewis0721/spread-app/issues/76)
- [Issue #77: Claude reviewer](https://github.com/WGLewis0721/spread-app/issues/77)

## Source and truthfulness gate

Branches and issues prepared does not mean bots executed; PRs opened does not mean tests passed; passing unit tests does not mean native APIs operated on a physical device. When hardware/OS/model are unavailable, mark phase 3/4 hardware evidence **blocked**, preserve the code as gated draft work, and never mark 100% complete until the agreed acceptance evidence exists.

