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

## Outcome (2026-10-27)

Done in 17893c8. `getBrowser()` clears its cached promise when the launch rejects and when the
browser emits `disconnected`, each only if the cache still holds that launch (a late event from an
old browser cannot drop a newer one). `closeBrowser()` no longer throws when the launch had failed.

Checked: `playwright.test.ts` (5 tests, `playwright` mocked): a launch stub that fails once and then
succeeds gives a browser on the second `getBrowser()`. Also checked: calls share one browser, a
disconnect leads to a new launch, a stale disconnect is ignored, and close is safe after a failed
launch. Four fail on the old module. api 114/114, tsc clean. With the real local Chromium and no
site opened: closing the browser and calling `getBrowser()` again gave a new connected browser that
rendered a page.
