# Task 24: The server in the code structure

**Depends on:**

- In ro-housing: brief 22, for the gate, `eslint-plugin-n`'s `no-process-env` (a warning until this brief) and `.claude/rules/api.md`.
- In the owner's skills library:
  - brief 03, *A code-structure skill for the Fastify + React apps*: rules 1-11, `server-skeleton.md`, `zod-type-provider.md`, `migrating-a-server.md`, `check-structure.mjs`, and the dependency-cruiser and knip presets;
  - brief 16, *The Fastify servers adopt the code structure*: the method;
  - brief 15, *Enforce the base-ui and code-structure skills in every repo*: `check-structure` runs `--warn-only` until this brief is done.
- The owner's grilling of 2026-11-10: Q1 is answered (a fact): the container starts a file path, and the repo owns its Dockerfile. The technical calls settle Q23 (`features/`), Q24 (plugin options, explicit registration), Q25 and Q53 (response schemas, with the stream and binary exemption), Q43 (the error handler), Q54-Q56; the decisions below say how.

**Order:** after 22. It touches no file that 23 touches, but never run it at the same time as another brief.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

The owner asked on 2026-11-09 for one researched code structure, enforced in every repo. This server is nearer to it than the brief set's premise assumed. Three corrections, read 2026-11-10:

- **No entry rename.** The entry is already `api/src/server.ts`, and `infrastructure/Dockerfile` ends `CMD ["node", "dist/server.js"]`. Nothing in the Dockerfile changes. What can change is `api/package.json`'s `build` script, whose `cp src/db/schema.sql dist/db/schema.sql` assumes `db/` stays where it is.
- **The routes are not in `app.ts`.** They sit in `api/src/routes/*.ts`; only `GET /api/health` is inline (`api/src/app.ts:112`). `app.ts` (120 lines) exports `buildApp(options)` and never listens, which is rule 2.
- **There is no zod.** `grep -n zod api/package.json api/package-lock.json` prints nothing. Request bodies are checked by hand (`api/src/routes/saved-input.ts`, 105 lines). So this brief adds zod 4 fresh, with `@fastify/type-provider-zod`, `fastify-plugin` and `close-with-grace`, and the provider's required peers `@fastify/swagger` and `openapi-types`. Pin all of them. The image's `deps` stage runs `npm ci --omit=dev`, so they reach the runtime image.

What is already right:

- `server.ts` is the only file that calls `listen` (`api/src/server.ts:42`), and `config.ts` reads the settings once and throws `ConfigError`, which the entry prints and exits on (`server.ts:12-19`).
- `app.test.ts` drives the whole app through `buildApp` and `inject()` (13 calls), and `routes/fill.test.ts` and `routes/refresh.test.ts` use `inject()` on a route plugin (14 and 8 calls). `routes/issues.test.ts` and `saved-input.test.ts` do not.

What is missing: feature folders, route and response schemas, `fastify-plugin` on the cross-cutting hooks, one error handler, `close-with-grace`, and a single reader of the environment.

### Versions (read 2026-11-10)

- `api/package.json`: `fastify` 5.12.7, `typescript` 6.0.3, `vitest` 4.1.12, no zod.
- The provider needs zod 4.2 or later and Fastify `^5.5.0`.

### The routes: 15, each with what it sends today

The vendored `wardAuth` plugin's `/auth/*` routes are generated code and out of scope.

| Feature | Route | Body or query read today | Replies today |
|---|---|---|---|
| health | `GET /api/health` (`app.ts:112`) | | 200 `{ ok: true }` |
| sources | `GET /api/sources` (`routes/sources.ts:5`) | | 200 list |
| sources | `PUT /api/sources/:id` (`:17`) | **no validation**: `req.body` goes straight to `updateSource` (`db/queries.ts:42`) | 200 `{ ok: true }`, 404 |
| listings | `GET /api/listings` (`routes/listings.ts:8`) | `sort`, `order`, `source`, unchecked | 200 list |
| refresh | `POST /api/refresh` (`routes/refresh.ts:18`) | | 200 `{ perSource }`, 409 |
| issues | `GET /api/issues`, `POST /api/issues` (`routes/issues.ts:31, 35`) | `body` checked by hand | 200, 400 (empty, too long), 409 (10 open) |
| saved | `POST /api/saved/scrape` (`routes/saved.ts:94`) | `url` | 200 (several shapes), 400 |
| saved | `GET /api/saved` (`:149`), `POST /api/saved` (`:151`), `PUT /api/saved/:id` (`:167`), `DELETE /api/saved/:id` (`:184`) | `parseSavedInput` (`saved-input.ts:46`), `parseId` (`saved.ts:79`) | 200, 201, 204, 400, 404, 409 |
| saved (fill) | `POST /api/saved/fill` (`routes/fill.ts:50`), `GET /api/saved/fill/:id` (`:76`), `DELETE /api/saved/fill/:id` (`:113`) | `url`, `missing`, `wait` by hand | 200, 202, 400, 404, 409, 502, 503 |

Every error reply is `{ error: "<sentence>" }`, and `web/src/api.ts` (`ApiError` at line 117, `apiErrorMessage` at 132) reads that string. **The repo's body shape stays**, as the skill's rule 8 says: one error handler, the existing shape.

### The move map

`api/src` today: 41 source files and 23 test files. A test moves with its source.

| Today | Target | Note |
|---|---|---|
| `server.ts` | the same | Entry only. `close-with-grace` replaces the hand-written signal loop (`server.ts:48-54`), which is also the one `no-misused-promises` finding (brief 22). It still closes the browser (`closeBrowser`). |
| `app.ts` | the same | Keeps `buildApp`. The Ward registration (`app.ts:57-100`) moves to `plugins/auth.ts`, the health route to `features/health/routes.ts`, and `stripApiPrefix` to `lib/api-prefix.ts` with its test. |
| `config.ts`, `config.test.ts` | the same | The one reader of the environment (see below). |
| `env.ts`, `paths.ts` | folded into `config.ts` | `paths.ts` is only env defaults. |
| `accounts.ts` | `plugins/auth.ts` neighbour: `plugins/accounts.ts` | `seed.ts` imports `seedUser`. |
| `lib/host.ts`, `lib/origin.ts` and tests | `plugins/host-guard.ts`, `plugins/origin-guard.ts` | Both import Fastify, so rule 7 (no Fastify in `lib/`) moves them. Wrapped in `fastify-plugin`, since they are root hooks. |
| `lib/fetch.ts`, `normalize.ts`, `playwright.ts`, `wicket.ts` and tests | the same | Pure of Fastify. `lib/fetch.ts:6` imports `isPrivateAddress` from `details/url.ts`: the wrong direction, so `details/url.ts` becomes `lib/url.ts`. |
| `routes/sources.ts`, `db/queries.ts` (sources part: `listSources`, `getSource`, `updateSource`, `markSourceRun`, `SourceRow`) | `features/sources/routes.ts`, `store.ts`, `index.ts` | `index.ts` exports what `refresh` needs. |
| `routes/listings.ts`, `db/queries.ts` (`listListings`, `upsertListingWithSnapshot`, row types) | `features/listings/routes.ts`, `store.ts`, `index.ts` | |
| `routes/refresh.ts` | `features/refresh/routes.ts` | Imports `sources` and `listings` through their `index.ts`. The module-level `running` flag stays. |
| `routes/issues.ts` | `features/issues/routes.ts` | `mkdirSync` at import (`issues.ts:12`) moves into the plugin's start. |
| `routes/saved.ts`, `routes/saved-input.ts`, `routes/fill.ts`, `db/saved.ts`, `details/*` | `features/saved/` | **One feature.** `fill.ts` imports `recordAiFill` from `saved.ts` (`fill.ts:7`), and both use the `pageTexts` cache (`details/pageText.ts:81`). Files: `routes.ts`, `fill-routes.ts`, `store.ts`, `input.ts`, and a private `details/` folder (`extract.ts`, `fetchPage.ts`, `pageText.ts`, `fill.ts`). `extract.ts` is 615 lines, over rule 11's 400, so it stays a warning to leave since nothing is added. |
| `adapters/*` | the same | Used by `db/index.ts` (the source seed) and `refresh`. Left where it is, with `adapters/index.ts` as its entry, and recorded as an exception for dependency-cruiser; moving it under `refresh` would make `db/` import a feature. |
| `db/index.ts`, `migrate.ts`, `schema.sql` | the same | See "import-time config". |
| `seed.ts`, `seed.test.ts` | the same | A CLI. Its two `process.env` reads move to `config.ts`. |

`build` in `api/package.json` keeps `cp src/db/schema.sql dist/db/schema.sql`, because `db/` doesn't move.

### Every reader of the environment (read 2026-11-10)

`grep -rn "process\.env\|process\.loadEnvFile" api/src --include=*.ts`:

| Where | What | Afterwards |
|---|---|---|
| `config.ts` | `loadConfig(env)` | stays, the one reader |
| `server.ts:13` | `loadConfig(process.env)` | `loadConfig()` with its `env = process.env` default |
| `server.ts:24, 25` | `HOST`, `WEB_ORIGINS` | new `Config` fields |
| `lib/host.ts:19`, `lib/origin.ts:13` | default parameters `process.env.HOST`, `WEB_ORIGINS` | the plugins take them from `Config`, no default |
| `lib/playwright.ts:14` | `CHROMIUM_DISABLE_DEV_SHM` | a `Config` field passed to `launchArgs` |
| `paths.ts:18, 25` | `RO_HOUSING_DB`, `RO_HOUSING_ISSUES_DIR` | `databasePath()` and `issuesDir()` move into `config.ts` |
| `seed.ts:47, 48` | `SEED_USERNAME`, `SEED_PASSWORD` | `loadSeedConfig()` in `config.ts` |
| `env.ts:8` | `process.loadEnvFile(<repo root>/.env)` | `loadEnvFile()` in `config.ts` |
| tests | `app.test.ts:9, 10`, `routes/fill.test.ts:6` (3 reads in all) | excepted |
| outside `api/` | `web/vite.config.ts:45` | out of scope: a build config |

`env.ts` swallows only `ENOENT` and rethrows other errors, but it finds the file by `../../` from `api/src/`. A file moved deeper would silently stop reading `.env`, which is the estate's "env loaders fail quietly" fact, so `loadEnvFile()` gets a test that fails when the repo root's `.env.example` is not found from where the module sits.

### Import-time config: a decision

`db/index.ts:9-18` opens the database when it is imported (`export const db = new Database(DB_PATH)`), runs the schema and seeds the sources. `routes/issues.ts:12` makes its folder at import. `app.test.ts:9-10` sets `RO_HOUSING_DB=:memory:` before importing. Turning this into `openDatabase(path)` is a large change: every store function reads the `db` singleton. **Default: the singleton stays**, `config.ts` only owns the two path functions, and the skill's allowance for import-time config applies. The alternative is worth a later brief.

## Owner decisions

Items 1-5 and 7 are decided 2026-11-10 (technical calls, the questions named); 6 and 8 are defaults no question covers.

1. **`features/<name>/`** (Q23, technical call), with `saved` as one feature (fill belongs to it).
2. **Dependencies as plugin options** (Q24, Q56, technical call): `buildApp` passes `wicket` and `fillable` as options, as it does today, and tests pass their dependencies the same way. No decorators as a test seam: `accounts` goes too, and the tests build their own, which drops the `declare module`. One error class stays if it has one (Q56).
3. **Zod route schemas with a response schema on every route** (Q25, technical call). Pass-through JSON uses a loose object. Response schemas are transform-free. A route's schema declares only the statuses its handler sends itself (a declared status the handler never sends becomes a 500).
4. **Where the schemas live** (Q55, technical call: a schema lives in `shared/` when the client imports it, otherwise in its feature folder; here the client cannot import one): `api/src/features/<name>/schema.ts`. There is no `shared/`, and none can exist: the image copies only `api/`, and `web/` is built apart. `web/src/api.ts` keeps its hand-written types, so a response schema and its web type can drift; a test per route compares the reply with the web type's keys.
5. **Error body** (Q43, technical call): one error handler, keeping the repo's `{ error: string }`. It passes Fastify's own 4xx through with their status and message, and never echoes a thrown message to the client (a 500 answers a fixed sentence, and the error is logged). A schema failure answers 400 with the first issue's message, so the sentences in `saved-input.ts` survive as zod messages.
6. **Timeouts.** `POST /api/refresh` runs every source in turn and can take minutes (`routes/refresh.ts:42-80`), and the fill poll waits up to 25 s (`api/src/lib/wicket.ts:49`). So no `connectionTimeout` or `requestTimeout` is set that would cut either; the default stays and the reason goes in `docs/decisions.md`.
7. **Streams and binary routes** (Q53, technical call): exempt from response schemas, each with a `scripts/conventions.json` entry. None here.
8. **The `trustProxy` setting.** ward-auth takes `trustedProxies` as its own option (`app.ts:93`), so Fastify's `trustProxy` stays unset. Record it.

## Files you OWN

- `api/src/**` (the moves, the new files and the tests that move with them), `api/package.json` and `api/package-lock.json`.
- `api/tsconfig.build.json`, only if the build exclude list needs a new path.
- `scripts/conventions.json`, `.dependency-cruiser.cjs` at the root or in `api/`.
- `.claude/rules/api.md` (add the structure lines).
- `docs/architecture.md` (the layout and "Request flow" paths), `docs/decisions.md`, `docs/adapters.md` and `docs/testing.md` where they name moved files, `corpus/wiki/status.md`, `corpus/log.md`.

## Files you must NOT touch

- `api/vendor/`, `infrastructure/Dockerfile` (no `CMD` change; check that `docker build` still passes), `web/` (the replies must stay the same JSON).
- The adapters' scraping code and the fetch hardening of brief 20.

## What to do

One commit per step. After each, `npm run check` passes (the API's tests are 244 today) and `check-structure` runs `--warn-only`.

1. **Before.** Run `check-structure` and record the counts by rule. Save the real JSON of every route the web calls (`web/src/api.ts`) from a seeded local API, for the step 5 comparison.
2. **`config.ts`.** Fold `env.ts` and `paths.ts` in, add `HOST`, `WEB_ORIGINS`, `CHROMIUM_DISABLE_DEV_SHM`, `loadSeedConfig()` and the `loadEnvFile()` test. `server.ts` and `seed.ts` read nothing else. `n/no-process-env` becomes an error here.
3. **Plugins.** `plugins/errors.ts` (one handler, `{ error: string }`: a Fastify 4xx passes through with its own status and message, and a thrown message is never echoed to the client, only logged), `plugins/host-guard.ts`, `plugins/origin-guard.ts`, `plugins/auth.ts`, all in `fastify-plugin`, registered in the same order as today (Host, Origin, Ward). `close-with-grace` in `server.ts`. The guard tests keep passing unchanged.
4. **Move the features** one folder per commit, in this order: health, sources, listings, issues, refresh, saved. Update every import, the tests, and docs paths.
5. **Schemas, one feature per commit.** Add zod and the provider in the first of these. For each route, write the body, query and params schemas and a response schema per status the handler sends. Replace `parseSavedInput`, `parseId`, and the hand checks in `issues` and `fill`. `PUT /api/sources/:id` gets its first validation: `searchUrl` a string, null or absent, `enabled` a boolean. Before each commit, compare the new JSON with step 1's for every route the web calls; response schemas strip unknown keys. Check the web's real payloads first, because a schema stricter than the client breaks it.
6. **dependency-cruiser and knip.** Feature boundaries (only through `index.ts`), no Fastify under `lib/`, no cycles, the `adapters/` exception. Fix `lib/fetch.ts`'s import of `details/url.ts`.
7. **Drop `--warn-only`** from `check-structure`. Update docs and `log.md`.

## Acceptance

- [ ] `grep -rn "process\.env" api/src --include=*.ts | grep -v "\.test\.ts" | grep -v "src/config.ts"` prints nothing.
- [ ] `grep -rn "listen(" api/src --include=*.ts | grep -v "\.test\.ts"` prints only `server.ts`.
- [ ] `grep -rln "from \"fastify\"" api/src/lib` prints nothing.
- [ ] `grep -rnE "\.parse\(req|parseSavedInput|parseId" api/src --include=*.ts | grep -v "\.test\.ts"` prints nothing.
- [ ] Every route in the table has an `inject()` test for its success and, where it takes input, for input that fails its schema (the 15 routes).
- [ ] A test per route compares the reply's keys with step 1's saved JSON.
- [ ] A test throws an error with a recognisable message from a route and expects the reply not to contain it, and a malformed JSON body keeps Fastify's own 4xx status.
- [ ] `npm run check` passes, `check-structure` strict reports 0, dependency-cruiser and knip pass, and `npm run build` in `api` produces `dist/server.js` and `dist/db/schema.sql`.
- [ ] `docker build -f infrastructure/Dockerfile .` passes, and the container answers `GET /api/health` (the Dockerfile's own health check).
- [ ] `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 22 turns on the gate this one tightens. Brief 23 touches only `web/`.
- The web's `api.ts` is untouched, so a changed reply shape is a bug here.
- (2026-11-11, brief 22) Step 6's dependency-cruiser landed in brief 22: `.dependency-cruiser.cjs` at the root, in `check:conventions`, passing with `lib-without-fastify` lowered to a warning by name (`lib/host.ts` and `lib/origin.ts` import Fastify's instance type). This brief keeps the `adapters/` exception, the feature-boundary check, and drops that lowered rule. `check-structure` runs `--warn-only` (29 findings: 10 `process.env` reads outside `config.ts`, 19 routes without a schema, plus two 400-line warnings), and `n/no-process-env` is a warning in `api/eslint.config.js`; drop both here.
