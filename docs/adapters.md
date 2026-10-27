# Adapters

## The contract

Every site adapter exports an object matching `Adapter` in `api/src/adapters/types.ts`:

```ts
{
  id: string,             // 'imobiliare' | 'storia' | ...
  displayName: string,
  scrape(searchUrl: string): Promise<ScrapedListing[]>
}
```

`scrape` takes a user-pasted search-results URL and returns one row per listing visible on that page. Pagination is *optional and best-effort* — if it's cheap (a `?page=N` query param), follow up to a few pages; if it requires JS interaction beyond what we want, just return page 1.

A `ScrapedListing` is intentionally permissive — every field except `sourceUid`, `url`, and `raw` is optional. Adapters surface what they can parse; the upsert tolerates nulls. `raw` is the full parsed row as a JSON object, kept for debugging when fields go missing.

## Strategies

### cheerio (default)

For sites whose listing cards are present in the raw HTML response. Use `lib/fetch.ts` to issue requests — it sets a real browser User-Agent and carries cookies across calls in a session. This matters for sites like imobiliare.ro that set consent cookies on first visit and 302 you to a wall otherwise.

### Playwright

For sites where the initial HTML is a SPA shell and listing data only appears after JS runs (storia.ro), or where anti-bot challenges block plain fetch. Open a page, wait for a known listing-grid selector, then either dump `page.content()` into cheerio or query directly through Playwright's locator API.

Reuse the chromium instance across adapter calls within a single refresh — `lib/playwright.ts` exposes a singleton with a lazy launch and an explicit `closeBrowser()` for shutdown. Since 2026-10-27 a failed launch (Chromium not installed yet) and a browser that disconnects (a crash, the laptop sleeping) clear the singleton, so the next call launches again; before, both kept failing until the API was restarted.

## Reading the price from a card

Every adapter reads the price with `extractPriceEur(cardText)` from `lib/normalize.ts` (since 2026-10-27; before, eight had a loose regex that also took the numbers in front of the price, so "Etaj 2 89.000 €" became 289000, and imobiliare took the largest amount, which was the crossed-out old price on every discounted flat). It takes the first euro amount between 5,000 and 5,000,000 that starts at a fresh number and is not a €/m² figure, a discount or add-on ("+ 2000 €", "10.000 € Discount"), or the amount labelled "Preț vechi" (wherever that amount stands in the card). The adapters call it through `cardPrice()`, which also reports whether that amount is marked "+ TVA" or "fără TVA" (stored as `price_plus_vat`; the single-link reader does the same for its "Preț" label). Known limits, each pinned in `normalize.test.ts`: a range "75.000 - 80.000 €" gives the upper end, and a price over 1,000,000 € written with spaces ("1 299 000 €") reads as 299000, because "Strada Aradului 12 299 000 €" has to.

## Per-site notes

These get filled in as adapters are built. Includes things worth remembering: the URL pattern, the selectors that work today, known quirks. **Do not rely on this file for current selectors** — when an adapter breaks, fix the code first, update this note second.

### imobiliare.ro
- **2026-10-16: blocked.** Plain fetch gets Cloudflare's "Attention Required!" 403; headless Chromium gets a DataDome CAPTCHA (`geo.captcha-delivery.com`). Both the search adapter and the Saved tab come back empty for it. Not worked around, on purpose. It worked from this machine in session 4, so the block may lift; re-test before changing the adapter.
- Strategy: cheerio.
- Search URL pattern: `https://www.imobiliare.ro/vanzare-apartamente/timisoara` (+ `?pagina=N`).
- Quirk: sets consent cookie on first visit. The shared `lib/fetch.ts` cookie jar handles this.
- Quirks learned in session 4 (each has a regression test in `api/src/lib/normalize.test.ts`):
  - **Titles embed the price** ("... 125.000 €") — adapter uses `stripTrailingPrice()` from `normalize.ts` to chop the trailing euro fragment.
  - **Card text mixes discounts, the old price and the real price** ("+ 2000 € Discount … 111.359 €", "109.000 € 131.890 € Preț vechi 131.890 €") — the adapter took the largest amount from session 4, which picked the old price on discounted flats; since 2026-10-27 it uses `extractPriceEur()` like the others (see above). Its own price element would be better still, but the site's markup cannot be checked while it shows the bot check. `imobiliare.test.ts` runs the adapter on two made-up cards.
  - **Fractional room descriptions** ("1,5 camere") — `parseRooms()` uses a negative lookbehind `(?<![\d.,])` so the "5 camere" in "1,5 camere" doesn't match.
  - **Listing cards don't carry a stable location class** — adapter parses the neighborhood from the URL slug via `locationFromImobiliareUrl()`.

### storia.ro
- **2026-10-16:** plain fetch answered 200 with the full page, search and listing alike. The adapter still uses Playwright; switching it to cheerio would be faster but is untested against the search page's markup.
- Strategy: Playwright (confirmed 403 on plain fetch + React SPA shell).
- Search URL pattern: `https://www.storia.ro/ro/rezultate/vanzare/apartament/timis/timisoara` (+ `?page=N`).
- Quirk: Cloudflare + bot signals. Use a stock Playwright chromium with default UA — no extra stealth needed at personal volume in initial testing, but be ready to add `playwright-extra` + stealth plugin if it starts challenging.

### foxfort.ro
- Strategy: cheerio (verified server-rendered).
- Search URL pattern: `/vanzare-apartamente/timisoara`.

### blitz.ro
- Strategy: cheerio (verified server-rendered).
- Search URL pattern: `/timisoara/apartament-vanzare-...`.

### hitchmosher.ro
- Strategy: cheerio. EN-language site, URL pattern `/en/apartments/for-sale`.

### agentie-imobiliare-timisoara.ro
- Strategy: cheerio (verified). PHP-based.
- Quirk: minimal CSS classes; selectors are structural (table rows, links) rather than class-based.

### apostuestate.ro, primum.ro, districtestate.ro
- Strategy: cheerio (assumed). Not verifiable from research environment.
- TODO during impl: confirm with `curl -A 'Mozilla/5.0 ...' <url>` from a real workstation that listings appear in raw HTML before writing selectors.

## Single listing pages (the Saved tab)

Separate from the search adapters: `api/src/details/` reads **one** listing page from **any** site into a draft. There is no per-site adapter to register. A site the extractor doesn't know still gets its title and photo from Open Graph, plus whatever its labels say.

The layers, most trusted first; a field keeps the first value found:

1. **storia's `__NEXT_DATA__`** (the OLX-group Next.js JSON): `ad.target` has `Price`, `Area`, `Rooms_num`, `Floor_no` (`floor_4`, `ground_floor`), `Building_floors_num`, `Build_year`; the area is the last of `ad.location.reverseGeocoding.locations`.
2. **Label/value lines.** Every text node is one line; a short line starting with a known Romanian label takes its value from the rest of the line or the next line. Covers foxfort (`Nr. camere:` + `<span>3</span>`), apostu (`<p>Pret</p><span>102,000 EUR</span>`), primum (`<strong>Pret:</strong> 108.000€`). `nav`, `footer` and `select` are dropped first so search filters don't pass for labels. Bare `Camere` and `Etaje` only count with a colon.
3. **Open Graph**: `og:title` (minus a trailing " - Site.ro" or listing ID), `og:image`.
4. **Phrases** in the title and prose: "2 camere", "garsoniera", "zona Freidorf", "etajul 3 din 3", "bloc din 1980", "imobil cu 10 etaje", "decomandat".

Values outside sane ranges are dropped (price under 1,000 €, year after next year + 5, a floor above the top floor drops the top floor). JSON-LD was looked at and skipped: on every site tested it only described the agency.

Bot checks: a page with no `og:title` whose `<title>` names a challenge, or that loads `captcha-delivery.com`, or that has under 500 characters of text, counts as blocked. Not `/cdn-cgi/challenge-platform`: Cloudflare adds that script to normal pages too.

When a field comes out wrong, add the page's block to a fixture in `api/src/details/fixtures/` (trimmed, no agent names or phones), write the failing test in `extract.test.ts`, then fix the rule.

## When a selector breaks

The expected failure mode. Diagnosis:

1. Open the search URL in a browser, view source, find a listing card. Note the new class / structure.
2. Update the adapter's selectors.
3. Update this file's per-site note only if the change is structural (different URL pattern, different strategy). Don't log every class rename.

If a site becomes consistently unscrapable (added Cloudflare, went SPA), either escalate it to the Playwright strategy or remove it from the registry. There's no obligation to keep all 9 working.
