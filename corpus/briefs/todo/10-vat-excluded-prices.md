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
