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

## Outcome (2026-10-27)

Done in 73aa338, the first option. The imobiliare adapter now calls `extractPriceEur` (brief 02),
which drops every amount equal to one labelled "Preț vechi" and takes the first price left, so the
sample gives 109000. Since "first" replaces "largest", the reader also skips a discount or add-on
("+ 2000 €", "10.000 € Discount", "Reducere: 6.500 €"), so a discount above the 5,000 € floor is
not taken either. `pickLargestPriceEur` had no other caller and is gone; its three tests now run on
`extractPriceEur` under "imobiliare card price", the discount sample unchanged.

Not done: reading imobiliare's dedicated price element. The site answers with a bot check, so its
current markup cannot be looked at; try it when the block lifts.

Checked: the Preț vechi sample gives 109000, also with the old price first; the discount test
passes; a new `adapters/imobiliare.test.ts` runs the adapter on two made-up cards (fetch mocked)
and gets 109000 and 111359. api 107/107, tsc clean.
