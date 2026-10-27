# Getting started

The README has the short version. This is the full one.

## Prerequisites

- Node 24 and npm. It has been built and tested on Node 24. Older versions may work but are untried.
- About 300 MB of disk for the Chromium build Playwright downloads on the API's first install. Only storia.ro's search scraper, and single listings whose site refuses a plain request, use it.
- Nothing else: no database server, no Docker, no accounts. SQLite is a file.

## Install and run

The repo is two separate npm packages with no root `package.json`, so `npm run dev` at the root fails. Use two terminals.

**Terminal 1, the API:**

```bash
cd api
npm install    # also runs `playwright install chromium`
npm run dev    # tsx watch: Fastify on http://127.0.0.1:3000, restarts when a file changes
```

**Terminal 2, the web app:**

```bash
cd web
npm install
npm run dev    # Vite on http://127.0.0.1:5173, proxies /api to the API
```

Open <http://127.0.0.1:5173>.

On its first start the API creates `data/ro-housing.db`, with the nine sources from the scraper registry, and an empty `issues/` folder at the repo root for the Report button. Both are gitignored. To start over, stop the API and delete `data/ro-housing.db*`.

## Settings

There is no `.env`. The API reads three environment variables:

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `3000` | Port the API listens on |
| `HOST` | `127.0.0.1` | Address it binds to. Keep it local, since the API has no sign-in |
| `WEB_ORIGINS` | `http://127.0.0.1:5173,http://localhost:5173` | The web app's origins. A request whose `Origin` header names any other site gets 403, so other pages open in the browser cannot use the API |

The web app's proxy target is fixed at `http://127.0.0.1:3000` in [web/vite.config.ts](../web/vite.config.ts). If you change `PORT`, change it there too.

## First use

1. **Sources.** Tick the sites you want and paste a search-results URL from each, such as `https://www.storia.ro/ro/rezultate/vanzare/apartament/timis/timisoara`, then press Save. imobiliare.ro and storia.ro start ticked, and the seven agency sites start unticked.
2. **Listings.** Press Refresh. The scrapers run one site after another, and a strip above the table says how many listings each site gave or why it failed. Every Refresh adds a point to each listing's price history.
3. **Saved.** Paste one listing's link and press Fetch details, or press "save" on a row in Listings. Check the draft, fill the gaps, add a note and press Save. A link that is already saved shows "Already saved" with Edit instead of fetching again.

Nothing runs in the background: the data is as fresh as your last Refresh.

## Tests and checks

Run each in both `api/` and `web/`:

```bash
npm test            # Vitest, once
npm run test:watch  # Vitest, watching
npx tsc --noEmit    # typecheck
```

`npm run build` in `web/` typechecks and builds into `web/dist/`. What each test file covers: [testing.md](testing.md).

## Common problems

- **`ENOSPC: System limit for number of file watchers reached`** when starting Vite or `tsx watch`. On Linux every watched folder uses an inotify watch, shared by every program you run, and an editor that has a large folder open can use them all. Make the editor watch less, or raise `fs.inotify.max_user_watches`. In VS Code, add `node_modules`, `dist` and similar folders to `files.watcherExclude`. Without watchers, `npm start` runs the API and `npm run build && npx vite preview --port 5173` serves the web app.
- **"Can't reach the API: is it running?"** in place of a list. The web app is up but the API is not, or it stopped. Start it in its terminal (`cd api && npm run dev`) and press Retry.
- **`Port 5173 is in use, trying another one...`** Something else holds the port, often an earlier Vite. Vite moves to the next free port and prints it. Lists still load, but the API refuses Save, Refresh and Report from that origin with 403 ("requests from other websites are refused"). Free port 5173, or start the API with that origin allowed, such as `WEB_ORIGINS=http://127.0.0.1:5174 npm run dev`.
- **imobiliare.ro gives nothing.** Since 2026-10-16 it answers plain requests with a Cloudflare block and headless Chromium with a CAPTCHA, so its search scraper fails and a pasted imobiliare link opens an empty form. The app does not try to get past either. Notes in [adapters.md](adapters.md).
- **A site's column goes empty after a Refresh.** Its markup changed. [adapters.md](adapters.md) says how to fix a scraper.
