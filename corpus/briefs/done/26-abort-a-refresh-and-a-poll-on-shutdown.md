# Task 26: Abort a refresh and a Wicket poll on shutdown

**Depends on:** brief 24 (`close-with-grace`, the `features/` layout, `plugins/`). The house recipe is the code-structure skill's `shutdown-and-timeouts.md`: cancel held responses in `preClose`, never in `onClose`.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)). Promoted from the todo "A refresh in flight holds the shutdown" (2026-11-13).

## Context

`POST /api/refresh` runs every source in turn and can take minutes. A held `GET /api/saved/fill/:id?wait=25` polls Wicket for up to 25 s. `app.close()` waits for every request in flight, so since brief 24 a SIGTERM during either runs `close-with-grace`'s 10 s out and the process exits 1; the job is cut wherever it was. A deploy during a refresh logs a failed stop.

The fix is the recipe's: an `AbortSignal` that a `preClose` hook aborts. The loop stops between sources, the scrapers' requests and browser pages are aborted, the Wicket request is aborted, the reply is a short "the server is restarting" line, and the close finishes at once.

Leave the server's timeout values (`keepAliveTimeout`, the default `connectionTimeout` and `requestTimeout`) and the 10 s grace delay alone.

## Files you OWN

- `api/src/plugins/shutdown.ts` (new) and its test
- `api/src/app.ts`, `api/src/testing/test-app.ts` (register the plugin)
- `api/src/features/refresh/`, `api/src/features/saved/fill-routes.ts` and their tests
- `api/src/adapters/*.ts` (`scrape` takes a signal), `api/src/lib/fetch.ts`, `api/src/lib/playwright.ts`, `api/src/lib/wicket.ts` and their tests
- `docs/decisions.md` (the shutdown line), `docs/architecture.md` if it names the hook
- `corpus/briefs/`, `corpus/todos/`, `corpus/log.md`, `corpus/wiki/status.md`

## Files you must NOT touch

- `api/src/server.ts` timeout values and the grace delay; `web/`; `vendor/` and `api/vendor/`; any `.env`.
- `features/saved/details/fetchPage.ts` and Fetch details (a separate route; not in this brief).

## What to do

1. `plugins/shutdown.ts`, wrapped in `fastify-plugin`: decorates the app with `shutdownSignal` (an `AbortSignal`) and aborts it, with a reason, from a `preClose` hook. Register it in `buildApp` and in `testApp`.
2. `Adapter.scrape(searchUrl, signal?)`. `FetchSession.get(url, signal?)` joins it to its own 20 s timeout with `AbortSignal.any`; `fetchRenderedHtml(url, selector, signal?)` closes its context when the signal aborts and throws the reason; the RSS adapter passes it to its `fetch`. Each of the nine adapters passes the signal on.
3. `refreshAll` takes the signal, checks it between sources, and rethrows an abort instead of recording it as the source's failure (the source's last-run stays as it was). The route answers 503 `{ error: "The server is restarting; press Refresh again in a moment." }` (add 503 to the response schema) and `running` is cleared.
4. `WicketClient.get(id, waitSeconds, signal?)` joins the signal to its timeout. The fill poll route passes `app.shutdownSignal` and answers 503 with a "restarting" sentence when it was the shutdown that aborted.
5. Tests, with every site and Wicket stubbed (no real scrape, no call to Wicket's model): a refresh hanging on a stub source and a fill poll hanging on a stub Wicket are aborted when the app closes and `close()` finishes in well under a second; the 503 bodies; an abort leaves the source's last-run alone.
6. Docs: update the shutdown line in `docs/decisions.md`.

## Acceptance

- `npm run check` and `bash corpus/lint.sh` exit 0.
- The new tests prove both aborts and a prompt close.
- The built server, run from a scratch folder with `RO_HOUSING_DB` and `RO_HOUSING_ISSUES_DIR` on the command line, stub sources and no `.env`, exits 0 within a second of SIGTERM with a refresh held (if run).
- Timeout values are unchanged.

## Outcome (2026-11-13)

Built in `7b8df13`. `plugins/shutdown.ts` decorates the app with `shutdownSignal` and aborts it in `preClose`. `Adapter.scrape`, `FetchSession.get`, `fetchRenderedHtml` and `WicketClient.get` take an optional signal (joined to their own timeouts with `AbortSignal.any`); `refreshAll` checks it between sources and rethrows an abort, so a cut source is not recorded as failed; the refresh route and the fill poll answer 503 "The server is restarting; try again in a moment." Tests close the app with a refresh and a poll hanging on stubs: 503, close under a second. `npm run check` exit 0 (api 302, web 150). Not run: the built server on a real socket with a held refresh, and `docker build`. Fetch details (`fetchListingPage`) is not covered. Owner step: `node cli.ts ro-housing server` from vps-deploy.
