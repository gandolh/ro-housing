# Task 05: Staleness from each source's last run, and a failed Refresh says so

## Context

`web/src/components/ListingsTable.tsx:53-55` dims a row as stale only when `lastRefreshAt` is set,
and `lastRefreshAt` is page state (`web/src/pages/ListingsPage.tsx:37`) set when Refresh is clicked
during this visit. After a reload or a tab switch nothing is dimmed, and the table shows no
last-seen date, so a flat delisted weeks ago can sort to the top of "price, low first".
`docs/architecture.md:76` says staleness is judged against each source's last refresh, which the
page already loads as `sources[].lastRunAt`. Also, `refresh()` (`ListingsPage.tsx:61-71`) sets
`lastRefreshAt` before the request and has no catch: a failed Refresh shows no error and dims every
row as if every flat had been delisted.

Improvement sweep of 2026-10-20 (web app lens), vetted against the code; the ranked report is the owner's "Repo improvement sweep" doc.

## Files you OWN

- `web/src/pages/ListingsPage.tsx`
- `web/src/components/ListingsTable.tsx`
- tests

## What to do

1. Compute stale per row from its source's last successful run (minus a few seconds), not from page state.
2. Show the last-seen date in the Age cell's title.
3. In `refresh()`, catch errors into a `role="alert"` message and leave staleness alone on failure.

## Acceptance

- Tests: after a reload, a row older than its source's last run is dimmed.
- A failed refresh shows the alert and dims nothing new.

## Outcome (2026-10-27)

Done in d031d1d. `ListingsTable` takes the sources instead of `lastRefreshAt` and works out one
cutoff per source (`staleCutoffs`): its `lastRunAt` when `lastRunOk` is true. The sources table
keeps only the last run, so when that run failed the cutoff is the newest `lastSeen` among the
source's listings, which is when its last good run found something. A row seen more than 5 s
before the cutoff is dimmed and carries `data-stale`. The Age cell's title reads "Last seen
YYYY-MM-DD HH:MM", plus ", not found by its source's last refresh" on a stale row.
`refresh()` catches into a `role="alert"` line ("Refresh failed: HTTP 500") and reloads only
after a good run. With staleness taken from the API, a failed Refresh changes no row.

Checked: `ListingsPage.test.tsx` (3 tests, fetch stubbed, all failing on the old code): on a
fresh load the rows older than their source's last run are dimmed, also for a source whose last
run failed; the titles; a 500 from Refresh shows the alert, leaves the rows as they were and
reloads nothing. web 52/52, tsc -b clean.
