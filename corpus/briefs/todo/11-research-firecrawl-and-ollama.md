# Task 11: Research Firecrawl and Ollama for finding listings

**Research only, not grilled yet.** Filed 2026-10-27. The owner asked whether to self-host
Firecrawl with Ollama, or Ollama alone, "so that it's easier to scrape and search online for
housing offers". This brief answers that with evidence and a recommendation; it builds nothing
into the app.

## Context

How finding listings works today ([docs/adapters.md](../../../docs/adapters.md),
[docs/decisions.md](../../../docs/decisions.md)):

- Refresh runs nine hand-written search adapters (`api/src/adapters/`), cheerio on plain HTML and
  Playwright where a site needs a browser. A site that changes its markup breaks its adapter
  quietly; the others carry on ("Silent skip on adapter failure").
- A single pasted link goes through one layered extractor (`api/src/details/extract.ts`): Open
  Graph tags, then a details block of Romanian labels, with a storia-specific JSON layer.
- imobiliare.ro has answered with a DataDome bot check since 2026-10-16. The decision "When a site
  shows a CAPTCHA" rules out stealth plugins and solving challenges. Any proposal stays inside it.
- The user is the last check: a draft marks each field "from page", "edited" or "not on page",
  and nothing is stored until Save. An LLM's output would go through the same form.

What the two tools are, to be confirmed against their current docs:

- **Firecrawl** turns a page into Markdown or JSON and can crawl, map a site, and search. The
  self-hosted version scrapes with plain Playwright; the anti-bot engine of the hosted service is
  not open source. Its `/search` needs a search provider (SearXNG or a paid API). Its LLM
  extraction can point at Ollama. It runs as several containers (API, workers, Redis, a
  Playwright service).
- **Ollama** runs a local model. On its own it cannot fetch or search the web; it can read a page
  we already fetched and return fields as JSON.

The machine: an AMD Ryzen 7 7735U laptop (8 cores, 16 threads, integrated Radeon), 15 GiB of RAM
in WSL, and no GPU visible to WSL (checked 2026-10-27). Models run on the CPU unless the research
finds a working path for the Radeon. The app runs only on this computer; there is no hosted
version, and the VPS (under 4 GiB of RAM) is not a candidate.

## Files you OWN

- A findings page, `docs/research-firecrawl-ollama.md`, linked from [docs/README.md](../../../docs/README.md).
- `corpus/wiki/status.md`, `corpus/log.md`.
- A scratch folder outside the repo for any trial runs. Nothing under `api/` or `web/` changes.

## What to do

1. **Pin down the question.** "Easier to scrape and search" splits into three jobs; answer each
   separately:
   - finding new listings across sites (what the adapters do);
   - reading one listing's fields (what the extractor does);
   - getting past sites that block us (imobiliare.ro).
2. **Firecrawl self-hosted.** From its docs and repo: what the self-hosted build lacks against
   the hosted one, the containers and the RAM it needs, how `/search` gets results, and whether
   its scrape gets through imobiliare.ro. Run it locally if it fits; record the RAM it took.
3. **Ollama alone.** Pick two or three small models that run on this CPU (3B to 8B, quantised).
   Feed each the same five saved listing pages from `api/src/details/fixtures/` and the agency
   sites, ask for the draft's fields as JSON, and score them against what the layered extractor
   returns: fields right, fields wrong, fields invented, seconds per page, peak RAM.
4. **Search.** Compare the ways to find listings without a per-site adapter: SearXNG self-hosted,
   a search API, the sites' own search pages read by an LLM. Say which respect the CAPTCHA
   decision and the sites' terms.
5. **Compare** three options in one table: stay as is, Ollama as an extra extractor layer behind
   the existing ones, Firecrawl + Ollama. Columns: what it fixes, what it costs to run, what it
   adds to `npm run dev`, what breaks when a site changes.
6. **Recommend** one, with the brief(s) it would take to build. Write those as proposals in the
   findings page, not as briefs; the owner picks at the grill.

## Acceptance

- `docs/research-firecrawl-ollama.md` answers the three jobs from step 1, with the table, the
  model scores from real runs (or a stated reason a run was impossible) and a recommendation.
- Every claim about Firecrawl's self-hosted limits cites its docs or source, with the version
  read.
- No listing data, search results or personal notes from the owner's database are copied into the
  repo; the fixtures already there are the test pages.

## Stopped (2026-10-28)

The owner paused the run partway through step 2. Done so far, in 982c5ef:
`docs/research-firecrawl-ollama.md` (linked from docs/README.md, marked in progress) with what
Firecrawl v2.11.0's `SELF_HOST.md`, `docker-compose.yaml` and source say: no Fire-engine
self-hosted, so scrapes use plain Playwright or fetch; the compose services and their memory
limits; `/search` falling back from SearXNG to scraping DuckDuckGo's HTML (the guide still says
Google); and how `OLLAMA_BASE_URL` and `MODEL_NAME` are used. Nothing was run: no containers were
started, no models pulled, no site requested. Left: the rest of step 2 (run Firecrawl, measure its
RAM, one slow try at imobiliare.ro) and steps 3 to 6 (model scores, search, the table, the
recommendation). The findings page lists them. Resume by re-cloning Firecrawl at a tagged release
into a scratch folder outside the repo; the clone used here was deleted.
