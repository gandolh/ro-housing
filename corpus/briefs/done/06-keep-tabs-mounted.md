# Task 06: Keep the pages alive when switching tabs

## Context

`web/src/App.tsx:34-44` renders the three pages in Base UI `TabsPanel`s without `keepMounted`
(Base UI's default is false). Leaving Saved unmounts an open draft with typed notes (reproduced with
a throwaway test: after Listings and back, the link box is empty and the notes are gone). Leaving
Listings drops the sort, the filter, the per-source OK/FAIL strip and the result of a running
Refresh. Coming back re-enables Refresh, and `api/src/routes/refresh.ts` has no in-progress guard,
so a second refresh runs in parallel against the listing sites.

Improvement sweep of 2026-10-20 (web app lens), vetted against the code; the ranked report is the owner's "Repo improvement sweep" doc.

## Files you OWN

- `web/src/App.tsx`
- `api/src/routes/refresh.ts`
- tests

## What to do

1. Keep the three panels mounted (`keepMounted`), or lift their state above the tabs.
2. In the API, refuse a second refresh while one is running (409), and show that on the page.

## Acceptance

- A test: draft notes survive going to Listings and back.
- A test: a second `POST /api/refresh` during a run gets 409.

## Outcome (2026-10-27)

Done in 23b71aa. The three `TabsPanel`s in `App.tsx` are `keepMounted`. `POST /api/refresh` answers
409 `{ error: "a refresh is already running" }` while a run is in progress, with the flag cleared
in a `finally`. `api.refresh()` now reads the server's error, and the Listings page shows a 409 as
"Another Refresh is already running. Try again when it has finished." in its alert from brief 05.

Outside the file list: `SourcesPage.tsx` and `api.ts`. A page that stays mounted no longer re-reads
the API when its tab comes back. Only Sources showed data that changes meanwhile (each source's
last run, after a Refresh on Listings), so it takes an `active` prop and re-reads the sources each
time its tab opens, keeping rows with unsaved edits; it also first loads when first opened.
Recorded in docs/decisions.md.

Checked: `App.test.tsx`: draft notes and the link survive going to Listings and back with one
scrape and one saved-list load; unsaved Sources edits survive a switch and a failed last run shows
after reopening. Both fail on the old `App.tsx`. `refresh.test.ts`: a second POST during a run gets
409, one after a finished or failed run is taken (the test times out on the old route; the database
and adapters are mocked, and `db/index.ts` throws if loaded). api 109/109, web 55/55, tsc clean,
vite build clean.
