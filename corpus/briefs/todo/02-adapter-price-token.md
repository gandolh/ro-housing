# Task 02: Adapters: read the price, not the numbers before it

## Context

Eight adapters (`api/src/adapters/blitz.ts:43`, storia, foxfort, apostu, district, hitchmosher,
primum, agentie-imo-tm) read the price with

    priceEur: parsePriceEur(text.match(/[\d.,\s]+\s*€|[\d.,\s]+\s*eur/i)?.[0]),

`[\d.,\s]+` also takes a number and a space before the price, and `parsePriceEur` joins every digit
it is given. Run on 2026-10-21: "Etaj 2 89.000 €" gives 289000; "Strada Aradului 12 299 000 €"
gives 12299000; a range "75.000 - 80.000 €" gives 75. The adapter path has no sanity check (the
single-link extractor has `sane()`), so these values reach the table, the €/m² column and the
price history, and sort to the wrong end.

Improvement sweep of 2026-10-20 (API correctness and safety lens), vetted against the code; the ranked report is the owner's "Repo improvement sweep" doc.

## Files you OWN

- `api/src/lib/normalize.ts` (a shared price extractor)
- the eight adapters
- tests

## What to do

1. Write one `extractPriceEur(text)`: a price token with a word boundary before it (`\d{1,3}(?:[.\s]\d{3})+(?:,\d{2})?` or `\d{4,7}`, then € or eur), the first one not marked as an old price, and nothing outside 5,000 to 5,000,000.
2. Use it in all eight adapters.

## Acceptance

- Unit tests for the strings above and the existing samples.
- All eight adapters call the shared function (grep).
