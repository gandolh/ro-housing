# Task 16: List new Timișoara flats from imobiliare.ro's RSS feed

Filed 2026-11-04. The owner said yes to the research's proposal C on 2026-10-28 and confirmed it
in the 2026-11-04 grill.

## Context

imobiliare.ro has answered the app with a bot check since 2026-10-16 (403 to a plain request,
DataDome to Chromium), and "Blocked means blocked" in [docs/decisions.md](../../../docs/decisions.md)
rules out getting past it. Its `robots.txt` lists `/rss-listings.xml` among its sitemaps, and
that feed answers a plain request with no bot check
([docs/research-firecrawl-ollama.md](../../../docs/research-firecrawl-ollama.md), job 1). Checked
again on 2026-11-04 from the owner's PC and from the VPS: 200, `text/xml`, about 557 KB, 2,364
items, 125 mentioning Timișoara. Each item has a `link`, a `pubDate` and a `title`, nothing else:
no price, no area.

The owner's terms: title and link only, each opening in a normal browser. No listing page is
fetched for it, and nothing that gets past a bot check or CAPTCHA, of any kind.

The links look like `https://www.imobiliare.ro/oferta/apartament-de-vanzare-timisoara-<zone>-…-<id>`:
the kind of property, "de-vanzare" or "de-inchiriat", the city, then the zone and a numeric ID.

## Files you OWN

- `api/src/adapters/imobiliare-feed.ts` (new) and its test, `api/src/adapters/index.ts`,
  `api/src/adapters/types.ts` (an optional default search URL)
- `api/src/db/index.ts` (the seed)
- `web/src/components/ListingsTable.tsx` (only if feed rows need a mark) and its tests
- `docs/adapters.md`, `docs/decisions.md`, `README.md` (the sites list)
- `corpus/briefs/`, `corpus/log.md`, `corpus/wiki/status.md`

## Files you must NOT touch

- `api/src/adapters/imobiliare.ts`, the search adapter, which stays as it is (blocked).
- `api/src/details/`: Fetch details on an imobiliare link behaves as before.

## What to do

1. **A source, not a new screen.** A tenth adapter, id `imobiliare-feed`, display name
   "imobiliare.ro (RSS)", so the feed runs inside Refresh (still button-only), shows on Sources
   with its last run, and its rows land in the Listings table where the owner already looks.
   Seed the source with the feed URL as its search URL and enabled, through an optional
   `defaultSearchUrl` on the adapter; `INSERT OR IGNORE` leaves an existing row alone.
2. **One request per Refresh.** A plain GET of the feed: no cookie jar, no Playwright fallback,
   no retry, a timeout, and an honest User-Agent that names the app. A non-200 answer throws, so
   the source shows as failed. The adapter refuses any URL but `https://www.imobiliare.ro/rss-listings.xml`
   (the search URL field could be edited).
3. **Keep Timișoara flats for sale.** Parse the RSS items with cheerio in XML mode. Keep an item
   when its link path starts `/oferta/` and continues `apartament-de-vanzare-timisoara-`,
   `garsoniera-de-vanzare-timisoara-` or `penthouse-de-vanzare-timisoara-` (the app is buy-only,
   flats only, Timișoara only: [docs/decisions.md](../../../docs/decisions.md)). `sourceUid` is the
   link's trailing numeric ID; `url` the link; `title` the item's title; `raw` the three item
   fields. No price, rooms, area or location: title and link only.
4. **In the table.** Feed rows have no price, so price, €/m² and the history line are blank. The
   title link already opens in a new tab. A row dims once it leaves the feed (about a day's
   window), which here means "no longer new", not "delisted"; say so in `docs/adapters.md`. The
   row's save action works as for any imobiliare link: the Saved form opens empty with the link
   kept when the site shows its bot check.
5. **Tests** on a made-up XML fixture written in the test file (no real listing titles or IDs in
   the repo): keeps the three flat kinds in Timișoara, drops rentals, houses, land and other
   cities, takes the ID as `sourceUid`, refuses another URL, throws on a non-200.
6. **Docs.** A per-site note in `docs/adapters.md`; a decision in `docs/decisions.md` next to
   "Blocked means blocked": the feed is published in imobiliare's `robots.txt`, served without a
   bot check, read once per Refresh, and no listing page is fetched; if the feed ever answers
   with a bot check, the source fails like any other. The README's sites list gains the feed.
7. One live check while building: a single Refresh-equivalent call of the adapter against the real
   feed, counting the items kept. No more requests than that.

## Acceptance

- `npx tsc --noEmit` and `npx vitest run` pass in `api/`.
- A fresh database seeds `imobiliare-feed` enabled with the feed URL.
- The adapter, run once against the live feed, returns only Timișoara flats for sale, with title
  and link.
