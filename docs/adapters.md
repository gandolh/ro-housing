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

Reuse the chromium instance across adapter calls within a single refresh — `lib/playwright.ts` exposes a singleton with a lazy launch and an explicit `closeBrowser()` for shutdown.

## Per-site notes

These get filled in as adapters are built. Includes things worth remembering: the URL pattern, the selectors that work today, known quirks. **Do not rely on this file for current selectors** — when an adapter breaks, fix the code first, update this note second.

### imobiliare.ro
- Strategy: cheerio.
- Search URL pattern: `https://www.imobiliare.ro/vanzare-apartamente/timisoara` (+ `?pagina=N`).
- Quirk: sets consent cookie on first visit. The shared `lib/fetch.ts` cookie jar handles this.
- Quirks learned in session 4 (each has a regression test in `api/src/lib/normalize.test.ts`):
  - **Titles embed the price** ("... 125.000 €") — adapter uses `stripTrailingPrice()` from `normalize.ts` to chop the trailing euro fragment.
  - **Card text mixes discounts and the real price** ("+ 2000 € Discount … 111.359 €") — adapter uses `pickLargestPriceEur()` which picks the max euro token in the text.
  - **Fractional room descriptions** ("1,5 camere") — `parseRooms()` uses a negative lookbehind `(?<![\d.,])` so the "5 camere" in "1,5 camere" doesn't match.
  - **Listing cards don't carry a stable location class** — adapter parses the neighborhood from the URL slug via `locationFromImobiliareUrl()`.

### storia.ro
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

## When a selector breaks

The expected failure mode. Diagnosis:

1. Open the search URL in a browser, view source, find a listing card. Note the new class / structure.
2. Update the adapter's selectors.
3. Update this file's per-site note only if the change is structural (different URL pattern, different strategy). Don't log every class rename.

If a site becomes consistently unscrapable (added Cloudflare, went SPA), either escalate it to the Playwright strategy or remove it from the registry. There's no obligation to keep all 9 working.
