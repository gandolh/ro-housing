# Architecture

## Repo layout

```
ro-housing/
  api/             Fastify backend. Exposes /api/sources, /api/listings, /api/refresh, /api/saved.
  web/             React + Vite frontend. Talks to api over fetch.
  data/            SQLite file (ro-housing.db) lives here. Gitignored.
  docs/            This folder.
```

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
   write last_run_at + last_run_ok on the source
        │
        ▼
Respond with { perSource: [{ id, ok, count, errorMsg? }] }
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
extractDetails(html, url): four layers, first value per field wins
   1. storia's __NEXT_DATA__ JSON   2. label/value lines ("Nr. camere:" + "3")
   3. Open Graph (title, image)     4. phrases in title and prose ("etajul 3 din 3")
        │
        ▼
Respond { draft, found, via, problem }   (nothing written to the DB)
        │
User checks each field ("from page" / "edited" / "not on page"), edits, clicks Save
        ▼
POST /api/saved → validate → INSERT into saved (raw_json = what the page said)
```

`PUT /api/saved/:id` replaces the whole record (the form always sends every field); `DELETE /api/saved/:id` removes it. Edits never re-fetch the page.

## Data model

Four tables. See `api/src/db/schema.sql` for the canonical version.

- **sources** — one row per adapter we've implemented. Seeded at boot from the adapter registry. Carries the user-pasted `search_url`, an `enabled` flag, and the last-run audit fields.
- **listings** — one row per (source_id, source_uid) pair. `source_uid` is whatever stable identifier we can extract from the source URL (numeric id, slug). `first_seen` and `last_seen` are unix-ms timestamps; `last_seen` only updates on a successful re-scrape.
- **saved** — apartments the user saved from a link (session 5). One row per normalized URL (`UNIQUE`). The columns hold what the user confirmed; `raw_json` holds what the page said at fetch time (the draft, which layer filled each field, the description) and `fetched_at` when. Never touched by Refresh, never linked to `listings`.
- **price_history** — append-only. One row per (listing, observation). Primary key is the composite, so re-running refresh in the same millisecond is a no-op.

Listings whose `last_seen` is older than the most recent refresh of their source are "stale" — likely delisted. UI dims them rather than deleting; the user might want to see the last known price. Since 2026-10-27 the table works this out from `/api/sources` on every load (`staleCutoffs` in `ListingsTable.tsx`): the source's `last_run_at` when its last run succeeded, else the newest `last_seen` among its listings, minus 5 seconds. A failed Refresh changes neither, so it dims nothing. The Age cell's title gives the last-seen time.

## Adapter strategy split

Two strategies live in `api/src/adapters/`:

- **cheerio path** — plain `fetch` with a browser UA + cookie persistence (`lib/fetch.ts`), then parse with cheerio. Used by 8 of 9 adapters.
- **Playwright path** — shared chromium launcher (`lib/playwright.ts`), navigate, wait for the listing grid, dump `page.content()` into cheerio. Used by storia.ro only.

Both end up passing rendered HTML to cheerio, so listing-parsing code looks similar across the two paths. The only structural difference is *how the HTML got here*.

## Why no dedup, no scheduler, no auth

Each of these is a category of complexity the user explicitly opted out of in scoping. Revisit only if a clear pain point appears in actual use. See `decisions.md` for the reasoning at the time.

## What lives where

- `api/src/server.ts` — Fastify bootstrap, the guard that refuses other websites' origins (`lib/origin.ts`; there is no CORS), route registration.
- `api/src/db/` — schema, connection, typed query helpers. No ORM.
- `api/src/adapters/` — one file per site, all exporting the same `Adapter` interface from `types.ts`. New site = new file + register in `index.ts`.
- `api/src/details/` — reading one listing page for the Saved tab: `url.ts` (normalize, site name, local-address guard), `fetchPage.ts` (plain fetch, Chromium fallback, bot-check detection), `extract.ts` (the four layers). Site-independent; `fixtures/` holds trimmed real pages for its tests.
- `api/src/lib/` — shared infrastructure: `fetch.ts` (cookie-aware HTTP), `playwright.ts` (browser singleton), `normalize.ts` (Romanian price/rooms/m² parsers).
- `api/src/routes/` — route handlers. Thin; business logic lives in adapters and db.
- `web/src/pages/` — `ListingsPage` (the unified table), `SavedPage` (add by link, the draft, the saved table, the edit dialog) and `SourcesPage` (per-source URL + enable toggle).
- `web/src/lib/` — `format.ts` (price, m², €/m², floor formatting shared by both tables), `apartment.ts` (form strings ↔ saved record, floor input "P"/"D").
- `web/src/components/` — `ListingsTable`, `PriceHistory` (inline-SVG sparkline), `ApartmentForm` (the draft and edit form), `SavedTable`, `ReportIssueButton`.
