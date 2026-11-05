---
summary: Where ro-housing's work stands on 2026-11-04, per area. The 2026-10-20 sweep's fixes built 2026-10-27 and the Host check 2026-10-28; on 2026-11-04 the Firecrawl research closed (01) and briefs 13 to 17 and 19 were built (hitchmosher note, extractor rules, empty-Refresh warning, imobiliare's RSS feed, ready for the VPS with sign-in and a container, the container running built JavaScript). The owner deployed it on 2026-11-05 and linked Ward. 18, Fill the gaps through Wicket, built 2026-11-05, not deployed: it needs ro-housing's Wicket token in vps-deploy's secrets.
updated: 2026-11-05
---

# Status: 2026-11-04

Pushed through `bfce142` (2026-11-01); the 2026-11-04 commits are on local main, not pushed. Brief numbering restarted at 01 on 2026-11-02 (see
[log.md](../log.md)); project knowledge is in [docs/](../../docs/README.md), the session record in
[docs/worklog.md](../../docs/worklog.md).

## By area

- **On the VPS: ready, not deployed** (2026-11-04). Sign-in (a seeded local account or Sign in
  with Ward, no sign-up), the app at `/ro-housing/`, the API at `/ro-housing-api`, a container on
  `127.0.0.1:8809` capped at 1 CPU and 1 GiB ([17](../briefs/done/17-ready-for-the-vps.md),
  [docs/owner-setup.md](../../docs/owner-setup.md)). Local development signs in too. The image
  compiles the API with tsc and runs `node dist/server.js`, no tsx: idle about 112 MiB in
  `docker stats`, down from about 160 ([19](../briefs/done/19-the-api-runs-built-javascript.md)).
- **API safety** (2026-10-27, 2026-10-28). No CORS; another site's `Origin` gets 403, and so does
  any `Host` but the local names, which closes DNS rebinding at port 3000
  ([docs/decisions.md](../../docs/decisions.md)).
- **Prices** (2026-10-27). Every adapter reads the price with `extractPriceEur()`, skipping the
  floor number, "Preț vechi" and discounts; the Saved form reads decimals; "+ TVA" prices carry a
  flag and a "+TVA" mark ([docs/adapters.md](../../docs/adapters.md)).
- **Single listing pages** (2026-11-04). The extractor reads a price from JSON-LD offers and from a
  bare line under the title, and keeps a zone on its line
  ([14](../briefs/done/14-extractor-price-and-zone-rules.md)).
- **Listings and staleness** (2026-10-27, 2026-11-04). Stale rows come from each source's last run; a
  failed Refresh says so; a second Refresh during a run gets 409; a run that finds no listings
  shows as EMPTY and dims nothing ([15](../briefs/done/15-empty-refresh-warning.md)).
- **Web app resilience** (2026-10-27). Tab pages stay mounted; with the API down each page shows
  "Can't reach the API" with Retry; a second Fetch details over an edited draft asks first.
- **Scraping** (2026-10-27). A failed or disconnected Chromium is relaunched on the next call.
- **imobiliare.ro's RSS feed** (2026-11-04). A source that lists new Timișoara flats for sale,
  title and link only, once per Refresh; no listing page fetched
  ([16](../briefs/done/16-imobiliare-rss-feed.md)).
- **hitchmosher.ro** (2026-11-04). Off by the owner's choice; its default search URL is stale
  ([13](../briefs/done/13-hitchmosher-stale-search-url-note.md), [docs/adapters.md](../../docs/adapters.md)).
- **Research** (2026-11-04). [01](../briefs/done/01-research-firecrawl-and-ollama.md) closed: no
  Firecrawl (too heavy here; [docs/research-firecrawl-ollama.md](../../docs/research-firecrawl-ollama.md)
  says what it would take on a bigger machine), a model only on request (brief 18).
- **Fill the gaps** (2026-11-05). [18](../briefs/done/18-fill-the-gaps-with-wicket.md) built: a
  button on the Saved draft asks Wicket for the empty fields, from the page text Fetch details kept,
  and fills them marked "from AI" ([docs/decisions.md](../../docs/decisions.md), "A model only on
  request, through Wicket"; the flow in [docs/architecture.md](../../docs/architecture.md)). Off
  until `WICKET_URL` and `WICKET_TOKEN` are set; vps-deploy's stack passes both. Not deployed.

## Open

Filed 2026-11-04 from the owner's grill, numbered in build order (numbering continues after the old
12, see [CLAUDE.md](../CLAUDE.md)):

- imobiliare's own price element, once its bot check lifts.

## Owner steps (2026-11-05)

Done by 2026-11-05, per vps-deploy's log: production Ward's app and client, the deploy, the
account in the container, the grant and "Link Ward", the seed command as `node dist/seed.js`, and
the brief-board sync.

- Fill the gaps: add `WICKET_TOKEN=<ro-housing's token>` (the value after `ro-housing=` in
  `WICKET_APP_TOKENS`, vps-deploy's `secrets/wicket.env`) to vps-deploy's
  `secrets/ro-housing.env`, then `node cli.ts ro-housing all` there. Then on a fresh draft with an
  empty field: Fill the gaps shows the ticket line, then fills the field marked "from AI"; the job
  shows on Wicket's page at `/wicket`.
- Ward's local seed: add the `ro-housing` entry to `APPS` in wzd_auth's
  `infrastructure/local/seed.mjs` (the line is in owner-setup, "Local development").
- With Docker Desktop up: walk a local Ward sign-in and "Link Ward" once (Local development,
  step 5). Building and checking the container (step 3) is optional now: brief 19 did it, but not
  Fetch details on a live page or Chromium.
- The README's Sources screenshot shows nine sites and no sign-in; retake it with
  `docs/images/shots.md` when convenient.
- Optional: `ollama rm qwen2.5:3b llama3.2:3b` frees the 3.9 GB pulled for the research.
- Answer [open-questions.md](open-questions.md).
