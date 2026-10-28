# Research: Firecrawl and Ollama for finding listings

**In progress. Stopped on 2026-10-28 when the owner paused the run.** This page holds what was
established before the pause. Nothing here has been run yet: no Firecrawl containers, no Ollama
models, no model scores. The open steps are listed at the end, and
[brief 11](../corpus/briefs/todo/11-research-firecrawl-and-ollama.md) stays in todo until they are
done. There is no recommendation yet.

The question, from the owner on 2026-10-27: should the app self-host Firecrawl with Ollama, or
Ollama alone, "so that it's easier to scrape and search online for housing offers"? It splits into
three jobs:

1. **Finding new listings across sites**, which the nine search adapters do today.
2. **Reading one listing's fields**, which the layered extractor (`api/src/details/extract.ts`) does
   for the Saved tab.
3. **Getting past sites that block us**, today imobiliare.ro's DataDome CAPTCHA. The decision
   "Blocked means blocked" in [decisions.md](decisions.md) rules out stealth plugins and CAPTCHA
   solving, and every option here stays inside it.

## Firecrawl self-hosted: what the source says

Read from the Firecrawl repository at release **v2.11.0** (tag of 2026-06-19, commit `ef12eb3`),
the latest release on 2026-10-28. File paths are relative to that tag.

**No anti-bot engine.** `SELF_HOST.md` (Considerations, item 1): "self-hosted instances of
Firecrawl do not have access to Fire-engine, which includes advanced features for handling IP
blocks, robot detection mechanisms, and more." The source agrees. In
`apps/api/src/scraper/scrapeURL/engines/index.ts` the six `fire-engine;…` engines, the `stealth`
ones among them, are enabled only when `FIRE_ENGINE_BETA_URL` is set, and that service is not in
the repository. Without it a scrape can use only `playwright` (when `PLAYWRIGHT_MICROSERVICE_URL`
is set), `fetch`, `pdf` and `document`. The Playwright service
(`apps/playwright-service-ts/package.json`) depends on plain `playwright` ^1.58.1, with no stealth
package.

What follows for job 3, as a reading and not yet a run: self-hosted Firecrawl reaches a page the
same two ways the app already does, a plain request and headless Chromium. On 2026-10-16
imobiliare.ro answered the first with a Cloudflare block and the second with a DataDome CAPTCHA, so
there is no reason in the source to expect a different answer. Step 2 of the brief still asks for
a real try, a single slow request.

**Containers and memory.** `docker-compose.yaml` at v2.11.0 defines:

| Service | What it is | Limit set in the compose file |
|---|---|---|
| `api` | The API, plus the workers it starts itself (`node dist/src/harness.js --start-docker`) | `cpus: 4.0`, `mem_limit: 8G` |
| `playwright-service` | Chromium behind an HTTP endpoint | `cpus: 2.0`, `mem_limit: 4G` |
| `redis` | `redis:alpine` | none |
| `rabbitmq` | `rabbitmq:3-management` | none |
| `nuq-postgres` | Postgres for the job queue, built from `apps/nuq-postgres` | none |
| `foundationdb`, `foundationdb-init` | An experimental queue backend, used only with `NUQ_BACKEND=fdb` | none |

The compose file builds `api`, `playwright-service` and `nuq-postgres` from source by default; the
prebuilt `ghcr.io/firecrawl/…` images are commented out next to each `build:` line. The two
FoundationDB services have no profile, so a plain `docker compose up` starts them too. The limits
add up to 12 GB for two services alone, against 15 GiB in WSL on this laptop. The real use was not
measured: that was the next step.

**Search.** `SELF_HOST.md` says "By default, the /search API will use Google search." The v2 code
does something else. `apps/api/src/search/v2/index.ts` tries Fire-engine when
`FIRE_ENGINE_BETA_URL` is set, then SearXNG when `SEARXNG_ENDPOINT` is set, then falls back to
`ddgsearch.ts`, which fetches DuckDuckGo's HTML results page with a rotating list of browser
user agents and gives up when DuckDuckGo shows its anti-bot check. So a self-hosted `/search`
either needs a SearXNG instance or scrapes DuckDuckGo, which the terms question in step 4 has to
weigh.

**LLM extraction with Ollama.** `SELF_HOST.md` lists `OLLAMA_BASE_URL`, `MODEL_NAME` and
`MODEL_EMBEDDING_NAME` under "Experimental: Use Ollama". In `apps/api/src/lib/generic-ai.ts`,
setting `OLLAMA_BASE_URL` makes Ollama the default provider and `MODEL_NAME` overrides the model
for every call.

**Other facts that bear on the choice.** The licence is AGPL-3.0 (`LICENSE`; the README says the
SDKs and some UI parts are MIT). The README says "By default, Firecrawl respects robots.txt
directives."

## Not done yet

Where the run stopped, in the brief's order:

- **Step 2, the rest.** Start Firecrawl locally (only `api`, `playwright-service`, `redis`,
  `rabbitmq` and `nuq-postgres`), record the RAM it takes, and try one slow scrape of an
  imobiliare.ro listing to observe what comes back. Nothing that solves a CAPTCHA.
- **Step 3.** Two or three quantised 3B to 8B models in Ollama on the CPU, fed the four listing
  fixtures in `api/src/details/fixtures/` plus the DataDome page (to see whether a model invents
  fields on a page with none), scored against the layered extractor and a hand-checked answer:
  fields right, wrong and invented, seconds per page, peak RAM. The fixtures are trimmed, so a
  model will look faster on them than on a full page; one or two full agency pages, fetched once
  into a scratch folder outside the repo, would show the real cost.
- **Step 4.** SearXNG, a search API, and a site's own search page read by an LLM, each checked
  against the CAPTCHA decision and the sites' terms.
- **Steps 5 and 6.** The table comparing staying as is, Ollama as an extra extractor layer behind
  the existing ones, and Firecrawl with Ollama; then a recommendation with proposed briefs.
