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
The user toggles sources on/off from the UI. Sources start with `enabled=0` except `imobiliare` and `storia`. The DB seed only inserts on conflict-ignore, so re-running boot never overrides user choices. Since 2026-11-04 the RSS feed source (`imobiliare-feed`) starts enabled too, with its URL filled in.

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

Since 2026-11-06 "only the first hop" no longer holds either: every fetch checks each redirect hop and connects only to an address that passed, and Chromium refuses local addresses too (see "Every hop of a fetch is checked" below). This early check stays, so a pasted local link gets a plain 400 before anything is fetched.

## Improvement sweep briefs (2026-10-27)

### Only the web app's own origin
The API had `@fastify/cors` with `origin: true` and no sign-in, so any page open in the browser could read the saved flats with their notes, start a Refresh, or write files into `issues/` that read like the owner's own feedback. The web app never needed CORS: it reaches the API through Vite's proxy, on its own origin. So the plugin is gone, and an `onRequest` hook (`api/src/lib/origin.ts`) answers 403 to any request whose `Origin` header is present and is not the app's: `http://127.0.0.1:5173` or `http://localhost:5173`, or the comma-separated list in `WEB_ORIGINS`. Vite's proxy rewrites `Host` but passes `Origin` on unchanged. Requests with no `Origin` (curl, a same-origin GET) pass.

The check is on `Origin`, not only on the missing CORS headers, because a plain form post from another page needs no preflight and would still have been run. Another local port counts as another website: when Vite moves to 5174 because 5173 is taken, saves are refused until that origin is in `WEB_ORIGINS`. DNS rebinding straight at port 3000 was left open at first: a page that points its own name at 127.0.0.1 makes same-origin requests, which carry no `Origin`.

Since 2026-10-28 a second `onRequest` hook (`api/src/plugins/host-guard.ts`, registered before the `Origin` one) closes it. It answers 403 when the `Host` header is missing or its hostname is not `localhost`, `127.0.0.1` or `[::1]`, plus the `HOST` address when that variable binds the API to another one. A rebound page can hide its `Origin` but not its `Host`, which still names its own site. Only the hostname is compared, not the port, so moving the API or Vite to another port needs no change. Vite's proxy shorthand sets `changeOrigin`, so the app's own requests reach the API as `Host: 127.0.0.1:3000` whichever name the browser used. Vite answers a rebound name on its own port with 403 too (`server.allowedHosts`), before the proxy runs. With `HOST=0.0.0.0` other machines are refused unless they use the name in `HOST`, so a LAN setup sets `HOST` to the machine's LAN address.

### The tab pages stay mounted; one Refresh at a time
Base UI unmounts a hidden tab panel by default, so leaving Saved threw away an open draft with its notes, and leaving Listings dropped the sort, the filter and the result of a running Refresh, then offered Refresh again. All three panels now use `keepMounted`. The cost is that a hidden page does not re-read the API when it comes back; only Sources needs to (its last-run lines change with every Refresh), so it re-reads them each time its tab opens and keeps rows with unsaved edits. Separately, `POST /api/refresh` answers 409 while a run is in progress, so two Refreshes never hit the sites in parallel, whatever the UI does.

### Prices before VAT are marked, not converted
Developers list new builds as "92.033 € + TVA", next to resale flats whose price includes VAT, so their €/m² looked about a fifth cheaper than it is. The price readers now notice "+ TVA", "+TVA", "(+TVA)" and "fără TVA" next to the amount they take, and a `price_plus_vat` flag on `listings` and `saved` carries it to a "+TVA" marker beside the price and the €/m² in both tables. The mark belongs to the amount it follows: in "111.359 € 92.033 € +TVA" the price taken is 111359 and it is not marked. Working out a gross price is left out on purpose: the rate is 21%, or 9% for a first home under the reduced-rate cap, and which applies is the buyer's case, not the listing's. On a saved apartment the mark is a tick box beside the price that the user confirms like every other field.

The new column is the first one added since the tables were created. `schema.sql` has it for new databases, and `db/migrate.ts` adds it to existing ones when `PRAGMA table_info` shows it missing, which is safe on every boot. `user_version` stays for one-off data changes.

## The 2026-11-04 grill

### No Firecrawl; a model only on request
The Firecrawl and Ollama research ([research-firecrawl-ollama.md](research-firecrawl-ollama.md)) ran self-hosted Firecrawl v2.11.0 and small models on the laptop's CPU. Firecrawl needs five containers, 3.3 GB of images and 2 to 3 GiB of RAM before a model is loaded, got the same 403 from imobiliare.ro as the app, and through it a model invented a flat on a CAPTCHA page. The owner decided on 2026-11-04 not to build it: too expensive to run on this setup, and a nice-to-have only on a bigger machine. A model may help read fields the rules miss, but only when the owner asks for it on a draft, never in Refresh or Fetch details, and every value it gives is marked for the owner to check. The two model scores still missing were dropped.

### imobiliare's RSS feed, title and link only
imobiliare.ro has shown the app a bot check since 2026-10-16, and "Blocked means blocked" rules out getting past it. Its RSS feed is a different thing: the site lists `/rss-listings.xml` in its own `robots.txt` and serves it to a plain request without a check. The owner said yes on 2026-10-28 and confirmed it on 2026-11-04, on these terms: the feed is read once per Refresh by a request that names the app, only the feed's title and link are kept, no listing page is fetched for it, and each link opens in the owner's own browser. If the feed ever answers with a bot check, the source fails like any other; nothing tries again or around it. It is a source like the nine search adapters, not a screen of its own, so it runs inside the button-only Refresh and its rows sit in the Listings table with the price blank. It starts enabled, with its URL filled in.

### An empty Refresh is a warning, not a success
"Silent skip on adapter failure" covers an adapter that throws. A site that changes its markup more often makes its adapter find no cards and return an empty list, which Refresh reported as "OK, 0" and counted as a successful run, so the staleness rule dimmed every listing from that site as delisted (the research found this for hitchmosher.ro). Since 2026-11-04 a run that returns no listings still counts as having worked (`last_run_ok = 1`, so Sources doesn't say "failed"), but `last_run_count = 0` keeps it from becoming the staleness cutoff, and the Refresh summary shows it as EMPTY with a line saying the search URL or the page may have changed. Any 0 is flagged, even for a source that never had listings: a search URL that finds nothing in Timișoara is as likely wrong as a site that changed.

### On the VPS at /ro-housing, behind sign-in
"Two terminals, no concurrently/turbo/Docker" said: local-only project, no deployment. On 2026-11-04 the owner decided to move ro-housing to the VPS, so the repo now has a container and sign-in; the two terminals stay for local work. The calls:

- **Sign-in exactly like brief-board**: the estate's ward-auth library, vendored into `api/vendor/ward` and `web/vendor/ward`; a local account made by `npm run seed`, and "Sign in with Ward". No sign-up and no rename. Unlike brief-board, a session may write: there is no CLI, the browser is the only client. On a shared origin a script in another app could send the cookie; the Origin check refuses other websites, and the other apps are the owner's own.
- **The sub-path** `/ro-housing/` for the app and `/ro-housing-api` for the API, like brief-board; locally too, so one build runs in both places. The Host and Origin checks (against DNS rebinding and other websites) stay and also allow `PUBLIC_ORIGIN`.
- **Port 8809** on the box's loopback; 3000 stays the local default.
- **One container** on Debian (Playwright's Chromium needs glibc) with the headless shell only, run through `tsx` (now a runtime dependency; Node's own type stripping refuses the code's parameter properties), the SQLite file and the Report button's files on a `/data` volume, capped at 1 CPU, 1 GiB, no swap and 256 tasks. Measured: about 200 MiB for the API, 100 to 190 MiB for Chromium on a local page. A killed Chromium is relaunched on the next call. (Since 2026-11-04 the container runs built JavaScript instead of `tsx`: see "The API runs built JavaScript" below.)
- **Start fresh**: no database to move. **Refresh stays button-only**: no schedule on the VPS either.

Every site answered the VPS as it answers the owner's computer on 2026-11-04 (imobiliare.ro 403 on both), so moving adds no blocking. The setup is in [owner-setup.md](owner-setup.md).

### The API runs built JavaScript
The VPS has 3.7 GiB of RAM for every app on it, and the owner decided on 2026-11-04, after a memory review of the box, that its apps run built JavaScript started by `node` itself: no `tsx` (which keeps esbuild and its transform work in every process) and no `npm` sitting above the server. The image compiles the API in a build stage with plain `tsc` (`api/tsconfig.build.json`, `npm run build`): `rewriteRelativeImportExtensions` turns the source's `./app.ts` imports into `./app.js`, tsc compiles the parameter properties Node's own type stripping refuses, and the build copies `db/schema.sql` beside `db/index.js`. A bundler was not needed: tsc emits this code cleanly, and `dist/` keeps `src/`'s layout, so `paths.ts` still finds the repo root two levels up and `dist/` imports the vendored ward-auth at the same relative path. The runtime stage holds `dist/`, `vendor/`, `package.json` (for `"type": "module"`) and the production dependencies; `tsx`, TypeScript and the tests are not in it. `npm run dev` and `npm run seed` stay on tsx for development; `npm start` runs the build, like the container. Measured on the laptop, the same container idle: about 112 MiB in `docker stats` and 12 tasks as built JavaScript, against about 160 MiB and 24 tasks under `tsx` (whose esbuild helper also kept a second process and a little CPU busy); the image is 12 MB smaller.

### A model only on request, through Wicket
The "No Firecrawl" call above left one use for a model: reading the fields the rules missed, when the owner asks. On 2026-11-04 the owner settled how, and it was built on 2026-11-05. A "Fill the gaps" button on the Saved draft starts one job on Wicket, the estate's queue for LLM calls, which holds the Ollama Cloud key, runs one call at a time and picks the model. The job reads the page text Fetch details kept (the input the research scored: the URL, the title and tags, the JSON scripts, the visible text), so the site is not asked a second time. It asks only for the fields still empty, with a JSON schema where every field may be null and a prompt that says never to guess. The answer goes through the extractor's sanity ranges, and the form fills a field only if it is still empty when the answer comes, marked "from AI" until edited. Nothing is saved until Save, and raw_json records which fields the model gave and its name. While the job waits, the form shows Wicket's ticket line ("You're number N, now serving M") and a Cancel. Rejected: a model inside Refresh or Fetch details (the research's slow CPU runs and the invented flat), a model on the box itself (Wicket asks the cloud only since 2026-11-04, so the box keeps its memory), and the browser calling Wicket directly (the token stays on the server). The button is off without `WICKET_URL` and `WICKET_TOKEN`, and disabled on a bot-check draft, where there is no listing to read.

## Fetching on someone else's say-so (2026-11-06)

### Every hop of a fetch is checked, and the connection too
With the app on the VPS, a pasted link is a request the server makes from inside the box. The old guard checked only the pasted link's first address: `fetch` then followed redirects unchecked, so a public page could send the server to `127.0.0.1` or another app's port, and `fetch` resolved the name again when it connected, so a name with a short TTL could answer public to the check and private to the connection (DNS rebinding). newspapper closed the same gap the same day; the approach is copied, not the code.

Every fetch through `createSession()` (`api/src/lib/fetch.ts`) now follows redirects by hand, at most 5, and checks each hop before requesting it: http(s) only, and every address the host resolves to must be public. The request goes through Node's own `node:http` / `node:https` with a `lookup` option that replaces the connection's name resolution: it resolves, refuses unless every address is public, and hands the socket only those, so the socket connects only to an address that passed. TLS still checks the certificate against the host name. The owner's calls: no new dependency (newspapper's owner turned down the `undici` package for the same fix), and every `createSession()` fetch goes this way, the adapters' search pages included, not only pasted links: one path is simpler to keep right, and the known sites pass anyway. A small adapter keeps what the session used from `fetch`: the cookie jar now works per hop (a cookie set by a redirect goes with the next request), gzip, deflate and br bodies are decoded, the 20 s timeout covers the whole chain, and a refused hop throws the same "local addresses are not allowed" error. One addition of ours: a body over 20 MB, or a compressed one that would grow past that, is refused, since the session now does the decoding `fetch` did.

`isPrivateAddress` (`api/src/lib/url.ts`) learned the IPv6 forms that carry an IPv4 address: NAT64 (`64:ff9b::/96`) and IPv4-compatible (`::/96`) are judged as the IPv4 address inside, like IPv4-mapped already was; 6to4 (`2002::/16`) is refused whatever it carries, since the relay it goes through is anyone's. It also refuses multicast and reserved addresses, and anything that is not an IP address.

Two plain `fetch` calls stay outside the session: the imobiliare RSS feed, which only ever asks for one fixed address, and the Wicket client, whose address is the server's own setting.

### Chromium refuses local addresses, but resolves names itself
The Chromium fallback loaded whatever the page asked for. Now a route filter on the browser context checks the first request of every chain (the page, its frames, its scripts and images) against the same rule and aborts a local one; requests from any other page, such as a popup, are aborted outright, and service workers are blocked, since route handlers don't see their requests. Playwright's route handler is never called for the hops a redirect leads to (its docs say so, and a check on 2026-11-06 confirmed it: the handler saw a page's address but not the one it redirected to, which the server still received), so a DevTools session on the page pauses each redirect hop and runs the same check before it goes out. A refused navigation reads as the same "local addresses are not allowed" error.

The accepted gaps: Chromium resolves names itself when it connects, so DNS rebinding stays possible there, and WebSockets are not filtered (Playwright's WebSocket routing replaces the page's `WebSocket` class with a script, which a bot check could notice). The DevTools session sees the frames in the page's own process; the headless shell put a cross-site frame there in the 2026-11-06 check, but a frame Chromium ever moves to its own process would have its redirect hops unchecked. If any of this starts to matter, the way to close all three is to run Chromium through a small proxy in the API process that resolves and checks every host itself.

## The house style, formatted and checked (2026-11-11)

### The estate's format, tools and checkers, from one vendored copy at the root
The repo adopted the estate's house style: Prettier at width 120 with trailing commas, double quotes and semicolons, the house tsconfig flags, ESLint with six typed rules and the house shapes, knip, dependency-cruiser and the two convention checkers. The configs come from a copy of the library's `house-style` folder in `vendor/house-style/` (version 1.1.0, with a header saying where it came from), refreshed by `npm run house-style:sync`; it is not a dependency. The outliers moved to the house format in one reformat commit: 361 single-quoted imports became double-quoted and nearly every file changed, about 3,200 lines each way in 113 files. `.git-blame-ignore-revs` hides it from `git blame`. The `.ts` import suffixes stay, with `allowImportingTsExtensions`.

**A root `package.json`, tools and scripts only.** The vendored ESLint config resolves its plugins from where it sits, so the tool pins (ESLint, Prettier, knip, dependency-cruiser, typescript-eslint and their plugins) live in a root `package.json` with its own lockfile and `.npmrc`. It has no `workspaces` and no app dependency; `api/` and `web/` keep their own lockfiles, so the Docker build (which copies only `api/`) and vps-deploy's build of `web/` are unchanged, and `npm ci --omit=dev` in `api/` installs no linter. Each package has its own `eslint.config.js`, `knip.config.js` and `check:fast`; the root's `check` and `check:fast` call both. Rejected: npm workspaces (the "Two independent npm packages" call stands), a copy of the configs in each package (two copies to sync), and a `git` or tarball dependency for the configs.

**`api/tsconfig.json` keeps the house flags itself.** The Docker build stage copies only `api/`, so a base extended from `../vendor/` would not exist there. `web/tsconfig.json` extends the vendored base and overrides the module settings for Vite. `exactOptionalPropertyTypes` is not on yet (16 errors in `api`, 4 in `web`).

**Temporary exceptions**, each with a dated comment that says what removes it: `react-hooks/set-state-in-effect` and `react-hooks/refs` are warnings (four pages set state in an effect and `SavedPage` reads a ref while rendering; each fix changes render timing and needs a test first), `check-base-ui` reports nothing and runs strict. (The other three went on 2026-11-12, with the server in the code structure below: `n/no-process-env` and dependency-cruiser's `lib-without-fastify` are errors, `check-structure` is strict.) `!` is an error in source and a warning in tests (24 left).

## Base UI by the conventions (2026-11-11)

**Selects take `items`.** `Select` wraps Base UI's root and requires an `items` map (value to label), so the trigger shows the label, not the raw value, and `SelectValueLabel` is gone. The empty "All sources" value is an item with the key `""`.

**Dialogs.** `Dialog` skips a close whose Escape another control already used, focus lands on the first `[data-autofocus]` (else the first field, else the first button), and the Report and Edit dialogs set `disablePointerDismissal` so an outside tap doesn't throw away what was typed.

**Layers and tokens.** The bare-element rules sit in `@layer base`; the z-index scale (`z-header`, `z-overlay`, `z-dialog`), the type scale (`text-mark`) and the knob's bevel (`shadow-knob`, `--color-bevel`) are `@theme` tokens, and `.knob` is gone. Moving the rules into the layer made inputs lose to `text-sm`, so `Input` and `Textarea` say `text-base` (13px) to keep the look.

**Theme: Light, Dark, System, a RadioGroup.** The choice is kept on the device (`localStorage`, key `theme`), not on the server, so the control is a `RadioGroup` whose arrow keys choose (the base-ui skill's rule 16), not a guarded ToggleGroup as the brief said. Tokens are `light-dark()` pairs and `data-theme` on `<html>` sets `color-scheme`, so System tracks the operating system with no script; `@custom-variant dark` keys off the attribute for the rare class that needs it. A script in `index.html` sets the attribute before first paint, light when nothing is saved.

## The server in the code structure (2026-11-12)

The API follows the estate's code structure for Fastify servers (the code-structure skill). What it decided here:

- **`features/<name>/`, one folder per part, used through its `index.ts`.** `health`, `sources`, `listings`, `issues`, `refresh`, and `saved`, which holds the fill routes as well: they share `recordAiFill` and the page-text cache. `plugins/` holds what every route inherits (the error handler, the Host and Origin guards, sign-in), each wrapped in `fastify-plugin`; `lib/` imports no Fastify; `server.ts` alone listens and `app.ts` builds. `adapters/` stays a folder of its own, because `db/` seeds the sources from its registry and `refresh` runs it; it is not a feature, so the boundary check has nothing to except.
- **Zod schemas on every route, a response schema included**, through `@fastify/type-provider-zod`. A schema lives in its feature's `schema.ts`: the web is built apart and the image copies only `api/`, so no `shared/` can exist, and `web/src/api.ts` keeps its hand-written types. A route declares only the statuses its handler sends itself, each error with `{ error: string }`. Each route has a test that compares the reply's keys with what the web has always been sent.
- **One error handler, the repo's body `{ error: string }`.** A schema failure is a 400 with the first issue's message, so the form's sentences ("title must be text", "floor is above the number of floors in the building") are zod messages and read as before. A 4xx Fastify or a plugin raised keeps its status and its message. Anything else is a 500 with a fixed sentence and the error is logged: a thrown message never reaches the client. The one visible change: the web showed `Internal Server Error` or `Bad Request` for these, and shows the sentence now.
- **Settings.** `config.ts` is the only reader of the environment (`n/no-process-env` is an error everywhere else, tests apart). The database still opens when its module loads (`db/index.ts`), and the import-time reads stay: `server.ts` and `seed.ts` call `loadEnvFile()` and import the app after it. Turning the database into an `openDatabase(path)` that `buildApp` calls is a larger change, because every store function reads the singleton; it is left for a later brief. `loadEnvFile()` has a test that fails when the repo root's `.env.example` is not found from where `config.ts` sits, since an `.env` that is no longer found would only be silently unread.
- **Dependencies are plugin options, not decorators.** `buildApp(config, { wicket })` passes Wicket and `fillable` to the saved routes, the issues folder is an option of the issues plugin, and a test passes its own. The `accounts` decorator is gone: the seed and the tests build their accounts from the database.
- **Shutdown** is `close-with-grace` (10 s): it stops taking requests, finishes those in flight, closes the app and the browser, and exits. A held `POST /api/refresh` (minutes) or a Wicket long poll (up to 25 s) would outlast the 10 s, so `plugins/shutdown.ts` aborts `app.shutdownSignal` in a `preClose` hook (an `onClose` hook runs only after every request in flight has finished). The refresh stops between sources and inside one (the adapters' requests and Chromium pages get the signal), the Wicket poll is cut, and both answer 503 "The server is restarting"; the close then finishes at once. A source the shutdown cut is not recorded as a failed run. Fetch details is not covered and still holds the close up to its own timeouts. The timeout values are unchanged.
- **Timeouts.** `keepAliveTimeout` is 125 s, above Caddy's two minutes of idle upstream connection, so the proxy never sends a request down a socket just closed. `connectionTimeout` and `requestTimeout` stay at Fastify's defaults (none): a refresh answers only when every source has been read, which takes minutes, and the fill poll waits up to 25 s, so a limit would cut a working request.
- **`trustProxy` stays unset.** ward-auth takes `trustedProxies` as its own option (`AUTH_TRUSTED_PROXIES`) and reads the socket and `X-Forwarded-For` itself, so Fastify's setting would change nothing it uses.
- **Not done.** A rate-limited 404 handler: no `@fastify/rate-limit` is here, and an unknown path is answered 404 by Fastify's own body (`{ message, error, statusCode }`) before sign-in, as before. `saved/details/extract.ts` is 560 lines (rule 11 warns at 400) and stays, since nothing was added to it.

## What we'd revisit if usage proves us wrong

- **Dedup**: if the same apartment appears 3+ times across sources every refresh, that noise might outweigh the false-positive risk. Add a "group by (rooms, m², ±5% price, fuzzy-neighborhood)" view as a toggle.
- **Scheduler**: if the user actually wants meaningful price history and refresh-click density isn't enough, add an optional single daily cron — not a heavy scheduler.
- **Playwright per-site**: if more sites turn out to need it, fine. If only storia needs it forever, also fine.
- **Saved vs listings**: if most saved apartments also show up in the Listings table, join them on normalized URL to show the refresh price history next to the saved row.
- **Re-check a saved apartment**: a "fetch again" that shows what changed on the page (price drops, taken down) without overwriting the user's values.

## The console, re-ruled (2026-11-13)

The owner approved the redesign "The console, re-ruled" on the estate redesign board, with every question there standing as proposed. The retro console stays: mono, sharp corners, 1 px ink rules, one burnt-ochre accent. Two earlier lines of [design.md](design.md) are **changed**; their old text is kept here as history.

### The island has a hard shadow in light (changed 2026-11-13)

- **Was:** "No box-shadows on standard elements. Cards, inputs, buttons — all flat." Only the Select and Dialog popups carried a hard offset.
- **Now:** each tab's island (the tabs, the head band and the table as one surface, on Listings, Saved and Sources) carries a 3 px hard offset shadow in `rule`, in light only. Popups keep a hard offset in both themes, never a blur. Dark drops the island's shadow: the panel steps up by lightness and keeps a 4.4:1 rule edge. The utility is `shadow-island dark:shadow-none`, because Tailwind inlines the token and a `[data-theme]` override of it never reached the utility.

### Sentence case, a 12 to 20 px scale (changed 2026-11-13)

- **Was:** "We get hierarchy from size + weight + uppercase + tracking", with headings, tab labels, table headers and badges in UPPERCASE with `tracking-wide`, a 13 px body and a 10 px smallest size.
- **Now:** sentence case everywhere, no tracked capitals (the wordmark alone stays uppercase). The scale is 12, 14, 16, 18 and 20: body and table at 14, nothing under 12. The face is Source Code Pro, self-hosted from `@fontsource-variable/source-code-pro` 5.3.1. `shadow-knob`, `color-bevel` and `--tracking-wide` are gone: nothing used them once Refresh became a flat secondary button.

### Phone navigation is a bottom bar (changed 2026-11-13)

- **Was:** the top tabs on every width.
- **Now:** below 821 px the same Base UI `TabsList` (every panel still `keepMounted`) is a sticky bottom bar of Listings, Saved and Sources. One list, so each tab exists once for assistive tech.

### The new mark, source health and the table's break

- **A row is `new`** when its `firstSeen` is two days old or less, computed in the web from data it already has (`isNew`, the same day count as the Age column). There is no seen flag in the API.
- **Source health:** the source control lists each site with its last run; a failed site shows a square `failed` chip, and the head band carries `<site> failed on its last run`.
- **The table breaks at 960 px**, where titles still take two lines. Between 960 and 1199 the table keeps Location under the title; from 640 to 959 the listings are two-column cards; below 640, one column.
- **No saved mark on a listing.** The saved table has no link to listings (saved is keyed by URL), so a listing's Save opens a draft as before.
- **The URL field stays on unchecked sources**, on a phone too; hiding it would change what the field is for.
- **Stale rows** are drawn as the app computes them (`staleCutoffs`); a ring before the Age and a key in the foot say so.

