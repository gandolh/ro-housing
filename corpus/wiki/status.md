---
summary: Where ro-housing's work stands on 2026-11-04, per area. The 2026-10-20 sweep's fixes built 2026-10-27 and the Host check 2026-10-28; the 2026-11-04 grill closed the Firecrawl and Ollama research (01) and filed briefs 13 to 18 (a hitchmosher note, two extractor rules, an empty-Refresh warning, imobiliare's RSS feed, getting ready for the VPS, and Wicket's "Fill the gaps", which waits).
updated: 2026-11-04
---

# Status: 2026-11-04

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

## Open

Filed 2026-11-04 from the owner's grill, numbered in build order (numbering continues after the old
12, see [CLAUDE.md](../CLAUDE.md)):

- [17](../briefs/todo/17-ready-for-the-vps.md), ready for the VPS: Sign in with Ward and a seeded
  account, `/ro-housing` and `/ro-housing-api`, port 8809, a capped container with Chromium. No
  deploy.
- [18](../briefs/todo/18-fill-the-gaps-with-wicket.md), "Fill the gaps" through Wicket on the Saved
  draft. Written only: it waits for Wicket, which is being built.
- imobiliare's own price element, once its bot check lifts.
