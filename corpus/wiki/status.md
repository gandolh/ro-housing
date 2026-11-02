---
summary: Where ro-housing's work stands on 2026-11-02, per area. The 2026-10-20 sweep's fixes (API locked to the app, price reading, staleness, tabs kept mounted, API-down errors, draft re-fetch, Chromium recovery, +TVA prices) built 2026-10-27 and the Host check 2026-10-28; one open brief, 01, the Firecrawl and Ollama research, paused with a provisional recommendation.
updated: 2026-11-02
---

# Status: 2026-11-02

Pushed through `bfce142` (2026-11-01). Brief numbering restarted at 01 on 2026-11-02 (see
[log.md](../log.md)); project knowledge is in [docs/](../../docs/README.md), the session record in
[docs/worklog.md](../../docs/worklog.md).

## By area

- **API safety** (2026-10-27, 2026-10-28). No CORS; another site's `Origin` gets 403, and so does
  any `Host` but the local names, which closes DNS rebinding at port 3000
  ([docs/decisions.md](../../docs/decisions.md)).
- **Prices** (2026-10-27). Every adapter reads the price with `extractPriceEur()`, skipping the
  floor number, "Preț vechi" and discounts; the Saved form reads decimals; "+ TVA" prices carry a
  flag and a "+TVA" mark ([docs/adapters.md](../../docs/adapters.md)).
- **Listings and staleness** (2026-10-27). Stale rows come from each source's last run; a failed
  Refresh says so; a second Refresh during a run gets 409.
- **Web app resilience** (2026-10-27). Tab pages stay mounted; with the API down each page shows
  "Can't reach the API" with Retry; a second Fetch details over an edited draft asks first.
- **Scraping** (2026-10-27). A failed or disconnected Chromium is relaunched on the next call.

## Open

- [01](../briefs/todo/01-research-firecrawl-and-ollama.md), research whether self-hosted Firecrawl
  with Ollama, or Ollama alone, makes finding and reading listings easier (filed 2026-10-27, not
  grilled). Paused twice on 2026-10-28;
  [docs/research-firecrawl-ollama.md](../../docs/research-firecrawl-ollama.md) has the Firecrawl
  run, the search check, scores for the extractor and `qwen2.5:3b`, and a provisional
  recommendation: no Firecrawl, two extractor rules and an "OK, 0" warning first, a model only as
  an opt-in button. `llama3.2:3b` and `qwen2.5:7b` are not scored yet.
- imobiliare's own price element, once its bot check lifts.
