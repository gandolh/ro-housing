# Task 09: Recover from a failed or crashed Chromium without a restart

## Context

`api/src/lib/playwright.ts:3-10` caches the launch promise forever, including a rejected one, and
never notices a closed browser. After one failed launch (for example before
`npx playwright install chromium`), or after Chromium crashes or the laptop sleeps, storia and the
Saved tab's browser fallback fail until `npm run dev` is restarted (checked on a copy without
Chromium: later calls return the same rejected promise).

Improvement sweep of 2026-10-20 (API correctness and safety lens), vetted against the code; the ranked report is the owner's "Repo improvement sweep" doc.

## Files you OWN

- `api/src/lib/playwright.ts`
- tests

## What to do

1. On rejection, reset the cached promise to null.
2. On the browser's `disconnected` event, reset it as well.

## Acceptance

- A test with a launch stub that fails once and then succeeds: the second `getBrowser()` succeeds.
