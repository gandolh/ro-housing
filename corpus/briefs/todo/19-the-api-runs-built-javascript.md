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
