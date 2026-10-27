# Task 07: Show an error when the API is down, not an empty shortlist

## Context

`web/src/pages/SavedPage.tsx:102-105`, `ListingsPage.tsx:58` and the Sources page load their lists
with no catch. When the API is not running, Vite's proxy answers 500 and `api.ts:85` throws, and
each page renders its empty state ("Nothing saved yet. Paste a listing link above…", "0 saved",
"No listings yet"). The Sources Save (`SourcesPage.tsx:70-86`) has no catch either.

Improvement sweep of 2026-10-20 (web app lens), vetted against the code; the ranked report is the owner's "Repo improvement sweep" doc.

## Files you OWN

- `web/src/pages/*.tsx`
- a small shared error component

## What to do

1. Catch load errors into an error state with `role="alert"` ("Can't reach the API: is it running?") and a Retry button; do the same for Sources Save.

## Acceptance

- Tests: with fetch failing, each page shows the alert, not its empty state.

## Outcome (2026-10-27)

Done in 95430d3. A new `web/src/components/ApiErrorNotice.tsx` shows a `role="alert"` line with a
Retry button. `apiErrorMessage()` in `api.ts` words it: "Can't reach the API: is it running?" when
fetch rejects or the proxy answers 5xx without a JSON body (Vite 8's proxy answers 502, not 500),
else the API's own error. Listings, Saved and Sources show it in place of their list, with the
count hidden, when a load fails ("Couldn't load the listings. Can't reach the API: is it
running?"), and Retry loads again. A failed Sources Save shows "Not saved. …", keeps the edits,
and Retry saves them again.

Outside `pages/`: `api.ts`. The list calls threw a bare `Error("HTTP 502")`; they now throw
`ApiError` like the others, so the message can tell the proxy's 502 from the API's own error.
The Refresh alert now reads "Refresh failed. <reason>". The Report button's issue count already
had a catch and was left alone.

Checked: one test per page with fetch failing (a rejected fetch for Saved, a text/plain 502 for
Listings and Sources): the alert shows, the empty state and count do not, and Retry recovers.
Plus a failed Sources Save. All four fail on the old pages. web 59/59, tsc -b and vite build
clean.
