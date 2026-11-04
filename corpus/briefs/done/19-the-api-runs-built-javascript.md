# Task 19: The API runs built JavaScript, not tsx

Filed 2026-11-04 from the owner's memory review of the VPS. Build it
**before ro-housing's first deploy**.

## Context

The VPS has 3.7 GiB of RAM shared by every app, and the owner doesn't want
to upgrade it (vps-deploy's `memory-on-the-box` research, 2026-11-04). Apps
that compile TypeScript at runtime with tsx carry esbuild and the transform
work in every process: newspapper's API sits at 127 MB plus 58 MB in swap.
ro-housing's container starts `node --import tsx src/server.ts` and idled at
about 200 MiB on the laptop (brief 17's measurement). Brief 17 found Node's
own type stripping fails on this code, so `tsx` became a runtime dependency.

The owner decided on 2026-11-04 that the apps on the box run built
JavaScript.

## Files you OWN

- `api/` build setup (`tsconfig` for emit, a `build` script) and anything
  that blocks a plain `tsc` emit
- `infrastructure/Dockerfile` (build stage, `CMD ["node", "dist/server.js"]`
  or wherever it lands), `infrastructure/docker-compose.yml` if paths change
- `docs/owner-setup.md`, `README.md` where they name the start command
- `corpus/wiki/` pages that say the API runs under tsx, `status.md`,
  `log.md`

## What to do

1. Build the API to JavaScript (`tsc`, or a bundler if `tsc` can't emit this
   code cleanly; say which and why). Keep `npm run dev` on tsx for
   development.
2. The image builds once in a build stage and the runtime stage runs
   `node` on the output, with `tsx` back to a dev dependency and dropped from
   the runtime image. `node` is started directly, never through `npm`.
3. Migrations, the seed (`src/seed.ts`) and any other script the owner runs
   in the container get a built entry too; update the commands
   `docs/owner-setup.md` prints, and tell vps-deploy's brief 05 outcome (in
   your outcome note) if its printed seed command changes.
4. Measure the container idle before and after (`docker stats`, Docker is
   up), and with Chromium open for one source if that's cheap.

## Acceptance

- The image builds; the container answers `GET /api/health`; a Refresh of
  one cheerio source and the Saved draft read work in the container.
- `tsx` is not in the runtime image; the API test suite passes.
- The outcome gives idle memory before and after.

## Outcome (2026-11-04)

Built and checked in Docker; not deployed.

- **Build tool: plain `tsc`.** `api/tsconfig.build.json` extends `tsconfig.json`, emits to
  `api/dist/` with `rewriteRelativeImportExtensions` (the source's `./x.ts` imports become `./x.js`)
  and leaves out tests and fixtures. `npm run build` runs it and copies `db/schema.sql` beside
  `db/index.js`, the one file read at run time. tsc compiles the parameter properties Node's type
  stripping refuses, and `dist/` keeps `src/`'s depth, so `paths.ts` and the `../vendor/ward`
  import need no change. No bundler: tsc emitted this code cleanly on the first try.
- **Scripts.** `dev` and `seed` stay on tsx; `start` is now `node dist/server.js`; `build` is new.
  `tsx` moved to `devDependencies` (the lock only gains `"dev": true` on tsx and esbuild).
- **Image.** A `build` stage (`npm ci --ignore-scripts`, then `npm run build`); `prod` copies
  `dist/`, `vendor/` and `package.json` (for `"type": "module"`), no source, no tsconfig, and runs
  `CMD ["node", "dist/server.js"]`. The health check is unchanged. tsx, esbuild, TypeScript and
  vitest are not in the runtime image. 883 MB before, 871 MB after.
- **Seed.** In the container: `node dist/seed.js` (owner-setup step 5, the comment in `seed.ts`).

Where the brief and the code differ: there is no migration script to build. The schema and
`db/migrate.ts` run on every start inside `db/index.ts`, so the seed is the only other entry. The
README never named the container's start command, so it is unchanged. The brief's "about 200 MiB"
is Node's resident size; `docker stats` showed about 160 MiB for the same container.

**Idle memory**, the same `docker run` both ways (`--init`, the compose file's caps, a fresh
volume), five `docker stats` samples over 50 seconds after the first healthy answer:

| | `docker stats` | Resident (`docker top`) | Tasks | Idle CPU |
|---|---|---|---|---|
| Before, `node --import tsx src/server.ts` | about 160 MiB | node 198 MiB + esbuild 15 MiB | 24 | about 0.1% |
| After, `node dist/server.js` | about 112 MiB | node 160 MiB | 12 | 0.00% |

After a Refresh and the Saved calls below, about 119 MiB. `docker top` after: `docker-init` and
`node dist/server.js`, no npm, no tsx, no esbuild. Chromium was not started: this change doesn't
touch it, and brief 17's figures stand.

**Checks.** api `tsc --noEmit` clean, `vitest run` 162/162; `npm run build`, then the built server
and seed run from a scratch copy (health, 401, an account made). In the new container: health
`{"ok":true}` (also under `/ro-housing-api`), Docker's health status "healthy", 401 without a
session, `node dist/seed.js` made an account, sign-in, a Refresh of the RSS feed (the source a
fresh database has ticked with a URL; cheerio in XML mode, one plain request) kept 93 listings,
Saved list, save, read back, a scrape of a saved link (answers `existing`), of a name that doesn't
resolve (`unreachable`) and of a local address (400). `docker stop` ended it in a second on
SIGTERM, exit 0. Not run: a scrape that fetches a live listing page (the run allowed one outbound
fetch, the Refresh); see [open-questions](../../wiki/open-questions.md).

**For vps-deploy's brief 05.** The seed command its ro-housing stack prints changes from
`node --import tsx src/seed.ts` to `node dist/seed.js`. Nothing else changes: the image still builds
from `infrastructure/Dockerfile`, the stack's `excludes` (`dist`, tests, fixtures) suit a build
inside the image, and the health check's command and path are the same. One comment there goes
stale: the image no longer holds the source, so there are no tests in it to delete.
