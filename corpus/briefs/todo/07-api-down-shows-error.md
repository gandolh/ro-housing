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
