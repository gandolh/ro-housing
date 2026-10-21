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
