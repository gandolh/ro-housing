# Task 10: Mark "+ TVA" prices so €/m² compares like with like

## Context

`parsePriceEur('92.033 € + TVA')` returns 92033 (run on 2026-10-21). Developer cards carry both the
gross and the net price (the sample in `normalize.test.ts`, ratio 1.21), and nothing detects VAT:
grep finds "TVA" only in that test. The single-link reader (`api/src/details/extract.ts:250`) and the
adapters store the net price marked "from page", so a new build priced "+ TVA" ranks above resale
flats whose price includes VAT.

Improvement sweep of 2026-10-20 (API correctness and safety lens), vetted against the code; the ranked report is the owner's "Repo improvement sweep" doc.

## Files you OWN

- `api/src/lib/normalize.ts`
- `api/src/details/extract.ts`
- the listings and saved schemas (a VAT flag, with a migration)
- the web table (a marker)
- tests

## What to do

1. Detect "+ TVA", "+TVA" and "fără TVA" next to the price and store a flag.
2. Show "+TVA" beside the price; computing a gross €/m² (21%, or 9% for a first home under the reduced-rate cap) is the owner's call, so show the marker first.

## Acceptance

- A test: "92.033 € + TVA" gives 92033 with the flag set.
- The table shows the marker.

## Outcome (2026-10-27)

Done in f8152b9. `normalize.ts` gains `extractPrice()`: the card price plus whether that amount is
marked "+ TVA", "+TVA", "(+TVA)" or "fără TVA" after it, or "Preț fără TVA:" before it. The adapters
store it through `cardPrice()`, and the single-link "Preț" label through `isPlusVat()`. The mark
belongs to the amount it follows: in the developer sample "111.359 € 92.033 € +TVA" the price is
111359, unmarked. "TVA inclus" and "cu TVA" mark nothing. A `price_plus_vat` column on `listings`
and `saved` is in `schema.sql` for new databases, and the new `db/migrate.ts` adds it to existing
ones at boot when `PRAGMA table_info` shows it missing. The owner's `data/ro-housing.db` gets it on
the API's next start; it was not touched here. Both tables show "+TVA" beside the price and the
€/m². No gross price is worked out: which rate applies (21%, or 9% for a first home) is the buyer's
case. The Saved form has a "+ TVA (before VAT)" tick box under the price, "from page" when the page
set it, so the user confirms it like every other field.

Outside the file list: the nine adapters and `adapters/types.ts`, `db/index.ts`, `db/queries.ts`,
`db/saved.ts`, `routes/listings.ts`, `routes/saved.ts`, `routes/saved-input.ts`, and on the web side
`api.ts`, `lib/apartment.ts`, `ApartmentForm.tsx`, `SavedTable.tsx`, `SavedPage.tsx` (the field
name for brief 08's question) and a new `VatMarker.tsx`.

Checked: "92.033 € + TVA" gives `{ eur: 92033, plusVat: true }`, and `parsePriceEur` still gives
92033. The marker shows in a listings row (`ListingsPage.test.tsx`) and on a saved row after the
box was set from the page. `migrate.test.ts` covers an old-shape database twice and a new one. api
122/122, web 65/65, tsc clean, vite build clean. On a throwaway copy with the owner's database
copied in, two boots added the column once and kept the rows, and a boot on an empty `data/`
worked. In Chrome on that copy: "+TVA" beside a flagged listing's price and €/m², and a draft
saved with the box ticked showed it in the Saved table.
