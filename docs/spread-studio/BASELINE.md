# Spread Studio Gate 0 baseline

Recorded on an **unmodified** `spread-studio` tree, before `studio-contract` added any files. This is the comparison point for later Studio pull requests. Durations are from this run and are not a gate. Counts, exit codes, and failing tests are.

## Pins

| Item                                                             | Value                                      |
| ---------------------------------------------------------------- | ------------------------------------------ |
| Date                                                             | 2026-10-25                                 |
| Node                                                             | `v22.23.4` (`node -v`)                     |
| Branch recorded                                                  | `spread-studio`                            |
| HEAD / `origin/spread-studio`                                    | `6b8ec1823e457329592ac5f272e23a7bae08e012` |
| `origin/main` (comparison only; work base stays `spread-studio`) | `d6fb09cbd609e3f9a5a8aea8f0faf60a1ec63012` |
| Working tree                                                     | clean (`git status --porcelain` empty)     |

Docs and code read at that same SHA before the baseline commands: `docs/spread-studio/README.md`, `SPRINT_2026-10-25.md`, `PRODUCT.md`, `ARCHITECTURE.md`, `DELIVERY_PLAN.md`, `RETRIEVAL_PROTOCOL.md`, `AGENTS.project.md`, `docs/design/SPREAD_DESIGN_SYSTEM.md`, `src/lib/spread/cloud-flags.ts`, `src/lib/spread/profiles.ts`, `src/lib/spread/store.ts` (`applyTheme`, `ACCENTS`), `src/styles.css` (light tokens), `scripts/run-tests.mjs`, `package.json` `test:spread`.

No Apple or Capacitor API is called by this baseline. `docs/spread-studio/source-index.json` was not used to verify a platform symbol.

## Command

From the repository root, in order:

```text
npm ci && npm run typecheck && npm run lint && npm run test:spread && npm run test:scripts && npm run build:dev
```

## Results

| Command                | Exit | Tests                                                                       | Failures                                     |
| ---------------------- | ---- | --------------------------------------------------------------------------- | -------------------------------------------- |
| `npm ci`               | 0    | —                                                                           | —                                            |
| `npm run typecheck`    | 0    | —                                                                           | none (`tsc --noEmit` printed no diagnostics) |
| `npm run lint`         | 0    | —                                                                           | 0 errors, 7 pre-existing warnings            |
| `npm run test:spread`  | 0    | **318** (318 passed, 0 failed, 0 skipped) from **40** files; minimum 290    | none                                         |
| `npm run test:scripts` | 0    | **195** (191 passed, 0 failed, **4** skipped) from **9** files; minimum 190 | none                                         |
| `npm run build:dev`    | 0    | —                                                                           | build completed                              |

`test:spread` floor in `package.json` at this SHA: `--min 290`. `test:scripts` floor: `--min 190`.

A later Studio change fails the gate if it adds a failure that is not listed here, or if `test:spread` runs fewer than **318** tests.

## Failing tests

None.

## Skipped tests (pre-existing, not Studio)

All four skips are in `npm run test:scripts`. Node marked each `ok` with `# SKIP`. Reason text, verbatim: `the og skill docs (.grok/skills/og) are platform-owned and not in this repository`.

1. `SKILL.md and AGENTS.md name the marker path and bound this script uses`
2. `the sections that own the brand-task prohibition never affirm a wait`
3. `SKILL.md tells the pass to self-check with the flag this CLI accepts`
4. `every hand-over the og skill prints is one this script accepts`

`test:spread` skipped 0.

## Exact command tails

### `npm ci` (exit 0)

`npm ci` printed deprecation warnings for `recharts@2.15.4` and `eslint@9.39.5`, then:

```text
added 461 packages, and audited 462 packages in 6s

97 packages are looking for funding
  run `npm fund` for details

4 vulnerabilities (1 moderate, 3 high)

To address all issues, run:
  npm audit fix

Run `npm audit` for details.
```

It also printed an npm update notice (`10.9.9 -> 12.2.1`). The audit count is not a test failure. `npm audit fix` was not run.

### `npm run typecheck` (exit 0)

```text
> typecheck
> tsc --noEmit
```

No further output.

### `npm run lint` (exit 0)

```text
> lint
> eslint .


/workspace/e2e/personas/allocate-time.ts
  1:15  warning  'Ctx' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/workspace/e2e/personas/create-plan.ts
  1:15  warning  'Ctx' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/workspace/e2e/personas/unfinished-tasks.ts
   1:15  warning  'Ctx' is defined but never used. Allowed unused vars must match /^_/u            @typescript-eslint/no-unused-vars
  11:20  warning  'page' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

/workspace/src/lib/auth/use-current-user.ts
  59:3  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/rules-of-hooks')

/workspace/src/lib/spread/backup-runner.test.ts
  90:19  warning  'text' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

/workspace/src/spread/components/weekly-view.tsx
  64:9  warning  The 'allocations' logical expression could make the dependencies of useEffect Hook (at line 105) change on every render. To fix this, wrap the initialization of 'allocations' in its own useMemo() Hook  react-hooks/exhaustive-deps

✖ 7 problems (0 errors, 7 warnings)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

### `npm run test:spread` (exit 0)

Node's own summary, then the runner line:

```text
1..318
# tests 318
# suites 0
# pass 318
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2051.244576
run-tests: 318 tests (318 passed, 0 failed, 0 skipped) from 40 files; minimum 290
```

The explicit file list is the `test:spread` script in `package.json` at this SHA (40 files). Individual `ok` lines are omitted here; `# fail 0` and exit 0 are the result.

### `npm run test:scripts` (exit 0)

```text
1..195
# tests 195
# suites 0
# pass 191
# fail 0
# cancelled 0
# skipped 4
# todo 0
# duration_ms 453.717852
run-tests: 195 tests (191 passed, 0 failed, 4 skipped) from 9 files; minimum 190
```

### `npm run build:dev` (exit 0)

Vite 8.3.1 (`vite v8.3.1 building client environment for development...`) reported `[nitro:vercel] Using nodejs22.x runtime` and `[nitro:vercel] Using web entry format`, transformed 2092 modules, and printed a browser-externalized `buffer` import from `docx` plus many `use client` directive warnings from dependencies (`sonner`, Radix). Those warnings did not fail the command. Closing lines:

```text
✓ built in 512ms
ℹ Generated .vercel/output/nitro.json

[nitro] ✔ You can preview this build using npx vite preview
[nitro] ✔ You can deploy this build using npx nitro deploy --prebuilt
```

Nothing was deployed.
