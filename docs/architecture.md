# Architecture

## Repo layout

```
ro-housing/
  api/             Fastify backend. /api/sources, /api/listings, /api/refresh, /api/saved, /api/issues,
                   /api/health, and sign-in under /auth. vendor/ward/ holds the ward-auth library.
  web/             React + Vite frontend at /ro-housing/. Talks to the API at /ro-housing-api.
  infrastructure/  The container for the VPS: Dockerfile and docker-compose.yml.
  data/            SQLite file (ro-housing.db) lives here. Gitignored.
  docs/            This folder.
```

## Addresses and sign-in

The browser sees one origin. The web app is at `/ro-housing/` (Vite's `base`); every API call goes
to `/ro-housing-api/...`, which Vite's dev proxy (locally) or Caddy (on the VPS) forwards to the API
with the prefix stripped; the API strips it too when reached directly (`stripApiPrefix` in
`app.ts`). Locally the API is on `127.0.0.1:3000`; in the container it is `0.0.0.0:8809`, published
on the box's loopback only ([owner-setup.md](owner-setup.md)).

Every request passes three guards before a route runs, in this order (`api/src/app.ts`):

1. **Host** (`lib/host.ts`): this machine's names, `HOST`, and `PUBLIC_ORIGIN`'s host, which Caddy
   passes through. Anything else is a rebound name: 403.
2. **Origin** (`lib/origin.ts`): no `Origin`, the Vite dev origins (or `WEB_ORIGINS`) and
   `PUBLIC_ORIGIN`. Another website: 403.
3. **Session** (the vendored ward-auth plugin): every `/api` route but `GET /api/health` needs the
   `ro_housing_session` cookie (HttpOnly, path `/ro-housing-api`); without it, 401. Sign-in is
   `POST /auth/login` with a local account made by `npm run seed`, or "Sign in with Ward" when the
   `WARD_OIDC_*` settings are set. No sign-up route, no rename. A session may write.

The accounts and sessions are ward-auth's own `auth_*` tables in the app's SQLite file. In the
browser, `AuthGate.tsx` shows the login page until the session hook says signed in; any API call
answered 401 makes it ask again. `/ro-housing/login` and `/ro-housing/account` are addresses (the
account one opens a dialog over the app, so an open draft survives); the tabs are not.

Two independent npm packages. No monorepo tooling — `npm install` and `npm run dev` happen separately in each. Intentional: keeps the moving parts minimal for a personal project.

## Request flow

```
User clicks Refresh in web/
        │
        ▼
POST /api/refresh          (409 if a refresh is already running)
        │
        ▼
For each source where enabled=1 AND search_url IS NOT NULL (sequential, not parallel):
   load adapter from adapters/index.ts registry
   call adapter.scrape(searchUrl) → ScrapedListing[]
   inside try/catch:
     for each scraped row:
       upsert into listings (on conflict bumps last_seen + updates fields)
       append a price_history row
   write last_run_at + last_run_ok (+ last_run_count when it worked) on the source
        │
        ▼
Respond with { perSource: [{ id, ok, count, errorMsg?, warning? }] }
   (warning: 'no listings found' when a run worked but returned nothing)
```

Sequential on purpose — running 8 scrapers in parallel would amplify our visible request pattern and tank our chances against anti-bot heuristics. Refresh takes a few seconds longer; nobody cares.

## Saving one listing (the Saved tab)

```
User pastes a listing link, clicks Fetch details
        │
        ▼
POST /api/saved/scrape { url }
        │  normalize the URL (drop utm_*, fbclid, the hash, a trailing slash)
        │  already saved? → return it as `existing`, fetch nothing
        │  refuse localhost / private-network hosts
        ▼
fetchListingPage: plain fetch → on 401/403/429/503 or a bot-check page, headless Chromium
        │  still a bot check → problem { kind: 'blocked' }, empty draft
        ▼
extractDetails(html, url): five layers, first value per field wins
   1. storia's __NEXT_DATA__ JSON   2. JSON-LD offers (the price only)
   3. label/value lines ("Nr. camere:" + "3")   4. Open Graph (title, image)
   5. phrases in title and prose ("etajul 3 din 3"), a bare price under the <h1>
        │
        ▼
Respond { draft, found, via, problem }   (nothing written to the DB)
        │
User checks each field ("from page" / "edited" / "not on page"), edits, clicks Save
        ▼
POST /api/saved → validate → INSERT into saved (raw_json = what the page said)
```

A second Fetch details rebuilds the whole draft, so when the open draft has edits (any field that differs from what the page gave, or notes), the page asks before replacing it; this also covers a "save" handed over from Listings.

`PUT /api/saved/:id` replaces the whole record (the form always sends every field); `DELETE /api/saved/:id` removes it. Edits never re-fetch the page.

## Data model

Four tables. See `api/src/db/schema.sql` for the canonical version.

- **sources** — one row per adapter we've implemented. Seeded at boot from the adapter registry. Carries the user-pasted `search_url`, an `enabled` flag, and the last-run audit fields: when, whether it worked, and (since 2026-11-04) `last_run_count`, how many listings a run that worked returned.
- **listings** — one row per (source_id, source_uid) pair. `source_uid` is whatever stable identifier we can extract from the source URL (numeric id, slug). `first_seen` and `last_seen` are unix-ms timestamps; `last_seen` only updates on a successful re-scrape.
- **saved** — apartments the user saved from a link (session 5). One row per normalized URL (`UNIQUE`). The columns hold what the user confirmed; `raw_json` holds what the page said at fetch time (the draft, which layer filled each field, the description) and `fetched_at` when. Never touched by Refresh, never linked to `listings`.
- **price_history** — append-only. One row per (listing, observation). Primary key is the composite, so re-running refresh in the same millisecond is a no-op.

`listings` and `saved` both have `price_plus_vat` (2026-10-27): 1 when the page gave the price before VAT ("+ TVA"), and the tables then show "+TVA" beside the price and the €/m². It is NULL on rows from before the column. Columns added after the first release are listed in `db/migrate.ts`, which adds each one to an existing database at boot when it is missing.

Listings whose `last_seen` is older than the most recent refresh of their source are "stale" — likely delisted. UI dims them rather than deleting; the user might want to see the last known price. Since 2026-10-27 the table works this out from `/api/sources` on every load (`staleCutoffs` in `ListingsTable.tsx`): the source's `last_run_at` when its last run succeeded and found at least one listing, else the newest `last_seen` among its listings, minus 5 seconds. A failed Refresh changes neither, so it dims nothing, and since 2026-11-04 neither does a run that found no listings: a site that changed its markup makes its adapter return an empty list, and every one of its listings looked delisted. The Refresh summary marks such a source EMPTY and says so; Sources says "found no listings" beside its last run. The Age cell's title gives the last-seen time.

## Adapter strategy split

Two strategies live in `api/src/adapters/`:

- **cheerio path** — plain `fetch` with a browser UA + cookie persistence (`lib/fetch.ts`), then parse with cheerio. Used by 8 of the 9 search adapters.
- **Feed path** — `imobiliare-feed` reads imobiliare.ro's RSS feed with one plain `fetch` that names the app, parsed by cheerio in XML mode; title and link only.
- **Playwright path** — shared chromium launcher (`lib/playwright.ts`), navigate, wait for the listing grid, dump `page.content()` into cheerio. Used by storia.ro only.

Both end up passing rendered HTML to cheerio, so listing-parsing code looks similar across the two paths. The only structural difference is *how the HTML got here*.

## Why no dedup, no scheduler

Each of these is a category of complexity the user explicitly opted out of in scoping. Revisit only if a clear pain point appears in actual use. See `decisions.md` for the reasoning at the time. Auth was on that list too until 2026-11-04, when the app was readied for the VPS (decisions.md, "On the VPS at /ro-housing, behind sign-in").

## What lives where

- `api/src/server.ts` — the entry point: loads `.env` (`env.ts`), reads the settings (`config.ts`, which names any bad variable), builds the app and listens. In development tsx runs it as TypeScript; `npm run build` compiles `src/` to `api/dist/` with `tsc -p tsconfig.build.json` (tests and fixtures left out, `db/schema.sql` copied), and the container runs `node dist/server.js`.
- `api/src/app.ts` — the Fastify app: the prefix strip, the guards that refuse a `Host` other than this machine (`lib/host.ts`, against DNS rebinding) and other websites' origins (`lib/origin.ts`; there is no CORS), the ward-auth plugin, the health check, route registration.
- `api/src/accounts.ts`, `api/src/seed.ts` — the accounts on the app's database, and the script that makes one. `api/src/paths.ts` — where the database and the issues folder are (`RO_HOUSING_DB`, `RO_HOUSING_ISSUES_DIR`).
- `api/vendor/ward/`, `web/vendor/ward/` — the vendored ward-auth library (a generated copy; upgrade it with the wzd_auth repo's vendoring script, never by hand).
- `api/src/db/` — schema, connection, typed query helpers, `migrate.ts` (columns added after the first release). No ORM.
- `api/src/adapters/` — one file per site, all exporting the same `Adapter` interface from `types.ts`. New site = new file + register in `index.ts`.
- `api/src/details/` — reading one listing page for the Saved tab: `url.ts` (normalize, site name, local-address guard), `fetchPage.ts` (plain fetch, Chromium fallback, bot-check detection), `extract.ts` (the five layers). Site-independent; `fixtures/` holds trimmed real pages for its tests.
- `api/src/lib/` — shared infrastructure: `fetch.ts` (cookie-aware HTTP), `playwright.ts` (browser singleton), `normalize.ts` (Romanian price/rooms/m² parsers).
- `api/src/routes/` — route handlers. Thin; business logic lives in adapters and db.
- `web/src/pages/` — `ListingsPage` (the unified table), `SavedPage` (add by link, the draft, the saved table, the edit dialog) and `SourcesPage` (per-source URL + enable toggle).
- `web/src/lib/` — `format.ts` (price, m², €/m², floor formatting shared by both tables), `apartment.ts` (form strings ↔ saved record, floor input "P"/"D").
- `web/src/components/` — `ListingsTable`, `PriceHistory` (inline-SVG sparkline), `ApartmentForm` (the draft and edit form), `SavedTable`, `ReportIssueButton`, `ApiErrorNotice` (the alert with Retry that a page shows in place of its list when the API fails, worded by `apiErrorMessage` in `api.ts`), `AccountButton` (the user's name in the header and the account dialog).
- `web/src/` sign-in — `base.ts` (`API_BASE`, the app's base path), `auth.ts` (sets up the vendored hooks; a 401 asks again), `route.ts` (the three addresses), `AuthGate.tsx`, `LoginPage.tsx`, `messages.ts` (the hooks' error codes in words).
