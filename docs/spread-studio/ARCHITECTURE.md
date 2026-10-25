# Spread Studio — proposed technical architecture

**Status:** design only. Baseline `main@d6fb09c`, 2026-10-25. Verify again against the implementation branch before coding. Keep React/Zustand planner authoritative; do not implement native task database migration just for appearance.

## 1. Verified code seams

- `src/lib/spread/model.ts`: `SpreadData` has hats, weeks and currentWeek; tasks are within boxes. `Hat.defaultHours`, `Allocation.day/hours` are not clock-based calendar events. Do not invent due dates, recurring shifts or event scheduling.
- `src/lib/spread/profiles.ts`: profile roster max 10, per-profile `theme: system|light|dark`, optional accent, explicit parse/serialization. Unknown new profile fields are currently discarded by parsing.
- `src/lib/spread/store.ts`: `applyTheme` controls `data-theme`, `applyAccent` uses CSS variables; existing planner state/actions remain the authority.
- `src/styles.css` and `docs/design/SPREAD_DESIGN_SYSTEM.md`: shipped semantic tokens and planner interaction constraints; no general-purpose appearance system exists.
- `src/lib/spread/native-mirror.ts`: authoritative planner is WKWebView `localStorage` with two alternating local Library snapshots for recovery; mirror is **not** an externally mutable transaction database.
- `src/lib/spread/backup.ts`, `src/lib/spread/schema.ts`, `docs/ICLOUD_PLAN.md`: separate backup, migrations and optional cloud sync contracts. Verify all before persisting a new setting.
- `src/lib/spread/view-context.ts`: per-profile convenience view stored outside the planner `spread.*` namespace; illustrates that not all local settings are automatically in backups.
- `src/lib/spread/native.ts`: lazy native Capacitor helpers; iOS target 17.0, Capacitor 8.5.1 in `package.json` and the Xcode project.

## 2. Deliberately separate components

~~~text
User: photo/controls/typed request/Siri
    │
    ├── Manual Studio controls ─────────────────┐
    ├── Local deterministic palette sampler ───┤
    └── [optional] Swift Foundation Models ────┤ (structured proposal only)
                                                ▼
                         Appearance proposal validator
                         range limits / accessibility checks
                                                ▼
                        Live preview → user Apply/Cancel
                                                ▼
             Appearance state & local image asset registry
                                                ▼
               Shared React Spread visual renderer
                                                │
              Existing planner state remains untouched

[Later optional] Siri/App Intent → foreground Studio screen / validated handoff
[Later optional] Widget/Focus/icon adapters; not dependencies of Studio.
~~~

**Canonical code decision (2026-10-25):** The single proposed Gate 0 code contract is [draft PR #81](https://github.com/WGLewis0721/spread-app/pull/81), `src/lib/spread/studio/contract.ts`, type `StudioAppearanceV1`. [PR #80](https://github.com/WGLewis0721/spread-app/pull/80) and its plural `contracts.ts` were superseded and closed. The earlier sketch in this document is historical and is **not an implementation schema**: #81 uses a different validated range for wallpaper positions, more restrictive typography/control identifiers, and distinct typed asset/AI/Siri structures. Follow #81's actual code after review, not the sketch. #81 is unmerged and awaits review/approval. Expand limited appearance primitives in its single contract through reviewed subsequent PRs; never create a second schema.

## 3. Appearance contract, not premade theme packs

Model **user-created** settings over a bounded renderer. The following is illustrative TypeScript, not an implemented API:

~~~ts
type AppearanceV1 = {
  version: 1;
  id: string;                  // user-created ID
  name: string;                // user-editable
  mode: "system" | "light" | "dark";
  wallpaperAssetId?: string;   // sandbox asset, never remote URL
  wallpaper: { fit: "cover" | "contain"; positionX: number; positionY: number; dim: number; blur: number };
  palette: { accent: string; surface: string; text: string; secondaryText: string };
  material: { treatment: "flat" | "glass" | "matte" | "metal"; transparency: number; depth: number };
  typography: { presetId: string; scale: number; numeralEmphasis: number };
  controls: { density: "comfortable" | "compact"; treatmentId: string };
  effects: { decorationIntensity: number; animationIntensity: number };
};
type DraftAppearance = {
  baseAppearanceId?: string;
  proposed: AppearanceV1;
  explanation?: string;
  warnings: string[];
};
~~~

**Use an allowlisted schema**, typed validation and numeric bounds. Do not accept model-produced CSS selectors, arbitrary property names, SVG scripts, JavaScript, executable modules, font URLs, remote image URLs or new React components. Unrecognized fields fail or fall back safely. Limit asset size, megapixels, memory and rendering cost.

Maintain `data-theme` for light/dark/system; use a separate Studio-specific attribute or style scope, e.g. `data-studio-appearance`, for the selected user appearance. Avoid direct uncontrolled inline overrides to root tokens that persist across profile switches. A single token resolver maps user settings to tested semantic variables/approved component variants, then resolves accessible contrast and role/status colors. The source image should not become the sole indicator of state.

**Component policy:** same Week/Spread structure, responsibilities, task actions, hour banks, crown, drag/tap/keyboard controls, undo and focus semantics. Materials, surfaces, type presets, decoration and bounded card presentation can vary through shared components. Variants must be meaningful and finite even though combinations of settings are user-created. Theme choice must not alter planning data.

**Design-rule conflict:** existing `AGENTS.project.md` and `docs/design/SPREAD_DESIGN_SYSTEM.md` forbid new colors/fonts/decorative styling. A Studio implementation must include a narrowly scoped, owner-reviewed amendment defining Studio-only token overrides and safeguards. Research documentation alone does not override the current rule.

## 4. Image acquisition, durability and privacy

- Prefer system Photos picker / user-initiated Files selection. Do not request broad library permission just to choose a photo; verify platform implementation.
- Strip unnecessary metadata and orientation problems, transcode/crop to bounded local derivatives; avoid decoding full-resolution images in every frame.
- Store user image bytes in an app-managed sandbox location (iOS: appropriate app data directory through a tested Capacitor/native adapter; web: IndexedDB/Blob or other suitable persisted asset store). **Do not put image data URI/base64 into planner `localStorage`.**
- Appearance metadata references assets by stable opaque ID. Validate path resolution against traversal/injection; never render untrusted HTML.
- Decide backup policy explicitly. The current native mirror only captures selected localStorage keys and does not back up arbitrary image files. A .spread export must not claim to include images until it really does; a missing image gracefully falls back to a neutral canvas.
- Separate temporary draft, committed appearance, and user-created named saved appearances; atomic metadata writes and rollback on failed asset persist. Removing a wallpaper deletes orphaned local files after references are checked.
- Existing per-profile theme/accent semantics remain compatible; decide a versioned migration path and check `parseProfiles`, full backup/restore and iCloud sync for settings without overwriting existing preferences.
- No automatic cloud image upload, personal image analytics, external image URL fetch, third-party generative AI or public sharing. Any future iCloud image sync requires separate opt-in/feature gate and privacy/storage design.
- On local/web failure: show durable save failure and keep the uncommitted preview; never silently claim it was saved.

## 5. AI assistant = configuration interpreter

**Native integration:** small Swift service behind a typed Capacitor plugin in installed iOS app; capability probe checks OS, eligible device, enabled/downloaded local model, supported language/region and model availability. The iOS 17 baseline keeps manual controls running; Foundation Models is an optional higher-OS path. Web build has no native AI dependency.

**Data flow:** user's typed description plus allowlisted current settings (and optional locally derived wallpaper palette) → explicit *on-device* `SystemLanguageModel` session → constrained structured proposal → TypeScript/Swift schema validation → live preview → Apply/Cancel. Revisions are separate from the committed appearance until user approval. Never give the model write-capable tools in the first release. Allow cancellation/refusal/timeouts and bounded input/output. Avoid logging raw prompts, images or private planner data.

Foundation Models in recent OS versions offers additional model providers and Private Cloud Compute routes; **explicitly select the local model** for a no-server promise. The local language model can interpret requests and generate structured values, but does not design arbitrary executable UI or magically generate branded/character artwork. Color extraction from user photos can be deterministic and local; optional on-device image interpretation requires a separately tested capability, not an implicit guarantee. Image Playground is a distinct, potentially server-side feature and is **out of scope**.

Sample: 'Make it look like my Falcons wallpaper: bold red, black graphite, dim background, shiny metal buttons' → suggested numeric/enum controls, not a downloaded official NFL theme. User may change any value manually.

## 6. Siri, Shortcuts and iOS surfaces

**Separate capabilities**: (1) basic App Intents/Shortcuts, (2) local Foundation Models in Spread, (3) newer Siri AI/App Schemas, which have distinct availability and beta constraints. Never claim all Siri requests run entirely offline.

Phase 4 first delivers supported foreground App Intents for **opening the Studio** and optionally carrying a bounded appearance instruction to the live UI. Cold starts, cancellation and app-readiness must be tested. A foreground intent is not permission to mutate React `localStorage` while no WebView exists.

A native **pending-request inbox** is only an evaluation candidate. If later adopted: random command ID, schema version, target profile, expiry, staged/processed/failed statuses, persisted deduplication receipts and truthful responses ('saved for review', not 'applied'). There is no atomic transaction across WebView storage and a separate queue: design retries and restore interactions explicitly. Avoid runtime Siri access to planner tasks in Studio scope.

Matching alternate **bundled** app icons, optional Focus-based view/appearance selection and widgets require their own native design; alternate icons cannot be arbitrary runtime images. Focus must not mutate planning data. Widgets require native-readable, privacy-scoped snapshots and do not read arbitrary React DOM or WKWebView localStorage.

A real native transactional task database becomes an option **only after** product approval for independent background task CRUD, with migration/recovery/conflict testing—not part of the four Studio milestones.

## 7. Security/performance/error contracts

- Validate all image formats, MIME/content consistency, dimensions and byte caps; reject external URLs and untrusted scriptable SVG as a wallpaper input.
- No storing user credentials, API keys or broad AI inference endpoints; preserve local-first mode.
- Data minimized for AI; no background collection of personal content for aesthetic guesses.
- Require accessible fallback for uncontrolled color contrast and blurred/transparent layouts.
- Persist draft/commit distinction, preserve recent appearance for reset, and keep images referenced after restore only where they exist.
- Test low-storage, app kill, interrupted import, simultaneous profile switching, restore, orphan cleanup, huge image memory, unsupported hardware, VoiceOver, dynamic text, reduced motion/transparency and light/dark transitions.

See [DELIVERY_PLAN.md](DELIVERY_PLAN.md) for proof requirements and [RETRIEVAL_PROTOCOL.md](RETRIEVAL_PROTOCOL.md) for source-grounding policy.
