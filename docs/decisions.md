# Decisions

Append-only. When you make a call that you might second-guess later, record it here with the reasoning. Read this before changing any of the rules below.

## Scoping decisions (v1)

### Timișoara-only, buy-only
A personal-use aggregator works because the user knows the local market and has specific filters. Generalizing to "all Romania, all transaction types" turns this into an aggregator-aggregator and isn't useful to one user. Adding rent or other cities later means a UI filter, not new adapters.

### On-demand only, no background scheduler
History gets one data point per refresh click. Tradeoff explicitly chosen: density of history = how often the user opens the app. Acceptable because the alternative (cron + always-on process) materially raises the project's complexity (process supervision, scheduling library, dealing with failures while user isn't watching) for marginal benefit at personal scale.

### No dedup
Same apartment listed on imobiliare + the agency's own site shows up twice. We considered fuzzy-matching on (rooms, m², price, neighborhood) and dropped it: the false-positive rate of merging genuinely-different apartments is worse than the visual noise of duplicates. The "duplicate" listings often have different prices — that's *useful*, not noise.

### Silent skip on adapter failure
If one of 9 adapters throws, the others still produce results. Aggregator-of-flaky-sources can't have "any failure tanks the refresh" semantics, or the app stops working the day any site changes markup.

## Technical decisions

### SQLite + better-sqlite3, no ORM
Single-user, single-machine. Anything heavier (Postgres + connection pool + ORM + migration tool) buys nothing here. Schema is hand-written SQL applied idempotently at boot via `CREATE TABLE IF NOT EXISTS`. When the schema needs to evolve, add a column with a separate `ALTER TABLE` statement (also idempotent) — no migration framework.

### `better-sqlite3` specifically (not `node:sqlite`, not `sqlite3`)
Synchronous API maps cleanly to single-user request handling — no Promise plumbing around every query. Mature, battle-tested. The native build dep is fine for a local project.

### Cheerio + Playwright, not just one
Originally tried to keep it cheerio-only. Live-verified that storia.ro 403s on plain fetch — would have shipped a broken adapter. Accepting the Playwright dep (~300MB chromium download) for the one site that needs it.

### Required dep, not optional/lazy-loaded
The user explicitly chose to install Playwright for all setups even though only one adapter uses it. Simpler code paths, simpler README, single dev environment. The cost (one-time chromium download) is bearable.

### Two terminals, no concurrently/turbo/Docker
The user dev workflow is `cd api && npm run dev` in one terminal, `cd web && npm run dev` in another. Considered concurrently or turbo for a unified `npm run dev` at root; rejected as additional surface area for a one-person project. Considered Docker; rejected — local-only project, no deployment.

### Strict TypeScript, no linter/formatter in v1 (Vitest added in session 4)
Originally opted into "strict TS only" — no Vitest, no ESLint, no Prettier — to keep the v1 surface area small. Vitest was added in session 4 once we had an actual reason: a Playwright bug audit surfaced ten regressions, and the fixes needed regression tests so they wouldn't re-break silently. No linter/formatter yet; revisit only when we hit a conflict that one would settle. See [testing.md](testing.md) for the setup.

### Sequential refresh, not parallel
With 9 sources hit in parallel, our request pattern looks more bot-like. Sequentially, with normal request spacing, we look like a tab-switching user. Refresh takes a few extra seconds; that's fine.

### `enabled` flag persisted in DB, not in code
The user toggles sources on/off from the UI. Sources start with `enabled=0` except `imobiliare` and `storia`. The DB seed only inserts on conflict-ignore, so re-running boot never overrides user choices.

### Adapter registry is a plain object map
`adapters/index.ts` exports `ADAPTER_REGISTRY: Record<string, Adapter>`. Considered file-system auto-discovery (read every `*.ts` in adapters/, import dynamically). Rejected — 9 files is small enough that explicit registration is clearer and survives bundling.

### Schema migrations via `PRAGMA user_version` (session 4)
Originally said in this file that schema evolves via idempotent `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` statements. That holds for structural changes, but it doesn't help when the *seed defaults* change for rows that already exist. In session 4 we discovered that toggling imobiliare/storia to default-enabled didn't take effect on dev DBs created before session 2, because `INSERT OR IGNORE` never touches existing rows.

Decision: use SQLite's built-in `PRAGMA user_version` as a one-shot migration latch. The boot logic in `api/src/db/index.ts` reads `user_version`, and if it's below the current expected number, runs a one-shot UPDATE then bumps the pragma. Next boot is a no-op. The migration condition `last_run_at IS NULL` is a deliberate heuristic: it means "this row has never produced data", which is the safest signal that the user hasn't relied on it yet — rows the user has actually run keep whatever `enabled` setting they have.

### No bare-element CSS rules after `@import 'tailwindcss';` (session 4 lesson)
A `button { background: transparent; border: none; padding: 0 }` block in `styles.css` looked innocent but overrode every Tailwind utility on every button because unlayered rules outrank `@layer utilities`. The rule going forward: don't add bare-element selectors to `styles.css`. If you genuinely need to reset a native element's defaults, wrap the rule in `@layer base { ... }` so it sits below utilities in the cascade. Better still, let Tailwind's preflight handle the reset.

## Saved apartments (session 5)

### A separate `saved` table, not a flag on `listings`
`listings` is overwritten by every Refresh. A saved apartment holds values the user confirmed or typed (a corrected price, a floor the page didn't give, notes), and a Refresh must never touch them. It also covers sites that have no search adapter at all. So: its own table, keyed by normalized URL, with no link to `listings`. Cost: a listing that is in both shows up in both, with no price history on the saved side.

### The page is a draft; nothing is saved without the user
Same rule as shelfmark's book lookup. `POST /api/saved/scrape` only reads; the form marks every field "from page", "edited" or "not on page"; only Save writes. Scrapers are wrong in quiet ways (apostu's own page says "decomandat" in the prose and "semidecomandat" in its details block), so the user is the last check, not the extractor.

### One generic extractor, not one per site
The search adapters are per site because search cards differ a lot. Listing pages mostly carry Open Graph tags and a details block of Romanian labels, so one layered extractor covers storia (its JSON) and the four agency sites tested, and does something useful on a site never seen. Only storia has a site-specific layer, because its JSON is exact.

### Blocked means blocked
When a site shows a CAPTCHA even to headless Chromium (imobiliare.ro's DataDome on 2026-10-16), the app says so and opens the empty form with the link filled in. It does not add stealth plugins or solve challenges. Shelfmark took the same stance on the national library's CAPTCHA.

### Store the photo's link, not the photo
Keeps the "no image storage" scope. The thumbnail breaks if the listing is taken down; `raw_json` still has what the page said. Revisit if dead thumbnails get annoying: download once on save, as shelfmark does for covers.

### Refuse local addresses in the scrape endpoint
The API answers any origin (`cors: origin: true`), so any page open in the browser could ask it to fetch a URL. The endpoint refuses `localhost` and private-network IPs (checked after DNS). Only the first hop is checked; redirects are followed unchecked. Enough for a localhost tool.

Since 2026-10-27 the API no longer answers other origins (see "Only the web app's own origin" below), so the first sentence no longer holds. The local-address guard stays as a second line.

## Improvement sweep briefs (2026-10-27)

### Only the web app's own origin
The API had `@fastify/cors` with `origin: true` and no sign-in, so any page open in the browser could read the saved flats with their notes, start a Refresh, or write files into `issues/` that read like the owner's own feedback. The web app never needed CORS: it reaches the API through Vite's proxy, on its own origin. So the plugin is gone, and an `onRequest` hook (`api/src/lib/origin.ts`) answers 403 to any request whose `Origin` header is present and is not the app's: `http://127.0.0.1:5173` or `http://localhost:5173`, or the comma-separated list in `WEB_ORIGINS`. Vite's proxy rewrites `Host` but passes `Origin` on unchanged. Requests with no `Origin` (curl, a same-origin GET) pass.

The check is on `Origin`, not only on the missing CORS headers, because a plain form post from another page needs no preflight and would still have been run. Another local port counts as another website: when Vite moves to 5174 because 5173 is taken, saves are refused until that origin is in `WEB_ORIGINS`. Not covered: DNS rebinding straight at port 3000, where a same-origin GET carries no `Origin`; a `Host` check would close it.

### The tab pages stay mounted; one Refresh at a time
Base UI unmounts a hidden tab panel by default, so leaving Saved threw away an open draft with its notes, and leaving Listings dropped the sort, the filter and the result of a running Refresh, then offered Refresh again. All three panels now use `keepMounted`. The cost is that a hidden page does not re-read the API when it comes back; only Sources needs to (its last-run lines change with every Refresh), so it re-reads them each time its tab opens and keeps rows with unsaved edits. Separately, `POST /api/refresh` answers 409 while a run is in progress, so two Refreshes never hit the sites in parallel, whatever the UI does.


- **Dedup**: if the same apartment appears 3+ times across sources every refresh, that noise might outweigh the false-positive risk. Add a "group by (rooms, m², ±5% price, fuzzy-neighborhood)" view as a toggle.
- **Scheduler**: if the user actually wants meaningful price history and refresh-click density isn't enough, add an optional single daily cron — not a heavy scheduler.
- **Playwright per-site**: if more sites turn out to need it, fine. If only storia needs it forever, also fine.
- **Saved vs listings**: if most saved apartments also show up in the Listings table, join them on normalized URL to show the refresh price history next to the saved row.
- **Re-check a saved apartment**: a "fetch again" that shows what changed on the page (price drops, taken down) without overwriting the user's values.
