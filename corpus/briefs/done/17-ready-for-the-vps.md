# Task 17: Make ro-housing ready for the VPS: sign-in, sub-path, container

Filed 2026-11-04 from the owner's grill. This brief makes the repo ready; it does **not** deploy.
Someone else writes the vps-deploy stack from `docs/owner-setup.md`.

## Context

ro-housing has run only on the owner's computer: two dev servers, the API on `127.0.0.1:3000`
with no sign-in, guarded by a Host check (against DNS rebinding) and an Origin check
([docs/decisions.md](../../../docs/decisions.md)). The owner decided on 2026-11-04 to move it to
the VPS:

- **Sign-in** exactly like the brief-board repo: "Sign in with Ward" plus a local account made by
  a seed script, and no sign-up. brief-board vendors the estate's ward-auth library into
  `server/vendor/ward` and `web/vendor/ward` with the wzd_auth repo's
  `shared-library/scripts/vendor.mjs`; its `corpus/wiki/sign-in.md` describes the setup. Unlike
  brief-board, a signed-in session here must write (Save, Sources, Refresh): there is no CLI.
- **Address:** the web app at the sub-path `/ro-housing/`, the API at `/ro-housing-api` (Caddy
  strips the prefix), like brief-board's `/brief-board` and `/brief-board-api`. Loopback port
  **8809** on the box.
- **Container:** an image with Playwright's Chromium (storia needs it), the SQLite file on a
  volume, and a CPU and memory cap so a Refresh can't starve the box (3.7 GiB RAM, about 2.1 GiB
  free, 2 vCPUs, shared with mail, Ward, monitoring and other apps).
- **Start fresh:** no old database to move.
- **Refresh stays button-only.** No schedule.
- Checked 2026-11-04: every site answers the VPS as it answers the PC (imobiliare.ro 403 on both,
  the other seven answer on both), so the datacenter address adds no blocking.

## Files you OWN

- `api/` (server, config, accounts, seed, guards, issues and DB paths, Playwright launch args,
  `package.json`), `api/vendor/ward/` (vendored, not edited)
- `web/` (base path, API prefix, dev proxy, sign-in pages, the fetch mocks in tests),
  `web/vendor/ward/` (vendored)
- `infrastructure/Dockerfile`, `infrastructure/docker-compose.yml`, `.dockerignore`, `.env.example`
- `docs/owner-setup.md` (new), `README.md`, `docs/getting-started.md`, `docs/architecture.md`,
  `docs/decisions.md`, `docs/README.md`
- `corpus/briefs/`, `corpus/log.md`, `corpus/wiki/status.md`, `corpus/wiki/open-questions.md`

## Files you must NOT touch

- The vps-deploy and wzd_auth repos. Running wzd_auth's vendoring script to copy ward-auth into
  this repo is fine; nothing in wzd_auth changes. The Ward seed entry and the production Ward
  registration are owner steps.

## What to do

1. **Vendor ward-auth** into `api/vendor/ward/` and `web/vendor/ward/` with the vendoring script.
2. **Settings.** One `config.ts` reads the environment (and the repo root's `.env`, which Ward's
   local seed writes) and stops the start with a message naming each bad variable: `HOST`,
   `PORT`, `PUBLIC_ORIGIN`, `RO_HOUSING_DB`, `RO_HOUSING_ISSUES_DIR`, `WEB_ORIGINS`,
   `AUTH_TRUSTED_PROXIES`, the five `WARD_OIDC_*`. Defaults keep local development as it is
   (port 3000, `data/ro-housing.db`, `issues/` at the repo root).
3. **The guard.** Register the `wardAuth` plugin after the Host and Origin hooks: cookie
   `ro_housing_session` with path `/ro-housing-api`, routes under `/auth`, `GET /api/health`
   public, `allowRename: false`, no registration, Ward on when `WARD_OIDC_ISSUER` is set. Every
   other `/api` route needs a session. Accounts live in the app's own SQLite file (the library's
   `auth_*` tables), one role, `user`. The API strips a leading `/ro-housing-api` itself, so it
   works behind Caddy and on its own.
4. **The existing guards behind Caddy.** Caddy passes the browser's `Host` through, so the Host
   check also allows `PUBLIC_ORIGIN`'s host name, and the Origin check also allows
   `PUBLIC_ORIGIN`. Tests for both.
5. **Seed.** `npm run seed` (and `node`/`tsx` in the container) makes one local account from
   `SEED_USERNAME` and `SEED_PASSWORD`, or asks on the terminal without echo, and leaves an
   existing one alone.
6. **Web.** Vite `base` `/ro-housing/` (`RO_HOUSING_BASE` moves it), every call under
   `/ro-housing-api`, and a dev proxy that strips the prefix and rewrites a same-host `Origin` to
   `PUBLIC_ORIGIN`, as brief-board's does. A gate around the app on the vendored hooks: loading,
   the login page (username, password, "Sign in with Ward" when on, no sign-up), an account
   page (who, how, Link Ward, sign out). A 401 from any call asks the hooks again. Built with the
   app's own components and palette ([docs/design.md](../../../docs/design.md)). Update the fetch
   mocks in the web tests for the new prefix.
7. **Container.** `infrastructure/Dockerfile` on a Debian Node 24 image (Playwright's Chromium
   needs glibc) with `playwright install --with-deps` for Chromium only; `tsx` moves to
   `dependencies` so `npm ci --omit=dev` keeps it; `HOST=0.0.0.0`, `PORT=8809`,
   `RO_HOUSING_DB=/data/ro-housing.db`, `RO_HOUSING_ISSUES_DIR=/data/issues`; `VOLUME /data`; a
   health check on `/api/health`. Chromium gets `--disable-dev-shm-usage` when an env flag the
   image sets asks for it. `infrastructure/docker-compose.yml` publishes `127.0.0.1:8809` only,
   with the caps. Don't depend on Docker running here.
8. **Caps.** Measure what is light to measure (the API's idle memory, one Chromium launch on a
   local page, no site fetched) and propose `cpus`, `mem_limit` and `pids_limit`; say what
   happens when the cap kills Chromium mid-Refresh (the relaunch on the next call).
9. **Docs.** `docs/owner-setup.md`: everything the vps-deploy stack needs (port, env and secret
   names, routes, volume, caps, health check), the Ward registration and the local seed entry as
   owner steps, creating the account, a local container check. The README's status line, run
   steps and layout; `getting-started.md`; `architecture.md` (no more "no auth"); a new entry in
   `decisions.md` (append-only: the old "no Docker" entry stays, the new one says what changed).

## Acceptance

- `npx tsc --noEmit` and `npx vitest run` in `api/`; `npx tsc -b` and `npx vitest run` in `web/`.
- Locally, the API refuses `/api/listings` without a session (401) and answers `/api/health`;
  after the seed, the login page signs in and the three tabs work under `/ro-housing/`.
- `docs/owner-setup.md` lists the port, env and secret names, routes, volume and cap numbers.
- wzd_auth's `git status` is clean after vendoring.

## Outcome (2026-11-04)

Built; not deployed, and the image not built (Docker wasn't reachable from WSL).

- **Sign-in.** ward-auth 0.7.0 vendored into `api/vendor/ward` and `web/vendor/ward` with wzd_auth's
  `vendor.mjs` (wzd_auth's `git status` stayed clean; the copy is byte-identical to brief-board's).
  `api/src/app.ts` builds the app: prefix strip, Host check, Origin check, then the plugin (cookie
  `ro_housing_session` on `/ro-housing-api`, `/auth`, `GET /api/health` public, `allowRename:
  false`, no registration, Ward when `WARD_OIDC_ISSUER` is set). Sessions write. `config.ts` reads
  and checks the settings; `env.ts` loads the repo root's `.env`; `paths.ts` reads `RO_HOUSING_DB`
  and `RO_HOUSING_ISSUES_DIR`; `seed.ts` (`npm run seed`) makes an account.
- **Web.** Base `/ro-housing/`, every call under `/ro-housing-api` (`base.ts`), a dev proxy that
  strips the prefix and rewrites a same-host `Origin` to `PUBLIC_ORIGIN`; `AuthGate`, `LoginPage`,
  and the account as a dialog from the user's name in the header (`AccountButton`) at
  `/ro-housing/account`, so the tabs behind it keep an open draft. That is a change from the
  brief's "account page": a page would unmount the app. The page tests' `fetch` stubs now refuse
  any call without the prefix.
- **Container.** `infrastructure/Dockerfile` (Debian `node:24-bookworm-slim`, Chromium's headless
  shell only, `tsx` at run time, `/data` volume, Node-`fetch` health check),
  `infrastructure/docker-compose.yml` (`127.0.0.1:8809`, caps), `.dockerignore`, `.env.example`.
  `tsx` moved to `dependencies`; Node's own type stripping was tried and refuses the code's
  parameter properties. Chromium gets `--disable-dev-shm-usage` under `CHROMIUM_DISABLE_DEV_SHM=1`.
- **Caps** from light measurements (no site fetched): API idle about 200 MiB under `tsx`; headless
  Chromium about 100 MiB launched, about 190 MiB with one heavy local page, about 90 threads with
  the API. Proposed and written into the compose file: `cpus: 1.0`, `mem_limit: 1g`,
  `memswap_limit: 1g`, `pids_limit: 256`, `init: true`.
- **Docs.** `docs/owner-setup.md` (the stack's needs, the owner's steps, local development), the
  README (status line, sign-in, run steps, layout), getting-started, architecture ("Addresses and
  sign-in"), decisions ("On the VPS at /ro-housing, behind sign-in"), overview, issues, testing,
  docs/README. Open questions in `corpus/wiki/open-questions.md`.

Checks: api `tsc --noEmit` clean, `vitest run` 162/162 (147 before); web `tsc -b` clean, `vitest run`
73/73 (68 before), `vite build` clean with assets under `/ro-housing/`. A local walk with curl on a
throwaway database through Vite's proxy: the page at `/ro-housing/`, 401 without a session, the
seeded account signing in from `http://localhost:5173` (rewritten to `PUBLIC_ORIGIN`), the cookie on
`/ro-housing-api`, reads and writes with it, another site's `Origin` refused, the feed source seeded
with its URL. Not done: a browser walk and a Ward sign-in (owner steps).
