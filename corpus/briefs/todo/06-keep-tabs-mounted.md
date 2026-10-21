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
