# Task 08: A second "Fetch details" must not wipe the open draft

## Context

`web/src/pages/SavedPage.tsx:116-123` rebuilds the whole draft on every fetch, and the link box and
button stay enabled while a draft is open (`:237`, `:242` disable them only while fetching). Enter in
the link field, or a second click because the page read looked wrong, discards everything typed
since the first fetch (reproduced with a throwaway test).

Improvement sweep of 2026-10-20 (web app lens), vetted against the code; the ranked report is the owner's "Repo improvement sweep" doc.

## Files you OWN

- `web/src/pages/SavedPage.tsx`
- tests

## What to do

1. When the draft has edits, ask before replacing it, or merge the new read and keep the fields marked "edited" and the notes.

## Acceptance

- A test: edit the notes, fetch again, and the notes are kept (or a confirmation appears first).
