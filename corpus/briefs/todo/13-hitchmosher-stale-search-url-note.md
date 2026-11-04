# Task 13: Note that hitchmosher.ro's default search URL is stale

Filed 2026-11-04 from the owner's grill. Small, docs only.

## Context

The owner decided on 2026-11-04 that the hitchmosher.ro search adapter stays off (it is off by
default: only imobiliare and storia start enabled). The reason is in the Firecrawl and Ollama
research ([docs/research-firecrawl-ollama.md](../../../docs/research-firecrawl-ollama.md), job 1):
on 2026-10-28 the page at the pattern [docs/adapters.md](../../../docs/adapters.md) gives,
`/en/apartments/for-sale`, had no listing links in its HTML. The cards are filled in by a script,
and even the page rendered by a browser had only two listing links, under `/ro/proprietate/`,
which the adapter's `/apartments/` pattern doesn't match. So a source pointed there returns an
empty list. `docs/adapters.md` still lists that URL pattern as if it worked.

## Files you OWN

- `docs/adapters.md` (the hitchmosher.ro note only)
- `corpus/briefs/`, `corpus/log.md`, `corpus/wiki/status.md`

## What to do

1. Under "### hitchmosher.ro" in `docs/adapters.md`, add a dated line: the default search URL is
   stale since 2026-10-28 (no listing links in the HTML, cards filled in by a script, the two
   rendered links under `/ro/proprietate/`), the adapter would return an empty list, and the
   owner keeps the source off (2026-11-04). Link the research page for the detail.
2. Say what reviving it would take, in one line: a new search URL and a link pattern for
   `/ro/proprietate/`, checked against the live page first; a script-filled page needs the
   Playwright strategy.
3. Leave `api/src/adapters/hitchmosher.ts` as it is. Nothing is fetched for this brief.

## Acceptance

- `docs/adapters.md` says the hitchmosher.ro default URL is stale, since when, why, and that the
  source stays off by the owner's choice.
- No code changes; `bash corpus/lint.sh` passes.
