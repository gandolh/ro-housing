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

## Outcome (2026-10-27)

Done in fd14226. `extractPriceEur(text)` in `api/src/lib/normalize.ts` takes a price token that
starts at a fresh number (not after a digit, "." or ","): thousands groups split by ".", "," or a
space, or 4-7 bare digits, an optional ",00", then €, eur or euro, and not followed by "/m²". It
skips amounts outside 5,000-5,000,000 € and every amount equal to one labelled "Preț vechi", and
returns the first left. The eight adapters call it instead of their regex.

Two calls the brief left open, pinned in tests: where a space-grouped number reads more than one
way, the shortest reading in range wins, so "Strada Aradului 12 299 000 €" gives 299000 and a real
"1 299 000 €" gives 299000 too (rarer for a flat here than a number in front of the price); the
range "75.000 - 80.000 €" gives 80000, the only amount with a currency sign after it. Comma
thousands ("109,000 EUR", an existing sample) count as a separator.

Checked: unit tests for the brief's three strings and the old samples (api 104/104), tsc clean;
`grep -n "extractPriceEur\|parsePriceEur" api/src/adapters/*.ts` shows the eight adapters on
`extractPriceEur` and none on `parsePriceEur`. No search page was fetched.
