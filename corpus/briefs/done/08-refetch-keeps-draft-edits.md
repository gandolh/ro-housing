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

## Outcome (2026-10-27)

Done in 117f738, the "ask first" option. `SavedPage` works out the open draft's edits: fields that
differ from what the page gave, or from an empty form when the page was blocked, notes included.
With edits, Fetch details, Enter in the link box, and a "save" handed over from Listings (which
can now reach an open draft, since brief 06 keeps the page mounted) all wait behind an inline
alert: "Fetching again replaces the open draft. Your edits to it are lost: price, notes." It has
two buttons, Replace draft and Keep editing. With no edits the fetch runs at once, as before.
Merging was not picked because the second link may be a different flat.

Checked: three tests in `SavedPage.test.tsx`. Edited notes and price survive a second click and
Keep editing; Enter asks again, and Replace draft fetches a fresh draft. A draft without edits
fetches again with no question. A Listings hand-over over an edited draft asks and fetches nothing.
Two of the three fail on the old page. web 62/62, tsc -b and vite build clean.
