# Task 14: Two extractor rules: a price outside a "Preț" label, a zone on one line

Filed 2026-11-04 from the owner's grill: proposal A of the Firecrawl and Ollama research.

## Context

The single-listing reader (`api/src/details/extract.ts`, described in
[docs/adapters.md](../../../docs/adapters.md), "Single listing pages") was scored on a full
hitchmosher.ro listing page in the research
([docs/research-firecrawl-ollama.md](../../../docs/research-firecrawl-ollama.md), "What the
extractor got wrong on the unseen page"). It found 7 of 10 fields. Two of the misses are plain
rules:

- **Price.** The page shows "145.000 Eur" on its own line under the title, and the prose says
  "Pretul de vanzare este 145.000 euro". The label rule wants a line that starts with "Preț", so
  nothing matched. The page's JSON-LD also carries `"offers": {"price": "145000",
  "priceCurrency": "EUR"}`, which the extractor never reads: on the first four sites tested,
  JSON-LD only described the agency.
- **Zone.** The phrase layer's `zona\s+([A-Z]…)` lets `\s` cross a line break, so "zona Lidia" on
  one line and "Apartament" on the next became "Lidia\nApartament".

The third miss ("imobil cu 4 niveluri", floors in the building) is a guess at what "niveluri"
counts and stays with the user, as the draft already does.

## Files you OWN

- `api/src/details/extract.ts`, `api/src/details/extract.test.ts`
- `api/src/details/fixtures/hitchmosher.html` (new), `api/src/details/fixtures/README.md`
- `docs/adapters.md` ("Single listing pages")
- `corpus/briefs/`, `corpus/log.md`, `corpus/wiki/status.md`

## Files you must NOT touch

- The search adapters (`api/src/adapters/`) and `lib/normalize.ts`'s card price rules: this is
  the single-listing reader only.

## What to do

1. **JSON-LD offers.** A new layer between storia's JSON and the labels: read every
   `<script type="application/ld+json">` (a single object, an array, or an `@graph`), take
   `offers.price` (or the first offer of an array) when `priceCurrency` is `EUR`, through
   `parsePriceEur` or a plain number check, from an item whose `@type` is `Product`, `Offer`,
   `Residence`, `Apartment`, `SingleFamilyResidence`, `RealEstateListing` or `Accommodation`.
   Only the price; nothing else from JSON-LD. A page whose JSON-LD only describes the agency
   gives nothing, as today. Name the layer (`'jsonld'`) so `sources.priceEur` says where it came
   from.
2. **A bare price line near the title.** When no earlier layer gave a price: the first text
   line within a few lines after the line that holds the page's `<h1>` text, whose whole content
   is an amount and a euro currency ("145.000 Eur", "145 000 €", "€ 145.000"), optionally with
   "+ TVA". Only that window, so a "similar listings" block lower down can't feed it. No `<h1>`,
   no rule.
3. **Zone on one line.** In the phrase layer's zone regex, both gaps (after "zona" and between
   the two name words) become `[ \t]+` instead of `\s+`.
4. **Fixture and tests.** Add `fixtures/hitchmosher.html`, a trimmed real hitchmosher.ro listing
   page (one fetch of one listing page; the search page is not fetched), with people, phones and
   IDs removed and image URLs replaced, as the fixtures README says. If the fetch fails or the
   page changed shape, build the fixture from the shapes the research describes and say so in
   the fixture README and the outcome. Tests: the new fixture gives the price from JSON-LD and
   the zone without the next line; a page without JSON-LD gives the bare line's price; a bare
   price line far below the title is ignored; JSON-LD of type `Organization` gives nothing. The
   five existing fixtures keep their exact answers.
5. Update "Single listing pages" in `docs/adapters.md`: the layer list and the "JSON-LD was looked
   at and skipped" sentence.

## Acceptance

- `npx tsc --noEmit` and `npx vitest run` pass in `api/`, the old fixture tests unchanged.
- The hitchmosher fixture reads price 145000 (or the fixture's own price) and a zone with no line
  break in it.
- `docs/adapters.md` names the JSON-LD layer and the bare-price rule.
