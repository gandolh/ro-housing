# Getting started

The README has the short version. This is the full one.

## Prerequisites

- Node 24 and npm. It has been built and tested on Node 24. Older versions may work but are untried.
- About 300 MB of disk for the Chromium build Playwright downloads on the API's first install. Only storia.ro's search scraper, and single listings whose site refuses a plain request, use it.
- Nothing else: no database server and no Docker for local work. SQLite is a file. The account you sign in with is made by a script (below). Docker is only for checking the VPS container ([owner-setup.md](owner-setup.md)).

## Install and run

The repo is two separate npm packages. The root `package.json` holds only the house-style tools and the check scripts, so `npm run dev` at the root fails. Run `npm ci` in the root once for the tools, then use two terminals.

**Terminal 1, the API:**

```bash
cd api
npm install    # also runs `playwright install chromium`
npm run seed   # once: makes your local account; asks for a username and a password (8+ characters)
npm run dev    # tsx watch: Fastify on http://127.0.0.1:3000, restarts when a file changes
```

**Terminal 2, the web app:**

```bash
cd web
npm install
npm run dev    # Vite on http://127.0.0.1:5173/ro-housing/, proxies /ro-housing-api to the API
```

Open <http://127.0.0.1:5173/ro-housing/> and sign in with that account. There is no sign-up page;
another account is another `npm run seed`. "Sign in with Ward" shows on the login page once the
`WARD_OIDC_*` settings are set, which Ward's local seed writes ([owner-setup.md](owner-setup.md),
"Local development").

When an update adds a column (the first, `price_plus_vat`, came on 2026-10-27), the API adds it to an existing `data/ro-housing.db` on its next start; there is nothing to run by hand. The accounts and sessions live in the same file, in ward-auth's own `auth_*` tables. On its first start (or the seed's) the API creates `data/ro-housing.db`, with the ten sources from the scraper registry (nine search sites and imobiliare.ro's RSS feed), and an empty `issues/` folder at the repo root for the Report button. Both are gitignored. To start over, stop the API and delete `data/ro-housing.db*`.

## Settings

The API reads its settings from the environment, and fills in what is unset from a `.env` at the
repo root (git-ignored; `cp .env.example .env` starts one, and the defaults need no changes). A
bad value stops the start with a message naming it.

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `3000` | Port the API listens on. The web app's dev proxy reads it from the same `.env` |
| `HOST` | `127.0.0.1` | Address it binds to. The API answers only requests addressed to `localhost`, `127.0.0.1`, `[::1]`, this address or `PUBLIC_ORIGIN`'s host (the `Host` header); any other name gets 403, so for a LAN setup set the LAN address itself here, not `0.0.0.0` |
| `PUBLIC_ORIGIN` | `http://127.0.0.1:5173` | The app's origin as the browser sees it. Sign-in refuses a POST from any other origin; Vite's proxy turns `http://localhost:5173` into this one, so both names work |
| `WEB_ORIGINS` | `http://127.0.0.1:5173,http://localhost:5173` | More origins besides `PUBLIC_ORIGIN`. A request whose `Origin` header names any other site gets 403, so other pages open in the browser cannot use the API |
| `RO_HOUSING_DB` | `data/ro-housing.db` | The SQLite file (relative paths are from the repo root) |
| `RO_HOUSING_ISSUES_DIR` | `issues/` | Where the Report button writes its files |
| `AUTH_TRUSTED_PROXIES` | empty | Peers whose `X-Forwarded-For` the login lockout believes; only behind a proxy |
| `WARD_OIDC_ISSUER`, `WARD_OIDC_CLIENT_ID`, `WARD_OIDC_CLIENT_KEY`, `WARD_OIDC_REDIRECT_URI`, `WARD_OIDC_POST_LOGOUT_REDIRECT_URI` | empty | "Sign in with Ward". All or none; the redirect URI must end in `/ro-housing-api/auth/ward/callback`. The key is a secret |
| `SEED_USERNAME`, `SEED_PASSWORD` | empty | Read by `npm run seed` only; it asks for what is missing |

The web app is built for `/ro-housing/`; `RO_HOUSING_BASE` moves it at build time.

## First use

1. **Sources.** Tick the sites you want and paste a search-results URL from each, such as `https://www.storia.ro/ro/rezultate/vanzare/apartament/timis/timisoara`, then press Save. imobiliare.ro and storia.ro start ticked, and the seven agency sites start unticked.
2. **Listings.** Press Refresh. The scrapers run one site after another, and a strip above the table says how many listings each site gave or why it failed. Every Refresh adds a point to each listing's price history.
3. **Saved.** Paste one listing's link and press Fetch details, or press "save" on a row in Listings. Check the draft, fill the gaps, add a note and press Save. A link that is already saved shows "Already saved" with Edit instead of fetching again.

Nothing runs in the background: the data is as fresh as your last Refresh.

## Tests and checks

From the repo root, after `npm ci` in the root, `api/` and `web/`:

```bash
npm run check       # typecheck, lint, format check, conventions and tests, across both packages
npm run check:fast  # both typechecks, then ESLint on the changed files
npm run format      # Prettier writes every file it covers (Markdown stays out)
```

Inside `api/` or `web/`, each package has its own:

```bash
npm test            # Vitest, once
npm run test:watch  # Vitest, watching
npm run typecheck   # tsc, tests included
npm run lint        # ESLint with the house config
npm run check       # typecheck, lint, knip, tests
```

`npm run build` in `web/` typechecks and builds into `web/dist/`. In `api/` it compiles the API to
JavaScript in `api/dist/` (tsc, then the schema copied beside it); that is what the container runs,
with `node dist/server.js`, and what `npm start` runs. `npm run dev` and `npm run seed` stay on tsx
and need no build. What each test file covers: [testing.md](testing.md).

## Common problems

- **`ENOSPC: System limit for number of file watchers reached`** when starting Vite or `tsx watch`. On Linux every watched folder uses an inotify watch, shared by every program you run, and an editor that has a large folder open can use them all. Make the editor watch less, or raise `fs.inotify.max_user_watches`. In VS Code, add `node_modules`, `dist` and similar folders to `files.watcherExclude`. Without watchers, `npm run build && npm start` runs the API and `npm run build && npx vite preview --port 5173` serves the web app.
- **The login page says "Open ro-housing from its own address to sign in."** The sign-in request reached the API with an `Origin` other than `PUBLIC_ORIGIN`, which Vite's proxy only lets happen for a page from another address. Open <http://127.0.0.1:5173/ro-housing/>, or set `PUBLIC_ORIGIN` to the origin you serve the app from.
- **A blank page or 404 at <http://127.0.0.1:5173/>.** The app lives under `/ro-housing/` now.
- **"Can't reach the API: is it running?"** in place of a list. The web app is up but the API is not, or it stopped. Start it in its terminal (`cd api && npm run dev`) and press Retry.
- **`Port 5173 is in use, trying another one...`** Something else holds the port, often an earlier Vite. Vite moves to the next free port and prints it, and the app works there too: its proxy passes the page's own origin on as `PUBLIC_ORIGIN`. Ward's local client only knows port 5173, so "Sign in with Ward" needs 5173 free.
- **`requests for other host names are refused`** (403) from the API. The request was addressed to a name other than `localhost`, `127.0.0.1` or `[::1]`, such as the computer's network name. That check stops DNS rebinding. Use one of those names, or start the API with `HOST` set to the address you use.
- **imobiliare.ro gives nothing.** Since 2026-10-16 it answers plain requests with a Cloudflare block and headless Chromium with a CAPTCHA, so its search scraper fails and a pasted imobiliare link opens an empty form. The app does not try to get past either. Notes in [adapters.md](adapters.md).
- **A site's column goes empty after a Refresh.** Its markup changed. [adapters.md](adapters.md) says how to fix a scraper.
