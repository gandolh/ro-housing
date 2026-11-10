# Task 22: The house style and the quality harness

**Depends on:**

- In ro-housing: brief 21, so the lockfile of `web/` is already rewritten.
- In the owner's skills library:
  - brief 27, *A house style, and a quality harness that enforces it*: the `house-style` package at `v1.0.0`, the `house-style` skill, and the plugin's `Stop` and `PostToolUse` hooks;
  - brief 15, *Enforce the base-ui and code-structure skills in every repo*: how the convention checkers are wired and when they run `--warn-only`.
- The owner's grilling of 2026-11-10, questions Q5-Q14 and Q47-Q51 of the skills library's open questions. Q9 (the outliers move to the house format) and Q51 (one estate width) are unanswered; this brief builds their defaults.

**Runs before:** 23, 24 and 25. The reformat touches about 112 files, and the later briefs rewrite or move most of them. Formatting first gives one clean reformat commit.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

On 2026-11-09 the owner made three calls for every web app they own: Base UI 1.9.0, the whole app on Tailwind v4, and the researched conventions enforced in each repo. The skills library's brief 27 found the house style consistent but unenforced, and answers with a two-layer harness: the repo's gate (`npm run check`, with `check:fast`) and the Claude Code layer (a `Stop` hook, a `PostToolUse` formatter, `.claude/rules/`, a root `CLAUDE.md`).

ro-housing is an outlier on three counts: single quotes, `.ts` import suffixes, and **no root `package.json`**. It also holds two npm projects, `api/` and `web/`, so the gate has to run across both.

### What the repo has today (read 2026-11-10)

- **Two independent npm projects**, each with its own `package.json`, `package-lock.json` and `.npmrc` (`save-exact=true`). [docs/architecture.md](../../../docs/architecture.md) says "Two independent npm packages. No monorepo tooling ... Intentional", and the deploy builds `web/` on its own (`npm ci`, `npm run build` in `web/`) while `infrastructure/Dockerfile` copies only `api/`. So npm workspaces are out.
- **`node_modules` are installed** in both (140 and 75 entries). The scratch measurements below used `npm ci --ignore-scripts` plus `npm rebuild better-sqlite3`.
- **Scripts:** `api` has `dev`, `build`, `start`, `seed`, `test`, `test:watch`, `postinstall`. `web` has `dev`, `build` (`tsc -b && vite build`), `preview`, `test`, `test:watch`. Neither has `typecheck`, `lint` or `format`.
- **`api/tsconfig.json`** includes tests (`src/**/*`), with `module: ESNext`, `moduleResolution: Bundler`, `allowImportingTsExtensions`, `noEmit`, `strict`, `noUncheckedIndexedAccess`. `api/tsconfig.build.json` excludes tests and adds `rewriteRelativeImportExtensions`, so `src` imports of `./app.ts` become `./app.js` in `dist/`. **No script typechecks the API's tests**: `build` uses the build config. It is clean today (0 errors with `tsc -p api --noEmit`).
- **`web/tsconfig.json`** is the same shape plus `jsx`, and includes only `src`, so `web/vite.config.ts`, `web/vitest.config.ts` and `api/vitest.config.ts` are in no tsconfig.
- **No ESLint, no Prettier, no knip, no root `CLAUDE.md`, no `.claude/`.** The only `CLAUDE.md` is [corpus/CLAUDE.md](../../CLAUDE.md).
- **`.gitignore` ignores `.claude`** (the `issues/`, `.claude`, `.agents` block). Rules and settings under `.claude/` would stay untracked until that line changes.
- **Tests:** vitest. `api` 20 files, 244 tests, 3.3 s. `web` 12 files, 79 tests (happy-dom), 8 to 13 s. Neither needs a build first, so no `pretest` is needed.

### Measured on 2026-11-10

Scratch copy, Prettier 3.9.10, typescript-eslint 8.72.2, ESLint 9.39.5, TypeScript 6.0.3 from the repo. 120 tracked TypeScript, JavaScript, CSS, JSON and HTML files outside `vendor/`, test fixtures and `docs/` (11,363 lines). The measuring scripts were throwaway Node and shell scripts; the step 1 commands below reproduce each count.

**Prettier churn** (lines added plus lines removed, `trailingComma: "all"`, other settings default, so double quotes and semicolons):

| `printWidth` | Changed lines | Files |
|---|---|---|
| 100 | 6,560 | 113 |
| 120 | 6,674 | 112 |
| 130 | 6,837 | 112 |
| 150 | 6,902 | 112 |

Almost all of it is the quote swap: 361 imports are single-quoted and none is double-quoted (`grep -rhE "^import .* from '" api/src web/src | wc -l`), and nearly every file holds a string. The width-only cost, with `--single-quote` kept, is far smaller:

| `printWidth` | Changed lines | Files |
|---|---|---|
| 90 | 1,748 | 77 |
| 100 | 1,360 | 74 |
| 110 | 1,286 | 71 |
| 120 | 1,502 | 76 |
| 130 | 1,739 | 80 |

So the repo's own width is about 100 to 110 (95th percentile line length 86, 99th 106, longest 190, over `.ts` and `.tsx`). Whatever width the estate picks (Q51), the reformat commit is a rewrite of nearly every file, which `.git-blame-ignore-revs` absorbs. CSS: 8 lines in `web/src/styles.css`. JSON and HTML: 0.

**The `.ts` suffixes.** 162 relative imports end in `.ts` and 64 in `.tsx` (`grep -rnE "from '\.{1,2}/[^']*\.tsx?'" api/src web/src`); only 9 relative imports have no extension. The house writes `.js`. With `module` and `moduleResolution` set to `NodeNext` on the API, `tsc -p api --noEmit` gives **0 errors**, and `tsc -p api/tsconfig.build.json` still writes `./app.js` imports in `dist/`. So the house `tsconfig.base.json` can be extended if each package keeps `allowImportingTsExtensions` for the `noEmit` config and the build config keeps `rewriteRelativeImportExtensions`. `web/` overrides to `ESNext` and `Bundler` for Vite, as Almanac does. Moving to `.js` suffixes would be about 226 edits with no gain; the `.ts` form is also the one Node's type stripping can resolve.

**TypeScript flags** (`tsc -p . --noEmit` plus one flag, errors in `api` and `web`):

| Flag | api | web |
|---|---|---|
| `verbatimModuleSyntax` | 0 | 0 |
| `erasableSyntaxOnly` | 4: `api/src/details/fetchPage.ts:11`, `api/src/details/pageText.ts:56, 57`, `api/src/lib/wicket.ts:32` | 2: `web/src/api.ts:119, 120` |
| `noImplicitOverride`, `noFallthroughCasesInSwitch`, `isolatedModules`, `noUnusedParameters` | 0 | 0 |
| `noUnusedLocals` | 1: `api/src/routes/issues.test.ts:1` (`readFileSync`) | 0 |
| `exactOptionalPropertyTypes` (not added now) | 16 | 4 |

**The house shapes**, counted with the TypeScript parser over the 113 source files:

| Shape | Count | Where |
|---|---|---|
| `enum`, `any`, namespaces | 0 | |
| `@ts-ignore` / `@ts-nocheck` / `@ts-expect-error` | 0 | |
| `TODO` / `FIXME` / `XXX` / `HACK` | 0 | |
| non-null `!` | 33 (9 in source, 24 in tests) | source: `api/src/app.ts:94`, `api/src/details/extract.ts:391, 395`, `api/src/lib/normalize.ts:72 (twice), 86`, `web/src/components/PriceHistory.tsx:29, 30, 43` |
| `console` | 3 | `api/src/seed.ts:56, 66`, `api/src/server.ts:16`: a CLI, and the entry before its logger exists |
| default exports | 3 | `api/vitest.config.ts:3`, `web/vite.config.ts:45`, `web/vitest.config.ts:4`: configs |
| parameter properties | 6 | the `erasableSyntaxOnly` list above |

**Typed and house lint** (a scratch config with the six typed rules through `projectService`, the house shapes, `n/no-process-env`, `@vitest/eslint-plugin` recommended, and `react-hooks` recommended on `web/`). One run per package:

| Rule | api | web |
|---|---|---|
| `no-floating-promises`, `await-thenable`, `switch-exhaustiveness-check` (with `considerDefaultExhaustiveForUnions`) | 0 | 0 |
| `no-misused-promises` | 1: `api/src/server.ts:49` (an async signal handler) | 7: async handlers on attributes, `ReportIssueButton.tsx:81, 137`, `SavedTable.tsx:104`, `ListingsPage.tsx:106`, `SavedPage.tsx:459, 525`, `SourcesPage.tsx:141` |
| `no-unnecessary-type-assertion` | 2: `api/src/details/extract.ts:380`, `api/src/lib/wicket.test.ts:48` | 1: `web/src/AuthGate.test.tsx:37` |
| `consistent-type-imports` | 2, in `api/src/lib/playwright.test.ts:12, 13` (`import()` types) | 0 |
| `no-non-null-assertion` | 23 (6 in source) | 10 (3 in source) |
| `no-console` | 3 | 0 |
| `n/no-process-env` | 10 in source, 3 in tests | 0 |
| `react-hooks` compiler and rules-of-hooks rules | n/a | 9: `set-state-in-effect` 4 (`ReportIssueButton.tsx:33`, `ListingsPage.tsx:80`, `SavedPage.tsx:178`, `SourcesPage.tsx:83`), `exhaustive-deps` 4, `refs` 1 (`SavedPage.tsx:242`) |
| `@typescript-eslint/no-empty-object-type` | 0 | 1: `web/src/components/ui/Dialog.tsx:9` |
| `no-require-imports`, `no-unused-vars` (recommended) | 2 and 2 in `api/src/routes/issues.test.ts:1, 58, 66`, `refresh.test.ts:8` | 0 |
| `vitest/valid-expect`, `no-conditional-expect` | 3: `host.test.ts:128`, `playwright.test.ts:110`, `extract.test.ts:242` | 0 |

`projectService` and `project` took the same time (6.5 s for `api`, 7.7 s for `web`, cold). A single root config over both packages took 18 to 27 s on a busy machine, so each package keeps its own config. `noUncheckedIndexedAccess` is already on in both packages, so the `!` are needed and only 3 are flagged unnecessary (the interplay of the skills library's Q47 and Q50).

**knip** (run in each package): no unused dependencies. `vendor/` shows as unused files and exports, so it must be ignored. Outside `vendor/`: 10 unused exports in `api` (for example `getSaved` at `api/src/db/saved.ts:49`, `CookieJar` at `api/src/lib/fetch.ts:39`) and 7 in `web` (for example `authClient` at `web/src/auth.ts:21`).

**Not measured here:** `eslint-plugin-better-tailwindcss` (it could not find Tailwind from the scratch tools folder; step 1 runs it from `web/`).

## Owner decisions (defaults this brief builds)

1. **A root `package.json`, scripts only** (new question for the grilling; it revisits "no monorepo tooling"). Default: a root `package.json` with `"private": true`, no `workspaces`, no dependencies, and scripts that call `npm --prefix api run <x>` then `npm --prefix web run <x>`. It exists because the plugin's `Stop` hook runs a repo's `check:fast` only when the root `package.json` has it. Rejected: workspaces (see above). Each package keeps its own `node_modules`, config and lockfile.
2. **Where the configs come from** (skills library Q6). Default: the `house-style` package, as an exact dependency of both packages. `api`'s Docker build stage runs `npm ci --ignore-scripts` with no `git` installed (`infrastructure/Dockerfile`, the `build` stage), so a `github:` dependency would break the image. Default within that: the tagged tarball URL, which npm fetches without git. The `deps` stage uses `--omit=dev`, so it never installs the package.
3. **Width** (Q8, Q51). Default: the estate's one width; if it isn't settled, 120.
4. **The outliers move to the house format** (Q9). Default: double quotes and semicolons, in the one reformat commit. The `.ts` suffixes stay (a new question for the grilling).
5. **Markdown stays out of Prettier** (Q45).
6. **tsconfig** (Q11): add `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noImplicitOverride`, `noUnusedLocals`, `noFallthroughCasesInSwitch`, `isolatedModules`; not `exactOptionalPropertyTypes`.
7. **Typed lint** (Q12), **house shapes as errors** (Q13), **`check:fast`** (Q10), **hooks in the plugin** (Q7), **a root `CLAUDE.md`** (Q46): the defaults in the skills library's brief 27.
8. **`!` in tests** (Q47) is a warning, an error in source.

## Files you OWN

- New: root `package.json`, `.prettierrc`-style config and `.prettierignore` per package or at the root, `.git-blame-ignore-revs`, `CLAUDE.md`, `.claude/rules/`, `scripts/check-fast.mjs`, `scripts/conventions.json` if an exception is needed.
- `api/package.json`, `web/package.json` and both lockfiles (scripts and devDependencies only), `api/tsconfig.json`, `api/tsconfig.build.json`, `web/tsconfig.json`, a new `eslint.config.js` in each package, a `knip.json` in each.
- `.gitignore`: the `.claude` line.
- The reformat itself, and the fixes the new rules ask for: the six parameter properties, `api/src/routes/issues.test.ts:1`, the 9 source `!`, and what the typed rules find.
- `docs/decisions.md` (the root `package.json` decision), `docs/architecture.md` (the "Two independent npm packages" line), `docs/getting-started.md` (the commands), [corpus/CLAUDE.md](../../CLAUDE.md) (Hard rules and brief-board move to the root file as needed), `corpus/wiki/status.md`, `corpus/log.md`.

## Files you must NOT touch

- Behaviour. Apart from the fixes listed, every change is formatting or configuration.
- `api/vendor/` and `web/vendor/` (generated copies of the Ward library), both ignored by ESLint, Prettier and knip.
- `infrastructure/Dockerfile`, unless decision 2's tarball choice needs a change; the image must still build.
- The layout of `api/src` and the styling, which are briefs 24 and 23.

## What to do

One commit per step, each with the package checks green.

1. **Measure first.** Record in the `log.md` entry: the counts above, re-run (the commands: Prettier with each width into a scratch copy and a diff; `tsc -p . --noEmit` with each flag; ESLint with the scratch config; `npx knip`), `better-tailwindcss` findings on `web/` with `web/src/styles.css` as its entry, and lint time with `projectService` against `project`. A rule with more than about 20 real findings, or mostly false ones, goes back to the owner.
2. **Un-ignore `.claude`.** Change the `.gitignore` line to ignore only what must stay local (for example `.claude/settings.local.json`). Commit alone.
3. **Prettier and the reformat.** Add `prettier` (pinned) to both packages and the config (decision 3, `trailingComma: "all"`). `.prettierignore`: `*.md`, `vendor/`, `package-lock.json`, `dist/`, `data/`, `coverage/`, `api/src/details/fixtures/`. Add `format` and `format:check`. Commit that alone. Run the format as its own commit, `style: format with Prettier`, with no other work uncommitted. Put its hash in `.git-blame-ignore-revs` in a separate commit, and hand the owner `git config blame.ignoreRevsFile .git-blame-ignore-revs`.
4. **tsconfig.** Add the decision 6 flags. `api` takes `module: NodeNext` and `moduleResolution: NodeNext` (0 errors measured), keeping `allowImportingTsExtensions`, and `tsconfig.build.json` keeps `rewriteRelativeImportExtensions`. `web` stays `ESNext` and `Bundler`. Fix the six parameter properties (a declared field assigned in the constructor) and the unused import. Add a `typecheck` script to each package: `tsc -p tsconfig.json --noEmit` (the API's tests are checked here for the first time by a script). `npm run build` in `api` and the Docker build must still work.
5. **ESLint** in each package, extending the house config, with `n/no-process-env` as a **warning** (brief 24 makes it an error). Roots: `api/src`, `web/src`. CLIs and the entry that may use `console`: `api/src/seed.ts`, `api/src/server.ts`. Default exports allowed in `*.config.*`. `allowDefaultProject` for the three config files no tsconfig includes. `vendor/` and `api/src/details/fixtures/` ignored. Fix or list each finding: the 9 source `!`, the 8 `no-misused-promises` (wrap in a `void` handler or an explicit `.catch`), the `react-hooks` findings (fix, or list with the reason in the outcome note), `readFileSync`, the `require` calls in `issues.test.ts`.
6. **knip** in each package, with `vendor/` ignored. Unused exports are a warning.
7. **The gate.** Each package gets `lint`, `format:check`, `typecheck`, `test` and `check` (all four, then knip). The root `package.json` gets `check` (both packages, in order) and `check:fast`, which runs `node scripts/check-fast.mjs`: the changed and untracked `*.ts`, `*.tsx`, `*.js`, `*.mjs` files (against `HEAD`), grouped by package, each package's `typecheck` and ESLint on its files only. No shell-only syntax. Add a root `.npmrc` with `save-exact=true`. Time `check:fast` warm with one changed file, and `check`.
8. **`.claude/rules/`.** `api.md` (`paths: ["api/src/**"]`) and `web.md` (`paths: ["web/src/**"]`), each under about 40 lines. `api.md`: `.ts` suffixes on relative imports, `process.env` only in the config module, the fetch rules in [docs/decisions.md](../../../docs/decisions.md) (every fetch through `createSession()`), no edits in `vendor/`. `web.md`: Base UI only through `web/src/components/ui/`, tokens from `styles.css`, no bare-element rules outside `@layer base`, the retro look in [docs/design.md](../../../docs/design.md). Briefs 23 and 24 add the convention lines.
9. **`CLAUDE.md`** at the root, under about 60 lines: what ro-housing is, "read corpus/index.md first", the commands (`npm ci` in the root, `api` and `web`; `npm run check`; one test with `npx vitest run <file>` inside a package; `npm run dev` in each), and the places that mislead: two packages and two lockfiles, `.env` at the repo root, the API on 3000 and Vite on 5173, `postinstall` downloads Chromium. Move the repo-wide rules out of `corpus/CLAUDE.md` as needed.
10. **Corpus.** `docs/decisions.md` entry "The house style, formatted and checked", with the width, the config source, the root `package.json` and what was rejected. Update `status.md` and `log.md`. Run `bash corpus/lint.sh`.

## Acceptance

- [ ] `npm run check` at the repo root passes. Its run time, and `check:fast`'s warm with one changed file, are in the outcome note.
- [ ] `npx prettier --check .` passes in each package. The reformat is one commit (`git diff -w <hash>^ <hash>` shows only quote, semicolon and line-wrap changes in the formatted files), and its hash is in `.git-blame-ignore-revs`.
- [ ] `grep -c "^\.claude$" .gitignore` prints 0, and `git check-ignore .claude/rules/api.md` prints nothing.
- [ ] `npm run typecheck` passes in both packages, `npm run build` in `api` and `web` passes, and `docker build -f infrastructure/Dockerfile .` passes.
- [ ] ESLint reports zero errors in each package. A deliberate `enum`, `!`, `console.log` in `api/src/app.ts`, `// TODO` and `export default` each fail `npm run lint`. Revert them after.
- [ ] `npm ci --omit=dev` in `api` installs no `house-style`, ESLint or Prettier (`npm ls --omit=dev` lists none).
- [ ] `.claude/rules/api.md` and `web.md` exist with `paths:` frontmatter. The root `CLAUDE.md` is under about 60 lines and lists `npm run check`.
- [ ] With the plugin's hooks on, an edit is formatted on save and a type error stops the agent at `Stop`.
- [ ] `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 23 adds `better-tailwindcss`'s class-order rule and `check-base-ui`. Brief 24 adds dependency-cruiser and `check-structure`, and makes `no-process-env` an error.
- The reformat changes `web/src/styles.css` by 8 lines of formatting.
