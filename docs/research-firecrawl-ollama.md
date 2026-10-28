# Research: Firecrawl and Ollama for finding listings

**In progress. Paused for the second time on 2026-10-28**, when the owner cut the parallel run to
three agents because five overloaded the laptop. Done: the Firecrawl run, the imobiliare.ro try,
the search check, and the scores of the extractor, of `qwen2.5:3b` and of Firecrawl with
`qwen2.5:3b`. Missing: the scores of `llama3.2:3b` (stopped on its first page) and `qwen2.5:7b` (not
started), and timings on a quiet machine. The recommendation below is provisional until those are
in; [brief 11](../corpus/briefs/todo/11-research-firecrawl-and-ollama.md) stays in todo.

The question, from the owner on 2026-10-27: should the app self-host Firecrawl with Ollama, or
Ollama alone, "so that it's easier to scrape and search online for housing offers"? It splits into
three jobs:

1. **Finding new listings across sites**, which the nine search adapters do today.
2. **Reading one listing's fields**, which the layered extractor (`api/src/details/extract.ts`) does
   for the Saved tab.
3. **Getting past sites that block us**, today imobiliare.ro's DataDome CAPTCHA. The decision
   "Blocked means blocked" in [decisions.md](decisions.md) rules out stealth plugins and CAPTCHA
   solving, and every option here stays inside it.

Everything below was run on this laptop on 2026-10-28, CPU only, while other builds shared the
machine; each timing has the `uptime` load average beside it.

## Where it points so far

Don't add Firecrawl. It needs Docker, five containers and 2 to 3 GiB of RAM before a model is
loaded, and imobiliare.ro refused it just as it refuses the app. Through Firecrawl, `qwen2.5:3b`
made up a whole flat on the CAPTCHA page and read a different flat's numbers off a long page cut
short. Called directly, the same model did well: 67 of 70 fields right, nothing invented. Behind
the extractor it filled the price and floor count the rules missed on a site they had never seen.
It is also slow on this CPU: 10 seconds to over 5 minutes a page, depending on what else was
running, where the extractor takes milliseconds. Two of the extractor's three misses on that site
are plain rules (a price outside a "Preț" label, a zone regex that ran across a line break), and
two small deterministic fixes cover them for free. So the provisional order is: the rules and a
warning for empty sources first (proposals A and B). The owner decides on imobiliare's RSS feed
(C). A model only comes in as an opt-in button (D), and only if the missing scores don't change
the picture.

| Job | What helps | What doesn't |
|---|---|---|
| 1. Finding listings | The adapters as they are, plus a warning when one returns 0 (proposal B). imobiliare's RSS feed, if the owner accepts it (proposal C) | Web search: one query gave 10 search pages and no listing. Firecrawl's crawl and map still read each site's own pages |
| 2. Reading one listing | Two more deterministic rules in the extractor (proposal A); maybe a model on request for what is still empty (proposal D) | A model in the automatic path: it takes minutes on this CPU, and through Firecrawl it invented a flat |
| 3. Sites that block us | Nothing inside the decision. Self-hosted Firecrawl got a 403 from imobiliare.ro like the app does | Firecrawl's hosted anti-bot engine is not in the self-hosted build, and buying a way past a CAPTCHA is what the decision rules out |

## Job 1: finding new listings

**Web search finds search pages, not listings.** Firecrawl's `/v2/search` with no SearXNG set fell
back to DuckDuckGo (see below). One query, "apartament 2 camere de vanzare Timisoara", answered in
2.2 s with 10 results: every one was a portal's search or category page (olx, publi24, imobiliare,
storia, imoradar24, ofera), none a single listing. So search leads back to the pages the adapters
already read. What it can do, once, is name portals the app doesn't cover: olx.ro, publi24.ro,
imoradar24.ro and ofera.ro came up here.

**An LLM reading a site's own search page** replaces CSS selectors with a prompt. It still fetches
the same page, so it changes nothing about blocking, and it costs a model call per page of results:
on this CPU that is minutes per Refresh, against the seconds the adapters take now. Its advantage,
not breaking when a class name changes, doesn't help with the kind of break seen here.
hitchmosher.ro's search page at the pattern in [adapters.md](adapters.md) (`/en/apartments/for-sale`)
had no listing links in its HTML on 2026-10-28; the cards are filled in by a script, and even the
page Firecrawl rendered had only two listing links, under `/ro/proprietate/`, which the adapter's
`/apartments/` pattern doesn't match. An LLM given that HTML has nothing to read either. If the
owner's hitchmosher source points there, its adapter returns an empty list, which `refresh.ts`
reports as "OK, 0" and counts as a successful run, so the staleness rule dims every hitchmosher
listing as delisted. Proposal B makes that a warning.

**Feeds.** imobiliare.ro's `robots.txt` lists `/rss-listings.xml` among its sitemaps. One plain
request on 2026-10-28 got it with HTTP 200, no bot check: a nationwide feed of about 2,900
listings published in the previous 28 hours, with a title, a link and a date each (no price),
about 140 of them mentioning Timișoara. The listing pages it links to are the ones that have
answered the app with the CAPTCHA since 2026-10-16 (not retried here), so the app could list "new
on imobiliare" with titles and links for the owner to open in a normal browser, and nothing more. Whether that fits "Blocked means blocked" is the owner's call
(proposal C); it solves no challenge, but it is a way round the page that shows one.

## Job 2: reading one listing

Seven pages were scored, ten fields each, against a hand-checked answer:

- the five pages in `api/src/details/fixtures/` (storia, foxfort, primum, apostu, and the DataDome
  page, which has no listing on it);
- the full foxfort page those trims came from (159 KB of HTML as Firecrawl's Chromium saw it, 133 KB
  by a plain request; the extractor and `qwen2.5:3b` gave the same answers on both);
- one full page from hitchmosher.ro, a site the extractor has no fixture or test for.

A field is **right** when it matches (both empty counts), **wrong** when the page has a value and
the answer is another one, **missed** when the page has one and the answer is empty, and
**invented** when the page has none and the answer gives one. Two calls on judgment: apostu's
partitioning counts either way, because its own page says "decomandat" in the prose and
"semidecomandat" in the details; hitchmosher's "imobil cu 4 niveluri" accepts 3 or 4 floors.

The fixtures are the extractor's own test set, trimmed to what it reads, so it scores 50/50 there
by construction. The full hitchmosher page is the fair test.

Right / wrong / missed / invented:

| Reader | 5 fixtures (50 fields) | Full foxfort (10) | Full hitchmosher (10) | All 70 | Time per page |
|---|---|---|---|---|---|
| The extractor | 50 / 0 / 0 / 0 | 10 / 0 / 0 / 0 | 7 / 1 / 2 / 0 | 67 / 1 / 2 / 0 | 4 to 214 ms |
| `qwen2.5:3b` alone | 49 / 1 / 0 / 0 | 9 / 1 / 0 / 0 | 9 / 1 / 0 / 0 | 67 / 3 / 0 / 0 | 10 s to 5.2 min |
| The extractor, then `qwen2.5:3b` for the fields it left empty | 50 / 0 / 0 / 0 | 10 / 0 / 0 / 0 | 9 / 1 / 0 / 0 | **69 / 1 / 0 / 0** | the model's time, on pages with a gap |
| Firecrawl + `qwen2.5:3b` (below) | 31 / 2 / 10 / 7 | 1 / 6 / 3 / 0 | 8 / 2 / 0 / 0 | 40 / 10 / 13 / 7 | 57 s to 4.5 min |
| `llama3.2:3b` | not scored yet | | | | |
| `qwen2.5:7b` | not scored yet | | | | |

`qwen2.5:3b`'s three wrong answers were all areas or storeys: foxfort's "D+P+2" read as 4 floors
(the rule reads 2), and on both full pages the total area including balconies (153.2 and 84 m²)
instead of the usable area (135.8 and 76 m²). On the DataDome page it returned all nulls. Behind
the extractor it filled hitchmosher's price (145,000) and floor count (4); the one wrong field left
is the extractor's own zone, which a layer behind it can't correct.

### Ollama alone: how it was run

- Ollama 0.24.0, the host's systemd service, CPU only. Models: `qwen2.5:3b` (3.1B), `llama3.2:3b`
  (3.2B) and `qwen2.5:7b` (7.6B), all Q4_K_M; picked because they are the common small multilingual
  models and fit in RAM next to everything else. qwen3 was left out because its thinking mode adds
  minutes on a CPU.
- **Input**, the same for every page and what a layer in the app would send: the URL, `<title>`,
  the Open Graph and description tags, the JSON scripts (JSON-LD and storia's `__NEXT_DATA__`, at
  most 6,000 characters each), then the visible text one node per line with `script`, `style`,
  `nav`, `footer` and `select` removed, as `extract.ts` does (at most 12,000 characters). That is
  0.1 to 1.6 thousand characters for the fixtures, 6,700 for the full foxfort page and 4,400 for
  hitchmosher; 330 to 3,400 prompt tokens.
- **Prompt**: a system message naming the ten fields with their Romanian words and conventions
  ("parter" is 0, usable not built area, the zone not the city, "P+4" is 4), and "when the page does
  not give a field, return null. Never guess". Ollama's `format` was a JSON schema with every field
  nullable and partitioning limited to the four values; `temperature` 0, `seed` 1, `num_ctx` 8192.
  The same model gave the same fields in two runs an hour apart.
- **Time** is Ollama's own `total_duration`; **RAM** is the runner process's peak resident size
  (`VmHWM`).

`qwen2.5:3b` timings, in two runs on the same pages:

| Page | Run 1, 15:09 (load 11 to 19) | Run 2, 16:07 (load 13 to 37) |
|---|---|---|
| storia | 67 s (7.6 s of it loading the model) | 282 s |
| foxfort | 44 s | 109 s |
| primum | 30 s | 243 s |
| apostu | 28 s | 262 s |
| DataDome page | 10 s | 40 s |
| full foxfort | 183 s (the rendered page, 3,352 tokens) | 107 s (the plain page, 2,796 tokens) |
| full hitchmosher | 312 s | 69 s |

Peak RAM 2.6 to 2.8 GiB. Output ran between 0.6 and 15 tokens a second depending on the other
builds on the laptop, so these are what the owner would see on a busy machine, not its best.
During a Docker build the same primum page took 180 s.

`llama3.2:3b` got through the five fixtures in run 1 (51 to 236 s each at load 25 to 34, peak RAM
3.1 GiB), but its answers were in the scratch folder that the restart cleared, so it has no scores;
run 2 was paused on its first page. `qwen2.5:7b` was pulled and not run: during run 1 the laptop
had under 1 GB of RAM free with swap full, and loading a 4.7 GB model would have pushed the other
agents' builds into swap.

### What the extractor got wrong on the unseen page

On hitchmosher it found 7 of 10. The three misses are rules, not reading comprehension:

- **Price.** The page shows "145.000 Eur" on its own line under the title, and the prose says
  "Pretul de vanzare este 145.000 euro"; the label rule wants a line that starts with "Preț".
  The page's JSON-LD also carries `"offers": {"price": "145000", "priceCurrency": "EUR"}`. The
  extractor skips JSON-LD because on the first four sites it only described the agency
  ([adapters.md](adapters.md)); this site puts the offer in it.
- **Zone.** The phrase layer's `zona\s+([A-Z]…)` let `\s` cross a line break, so "zona Lidia" plus
  the next line's "Apartament" became "Lidia\nApartament".
- **Floors in the building.** "imobil cu 4 niveluri" has no rule; "imobil cu 10 etaje" does.

Proposal A covers the first two. The third is a guess at what "4 niveluri" counts, so it is left
for the user, as the draft already does.

## Job 3: sites that block us

One Firecrawl `/v2/scrape` call for imobiliare.ro's Timișoara search page, the URL in
[adapters.md](adapters.md), on 2026-10-28 at 14:43. Its Chromium got **HTTP 403**. Firecrawl
treats 401, 403 and 429 as "proxy inadequacy" and retries with a `stealthProxy` flag
(`apps/api/src/scraper/scrapeURL/index.ts`, the `isLikelyProxyError` check); no self-hosted engine
offers that, so it fell through to its `pdf` and `document` engines, which download the URL with a
plain request (`engines/pdf/index.ts`, `engines/document/index.ts`), three rounds of each. After
3.2 s it answered HTTP 500, "Scrape aborted after exceeding retry limit (document_antibot)", with
no page. So the self-hosted build is refused exactly as the app is, and one call became up to
seven requests to a site that had already said no. Nothing that solves a CAPTCHA was used or
looked for.

## Firecrawl self-hosted

Read from the Firecrawl repository at release **v2.11.0** (tag of 2026-06-19, commit `ef12eb3`),
the latest release on 2026-10-28; the `v2.11.6xx` tags after it are not releases. File paths are
relative to that tag; `apps/api/src/` is shortened to `src/`.

### What the source says

**No anti-bot engine.** `SELF_HOST.md` (Considerations, item 1): "self-hosted instances of
Firecrawl do not have access to Fire-engine, which includes advanced features for handling IP
blocks, robot detection mechanisms, and more." In `src/scraper/scrapeURL/engines/index.ts` the six
`fire-engine;…` engines, the `stealth` ones among them, are enabled only when
`FIRE_ENGINE_BETA_URL` is set, and that service is not in the repository. Without it a scrape can
use `playwright` (when `PLAYWRIGHT_MICROSERVICE_URL` is set), `fetch`, `pdf` and `document`. The
Playwright service (`apps/playwright-service-ts/package.json`) depends on plain `playwright`
^1.58.1, with no stealth package.

**Containers.** `docker-compose.yaml` defines `api` (the API plus the workers it starts itself,
`cpus: 4.0`, `mem_limit: 8G`), `playwright-service` (`cpus: 2.0`, `mem_limit: 4G`), `redis`,
`rabbitmq`, `nuq-postgres`, and two FoundationDB services used only with `NUQ_BACKEND=fdb`. The
FoundationDB pair has no profile, so a plain `docker compose up` starts them too. `api`,
`playwright-service` and `nuq-postgres` are built from source by default.

**Search.** `SELF_HOST.md` says "By default, the /search API will use Google search." The code does
something else: `src/search/v2/index.ts` tries Fire-engine, then SearXNG when `SEARXNG_ENDPOINT`
is set, then `ddgsearch.ts`, which fetches DuckDuckGo's HTML results page with a rotating list of
browser user agents and gives up when DuckDuckGo shows its bot check. The run's log said "Using
DuckDuckGo search".

**robots.txt.** The README says "By default, Firecrawl respects robots.txt directives." That holds
for crawls (`ignoreRobotsTxt` defaults to false in `src/controllers/v2/types.ts`). A single scrape
checks robots.txt only when the team flag `checkRobotsOnScrape` is set
(`src/scraper/scrapeURL/shouldCheckRobots.ts`), and the self-hosted build without database
authentication uses a stand-in team with `flags: null` (`mockACUC` in `src/controllers/auth.ts`).
So self-hosted `/scrape` never reads robots.txt.

**LLM extraction with Ollama.** `SELF_HOST.md` lists `OLLAMA_BASE_URL`, `MODEL_NAME` and
`MODEL_EMBEDDING_NAME` under "Experimental: Use Ollama", and in `src/lib/generic-ai.ts` setting
`OLLAMA_BASE_URL` makes Ollama the default provider. The JSON format of `/scrape` doesn't use the
default: `src/scraper/scrapeURL/transformers/llmExtract.ts` calls `getModel(…, "openai")` with the
provider written in (lines 318, 993, 1235, 1347 and 1448). With only the Ollama variables set, the
run's JSON scrape logged "Model: gpt-4o-mini" and failed with "Failed to parse URL from
/responses". It worked once Firecrawl was pointed at Ollama's OpenAI-compatible endpoint instead
(`OPENAI_BASE_URL=http://host.docker.internal:11434/v1`, any `OPENAI_API_KEY`, `MODEL_NAME`).

**Licence.** AGPL-3.0 (`LICENSE`; the README says the SDKs and some UI parts are MIT).

### What the run showed

Firecrawl ran in `/tmp/ro-run/` from a clone of the v2.11.0 tag, as compose project
`ro-run-firecrawl`, with only `api`, `playwright-service`, `redis`, `rabbitmq` and `nuq-postgres`.
The API image is the one Firecrawl published for the release commit,
`ghcr.io/firecrawl/firecrawl:sha-ef12eb36b2f3-linux-amd64`; there is no tagged image of the other
two for that commit, so they were built from the tag. An override capped `api` at 3 GB and 2 CPUs,
`playwright-service` at 2 GB, bound the port to 127.0.0.1, and set one browser and one job at a
time.

- **Disk:** API image 1.09 GB, Playwright service 1.37 GB, nuq-postgres 456 MB, rabbitmq 252 MB,
  redis 120 MB: 3.3 GB. Pulling and building took 16 minutes (load average 15 to 35).
- **Start:** RabbitMQ failed its health check (3 tries, 5 s apart) on the first `up` while the
  laptop was busy, so the API didn't start; the second `up` worked, and the API answered 45 s
  later.
- **RAM at idle**, from `docker stats` (load 21 to 24):

  | Container | As shipped | With `NUQ_WORKER_COUNT=1` |
  |---|---|---|
  | `api` | 2.50 GiB | 1.52 GiB |
  | `playwright-service` | 148 MiB | 208 MiB |
  | `rabbitmq` | 142 MiB | 151 MiB |
  | `nuq-postgres` | 103 MiB | 106 MiB |
  | `redis` | 14 MiB | 14 MiB |
  | **Total** | **2.9 GiB** | **2.0 GiB** |

  The API container runs 11 Node processes of 250 to 290 MiB each; five are queue workers
  (`NUQ_WORKER_COUNT` defaults to 5 in `src/config.ts`, and the compose file doesn't pass it, so
  lowering it takes an override). During a scrape the API peaked at 1.46 GiB and Playwright at
  385 MiB.
- **A busy laptop stalls it.** The queue worker logged "Can't accept connection due to RAM/CPU
  load" and "WORKER STALLED" whenever CPU use went over 80% (`MAX_CPU` and `MAX_RAM` default to
  0.8, `src/config.ts`; the check is in `src/services/system-monitor.ts`). Single `/v2/scrape`
  calls still answered.
- **A normal page:** the foxfort listing behind the fixture, one `/v2/scrape` call: 6.2 s
  (load 26), Playwright straight away, 159 KB of HTML and 23,800 characters of Markdown.
- **JSON extraction through Ollama** (`qwen2.5:3b`, the pages served to Firecrawl from a local
  container so no site was asked twice; that needs `ALLOW_LOCAL_WEBHOOKS=true`, because the
  Playwright service refuses private addresses, and a hostname with a dot, because the v2 URL
  check wants a top-level domain), scored the same way as the Ollama runs below, load average 11
  to 31:

  | Page | Right | Wrong | Missed | Invented | Seconds | What went wrong |
  |---|---|---|---|---|---|---|
  | storia | 4 | 1 | 5 | 0 | 67 | The Markdown was 99 characters: the `<head>` and the `__NEXT_DATA__` script are dropped |
  | foxfort | 8 | 0 | 2 | 0 | 75 | No photo (the `<head>` again), no floor count |
  | primum | 8 | 0 | 2 | 0 | 132 | No title, no photo |
  | apostu | 8 | 1 | 1 | 0 | 182 | Title rewritten by the model, no photo |
  | DataDome page | 3 | 0 | 0 | **7** | 57 | A whole flat made up: 2 rooms, 50 m², floor 1 of 6, built 2008, "Centrul-Bucuresti", decomandat |
  | full foxfort | 1 | 6 | 3 | 0 | 271 | Ollama cut the 10,064-token prompt to its default 4,096 ("truncating input prompt" in its log), keeping the end, so the model read the "similar listings" block and gave another flat's price, area and zone |
  | full hitchmosher | 8 | 2 | 0 | 0 | 146 | Title rewritten from the prose, a tracking pixel as the photo |
  | **All 70 fields** | **40** | **10** | **13** | **7** | | |

  Through the OpenAI-compatible endpoint Firecrawl can't set the context size, so Ollama uses its
  server default unless the server is started with a bigger one.

## Search: the ways to find listings without a per-site adapter

| Way | What it returns | Cost here | CAPTCHA decision | Terms |
|---|---|---|---|---|
| SearXNG, self-hosted | Results it scrapes from Google, Bing, DuckDuckGo and others | One more container | Fine as long as it isn't tuned to dodge engine blocks; SearXNG itself suspends an engine for 24 hours after a CAPTCHA or access denied (`suspended_times` in its settings) | The engines' terms forbid automated querying; SearXNG is a polite way of doing it, not a permitted one |
| Firecrawl `/search` without SearXNG | DuckDuckGo's HTML results page, with rotating user agents | Firecrawl | Gives up on DuckDuckGo's bot check, doesn't solve it | Same as above, and the rotating user agents are there to look like several browsers |
| Brave Search API | JSON results from Brave's own index | $5 per 1,000 queries with a monthly free credit; a card is asked for "to prevent abuse" (brave.com/search/api, read 2026-10-28) | Fine | Permitted; storing results needs "a plan that includes storage rights" |
| Google Custom Search JSON API | Google results | Closed to new customers; existing ones have until 2027-01-01 (developers.google.com/custom-search, read 2026-10-28) | n/a | n/a |
| A site's own search page read by an LLM | The listings, like an adapter | A model call per page of results, minutes per Refresh on this CPU | Same exposure as the adapters | Same as the adapters; storia's `robots.txt` says `Content-Signal: search=yes, ai-input=no, ai-train=no`, which asks not to feed its pages to an AI |
| A site's feed or sitemap | New listing URLs with titles and dates | One request per Refresh | imobiliare serves its RSS feed with no bot check (see job 1) | Listed in imobiliare's `robots.txt`; whether to use it is proposal C |

Two notes on the sites' own rules, read from their `robots.txt` on 2026-10-28. imobiliare.ro
disallows search URLs with filter parameters (`price=`, `rooms=`, `pagina=`, and others) and
`/cautare-ai`. foxfort.ro explicitly welcomes AI user agents. primum.ro disallows only `/crm/` and
`/images/`.

## The three options

| | What it fixes | What it costs to run | What it adds to `npm run dev` | What breaks when a site changes |
|---|---|---|---|---|
| **Stay as is** (with proposals A and B) | Prices outside a "Preț" label and JSON-LD prices; the zone regex; a silent "OK, 0" from a broken adapter | Nothing | Nothing | The adapter's selectors, as now, but Refresh says so instead of dimming the source's listings |
| **Ollama as an extra layer behind the existing ones** | Fields the rules leave empty on unseen sites, sometimes | About 2 GB on disk for `qwen2.5:3b` and 2.6 to 2.8 GiB of RAM while it is loaded | The Ollama service, a pulled model, and a wait of 10 s to 5 min on Fetch details | Nothing for search; for a listing page, a layout change can push the details past the model's context, and it then answers from whatever text is left |
| **Firecrawl + Ollama** | Pages that need a browser, which the app already handles with Playwright | 3.3 GB of images, 2.0 to 2.9 GiB of RAM before a model is loaded, plus the model | Docker (ruled out in [decisions.md](decisions.md), "Two terminals, no concurrently/turbo/Docker"), five containers, a compose override, and Ollama reachable from Docker | Search: the same as the adapters, since Firecrawl reads the same pages. Extraction: its Markdown drops the page's `<head>` and scripts, so the title, photo and storia's JSON go missing, and long pages are cut to the model's context |

## Recommendation (provisional)

Stay as is and fix the two rules, with a warning for empty sources. A model in the automatic path
costs minutes a page on this laptop, and through Firecrawl it showed two new ways to be wrong
(invented fields on an empty page, a neighbouring flat's numbers when the page is cut short).
Called directly, `qwen2.5:3b` was accurate, which is why proposal D stays on the list as an opt-in
button. Firecrawl adds none of what the
question hoped for: the self-hosted build has no anti-bot engine, its search is a DuckDuckGo
scraper that returns search pages, and its LLM extraction needs a workaround to reach Ollama at
all.

The proposals, for the owner to pick from at the grill. None of them is a brief yet.

**A. Two more rules in the extractor** (small, `api/src/details/` only)
- Read `offers.price` and `priceCurrency` (EUR only) from JSON-LD of type `Product`, `Offer` or
  `Residence`, ranked below the storia JSON and above the labels. Update the "JSON-LD was looked
  at and skipped" line in [adapters.md](adapters.md).
- Take a bare "145.000 Eur" line near the title as the price when no label gave one, through
  `parsePriceEur`.
- Keep the phrase layer's zone match on one line (`[ \t]+`, not `\s+`).
- Add a trimmed hitchmosher fixture and test, people removed as in the fixtures README.

**B. "OK, 0" is a warning** (small, API and web)
- A source whose adapter returns no listings while it had some before is reported as a warning in
  the Refresh summary, and its run doesn't count as a success for staleness, so its listings are
  not dimmed as delisted.
- Check hitchmosher's adapter against its current search page; on 2026-10-28 the cards were not in
  the HTML.

**C. imobiliare's RSS feed** (needs the owner's yes first)
- If the owner decides the feed fits "Blocked means blocked": a Refresh reads
  `/rss-listings.xml` once, keeps the Timișoara apartments for sale, and lists them with title,
  link and date, marked as "open in your browser". No listing page is fetched.
- If not: record the decision next to "Blocked means blocked".

**D. Only if the owner still wants a model:** a "Ask the model" button on the draft, never automatic,
for fields still empty; it runs after the bot-check test, sends the page text (head, JSON-LD and
body, as in the runs above), marks each field it fills "from model", and is off unless
`OLLAMA_URL` is set. `qwen2.5:3b` is the candidate so far (67 of 70 right, nothing invented, and it
filled the two fields the rules missed on hitchmosher); the missing scores may change that. This keeps the user as the last check, as the draft already does.

## How the runs were made

- Scratch folder `/tmp/ro-run/` (not in the repo): the Firecrawl clone, the compose override, the
  scripts and every page and result. The owner's database was not opened; nothing ran the app's
  API. The extractor ran from `api/src/details/extract.ts` through `tsx`.
- Requests to real sites, all on 2026-10-28, seconds apart: `robots.txt` of foxfort, primum,
  imobiliare, storia and hitchmosher; the foxfort listing once through Firecrawl and once plain; imobiliare's
  search page once through Firecrawl (Firecrawl made up to 7 requests of it); imobiliare's RSS
  feed once; hitchmosher's search page twice (plain, then through Firecrawl) and one hitchmosher
  listing twice; one DuckDuckGo query through Firecrawl. No page, result or listing value from them is
  in the repo; only counts and scores are. The laptop restarted between the Firecrawl run and the
  second model run and cleared `/tmp`, which is why the two full pages were fetched a second time.
- Ollama 0.24.0 on the host (the systemd service, CPU only, no GPU visible to WSL), models pulled
  for the run: `qwen2.5:3b`, `llama3.2:3b`, `qwen2.5:7b`, all Q4_K_M. The scripts (page text,
  prompt and schema as described above, a scorer with the rules above) are in `/tmp/ro-run/scripts/`
  and will not survive a restart.
- All of the run's containers, volumes, images and build cache were removed after the Firecrawl
  part. Left on the laptop at the pause: `qwen2.5:3b` and `llama3.2:3b` (3.9 GB together; the
  owner's `llama3.2:1b` was there before) and the scratch folder (under 1 MB). `qwen2.5:7b` was
  deleted and has to be pulled again to score it.

## To finish

- Score `llama3.2:3b` on the seven pages, and `qwen2.5:7b` if the laptop has about 6 GB free (it
  needs 4.7 GB on disk and more in RAM). Run them when no other build is running, so the timings
  show the laptop at its best as well as busy.
- Then settle proposal D and the recommendation, drop "provisional", and move the brief to done.
