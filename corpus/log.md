# Log

## [2026-10-21] todo | Briefs 01-10 filed from the 2026-10-20 improvement sweep

The corpus starts here, small (see [CLAUDE.md](CLAUDE.md)), to hold the briefs the owner asked for:
every Now and Next item of the 2026-10-20 sweep. Two finders read the API and the web app; every
item was re-read against the code and the price parsers were run on real input. No listing site
was fetched, and no brief suggests getting past a site's bot check ("Blocked means blocked" in
docs/decisions.md). Checks: tsc clean in both packages, tests 88/88 (api) and 40/40 (web).
16 raw findings, none dropped, filed as 10 briefs. Listed in [wiki/status.md](wiki/status.md).

## [2026-10-27] done | Brief 01: Close the API to other websites

CORS is removed and a hook in `api/src/lib/origin.ts` answers 403 to any request whose `Origin`
names another site; the app's own origins (Vite on 5173, as `127.0.0.1` or `localhost`) and
requests with no `Origin` pass. `WEB_ORIGINS` overrides the list. Code d58329c. Checks: api 97/97,
tsc clean; on a throwaway copy evil.example got 403 direct and through the Vite proxy, and the app's
own writes from Chrome got 200. Decision recorded in docs/decisions.md.

## [2026-10-27] done | Brief 02: Adapters read the price, not the numbers before it

One shared `extractPriceEur()` in `normalize.ts` replaces the eight adapters' loose regex: a price
token starting at a fresh number, 5,000-5,000,000 €, not €/m², not the "Preț vechi" amount, first
one wins. "Etaj 2 89.000 €" now gives 89000 and "Strada Aradului 12 299 000 €" 299000. Open calls
settled and pinned in tests: a range gives its upper end; a space-grouped price over 1,000,000 €
loses its millions. Code fd14226. Checks: api 104/104, tsc clean, grep on the adapters.

## [2026-10-27] done | Brief 03: Don't take the crossed-out old price

The imobiliare adapter reads its price with `extractPriceEur` instead of the largest amount, so
"109.000 € 131.890 € Preț vechi 131.890 €" gives 109000; discounts and add-ons are skipped by label,
not only by the 5,000 € floor. `pickLargestPriceEur` is removed. Reading imobiliare's own price
element waits until its bot check lifts. Code 73aa338. Checks: api 107/107 (an adapter test on
made-up cards), tsc clean.

## [2026-10-27] done | Brief 04: The form's price field: decimals are not thousands

The Saved form's price parser drops the currency, then a one- or two-digit decimal part, then the
thousands separators, and refuses prices over 10,000,000 €. "72000.00" was 7200000 and is now
72000. Code 3c5c673. Checks: web 49/49, tsc -b and vite build clean.

## [2026-10-27] done | Brief 05: Staleness from each source's last run, and a failed Refresh says so

The Listings table dims a row against its source's last successful run, read from `/api/sources`
on every load (or, when that source's last run failed, its newest `lastSeen`), not against a click
time held in page state. The Age cell's title shows the last-seen time. A failed Refresh shows a
`role="alert"` line and changes no row. Code d031d1d. Checks: web 52/52, tsc -b clean.

## [2026-10-27] done | Brief 06: Keep the pages alive when switching tabs

The three tab panels are `keepMounted`, so an open draft, the Listings sort and filter, and a
running Refresh survive a tab switch. Sources, the one page whose data changes behind it, re-reads
its last runs each time it opens and keeps unsaved edits (outside the brief's file list, see its
outcome). The API refuses a second Refresh during a run with 409, and the page says so. Code
23b71aa. Checks: api 109/109, web 55/55, tsc clean, vite build clean.

## [2026-10-27] done | Brief 07: Show an error when the API is down, not an empty shortlist

A shared `ApiErrorNotice` (role="alert" plus Retry) replaces a page's list when its load fails, so a
stopped API reads "Can't reach the API: is it running?" instead of "Nothing saved yet"; the same
notice covers a failed Sources Save, which keeps the edits. The list calls in `api.ts` now throw
`ApiError`, so a proxy 502 is told apart from the API's own error. Code 95430d3. Checks: web 59/59,
tsc -b and vite build clean.

## [2026-10-27] done | Brief 08: A second "Fetch details" must not wipe the open draft

When the open draft has edits (notes included), a second Fetch details, Enter in the link box or a
"save" from Listings shows an inline question naming the edited fields, with Replace draft and
Keep editing; without edits it fetches at once. Asking, not merging, because the new link may be
another flat. Code 117f738. Checks: web 62/62, tsc -b and vite build clean.

## [2026-10-27] done | Brief 09: Recover from a failed or crashed Chromium without a restart

`lib/playwright.ts` drops its cached launch when the launch fails or the browser disconnects, so
storia and the Saved tab's browser fallback work again on the next call. Code 17893c8. Checks: api
114/114 (a launch stub failing once, then succeeding), tsc clean, and a close-and-relaunch on the
real local Chromium with no site opened.

## [2026-10-27] done | Brief 10: Mark "+ TVA" prices so €/m² compares like with like

The price readers note "+ TVA" / "fără TVA" on the amount they take, a `price_plus_vat` column on
`listings` and `saved` stores it (added to old databases at boot by the new `db/migrate.ts`), and
both tables show "+TVA" beside the price and €/m²; the Saved form has a tick box for it. No gross
price is computed, as the brief left that to the owner. The owner's database gets the column on the
API's next start. Code f8152b9. Checks: api 122/122, web 65/65, tsc clean, vite build clean, boots
on a copy of the owner's database and a Chrome pass on a throwaway copy.

## [2026-10-27] done | Briefs 01-10 built

All ten sweep briefs are in done/, each with a code commit and a record commit on main, not pushed.
One extra docs commit (8848481) put back the "What we'd revisit" heading that brief 01's edit had
dropped from docs/decisions.md. Several briefs touched files outside their lists (06, 07, 10), named in
their outcomes. Open question for the owner: DNS rebinding straight at port 3000 (brief 01).

## [2026-10-27] todo | Brief 11 filed: research Firecrawl and Ollama

The owner asked whether to self-host Firecrawl with Ollama, or only Ollama, to make scraping and
searching for listings easier. Brief 11 is a
research brief: it splits the question into finding listings, reading one listing and getting past
blocking sites, scores small models on this laptop's CPU (no GPU is visible to WSL) against the
layered extractor, and ends in a recommendation. The CAPTCHA decision bounds it; self-hosted
Firecrawl lacks the hosted service's anti-bot engine, which the brief asks to confirm.

## [2026-10-28] decision | A Host check against DNS rebinding

The owner answered the question brief 01 left open: yes, the API should check
the `Host` header so a page rebinding its name to 127.0.0.1 is refused. Brief 12
is to be written; its line is in [wiki/status.md](wiki/status.md).

## [2026-10-28] done | Brief 12: Refuse requests whose Host is not this machine

A second `onRequest` hook (`api/src/lib/host.ts`, before brief 01's Origin hook) answers 403 when
`Host` is missing or its hostname is not `localhost`, `127.0.0.1`, `[::1]` or the `HOST` address,
so a page rebinding its name to 127.0.0.1 is refused straight at port 3000. The port is not
compared. Vite's proxy shorthand sets `changeOrigin`, so the app's own requests arrive as
`127.0.0.1:<port>`. Code 4c25974. Checks: api 133/133, tsc clean, and a throwaway copy with a fresh
database: rebound Host 403 by curl, and in Chrome the Listings and Saved tabs load and a save works.

## [2026-10-28] paused | Brief 11: research Firecrawl and Ollama

Started after brief 12 and paused by the owner during step 2. `docs/research-firecrawl-ollama.md`
(982c5ef) holds what Firecrawl v2.11.0's guide and source say about the self-hosted build: no
Fire-engine, so plain Playwright and fetch only; six services, two of them with 8 GB and 4 GB
limits; `/search` uses SearXNG if set, else scrapes DuckDuckGo. No containers, models or site
requests were run, so there are no scores and no recommendation. The brief stays in todo with a
note on where it stopped.

## [2026-10-28] paused | Brief 11: research Firecrawl and Ollama, second pass

Resumed after brief 12 and paused again when the owner cut the run to three agents. c554454 adds
to `docs/research-firecrawl-ollama.md` the Firecrawl run (2.0 to 2.9 GiB idle, 403 from
imobiliare.ro, one call became up to seven requests, `/search` scraped DuckDuckGo into ten search
pages, JSON extraction only via Ollama's OpenAI-compatible endpoint), scores on seven pages
(extractor 67/70, `qwen2.5:3b` 67/70 with nothing invented, layered 69/70, Firecrawl +
`qwen2.5:3b` 40/70 with a flat invented on the CAPTCHA page), the search comparison, the table and
a provisional recommendation: no Firecrawl; two extractor rules and an "OK, 0" warning first; the
owner to decide on imobiliare's RSS feed; a model only as an opt-in button. A laptop restart
cleared `/tmp` midway, losing `llama3.2:3b`'s first answers. Still missing: `llama3.2:3b` and
`qwen2.5:7b` scores. The brief stays in todo with a note.

## [2026-10-31] maintenance | README images retaken; the README names the "+ TVA" mark

A README refresh pass with the readme-docs standard. The 2026-10-27 fixes changed the screens the desktop images show, so `hero.webp`, `saved.webp` and `sources.webp` were taken again from `docs/images/demo-seed.mjs` in a scratch clone. The two phone shots stay: one needs the staged scrape mock and the other a live bot check from imobiliare.ro, which the workspace cannot reach. The README now says a price quoted before VAT is marked "+ TVA". Checked: `npm install` and `npm run dev` in `api/` and `web/`; the API's install could not download Playwright's Chromium here (`cdn.playwright.dev` is blocked), which only scraping needs, and the API and the web app both started.

The corpus also got the parts corpus-flow's bootstrap names that it lacked: `routing.md`, `lint.sh` (which also writes the wiki catalog into `index.md`) and `todos/`. Wiki pages beyond `status.md` were not added, since `docs/` keeps the knowledge here by the owner's choice; `CLAUDE.md` says so. `bash corpus/lint.sh` passes.

## [2026-11-02] maintenance | Briefs reset

Part of an estate-wide reset. The eleven done briefs are deleted; their knowledge was already in
`docs/` (decisions, architecture, adapters, testing, the worklog). Brief numbering restarts at
01, and the open research brief 11 is now
[01](briefs/done/01-research-firecrawl-and-ollama.md). The old briefs read like the grilling that
fed the first corpus. The last commit that held them is `9bd7f41`: read one with
`git show 9bd7f41:corpus/briefs/done/02-adapter-price-token.md`. Brief numbers in the entries above
refer to that set. [wiki/status.md](wiki/status.md) is a per-area snapshot instead of one line per
brief, and `docs/worklog.md` gained a session for 2026-10-28 to 2026-11-02 (the Host check, the
research paused, this reset). Code comments no longer cite brief numbers.


## [2026-11-04] todo | Briefs 13-18 filed from the owner's grill

The owner settled the open work in a grill on 2026-11-04 (and said yes to imobiliare's RSS feed
on 2026-10-28). Research brief 01 closes: Firecrawl is not built, the two missing model scores are
dropped. Six briefs, numbered in build order and after the old 12, since numbering never restarts
now ([CLAUDE.md](CLAUDE.md)): 13 a note that hitchmosher.ro's search URL is stale (the source stays
off), 14 two extractor rules (proposal A), 15 a warning for a Refresh that returns 0 (proposal B),
16 imobiliare's RSS feed, title and link only (proposal C), 17 ready for the VPS (sign-in like
brief-board, `/ro-housing` and `/ro-housing-api`, port 8809, a capped container; no deploy), and 18
"Fill the gaps" through Wicket (proposal D), written but not to be built until Wicket exists.

## [2026-11-04] done | Brief 01: research Firecrawl and Ollama, closed

Closed with the owner's 2026-11-04 decisions. Firecrawl is not built: too expensive to run here.
`docs/research-firecrawl-ollama.md` is final: "provisional" is gone, the two unscored models are
marked dropped, the "To finish" list became an Outcome section mapping proposals A to D onto briefs
14, 15, 16 and 18, and a short "Firecrawl on a bigger machine" section gives the measured costs; the
README links to it. Decision "No Firecrawl; a model only on request" in docs/decisions.md. No code.
Check: `bash corpus/lint.sh`.

## [2026-11-04] done | Brief 13: hitchmosher.ro's default search URL is stale

`docs/adapters.md` says the hitchmosher.ro source is off by the owner's choice and its default
URL (`/en/apartments/for-sale`) has had no listing links in its HTML since 2026-10-28, and what
reviving it would take. Docs only. Check: `bash corpus/lint.sh`.

## [2026-11-04] done | Brief 14: two extractor rules, a price outside a "Preț" label and a zone on one line

The single-listing reader gains a JSON-LD layer for the price (`offers.price` in euro, below
storia, above the labels) and a bare price line within five lines under the `<h1>`, and its zone
match no longer crosses a line break. The hitchmosher fixture is hand-built from the research's
description: no listing page could be reached without a browser (three requests, then stopped).
Also keeps a label's "+ TVA" mark when JSON-LD gives the same amount. Checks: api tsc clean,
vitest 139/139.

## [2026-11-04] done | Brief 15: a Refresh that returns 0 listings is a warning

`sources.last_run_count` records each working run's count; a 0 answers
`warning: 'no listings found'`, shows as EMPTY in the Refresh summary with a line naming the
sources, says "found no listings" on Sources, and no longer becomes the staleness cutoff, so a
broken adapter doesn't dim its site's listings. Any 0 is flagged. Decision recorded. Checks: api
tsc clean, vitest 141/141; web tsc -b clean, vitest 68/68.

## [2026-11-04] done | Brief 16: new Timișoara flats from imobiliare.ro's RSS feed

A tenth source, `imobiliare-feed`, reads `https://www.imobiliare.ro/rss-listings.xml` once per
Refresh (a plain request naming the app, no cookies, browser or retry) and keeps Timișoara flats
for sale, title and link only; it starts enabled with its URL filled in and refuses any other
URL. One live run kept 66. Decision "imobiliare's RSS feed, title and link only" recorded next to
"Blocked means blocked". Checks: api tsc clean, vitest 147/147.

## [2026-11-04] done | Brief 17: ready for the VPS (sign-in, sub-path, container); not deployed

Sign-in like brief-board (ward-auth 0.7.0 vendored with wzd_auth's script, a seeded local account,
Sign in with Ward, no sign-up, no rename; sessions write), the app at `/ro-housing/` and the API at
`/ro-housing-api` with the Host and Origin checks also allowing `PUBLIC_ORIGIN`, a Debian container
with Chromium's headless shell on `127.0.0.1:8809`, the database and the Report files on `/data`,
caps of 1 CPU, 1 GiB, no swap, 256 tasks. `docs/owner-setup.md` has everything the vps-deploy stack
needs. The image wasn't built (Docker not reachable from WSL). Checks: api tsc clean, vitest
162/162; web tsc -b clean, vitest 73/73, vite build; a curl walk through Vite's proxy on a throwaway
database. Open questions in [wiki/open-questions.md](wiki/open-questions.md).

## [2026-11-04] maintenance | Briefs 01 and 13-17 built; 18 waits for Wicket

The run's briefs are done except 18 (Fill the gaps through Wicket), which stays in todo until Wicket
exists. All commits on main, not pushed, nothing deployed. Board: ro-housing-01 was moved to Done;
13 to 18 have no tickets (creating them was refused), so the owner's next sync files them.

## [2026-11-04] todo | Brief 18 updated with Wicket's API as built

Wicket was built (not deployed) the same day; its API page in the wicket repo adds to the quoted
contract: a strict body (only `messages` and `format`), `?wait` held to 25, 503 `queue_full` past 200
waiting jobs, a 404 for a job read as cancelled (a restart forgets jobs), answers kept 10 minutes,
a reason on cancelled jobs, and `WICKET_URL` on the VPS being the public `/wicket-api` address, not
the box's loopback. [Brief 18](briefs/done/18-fill-the-gaps-with-wicket.md) now says each, in its
context and its steps. Still write-only.

## [2026-11-04] todo | Brief 19: the API runs built JavaScript

From the owner's memory review of the VPS (vps-deploy's `memory-on-the-box` research): the apps on
the box run built JavaScript, not tsx, and start with `node` directly. ro-housing idled at about 200
MiB under tsx on the laptop, so this lands before its first deploy.

## [2026-11-04] done | Brief 19: the API runs built JavaScript, started by `node`

`npm run build` compiles `api/src/` to `api/dist/` with plain tsc (`tsconfig.build.json`,
`rewriteRelativeImportExtensions`, tests left out, `db/schema.sql` copied); no bundler was needed.
The image gains a build stage and runs `CMD ["node", "dist/server.js"]`; tsx is a dev dependency
again and not in the runtime image; `dev` and `seed` stay on tsx, `start` runs the build. The seed
in the container is `node dist/seed.js`, which vps-deploy's ro-housing stack still prints the old
way. Idle, the same container: about 160 MiB and 24 tasks under tsx, about 112 MiB and 12 tasks
built. Checks: api tsc clean, vitest 162/162; both images built once; in the new one, health,
seed, sign-in, a Refresh of the RSS feed (93 listings), the Saved routes without a page fetch,
a clean SIGTERM stop. Decision "The API runs built JavaScript" recorded.

## [2026-11-04] decision | Wicket is cloud-only; brief 18 follows

The owner dropped Wicket's backup model on the VPS (its Ollama image was
6.55 GB against 7.1 GB free on the box) and every local-model idea with it:
Wicket calls Ollama Cloud only, and a cloud failure fails the job. Brief 18's
contract text loses `result.backup`, and the research write-up says so.

## [2026-11-05] done | Brief 18: Fill the gaps through Wicket

The Saved draft has a "Fill the gaps" button when the server has `WICKET_URL` and `WICKET_TOKEN`
and the draft has an empty field (disabled on a bot-check draft). Fetch details keeps the page text
(`details/pageText.ts`, the research's input, an hour in memory); `POST /api/saved/fill` asks
Wicket with exactly `{ messages, format }` for the empty fields only, every one nullable,
partitioning held to its four values; `GET /api/saved/fill/:id` passes Wicket's long poll through
(never above 25 s) and on `done` merges the answer (`details/fill.ts`: other keys and wrong types
dropped, the extractor's `sane()` ranges, now exported); `DELETE` cancels. Only ids this server
started are answered, Wicket's 404 reads as cancelled, `queue_full` reaches the form as a 503. The
form shows "You're number N, now serving M", then "Reading the page…", fills only the fields
still empty when the answer comes, each marked "from AI" until edited, and raw_json of the Save
gets `ai: { model, values }`. Leaving the draft cancels a job still going. Without the settings the
routes aren't registered. Refresh, Fetch details and the adapters never call Wicket. Wicket's API
page matched the brief. vps-deploy's ro-housing stack now passes `WICKET_URL` (the public
`/wicket-api`) and an optional `WICKET_TOKEN` secret. Checks: api tsc (and the build config) clean,
vitest 185/185; web tsc -b clean, vitest 79/79. Not run against a live Wicket; not deployed.

## [2026-11-06] todo | Brief 20: every hop of a fetch is checked

Promoted from the todo `check-every-hop-of-a-pasted-link` at the owner's
ask, built the way newspapper closed the same gap the same day: redirects
followed by hand with the check on every hop, the connection made with
`node:http`/`node:https` and a vetting lookup (no new dependency), every
`createSession()` fetch covered, and a Chromium route filter with the
rebinding gap there written down.

## [2026-11-06] done | Brief 20: every hop of a fetch is checked

`createSession()` follows redirects by hand (at most 5, one 20 s timeout for the chain), checks
every hop's host before requesting it, and makes each request with `node:http`/`node:https` and a
lookup that refuses unless every address is public, so the socket connects only to an address
that passed; no new dependency. Cookies set by a redirect go with the next hop; gzip, deflate and
br are decoded as `fetch` did; bodies are capped at 20 MB. `isPrivateAddress` judges NAT64 and
`::/96` as the IPv4 inside and refuses 6to4. Chromium: a route filter on the context for first
requests and popups, service workers blocked, and a DevTools session that checks each redirect
hop, since Playwright's route handler never sees those (checked against real Chromium).
Rebinding and WebSockets stay open in Chromium, written in decisions.md. Checks: api tsc clean,
vitest 244/244; foxfort's search (24 listings) and one foxfort listing fetched for real. Ready
for deploy: `node cli.ts ro-housing all` from vps-deploy.

## [2026-11-10] todo | Briefs 22-24 revised for the owner's grilling and the technical calls

- 22: `house-style` is vendored (a copy with a version header in `api/` and in `web/`, `house-style:sync`), so
  the Dockerfile needs no change; width 120 decided, with the 6,674-line reformat as the one-off cost; the 361
  single-quoted imports move to double quotes and the `.ts` import suffixes stay; `!` is an error in source and
  a warning in tests; the `.claude` un-ignore stays as step 3.
- 23: the theme control is a guarded `ToggleGroup` (the choice saves on each press, Q57); the two arbitrary text
  sizes become a named scale (Q62); the root font size already sits on `body` (Q44).
- 24: the error handler passes Fastify's 4xx through and never echoes a thrown message (Q43); no decorators as a
  test seam (Q56); stream and binary routes exempt (Q53, none here); the `from "fastify"` check uses double
  quotes, since brief 22 reformats the quotes.

## [2026-11-10] done | Brief 21: `@base-ui/react` 1.5.0 to 1.9.0, pinned exactly in `web/`

One commit (`chore(deps): @base-ui/react 1.9.0`): `web/package.json` and `web/package-lock.json` only. One copy, hoisted at `node_modules/@base-ui/react` 1.9.0; ten lockfile entries changed (eight versions plus two new nested `@babel/runtime` 8.1.0), as the brief predicted. In `web/`, `npx tsc -b`, `npx vitest run` (79 tests in 12 files) and `npm run build` pass. 1.9.0 still sets `data-active` on a selected tab (`TabsTabDataAttributes.js:24`), so `Tabs.tsx`'s styling holds.

## [2026-11-11] done | Brief 22: the house style and the quality harness

house-style 1.1.0 vendored at the root (`vendor/house-style/`, `npm run house-style:sync`), its tools pinned in a root `package.json` with no workspaces. Prettier at 120, double quotes and semicolons, in one reformat commit (113 files; the bundle compare shows no difference), hidden from blame by `.git-blame-ignore-revs`. `web/` extends the house tsconfig base; `api/` writes the flags out, since the image copies only `api/`. ESLint per project, with the six typed rules: 9 source `!`, 8 misused promises, 3 unnecessary assertions, the `require` calls, 6 parameter properties and 1 unused import fixed. Temporary warnings: `n/no-process-env` (10), `react-hooks/set-state-in-effect` and `refs` (5), dependency-cruiser's `lib-without-fastify` (4), and `check-structure --warn-only` (29 errors); `check-base-ui` runs strict. `npm run check` 40 s, `check:fast` 11 s. Root `CLAUDE.md` and `.claude/rules/api.md` and `web.md`; `.claude/rules/` is tracked. Owner steps: `git config blame.ignoreRevsFile .git-blame-ignore-revs`, and `node cli.ts ro-housing deploy` from vps-deploy.

## [2026-11-11] done | Brief 23: Base UI by the conventions, and the theme switch

Five commits. `check-base-ui` strict reported 0 before and after (its rules 4, 6 and 7 are review-only; their findings, the `.knob` class and the two transitions, are fixed by hand). `Select` requires `items` and `SelectValueLabel` is deleted; `Dialog` has the Escape guard and the initial-focus order, and the Report and Edit dialogs set `disablePointerDismissal`; the z-index scale, the `text-mark` size, the `shadow-knob` tokens and `@layer base` replace the raw numbers and `.knob`. Light, Dark and System: a `RadioGroup` in the Account dialog (the skill's rule 16 wins over the brief's ToggleGroup), `light-dark()` tokens with `data-theme` on `<html>`, and a script in `index.html` for the first paint. Screenshots at 1280 and 390 px of eight screens are pixel-identical in the light theme except the Account dialog, which gained the switch (the kept inputs at 13px needed `text-base`). 124 web tests pass. Owner step: `node cli.ts ro-housing deploy` from vps-deploy.

## [2026-11-12] done | Brief 24: the server in the code structure

Seventeen commits on `main` (`d3de342` to `ab1a85b`), one per step. `config.ts` is the one reader of the environment (`env.ts` and `paths.ts` folded in; `loadSeedConfig()`, `loadEnvFile()` with a root-finding test), and `n/no-process-env` is an error. `plugins/` holds the error handler (`{ error: string }`: a schema failure is a 400 with the first issue's message, Fastify's 4xx keep their status, anything else is a fixed 500 and the message is only logged), the Host and Origin guards, and the Ward sign-in moved unchanged, all in `fastify-plugin`; `server.ts` closes with `close-with-grace`. The routes moved to `features/` (health, sources, listings, issues, refresh, saved with fill and `details/`), `details/url.ts` to `lib/url.ts`, and every route got zod schemas and a response schema through `@fastify/type-provider-zod`. check-structure went from 0 errors and 31 findings to 0 and 2 (rule 11) and is strict; dependency-cruiser has no override left. 132 replies compared before and after through the real app: 122 identical, none dropped; ten differ on purpose (a bad `PUT /api/sources/:id` body, a bad sort or order, a non-string issue body and Fastify's own 4xx now answer 400 in `{ error }`, and a 500 answers a fixed sentence). Checks: `npm run check` exit 0 (api 297 tests, web 124), the build, and the built server on a real socket (health 200, SIGTERM exit 0 in 0.03 s); `docker build` skipped (local Docker I/O error). Ready for deploy: `node cli.ts ro-housing server` from vps-deploy. Details in [the brief](briefs/done/24-the-server-in-the-code-structure.md) and [docs/decisions.md](../docs/decisions.md).

