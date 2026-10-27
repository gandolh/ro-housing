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
