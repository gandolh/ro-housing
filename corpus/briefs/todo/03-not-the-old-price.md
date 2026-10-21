# Task 03: Don't take the crossed-out old price

## Context

`api/src/lib/normalize.ts:20-30` (`pickLargestPriceEur`) keeps the largest euro amount in the card.
On the repo's own imobiliare sample, "Apartament 2 camere zona X 109.000 € 131.890 € Preț vechi
131.890 €" (the comment at `normalize.ts:34`), it returns 131890 (run on 2026-10-21). Every
discounted listing therefore shows the old price in the Price and €/m² columns, and the history
line stays flat at the old price: the drops the owner is looking for never show. The "largest"
rule exists for the "+ 2000 € Discount … 111.359 € 92.033 € +TVA" blurb (`normalize.test.ts:92-97`).

Improvement sweep of 2026-10-20 (API correctness and safety lens), vetted against the code; the ranked report is the owner's "Repo improvement sweep" doc.

## Files you OWN

- `api/src/lib/normalize.ts`
- `api/src/lib/normalize.test.ts`
- the imobiliare adapter, if it should read its price element instead

## What to do

1. Drop the amounts next to "Preț vechi" before choosing, and prefer the first price in the card; keep the discount case working (VAT is brief 10).
2. Better still, read imobiliare's dedicated price element instead of the card's text.

## Acceptance

- A test: the Preț vechi sample gives 109000.
- The existing discount test still passes.
