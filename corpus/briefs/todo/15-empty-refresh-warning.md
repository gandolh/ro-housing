# Task 15: A source whose Refresh returns 0 listings gets a warning

Filed 2026-11-04 from the owner's grill: proposal B of the Firecrawl and Ollama research.

## Context

When a site changes its markup, its adapter usually finds no cards and returns an empty list
instead of throwing. `api/src/routes/refresh.ts` then reports "OK, 0" and calls
`markSourceRun(id, true)`, so the run counts as a success. The Listings table dims every row
older than its source's last successful run (`staleCutoffs` in
`web/src/components/ListingsTable.tsx`, [docs/architecture.md](../../../docs/architecture.md)),
so a broken adapter makes every listing from that site look delisted, with nothing saying why.
The research found exactly this case for hitchmosher.ro
([docs/research-firecrawl-ollama.md](../../../docs/research-firecrawl-ollama.md), job 1).

The owner settled on 2026-11-04: a visible warning when a source's Refresh returns 0 listings.

## Files you OWN

- `api/src/routes/refresh.ts`, `api/src/routes/refresh.test.ts`, `api/src/routes/sources.ts`
- `api/src/db/queries.ts`, `api/src/db/migrate.ts`, `api/src/db/migrate.test.ts`,
  `api/src/db/schema.sql`
- `web/src/api.ts`, `web/src/pages/ListingsPage.tsx`, `web/src/pages/ListingsPage.test.tsx`,
  `web/src/components/ListingsTable.tsx`, `web/src/pages/SourcesPage.tsx` and its test,
  `web/src/components/ui/Badge.tsx` (a warning tone, if the palette has one)
- `docs/architecture.md`, `docs/decisions.md`
- `corpus/briefs/`, `corpus/log.md`, `corpus/wiki/status.md`

## What to do

1. **Record the count.** A `last_run_count` column on `sources` (in `schema.sql`, and added to old
   databases by `db/migrate.ts`'s list). `markSourceRun` stores how many listings the run
   returned; a failed run stores null. `/api/sources` returns it as `lastRunCount`.
2. **The Refresh answer.** A source that returned no listings comes back as `ok: true, count: 0`
   plus `warning: 'no listings found'` (or similar). It is still not a failure: the adapter ran.
3. **Staleness.** `staleCutoffs` takes a source's `lastRunAt` only when that run was ok and found
   at least one listing. A 0-listing run falls back to the newest `lastSeen`, as a failed run
   does, so nothing is dimmed by it. A `lastRunCount` of null (rows from before the column, or a
   failed run) keeps today's behaviour.
4. **What the owner sees.** In the Refresh summary on Listings, a 0-listing source shows a warning
   badge (not OK, not FAIL) and a short line: no listings found, the search URL or the site's
   page may have changed, and its listings are not dimmed. On Sources, a source whose last run
   found nothing says so next to its last-run time. Use the palette's existing tokens
   ([docs/design.md](../../../docs/design.md)); add a badge tone only if a warning colour exists.
5. **Tests:** the refresh route answers the warning for an empty adapter (extend the mock in
   `refresh.test.ts`); the migration adds the column; `staleCutoffs` ignores a 0-listing run; the
   Listings page shows the warning.
6. One entry in `docs/decisions.md` ("An empty Refresh is a warning") and the staleness paragraph
   in `docs/architecture.md`.

## Acceptance

- `npx tsc --noEmit` and `npx vitest run` pass in `api/`; `npx tsc -b` and `npx vitest run` pass in
  `web/`.
- A source whose adapter returns `[]` shows a warning in the Refresh summary, and its old listings
  are not dimmed afterwards.
