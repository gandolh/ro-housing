# Task 04: The form's price field: decimals are not thousands

## Context

`web/src/lib/apartment.ts:66-71` (`price`) removes every space, ".", "," and "eur" before parsing,
so "72000.00" becomes 7200000 and "85.500,00 EUR" becomes 8550000; both pass the API's limit of
50,000,000 (`api/src/routes/saved-input.ts:81`). "72000 euro" is refused, because removing "eur"
leaves "o". The tests cover only "72.000 €".

Improvement sweep of 2026-10-20 (web app lens), vetted against the code; the ranked report is the owner's "Repo improvement sweep" doc.

## Files you OWN

- `web/src/lib/apartment.ts`
- its tests

## What to do

1. Remove the currency words (€, eur, euro) first, then a trailing decimal part (one or two digits after the last "." or ","), then the thousands separators.
2. Refuse values over 10,000,000 with "Price looks too large".

## Acceptance

- Tests: "72.000 €", "72000.00", "72000 euro" and "72 000" give 72000; "85.500,00 EUR" gives 85500.

## Outcome (2026-10-27)

Done in 3c5c673. `price()` in `web/src/lib/apartment.ts` now removes €, eur and euro first, then a
trailing decimal part (one or two digits after the last "." or ","), then spaces, "." and ",", and
refuses anything over 10,000,000 € with "Price looks too large". The API's own limit stays at
50,000,000.

Checked: tests for "72.000 €", "72000.00", "72000 euro", "72 000" (72000), "85.500,00 EUR" (85500),
"72000,5", an empty field, the cap and a non-number; five of them fail on the old parser. web 49/49,
`tsc -b` and `vite build` clean.
